from datetime import datetime
from typing import Dict, List, Any, Optional
from tigergraph.tg_store import TigerGraphStore

class TigerGraphMCP:
    """
    TigerGraph MCP Tool Interface for Agentic Fraud Investigation.
    Every call produces an auditable, structured telemetry record:
      - tool
      - arguments
      - result_summary
      - timestamp
      - case_id
    """
    def __init__(self, store: Optional[TigerGraphStore] = None):
        self.store = store or TigerGraphStore()
        self.call_audit_log: List[Dict[str, Any]] = []

    def _log_call(self, tool: str, arguments: Dict[str, Any], result_summary: str, case_id: str):
        record = {
            "tool": tool,
            "arguments": arguments,
            "result_summary": result_summary,
            "timestamp": datetime.now().isoformat(),
            "case_id": case_id
        }
        self.call_audit_log.append(record)

    def get_case_audit_logs(self, case_id: str) -> List[Dict[str, Any]]:
        return [log for log in self.call_audit_log if log["case_id"] == case_id]

    def tg_get_card_history(self, card_id: str, case_id: str, limit: int = 50, target_txn_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        MCP Tool: Retrieve transaction history and baseline parameters for a card.
        """
        txns = self.store.get_card_history(card_id, limit=limit, target_txn_id=target_txn_id)
        summary = f"Retrieved {len(txns)} transactions for card {card_id}"
        self._log_call("tg_get_card_history", {"card_id": card_id, "limit": limit, "target_txn_id": target_txn_id}, summary, case_id)
        return txns

    def tg_detect_card_testing(self, card_id: str, ref_ts: str, case_id: str, window_minutes: int = 60) -> Dict[str, Any]:
        """
        MCP Tool: Detect rapid small authorizations followed by larger purchase.
        """
        res = self.store.detect_card_testing(card_id, ref_ts, window_minutes)
        summary = f"Found {res['count_small']} small txns. Testing detected: {res['card_testing_detected']}"
        self._log_call("tg_detect_card_testing", {"card_id": card_id, "ref_ts": ref_ts, "window_minutes": window_minutes}, summary, case_id)
        return res

    def tg_find_shared_device_rings(self, device_info: Optional[str], case_id: str, txn_id: Optional[int] = None) -> Dict[str, Any]:
        """
        MCP Tool: Detect other cards, accounts, or closed cases sharing this device profile.
        """
        res = self.store.find_shared_device_rings(device_info=device_info, txn_id=txn_id)
        summary = f"Device '{res.get('device_profile')}': {len(res['connected_cards'])} connected cards, {len(res['linked_closed_cases'])} linked cases"
        self._log_call("tg_find_shared_device_rings", {"device_info": device_info, "txn_id": txn_id}, summary, case_id)
        return res

    def tg_check_region_history(self, card_id: str, region_code: str, case_id: str) -> Dict[str, Any]:
        """
        MCP Tool: Analyze cardholder presence in target billing region.
        """
        res = self.store.check_region_history(card_id, region_code)
        summary = f"Region {region_code}: {res['txns_in_region']}/{res['total_txns']} txns. Is new: {res['is_new_region']}"
        self._log_call("tg_check_region_history", {"card_id": card_id, "region_code": region_code}, summary, case_id)
        return res

    def tg_retrieve_similar_cases(self, pattern: Optional[str], channel: Optional[str], case_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        MCP Tool: Retrieve similar closed cases from Case Memory.
        """
        cases = self.store.retrieve_similar_cases(pattern=pattern, channel=channel, limit=limit)
        summary = f"Retrieved {len(cases)} prior cases for pattern '{pattern}'"
        self._log_call("tg_retrieve_similar_cases", {"pattern": pattern, "channel": channel, "limit": limit}, summary, case_id)
        return cases

    def tg_write_case_to_graph(self, case_record: Dict[str, Any], case_id: str) -> str:
        """
        MCP Tool: Write completed investigation case into TigerGraph FraudGraph.
        """
        graph_case_id = self.store.write_case_to_graph(case_record)
        summary = f"Persisted case {case_id} to TigerGraph as {graph_case_id}"
        self._log_call("tg_write_case_to_graph", {"case_record_keys": list(case_record.keys())}, summary, case_id)
        return graph_case_id
