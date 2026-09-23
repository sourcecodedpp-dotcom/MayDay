import json
import os
import glob
from typing import Dict, Any, List

VALID_PATTERNS = {
    "card_testing",
    "card_not_present_fraud",
    "card_not_present_new_device",
    "out_of_region_use",
    "account_takeover",
    "undocumented",
    "none"
}

VALID_STATUSES = {"open", "closed_fraud", "closed_legitimate", "escalated"}
VALID_VERDICTS = {"fraud", "legitimate", "uncertain"}
VALID_SOURCES = {"graph", "document", "customer", "external"}
VALID_ROUTES = {"auto", "L1", "L2"}
VALID_EVIDENCE_TYPES = {"customer_validation", "step_up_auth", "analyst_info"}

def validate_case_json(data: Dict[str, Any], filepath: str) -> List[str]:
    errors = []
    
    # Top level checks
    top_keys = ["case_id", "case", "evidence_requests", "next_best_actions", "sar", "stop_reason", "tool_calls", "tokens", "latency_s"]
    for k in top_keys:
        if k not in data:
            errors.append(f"Missing top-level key: {k}")

    if errors:
        return errors

    # Check case
    c = data["case"]
    if c.get("status") not in VALID_STATUSES:
        errors.append(f"Invalid status: {c.get('status')}")
    if c.get("verdict") not in VALID_VERDICTS:
        errors.append(f"Invalid verdict: {c.get('verdict')}")
    if not (0.0 <= c.get("fraud_probability", -1) <= 1.0):
        errors.append(f"Invalid fraud_probability: {c.get('fraud_probability')}")
    if c.get("pattern") not in VALID_PATTERNS:
        errors.append(f"Invalid pattern: {c.get('pattern')}")
    if c.get("pattern") == "undocumented" and not c.get("pattern_description"):
        errors.append("pattern is 'undocumented' but pattern_description is empty")

    if c.get("verdict") == "legitimate":
        if len(c.get("affected_txn_ids", [])) > 0:
            errors.append("verdict is 'legitimate' but affected_txn_ids is not empty")
        if c.get("exposure_usd") != 0.0:
            errors.append("verdict is 'legitimate' but exposure_usd != 0.0")
        if data["sar"].get("file") is not False:
            errors.append("verdict is 'legitimate' but sar.file is not False")

    # Check evidence items
    for i, ev in enumerate(c.get("evidence", [])):
        if "claim" not in ev or "source" not in ev or "ref" not in ev or "entity_ids" not in ev:
            errors.append(f"Evidence item {i} missing required keys")
        if ev.get("source") not in VALID_SOURCES:
            errors.append(f"Evidence item {i} invalid source: {ev.get('source')}")

    # Check next best actions
    nba = data["next_best_actions"]
    if "initial" not in nba or "final" not in nba or "what_changed" not in nba:
        errors.append("next_best_actions missing required keys")
    else:
        for a in nba["initial"] + nba["final"]:
            if a.get("route") not in VALID_ROUTES:
                errors.append(f"Invalid approval route: {a.get('route')}")

    # Check SAR consistency
    sar = data["sar"]
    final_has_file_report = any(a.get("action") == "FILE_REPORT" for a in nba.get("final", []))
    if sar.get("file") != final_has_file_report:
        errors.append(f"sar.file ({sar.get('file')}) does not agree with FILE_REPORT in final actions ({final_has_file_report})")

    if sar.get("file") is True:
        if not sar.get("narrative"):
            errors.append("sar.file is true but narrative is empty")
        if not sar.get("subjects"):
            errors.append("sar.file is true but subjects list is empty")
        if sar.get("total_amount_usd", 0) <= 0:
            errors.append("sar.file is true but total_amount_usd <= 0")
        if len(sar.get("activity_dates", [])) != 2:
            errors.append("sar.file is true but activity_dates does not have 2 items [start, end]")
    else:
        if sar.get("narrative") != "":
            errors.append("sar.file is false but narrative is not empty string")
        if len(sar.get("subjects", [])) > 0:
            errors.append("sar.file is false but subjects is not empty")
        if sar.get("total_amount_usd") != 0.0:
            errors.append("sar.file is false but total_amount_usd != 0.0")
        if len(sar.get("activity_dates", [])) > 0:
            errors.append("sar.file is false but activity_dates is not empty")

    return errors

if __name__ == "__main__":
    files = sorted(glob.glob("cases/*.json"))
    print(f"Validating {len(files)} answer files...")
    all_passed = True
    for fpath in files:
        with open(fpath, "r") as f:
            data = json.load(f)
        errs = validate_case_json(data, fpath)
        if errs:
            all_passed = False
            print(f"[FAIL] {os.path.basename(fpath)}:")
            for e in errs:
                print(f"   - {e}")
        else:
            print(f"[PASS] {os.path.basename(fpath)}")

    if all_passed and files:
        print("\nALL FILES FULLY COMPLIANT WITH THE OFFICIAL HACKATHON EVALUATOR SCHEMA!")
