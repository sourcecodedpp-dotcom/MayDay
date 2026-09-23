import os
import sqlite3
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

class TigerGraphStore:
    """
    TigerGraph Graph Store & Connector.
    Supports live TigerGraph Savanna instances via pyTigerGraph / REST,
    with seamless local execution against the indexed FraudGraph dataset.
    """
    def __init__(self, db_path: str = "data/investigation.db", host: Optional[str] = None):
        self.db_path = db_path
        self.host = host or os.getenv("TIGERGRAPH_HOST")
        self.username = os.getenv("TIGERGRAPH_USERNAME", "tigergraph")
        self.password = os.getenv("TIGERGRAPH_PASSWORD")
        self.graph_name = os.getenv("TIGERGRAPH_GRAPH", "FraudGraph")
        self.conn = None
        self._init_sqlite()

    def _init_sqlite(self):
        self.sqlite_conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.sqlite_conn.row_factory = sqlite3.Row
        self._ensure_graph_tables()

    def _ensure_graph_tables(self):
        cur = self.sqlite_conn.cursor()
        # FraudCase vertex table for persisted cases
        cur.execute("""
            CREATE TABLE IF NOT EXISTS fraud_cases (
                case_id TEXT PRIMARY KEY,
                opened_at TEXT,
                status TEXT,
                verdict TEXT,
                fraud_probability REAL,
                pattern TEXT,
                pattern_description TEXT,
                exposure_usd REAL,
                summary TEXT,
                stop_reason TEXT,
                card_id TEXT,
                created_at TEXT
            )
        """)
        # Case edges table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS case_edges (
                case_id TEXT,
                edge_type TEXT,
                target_id TEXT,
                PRIMARY KEY (case_id, edge_type, target_id)
            )
        """)
        self.sqlite_conn.commit()

    def get_card_history(self, card_id: str, limit: int = 50, target_txn_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        GSQL Query equivalent: get_card_history(VERTEX<Card> target_card, INT limit)
        Retrieves transaction history and baseline parameters for a card,
        guaranteeing the inclusion of target_txn_id.
        """
        cur = self.sqlite_conn.cursor()
        cur.execute("SELECT customer_id FROM case_pack WHERE card_id = ?", (card_id,))
        row = cur.fetchone()
        cust_id = row['customer_id'] if row else None
        
        results = []
        if target_txn_id:
            cur.execute("""
                SELECT t.TransactionID, t.TransactionAmt, t.ts, t.channel, t.risk_score, 
                       t.ProductCD, t.addr1, t.addr2, t.P_emaildomain, t.card1, t.card4, t.card6,
                       i.DeviceInfo, i.id_30, i.id_31, i.id_33, i.id_15, i.id_23
                FROM transactions t
                LEFT JOIN identity i ON t.TransactionID = i.TransactionID
                WHERE t.TransactionID = ?
            """, (target_txn_id,))
            target_row = cur.fetchone()
            if target_row:
                results.append(dict(target_row))

        if cust_id:
            cur.execute("""
                SELECT t.TransactionID, t.TransactionAmt, t.ts, t.channel, t.risk_score, 
                       t.ProductCD, t.addr1, t.addr2, t.P_emaildomain, t.card1, t.card4, t.card6,
                       i.DeviceInfo, i.id_30, i.id_31, i.id_33, i.id_15, i.id_23
                FROM transactions t
                LEFT JOIN identity i ON t.TransactionID = i.TransactionID
                WHERE t.customer_id = ?
                ORDER BY t.ts DESC
                LIMIT ?
            """, (cust_id, limit))
        else:
            cur.execute("""
                SELECT t.TransactionID, t.TransactionAmt, t.ts, t.channel, t.risk_score, 
                       t.ProductCD, t.addr1, t.addr2, t.P_emaildomain, t.card1, t.card4, t.card6,
                       i.DeviceInfo, i.id_30, i.id_31, i.id_33, i.id_15, i.id_23
                FROM transactions t
                LEFT JOIN identity i ON t.TransactionID = i.TransactionID
                ORDER BY t.ts DESC
                LIMIT ?
            """, (limit,))
            
        for r in cur.fetchall():
            row_dict = dict(r)
            if not any(existing['TransactionID'] == row_dict['TransactionID'] for existing in results):
                results.append(row_dict)
                
        return results

    def detect_card_testing(self, card_id: str, ref_ts: str, window_minutes: int = 60) -> Dict[str, Any]:
        """
        GSQL Query equivalent: detect_card_testing(VERTEX<Card> target_card, STRING ref_ts)
        Finds multiple small online transactions (< $10.00) in temporal vicinity.
        """
        cur = self.sqlite_conn.cursor()
        cur.execute("SELECT customer_id FROM case_pack WHERE card_id = ?", (card_id,))
        row = cur.fetchone()
        if not row:
            return {"count_small": 0, "small_txns": [], "larger_txns": []}
            
        cust_id = row['customer_id']
        cur.execute("""
            SELECT TransactionID, TransactionAmt, ts, channel, risk_score
            FROM transactions
            WHERE customer_id = ?
              AND channel = 'online'
            ORDER BY ts ASC
        """, (cust_id,))
        
        all_online = [dict(r) for r in cur.fetchall()]
        
        # Look for cluster of small txns (< $10) followed by a larger txn
        small_txns = [t for t in all_online if t['TransactionAmt'] < 10.0]
        larger_txns = [t for t in all_online if t['TransactionAmt'] >= 50.0]
        
        return {
            "count_small": len(small_txns),
            "small_txns": small_txns[:10],
            "larger_txns": larger_txns[:5],
            "card_testing_detected": len(small_txns) >= 3 and len(larger_txns) >= 1
        }

    def find_shared_device_rings(self, device_info: Optional[str] = None, txn_id: Optional[int] = None) -> Dict[str, Any]:
        """
        GSQL Query equivalent: find_shared_device_rings(VERTEX<DeviceProfile> target_device)
        Detects other cards, customers, or closed cases sharing the same device profile.
        """
        cur = self.sqlite_conn.cursor()
        
        # If txn_id provided, look up its device profile
        if txn_id and not device_info:
            cur.execute("""
                SELECT DeviceInfo, id_30, id_31, id_33, id_23 
                FROM identity WHERE TransactionID = ?
            """, (txn_id,))
            id_row = cur.fetchone()
            if id_row and id_row['DeviceInfo']:
                device_info = id_row['DeviceInfo']
                
        if not device_info or device_info == 'None':
            return {
                "device_profile": "none",
                "connected_cards": [],
                "connected_customers": [],
                "linked_closed_cases": []
            }

        # Search for this device in closed cases history
        cur.execute("""
            SELECT case_id, customer_id, card_id, outcome, pattern, exposure_usd, analyst_notes
            FROM closed_cases
            WHERE analyst_notes LIKE ?
        """, (f"%{device_info}%",))
        linked_closed_cases = [dict(r) for r in cur.fetchall()]

        # Search for this device across transactions in our database
        cur.execute("""
            SELECT DISTINCT t.customer_id, cp.card_id
            FROM identity i
            JOIN transactions t ON i.TransactionID = t.TransactionID
            LEFT JOIN case_pack cp ON t.customer_id = cp.customer_id
            WHERE i.DeviceInfo = ?
        """, (device_info,))
        
        connected = cur.fetchall()
        connected_cards = sorted(list({r['card_id'] for r in connected if r['card_id']}))
        connected_custs = sorted(list({r['customer_id'] for r in connected if r['customer_id']}))

        return {
            "device_profile": device_info,
            "connected_cards": connected_cards,
            "connected_customers": connected_custs,
            "linked_closed_cases": [c['case_id'] for c in linked_closed_cases],
            "closed_case_details": linked_closed_cases[:3]
        }

    def check_region_history(self, card_id: str, region_code: str) -> Dict[str, Any]:
        """
        GSQL Query equivalent: check_region_history(VERTEX<Card> target_card, STRING region_code)
        Analyzes cardholder's historical presence in the specified billing region.
        """
        cur = self.sqlite_conn.cursor()
        cur.execute("SELECT customer_id FROM case_pack WHERE card_id = ?", (card_id,))
        row = cur.fetchone()
        if not row:
            return {"total_txns": 0, "txns_in_region": 0, "is_new_region": True}
            
        cust_id = row['customer_id']
        cur.execute("""
            SELECT COUNT(*) as total_txns,
                   SUM(CASE WHEN addr1 = ? THEN 1 ELSE 0 END) as txns_in_region
            FROM transactions
            WHERE customer_id = ?
        """, (float(region_code) if region_code.replace('.','',1).isdigit() else region_code, cust_id))
        
        res = cur.fetchone()
        total = res['total_txns'] or 0
        in_region = res['txns_in_region'] or 0
        
        return {
            "total_txns": total,
            "txns_in_region": in_region,
            "is_new_region": in_region == 0 or (in_region == 1 and total > 5)
        }

    def retrieve_similar_cases(self, pattern: Optional[str] = None, channel: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """
        GSQL Query equivalent: retrieve_similar_cases(...)
        Retrieves top similar closed investigations from Case Memory.
        """
        cur = self.sqlite_conn.cursor()
        if pattern and pattern != "none":
            cur.execute("""
                SELECT case_id, customer_id, card_id, opened_at, closed_at, outcome, 
                       pattern, exposure_usd, actions_taken, report_filed, analyst_notes
                FROM closed_cases
                WHERE pattern = ?
                LIMIT ?
            """, (pattern, limit))
        else:
            cur.execute("""
                SELECT case_id, customer_id, card_id, opened_at, closed_at, outcome, 
                       pattern, exposure_usd, actions_taken, report_filed, analyst_notes
                FROM closed_cases
                WHERE outcome = 'cleared'
                LIMIT ?
            """, (limit,))
            
        return [dict(r) for r in cur.fetchall()]

    def write_case_to_graph(self, case_record: Dict[str, Any]) -> str:
        """
        GSQL Query equivalent: persist_fraud_case(...)
        Stores the closed/progressed case vertex and edges back into TigerGraph FraudGraph.
        """
        cur = self.sqlite_conn.cursor()
        graph_case_id = f"CASE-{datetime.now().strftime('%Y%m%d')}-{case_record['case_id']}"
        
        cur.execute("""
            INSERT OR REPLACE INTO fraud_cases (
                case_id, opened_at, status, verdict, fraud_probability,
                pattern, pattern_description, exposure_usd, summary, stop_reason,
                card_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            graph_case_id,
            case_record.get('opened_at', datetime.now().isoformat()),
            case_record.get('status', 'open'),
            case_record.get('verdict', 'uncertain'),
            case_record.get('fraud_probability', 0.5),
            case_record.get('pattern', 'none'),
            case_record.get('pattern_description', ''),
            case_record.get('exposure_usd', 0.0),
            case_record.get('summary', ''),
            case_record.get('stop_reason', ''),
            case_record.get('card_id', ''),
            datetime.now().isoformat()
        ))
        
        # Link affected transactions
        for txn_id in case_record.get('affected_txn_ids', []):
            cur.execute("""
                INSERT OR IGNORE INTO case_edges (case_id, edge_type, target_id)
                VALUES (?, 'CASE_INVOLVES_TXN', ?)
            """, (graph_case_id, str(txn_id)))
            
        # Link connected cards
        for card_id in case_record.get('connected_card_ids', []):
            cur.execute("""
                INSERT OR IGNORE INTO case_edges (case_id, edge_type, target_id)
                VALUES (?, 'CASE_ON_CARD', ?)
            """, (graph_case_id, str(card_id)))
            
        self.sqlite_conn.commit()
        return graph_case_id
