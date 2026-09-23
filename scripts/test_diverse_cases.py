import json
import sqlite3
import pandas as pd
from engine.investigator import FraudInvestigatorAgent
from scripts.validate_answers import validate_case_json

conn = sqlite3.connect('data/investigation.db')
cases_df = pd.read_sql_query("SELECT * FROM case_pack WHERE case_id IN ('HHG-006', 'HHG-014')", conn)
conn.close()

agent = FraudInvestigatorAgent()

for idx, row in cases_df.iterrows():
    case_meta = row.to_dict()
    cid = case_meta['case_id']
    print(f"\n==================== RUNNING {cid} ====================")
    print(f"Trigger: {case_meta['trigger_type']} | Text: {case_meta.get('trigger_text')}")
    
    result = agent.investigate_case(case_meta)
    
    # Save output
    out_path = f"cases/{cid}.json"
    with open(out_path, 'w') as f:
        json.dump(result, f, indent=2)
        
    errs = validate_case_json(result, out_path)
    if errs:
        print(f"[FAIL] {cid} validation errors:", errs)
    else:
        print(f"[PASS] {cid} validated successfully!")
        print(f"Verdict: {result['case']['verdict']} | Pattern: {result['case']['pattern']}")
        print(f"Exposure: ${result['case']['exposure_usd']} | SAR Filed: {result['sar']['file']}")
        print(f"Initial Actions: {[a['action'] for a in result['next_best_actions']['initial']]}")
        print(f"Final Actions:   {[a['action'] for a in result['next_best_actions']['final']]}")
        print(f"What Changed:    {result['next_best_actions']['what_changed']}")
        if result['sar']['file']:
            print(f"\nSAR Narrative ({len(result['sar']['narrative'].split())} words):")
            print(result['sar']['narrative'])
