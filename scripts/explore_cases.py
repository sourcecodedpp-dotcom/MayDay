import pandas as pd
import json

case_pack = pd.read_csv('data/case_pack.csv')
print("Case pack shape:", case_pack.shape)
print(case_pack[['case_id', 'opened_at', 'trigger_type', 'flagged_txn_id', 'card_id', 'customer_id', 'risk_score']])

closed_cases = pd.read_csv('data/closed_cases_history.csv')
print("\nClosed cases shape:", closed_cases.shape)
print("Closed cases outcome counts:\n", closed_cases['outcome'].value_counts())
print("\nClosed cases pattern counts:\n", closed_cases['pattern'].value_counts())

flagged_txns = set(case_pack['flagged_txn_id'].dropna().astype(int))
customers = set(case_pack['customer_id'].dropna())
cards = set(case_pack['card_id'].dropna())

print(f"\nUnique flagged txns: {len(flagged_txns)}, customers: {len(customers)}, cards: {len(cards)}")
