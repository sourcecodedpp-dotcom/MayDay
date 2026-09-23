import pandas as pd
df_first = pd.read_csv('data/transactions.csv', nrows=1)
print("Total columns in transactions.csv:", len(df_first.columns))
print("Columns with 'card':", [c for c in df_first.columns if 'card' in c.lower()])
print("Columns with 'id' or 'cust':", [c for c in df_first.columns if any(k in c.lower() for k in ['id', 'cust'])])
print("First row values for card columns:")
for c in [c for c in df_first.columns if 'card' in c.lower() or 'cust' in c.lower()]:
    print(f"  {c}: {df_first[c].iloc[0]}")
