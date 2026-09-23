import json
import sqlite3
import pandas as pd
from engine.investigator import FraudInvestigatorAgent

# Load case metadata for HHG-001
conn = sqlite3.connect('data/investigation.db')
case_df = pd.read_sql_query("SELECT * FROM case_pack WHERE case_id = 'HHG-001'", conn)
conn.close()

case_meta = case_df.iloc[0].to_dict()
print("Loaded case metadata for HHG-001:")
print(json.dumps(case_meta, indent=2))

print("\n--- Running Investigator Agent on HHG-001 ---")
agent = FraudInvestigatorAgent()
result = agent.investigate_case(case_meta)

print("\n--- Resulting Answer File (Formatted JSON) ---")
print(json.dumps(result, indent=2))

# Save to cases/HHG-001.json
with open('cases/HHG-001.json', 'w') as f:
    json.dump(result, f, indent=2)

print("\nSuccessfully saved to cases/HHG-001.json")
