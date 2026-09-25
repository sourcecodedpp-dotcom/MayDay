import sqlite3
import pandas as pd
from pathlib import Path
import os
import time

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = str(BASE_DIR / "data" / "investigation.db")

def ingest_csv_to_sqlite(transactions_file, identity_file=None):
    """
    Parses the raw CSV dataset and populates the investigation.db SQLite tables.
    This simulates loading raw data into TigerGraph.
    """
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    
    print("Loading transactions CSV...")
    # Load transactions (we only take a chunk to keep it fast for hackathon)
    df_tx = pd.read_csv(transactions_file, nrows=50000)
    
    # Map common column names if they vary
    if 'TransactionID' not in df_tx.columns and 'id' in df_tx.columns:
        df_tx = df_tx.rename(columns={'id': 'TransactionID', 'amount': 'TransactionAmt', 'card_id': 'card1'})
    
    if 'customer_id' not in df_tx.columns:
        # Create a mock customer ID mapping based on card1
        df_tx['customer_id'] = 'CUST-' + df_tx['card1'].astype(str)
        
    if 'ts' not in df_tx.columns:
        df_tx['ts'] = pd.Timestamp.now().isoformat()
        
    if 'channel' not in df_tx.columns:
        df_tx['channel'] = 'online'
        
    if 'risk_score' not in df_tx.columns:
        df_tx['risk_score'] = 0.5
        
    print(f"Writing {len(df_tx)} transactions to DB...")
    df_tx.to_sql('transactions', conn, if_exists='replace', index=False)
    
    if identity_file:
        print("Loading identity CSV...")
        df_id = pd.read_csv(identity_file, nrows=50000)
        print(f"Writing {len(df_id)} identities to DB...")
        df_id.to_sql('identity', conn, if_exists='replace', index=False)
    else:
        # Generate mock identity if none provided
        print("No identity CSV provided, generating mock devices...")
        identities = df_tx[['TransactionID']].copy()
        identities['DeviceInfo'] = 'MacOS | Chrome'
        identities['id_31'] = 'chrome 100.0'
        identities.to_sql('identity', conn, if_exists='replace', index=False)
        
    print("Generating dynamic case alerts (case_pack) from high-risk transactions...")
    # Find high risk or high amount transactions to flag as cases
    alerts = df_tx[(df_tx['risk_score'] > 0.8) | (df_tx['TransactionAmt'] > 500)].head(20).copy()
    
    cases_list = []
    for i, (_, row) in enumerate(alerts.iterrows(), 1):
        cases_list.append({
            'case_id': f"HHG-{str(i).zfill(3)}",
            'opened_at': row['ts'],
            'trigger_type': 'risk_score' if row['risk_score'] > 0.8 else 'high_amount',
            'trigger_text': f"Automated flag: Score {row['risk_score']} / Amt ${row['TransactionAmt']}",
            'card_id': row['card1'],
            'customer_id': row['customer_id'],
            'risk_score': row['risk_score'],
            'target_txn_id': row['TransactionID']
        })
        
    df_cases = pd.DataFrame(cases_list)
    if not df_cases.empty:
        df_cases.to_sql('case_pack', conn, if_exists='replace', index=False)
        print(f"Generated {len(df_cases)} cases in case_pack.")
        
    conn.close()
    return len(df_tx)
