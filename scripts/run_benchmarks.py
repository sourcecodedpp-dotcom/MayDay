import os
import sys
from pathlib import Path
import json
import sqlite3
import pandas as pd
import time

# Ensure project root and backend directory are in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
for p in [str(ROOT_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.engine.investigator import FraudInvestigatorAgent
except ImportError:
    from engine.investigator import FraudInvestigatorAgent

try:
    from scripts.validate_answers import validate_case_json
except ImportError:
    from validate_answers import validate_case_json

def run_all_benchmarks():
    print("=" * 80)
    print("Running 20 Benchmark Cases for TigerGraph Agentic Fraud Investigation (HHGOA 2026)")
    print("=" * 80)
    
    conn = sqlite3.connect('data/investigation.db')
    cases_df = pd.read_sql_query("SELECT * FROM case_pack ORDER BY case_id ASC", conn)
    conn.close()

    os.makedirs("cases", exist_ok=True)
    agent = FraudInvestigatorAgent()
    
    results_summary = []
    all_passed = True
    total_start = time.time()

    for idx, row in cases_df.iterrows():
        case_meta = row.to_dict()
        cid = case_meta['case_id']
        
        # Execute investigation
        res = agent.investigate_case(case_meta)
        
        # Save output JSON
        out_path = f"cases/{cid}.json"
        with open(out_path, 'w') as f:
            json.dump(res, f, indent=2)
            
        # Validate against official evaluator rules
        errs = validate_case_json(res, out_path)
        status_flag = "[PASS]" if not errs else "[FAIL]"
        if errs:
            all_passed = False
            print(f"{status_flag} {cid}: {errs}")
        
        c = res["case"]
        nba = res["next_best_actions"]
        init_acts = ",".join([a["action"] for a in nba["initial"]][:2])
        final_acts = ",".join([a["action"] for a in nba["final"]][:2])
        
        results_summary.append({
            "case_id": cid,
            "trigger": case_meta["trigger_type"],
            "verdict": c["verdict"],
            "pattern": c["pattern"],
            "exposure": f"${c['exposure_usd']:.2f}",
            "initial_nba": init_acts,
            "final_nba": final_acts,
            "sar": "YES" if res["sar"]["file"] else "NO",
            "tools": res["tool_calls"],
            "valid": status_flag
        })

    total_elapsed = round(time.time() - total_start, 2)
    
    df_summary = pd.DataFrame(results_summary)
    print("\n" + df_summary.to_string(index=False))
    print("=" * 80)
    print(f"Completed all 20 cases in {total_elapsed}s. All schema validations passed: {all_passed}")
    print("All answer files written to cases/*.json and ready for hackathon submission!")
    print("=" * 80)

if __name__ == "__main__":
    run_all_benchmarks()
