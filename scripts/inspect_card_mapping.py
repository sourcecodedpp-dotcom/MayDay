import pandas as pd

closed_cases = pd.read_csv('data/closed_cases_history.csv')
sample_cases = closed_cases.head(10)
print(sample_cases[['case_id', 'customer_id', 'card_id', 'first_fraud_txn_id', 'txn_ids']])

# Let's find transaction 3000120 (from CC-0001) in transactions.csv
# and see its customer_id and card1..card6
first_txns = set(sample_cases['first_fraud_txn_id'].dropna().astype(int))

found = []
for chunk in pd.read_csv('data/transactions.csv', chunksize=100000):
    matched = chunk[chunk['TransactionID'].isin(first_txns)]
    if not matched.empty:
        found.append(matched)
    if len(found) >= len(first_txns):
        break

if found:
    df_found = pd.concat(found)
    print("\nMatched transactions from closed cases:")
    print(df_found[['TransactionID', 'customer_id', 'card1', 'card2', 'card3', 'card4', 'card6', 'TransactionAmt', 'ts']])
