import pandas as pd
closed_cases = pd.read_csv('data/closed_cases_history.csv')
undoc = closed_cases[closed_cases['pattern'] == 'undocumented']
print("Undocumented cases:")
for idx, row in undoc.iterrows():
    print(f"\n--- {row['case_id']} (Customer: {row['customer_id']}, Card: {row['card_id']}) ---")
    print(f"Opened: {row['opened_at']}, Exposure: ${row['exposure_usd']}, Actions: {row['actions_taken']}, Report: {row['report_filed']}")
    print(f"Notes: {row['analyst_notes']}")
