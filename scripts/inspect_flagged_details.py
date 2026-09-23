import sqlite3
import pandas as pd

conn = sqlite3.connect('data/investigation.db')

cases = pd.read_sql_query("SELECT * FROM case_pack", conn)

print(f"{'Case':<8} | {'Flagged Txn':<11} | {'Cust':<7} | {'Amt':<8} | {'Risk':<5} | {'Channel':<9} | {'Region':<6} | {'Device':<25}")
print("-" * 90)

for idx, c in cases.iterrows():
    txn_id = int(c['flagged_txn_id'])
    txn = pd.read_sql_query(f"SELECT TransactionAmt, risk_score, channel, addr1, addr2, P_emaildomain FROM transactions WHERE TransactionID = {txn_id}", conn)
    ident = pd.read_sql_query(f"SELECT DeviceType, DeviceInfo, id_30, id_31, id_33, id_15, id_23 FROM identity WHERE TransactionID = {txn_id}", conn)
    
    amt = txn['TransactionAmt'].iloc[0] if not txn.empty else 'N/A'
    risk = txn['risk_score'].iloc[0] if not txn.empty else 'N/A'
    chan = txn['channel'].iloc[0] if not txn.empty else 'N/A'
    addr = str(txn['addr1'].iloc[0]) if not txn.empty else 'N/A'
    
    if not ident.empty:
        dev_info = f"{ident['DeviceInfo'].iloc[0]} / {ident['id_30'].iloc[0]} / {ident['id_31'].iloc[0]}"
    else:
        dev_info = "None (in_person / no id)"
        
    print(f"{c['case_id']:<8} | {txn_id:<11} | {c['customer_id']:<7} | {amt:<8} | {risk:<5} | {chan:<9} | {addr:<6} | {dev_info[:35]}")

conn.close()
