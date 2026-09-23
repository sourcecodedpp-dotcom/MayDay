import pandas as pd

# Let's inspect C01119's transactions
txns = []
for chunk in pd.read_csv('data/transactions.csv', chunksize=100000):
    matched = chunk[chunk['customer_id'] == 'C01119']
    if not matched.empty:
        txns.append(matched)

df = pd.concat(txns)
print(f"C01119 has {len(df)} transactions")
print("Unique card1 values for C01119:", df['card1'].unique())
print("Card details grouping:")
print(df.groupby(['card1', 'card2', 'card3', 'card4', 'card6']).size())

# Now check CC cases for C01119 and see which txn_ids belong to which card1
closed = pd.read_csv('data/closed_cases_history.csv')
c_cases = closed[closed['customer_id'] == 'C01119']
for idx, r in c_cases.head(5).iterrows():
    txn_id = int(str(r['txn_ids']).split('|')[0])
    txn_row = df[df['TransactionID'] == txn_id]
    if not txn_row.empty:
        print(f"Case {r['case_id']}, card_id: {r['card_id']}, txn: {txn_id} -> card1: {txn_row['card1'].values[0]}")
