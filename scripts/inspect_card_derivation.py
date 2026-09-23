import pandas as pd

closed = pd.read_csv('data/closed_cases_history.csv')
print(closed[['customer_id', 'card_id']].drop_duplicates().head(20))

# Let's inspect customers with multiple cards in closed cases
card_counts = closed.groupby('customer_id')['card_id'].nunique()
multi_card_custs = card_counts[card_counts > 1].index.tolist()
print("\nMulti-card customers in closed cases:", multi_card_custs[:10])

sample_cust = multi_card_custs[0]
print(f"\nClosed cases for {sample_cust}:")
print(closed[closed['customer_id'] == sample_cust][['case_id', 'card_id', 'opened_at', 'txn_ids']])
