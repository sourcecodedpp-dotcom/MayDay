import pandas as pd
import sqlite3
import time

start_time = time.time()
print("Extracting relevant data for 20 cases into SQLite db for fast indexing...")

case_pack = pd.read_csv('data/case_pack.csv')
target_custs = set(case_pack['customer_id'].dropna())
target_cards = set(case_pack['card_id'].dropna())
target_txns = set(case_pack['flagged_txn_id'].dropna().astype(int))

print(f"Target customers ({len(target_custs)}): {sorted(list(target_custs))}")
print(f"Target txns ({len(target_txns)}): {sorted(list(target_txns))}")

conn = sqlite3.connect('data/investigation.db')

# Extract transactions for target customers + any flagged txns
matched_txns = []
all_txn_ids_seen = set()

# Process transactions in chunks
print("Streaming transactions.csv...")
chunk_count = 0
for chunk in pd.read_csv('data/transactions.csv', chunksize=100000):
    chunk_count += 1
    m = chunk[(chunk['customer_id'].isin(target_custs)) | (chunk['TransactionID'].isin(target_txns))]
    if not m.empty:
        matched_txns.append(m)
        all_txn_ids_seen.update(m['TransactionID'].tolist())
    if chunk_count % 2 == 0:
        print(f"Processed {chunk_count * 100000} rows...")

df_txns = pd.concat(matched_txns)
print(f"Total transactions found for target customers: {len(df_txns)}")
df_txns.to_sql('transactions', conn, if_exists='replace', index=False)

# Now read identity.csv and match on all_txn_ids_seen
print("Streaming identity.csv...")
matched_identities = []
for chunk in pd.read_csv('data/identity.csv', chunksize=50000):
    m = chunk[chunk['TransactionID'].isin(all_txn_ids_seen)]
    if not m.empty:
        matched_identities.append(m)

if matched_identities:
    df_id = pd.concat(matched_identities)
    print(f"Total identity records found: {len(df_id)}")
    df_id.to_sql('identity', conn, if_exists='replace', index=False)
else:
    print("No identity records matched directly.")

# Also store case_pack and closed_cases in sqlite
case_pack.to_sql('case_pack', conn, if_exists='replace', index=False)
closed_cases = pd.read_csv('data/closed_cases_history.csv')
closed_cases.to_sql('closed_cases', conn, if_exists='replace', index=False)

# Create indices
print("Creating indices...")
cur = conn.cursor()
cur.execute("CREATE INDEX idx_txn_id ON transactions(TransactionID)")
cur.execute("CREATE INDEX idx_txn_cust ON transactions(customer_id)")
cur.execute("CREATE INDEX idx_txn_ts ON transactions(ts)")
cur.execute("CREATE INDEX idx_id_txnid ON identity(TransactionID)")
conn.commit()
conn.close()

print(f"Done in {time.time() - start_time:.2f} seconds!")
