import pandas as pd
import numpy as np

# Load case pack
case_pack = pd.read_csv('data/case_pack.csv')
target_cards = set(case_pack['card_id'].dropna())
target_txns = set(case_pack['flagged_txn_id'].dropna().astype(int))

print(f"Loading transactions for {len(target_cards)} cards and {len(target_txns)} flagged txns...")

# We can read in chunks to find all transactions for target cards + flagged txns
chunks = []
chunksize = 100000
cols = ['TransactionID', 'TransactionDT', 'TransactionAmt', 'ProductCD', 'card1', 'card2', 'card3', 'card4', 'card5', 'card6',
        'addr1', 'addr2', 'P_emaildomain', 'R_emaildomain', 'customer_id', 'ts', 'channel', 'risk_score']

# Read first chunk to see columns
df_first = pd.read_csv('data/transactions.csv', nrows=5)
print("Available added columns:", [c for c in ['customer_id', 'ts', 'channel', 'risk_score'] if c in df_first.columns])

# Let's inspect how card_id relates to card1..card6 or customer_id
print(df_first[['TransactionID', 'TransactionAmt', 'ProductCD', 'card1', 'card4', 'card6', 'customer_id', 'ts', 'channel', 'risk_score']])
