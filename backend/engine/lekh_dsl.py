"""
Lekh DSL v1 — Unified Agentic Fraud Specification Language
Syntax: [BlockType key=val key=val]  (no braces, no semicolons)
"""

from typing import Dict, Any, List, Optional
from datetime import datetime


class LekhDSL:

    @staticmethod
    def context(session_id: str, focus_case: Optional[str] = None) -> str:
        focus = focus_case or "NONE"
        return f'[CONTEXT session={session_id} model=gemini-3.8-flash cache=ENABLED focus={focus} ts={datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")}]'

    @staticmethod
    def case(dossier: Dict[str, Any]) -> str:
        c = dossier.get("case", {})
        case_id = dossier.get("case_id", "UNKNOWN")
        card = (c.get("connected_card_ids") or ["N/A"])[0]
        subject = (dossier.get("sar", {}).get("subjects") or ["N/A"])[0]
        target = (c.get("affected_txn_ids") or ["N/A"])[0]
        return (
            f'[CASE {case_id} '
            f'verdict={c.get("verdict","investigating")} '
            f'risk={c.get("fraud_probability", 0.0)} '
            f'exposure={c.get("exposure_usd", 0.0)} '
            f'pattern={c.get("pattern","unknown")} '
            f'card={card} '
            f'subject={subject} '
            f'txn={target}]'
        )

    @staticmethod
    def topology(dossier: Dict[str, Any]) -> List[str]:
        c = dossier.get("case", {})
        case_id = dossier.get("case_id", "UNKNOWN")
        lines = []
        
        # Check if explicit graph object exists
        graph = dossier.get("graph")
        if graph and graph.get("nodes"):
            for node in graph.get("nodes", []):
                lines.append(f'[NODE {node.get("type","entity").upper()} id={node.get("id")} label="{node.get("label","")}"]')
            for edge in graph.get("edges", []):
                lines.append(f'[EDGE {edge.get("source")} -> {edge.get("target")} label={edge.get("label","CONNECTS")}]')
            return lines

        # Otherwise synthesize directly from case dossier
        for card in c.get("connected_card_ids", []):
            lines.append(f'[NODE CARD id={card} label="Card"]')
            lines.append(f'[EDGE {case_id} -> {card} label=INVOLVES_CARD]')
        for dev in c.get("connected_device_profiles", []):
            dev_short = dev.split("|")[0].strip() if "|" in dev else dev[:25]
            lines.append(f'[NODE DEVICE id="{dev_short}" label="DeviceProfile"]')
            lines.append(f'[EDGE {case_id} -> "{dev_short}" label=FROM_DEVICE]')
        for txn in c.get("affected_txn_ids", [])[:5]:
            lines.append(f'[NODE TXN id={txn} label="Transaction"]')
            lines.append(f'[EDGE {case_id} -> {txn} label=AFFECTS_TXN]')
        return lines

    @staticmethod
    def review(case_id: str, pattern: str, verdict: str) -> str:
        status = "CONFIRMED_FRAUD" if verdict == "fraud" else "CLEARED"
        rule = f"RULE_{pattern.upper().replace(' ','_')}"
        return (
            f'[REVIEW rule={rule} '
            f'trigger="velocity>=3_AND_amount<15" '
            f'correlation="subsequent_auth>=100" '
            f'action=ISOLATE_CARD_DRAFT_SAR '
            f'status={status}]'
        )

    @staticmethod
    def report(dossier: Dict[str, Any]) -> str:
        case_id = dossier.get("case_id", "UNKNOWN")
        c = dossier.get("case", {})
        sar = dossier.get("sar", {})
        subject = (sar.get("subjects") or ["Unknown"])[0]
        filed = "TRUE" if sar.get("file", False) else "FALSE"
        narrative = (sar.get("narrative") or c.get("summary") or "Awaiting analyst.").replace('"', "'")[:120]
        return f'[REPORT {case_id} subject={subject} verdict={c.get("verdict","investigating").upper()} sar={filed} narrative="{narrative}"]'

    @staticmethod
    def format_full_dossier(dossier: Dict[str, Any], session_id: str = "alpha-live") -> str:
        case_id = dossier.get("case_id", "UNKNOWN")
        c = dossier.get("case", {})

        lines = [
            "// Lekh DSL v1 // MayDay Fraud Intelligence",
            "",
            LekhDSL.context(session_id=session_id, focus_case=case_id),
            "",
            LekhDSL.case(dossier),
            "",
        ] + LekhDSL.topology(dossier) + [
            "",
            LekhDSL.review(case_id, c.get("pattern", "unknown"), c.get("verdict", "investigating")),
            "",
            LekhDSL.report(dossier),
        ]
        return "\n".join(lines)
