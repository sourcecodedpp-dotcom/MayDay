from typing import Dict, List, Any, Optional

class SARGenerator:
    """
    Suspicious Activity Report (SAR) Generator.
    Operates strictly under Section 3a of the Fraud Policy.
    Generates a regulatory SAR only when FILE_REPORT is required by policy:
      - Exposure exceeds $1,000 USD
      - Activity connects to shared device profile or multi-card ring (R6)
      - Coordinated or undocumented pattern (R9)
    """

    @classmethod
    def generate_sar(
        cls,
        file_report: bool,
        case_id: str,
        customer_id: str,
        card_id: str,
        verdict: str,
        pattern: str,
        pattern_description: str,
        affected_txns: List[Dict[str, Any]],
        exposure_usd: float,
        connected_cards: List[str],
        connected_devices: List[str],
        activity_dates: List[str],
        reason_rule: str,
        evidence_summary: str
    ) -> Dict[str, Any]:
        """
        Builds the SAR object adhering to the exact dataset schema.
        """
        if not file_report:
            return {
                "file": False,
                "reason": f"Policy Section 3a: Case does not meet SAR filing criteria (exposure ${exposure_usd:.2f} <= $1000 and no cross-card syndicate link).",
                "narrative": "",
                "subjects": [],
                "total_amount_usd": 0.0,
                "activity_dates": []
            }

        # Collect all subject identifiers
        subjects = [customer_id, card_id]
        for c in connected_cards:
            if c not in subjects:
                subjects.append(c)
        for d in connected_devices:
            if d and d not in subjects and d != 'none':
                subjects.append(d)

        first_date = activity_dates[0] if activity_dates else "2016-11-01"
        last_date = activity_dates[-1] if activity_dates else first_date

        # Construct comprehensive 6-12 sentence regulatory narrative
        narrative_lines = [
            f"This Suspicious Activity Report documents confirmed fraudulent activity investigated under case {case_id}.",
            f"The primary subject of this investigation is customer {customer_id}, holding card account {card_id}.",
            f"Between {first_date} and {last_date}, the subject card account incurred unauthorized transactions totaling ${exposure_usd:.2f} USD.",
            f"Investigation by the fraud unit confirmed unauthorized use consistent with {pattern.replace('_', ' ')}.",
        ]

        if connected_devices and connected_devices[0] != 'none':
            narrative_lines.append(f"Forensic device analysis revealed that online authorizations originated from device profile '{connected_devices[0]}'.")
            
        if connected_cards:
            narrative_lines.append(f"Cross-graph analysis detected that this infrastructure is shared across multiple cardholder accounts, specifically: {', '.join(connected_cards)}.")
            narrative_lines.append("The coordination of activity across distinct cardholder identities indicates an organized card fraud ring.")

        if pattern_description:
            narrative_lines.append(f"Typology analysis: {pattern_description}")

        narrative_lines.append(f"Customer and cardholder communications established that transactions were unrecognized and unauthorized by the legitimate account holder.")
        narrative_lines.append(f"Evidence synthesis: {evidence_summary}.")
        narrative_lines.append(f"Total exposure in this fraudulent episode is confirmed at ${exposure_usd:.2f} USD.")
        narrative_lines.append(f"In accordance with bank fraud policy {reason_rule} and regulatory filing guidelines, card {card_id} has been blocked and reissued, connected accounts placed under heightened monitoring, and this suspicious activity report filed.")

        full_narrative = " ".join(narrative_lines)

        return {
            "file": True,
            "reason": reason_rule,
            "narrative": full_narrative,
            "subjects": subjects,
            "total_amount_usd": round(exposure_usd, 2),
            "activity_dates": [first_date, last_date]
        }
