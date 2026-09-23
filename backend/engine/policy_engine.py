from typing import Dict, List, Any, Optional

VALID_ACTIONS = {
    "ALLOW_TRANSACTION",
    "DECLINE_TRANSACTION",
    "MONITOR_CARD",
    "MONITOR_CONNECTED_CARDS",
    "WARN_CUSTOMER",
    "VERIFY_WITH_CUSTOMER",
    "STEP_UP_AUTH",
    "BLOCK_CARD",
    "BLOCK_ALL_CARDS",
    "GENERATE_REPORT",
    "CREATE_CASE",
    "FILE_REPORT",
    "ESCALATE_TO_ANALYST",
    "CLOSE_NO_FRAUD",
}

class PolicyEngine:
    """
    Deterministic Bank Fraud Policy Engine (Version 1.0).
    Enforces rules R1 through R10 and approval routing:
      - auto: Agent may act alone
      - L1: Team lead must approve
      - L2: Fraud manager must approve
    """

    @staticmethod
    def get_approval_route(action: str, exposure_usd: float) -> str:
        """
        Determines the exact approval route under Section 2 of Fraud Policy.
        """
        if action == "DECLINE_TRANSACTION":
            return "L1"
        elif action == "BLOCK_CARD":
            return "L1" if exposure_usd <= 2500.0 else "L2"
        elif action in ("BLOCK_ALL_CARDS", "FILE_REPORT"):
            return "L2"
        else:
            return "auto"

    @classmethod
    def evaluate_initial_nba(
        cls,
        trigger_type: str,
        fraud_probability: float,
        pattern: str,
        is_single_signal: bool,
        exposure_usd: float,
        has_card_testing: bool,
        has_shared_device: bool,
        is_recurring_dispute: bool,
        is_undocumented: bool,
    ) -> List[Dict[str, str]]:
        """
        Evaluates the Next Best Actions BEFORE any requested evidence is resolved.
        """
        actions = []

        # R7: Disputed recurring charge matching customer's own history
        if is_recurring_dispute:
            actions.append({"action": "CREATE_CASE", "route": "auto", "reason": "R7: dispute on recognized recurring pattern"})
            actions.append({"action": "VERIFY_WITH_CUSTOMER", "route": "auto", "reason": "R7: confirm if customer recognizes subscription before blocking"})
            actions.append({"action": "WARN_CUSTOMER", "route": "auto", "reason": "R7: recurring charge reminder"})
            return actions

        # R5: Card testing observed
        if has_card_testing:
            actions.append({"action": "DECLINE_TRANSACTION", "route": "L1", "reason": "R5: card testing sequence observed"})
            if exposure_usd > 100.0:
                route = cls.get_approval_route("BLOCK_CARD", exposure_usd)
                actions.append({"action": "BLOCK_CARD", "route": route, "reason": f"R5: purchase over $100 ({exposure_usd:.2f}) cleared"})
            else:
                actions.append({"action": "STEP_UP_AUTH", "route": "auto", "reason": "R5: testing sequence; require step-up before larger activity"})
            actions.append({"action": "CREATE_CASE", "route": "auto", "reason": "Section 3a: card testing investigation"})
            return actions

        # Customer report trigger (customer explicitly disputed/reported)
        if trigger_type == "customer_report":
            actions.append({"action": "CREATE_CASE", "route": "auto", "reason": "Section 3a: customer reported unrecognized transaction"})
            if fraud_probability >= 0.70 or exposure_usd > 200.0:
                route = cls.get_approval_route("BLOCK_CARD", exposure_usd)
                actions.append({"action": "BLOCK_CARD", "route": route, "reason": "R2: customer reported unauthorized charge; block pending investigation"})
            else:
                actions.append({"action": "VERIFY_WITH_CUSTOMER", "route": "auto", "reason": "R1: verify customer dispute details"})
            return actions

        # R1: Single signal / weak signal (< 0.70)
        if is_single_signal or fraud_probability < 0.70:
            if fraud_probability >= 0.30:
                actions.append({"action": "CREATE_CASE", "route": "auto", "reason": "Section 3a: fraud probability reaches 0.30 threshold"})
            actions.append({"action": "VERIFY_WITH_CUSTOMER", "route": "auto", "reason": f"R1: single signal / probability {fraud_probability:.2f} < 0.70, verify before blocking"})
            actions.append({"action": "MONITOR_CARD", "route": "auto", "reason": "R1/R4: heighten monitoring while awaiting verification"})
            return actions

        # High confidence initial alert (>= 0.70 with corroborated evidence)
        route = cls.get_approval_route("BLOCK_CARD", exposure_usd)
        actions.append({"action": "BLOCK_CARD", "route": route, "reason": f"Policy R1/R2: high confidence fraud ({fraud_probability:.2f}) with corroborated evidence"})
        actions.append({"action": "CREATE_CASE", "route": "auto", "reason": "Section 3a: open internal case"})
        if has_shared_device or exposure_usd > 1000.0 or is_undocumented:
            actions.append({"action": "FILE_REPORT", "route": "L2", "reason": "Section 3a/R6: exposure > $1000 or shared ring requires regulatory SAR"})
        if has_shared_device:
            actions.append({"action": "MONITOR_CONNECTED_CARDS", "route": "auto", "reason": "R6: shared infrastructure across cards"})

        return actions

    @classmethod
    def evaluate_final_nba(
        cls,
        evidence_response: str,
        fraud_probability: float,
        exposure_usd: float,
        has_shared_device: bool,
        has_card_testing: bool,
        is_undocumented: bool,
        connected_cards: List[str],
        is_recurring_dispute: bool,
    ) -> List[Dict[str, str]]:
        """
        Evaluates the Next Best Actions AFTER evidence response is received.
        """
        actions = []
        resp_lower = evidence_response.lower()

        # R3: Customer confirmed transaction
        if "confirm" in resp_lower or "authorized" in resp_lower or "legitimate" in resp_lower:
            actions.append({"action": "CLOSE_NO_FRAUD", "route": "auto", "reason": "R3: customer confirmed transaction as legitimate"})
            return actions

        # R7: Disputed recurring charge resolved
        if is_recurring_dispute:
            actions.append({"action": "CREATE_CASE", "route": "auto", "reason": "R7: record customer dispute on recurring charge"})
            actions.append({"action": "WARN_CUSTOMER", "route": "auto", "reason": "R7: advise customer to cancel merchant subscription directly"})
            return actions

        # R4: No reply within 24 hours
        if "no reply" in resp_lower or "timeout" in resp_lower:
            actions.append({"action": "DECLINE_TRANSACTION", "route": "L1", "reason": "R4: no reply within 24h; decline pending authorization"})
            actions.append({"action": "MONITOR_CARD", "route": "auto", "reason": "R4: monitor card for 72 hours"})
            if exposure_usd > 500.0:
                actions.append({"action": "ESCALATE_TO_ANALYST", "route": "auto", "reason": "R4: exposure exceeds $500 with no customer reply"})
            return actions

        # Customer denied / step-up auth failed / confirmed unauthorized (R2, R5, R6, R9)
        block_route = cls.get_approval_route("BLOCK_CARD", exposure_usd)
        actions.append({"action": "BLOCK_CARD", "route": block_route, "reason": f"R2: unauthorized activity confirmed; exposure ${exposure_usd:.2f}"})
        actions.append({"action": "CREATE_CASE", "route": "auto", "reason": "R2/Section 3a: write internal case to graph"})

        # Check SAR filing requirements under Section 3a & R2, R6, R9
        should_file_sar = (
            exposure_usd > 1000.0
            or has_shared_device
            or is_undocumented
            or len(connected_cards) > 0
        )

        if should_file_sar:
            reason = "Section 3a: "
            if exposure_usd > 1000.0:
                reason += f"exposure ${exposure_usd:.2f} exceeds $1,000 threshold; "
            if has_shared_device or len(connected_cards) > 0:
                reason += "connected to shared device/ring across cards (R6); "
            if is_undocumented:
                reason += "coordinated undocumented pattern (R9); "
            actions.append({"action": "FILE_REPORT", "route": "L2", "reason": reason.strip("; ")})

        if has_shared_device or len(connected_cards) > 0:
            actions.append({"action": "MONITOR_CONNECTED_CARDS", "route": "auto", "reason": "R6: monitor all connected cards sharing device/syndicate infrastructure"})

        return actions
