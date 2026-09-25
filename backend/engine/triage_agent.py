import os
import re
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import requests

class TriageAgent:
    def __init__(self):
        self.project = 'persuasive-axe-506219-h9'
        self.location = 'global'
        self.model = 'gemini-3.8-flash'
        self.client = None
        
        try:
            from google import genai
            self.client = genai.Client(
                vertexai=True,
                project=self.project,
                location=self.location
            )
        except Exception as e:
            print(f"[TriageAgent] Vertex AI client initialization warning: {e}")

    def get_case_data(self, case_id: str) -> Dict[str, Any]:
        clean_id = case_id.strip().upper()
        if clean_id.isdigit():
            clean_id = f"HHG-{clean_id.zfill(3)}"
            
        try:
            resp = requests.get(f"http://localhost:8000/api/cases/{clean_id}", timeout=5)
            if resp.status_code == 200:
                return resp.json()
            return {"error": f"Case {clean_id} not found."}
        except Exception as e:
            return {"error": f"Graph engine unreachable: {e}"}

    def process_chat(self, user_prompt: str) -> Dict[str, Any]:
        print(f"[TriageAgent] Received prompt: {user_prompt}")
        
        match = re.search(r'HHG-\d{3}', user_prompt.upper())
        detected_case_id = match.group(0) if match else None

        if self.client:
            sys_prompt = """
You are the cyber-forensics Triage Agent. You MUST return your response as a valid json-render JSON spec.
The UI uses a generative UI framework. Do NOT return text. Return ONLY a JSON object representing the UI spec.

Available Catalog Components:
1. Container: { type: "Container", props: { direction: "row" | "col", gap: number, padding: number }, children: string[] }
2. FraudMetric: { type: "FraudMetric", props: { label: string, value: string, alert: boolean } }
3. DossierCard: { type: "DossierCard", props: { title: string }, children: string[] }
4. Verdict: { type: "Verdict", props: { status: "fraud" | "cleared" | "investigating", reason: string } }
5. Text: { type: "Text", props: { content: string, style: "normal" | "bold" | "muted" } }

A spec MUST have this exact shape:
{
  "root": "id1",
  "elements": {
    "id1": { "type": "Container", "props": { "direction": "col" }, "children": ["id2"] },
    "id2": { "type": "Text", "props": { "content": "..." } }
  }
}
Generate a rich, beautiful dossier UI based on the user's request. Create unique IDs for elements.
"""
            # Inject context
            context = ""
            if detected_case_id:
                case_data = self.get_case_data(detected_case_id)
                context = f"\n\nContext for {detected_case_id}:\n{json.dumps(case_data)}"

            chat = self.client.chats.create(
                model=self.model,
                config={
                    "system_instruction": sys_prompt,
                    "temperature": 0.2,
                    "response_mime_type": "application/json"
                }
            )
            resp = chat.send_message(user_prompt + context)
            try:
                ui_spec = json.loads(resp.text)
                return {
                    "reply": "Generated UI",
                    "case_id": detected_case_id,
                    "model_used": "Gemini 3.8 Flash (Vertex AI)",
                    "ui_spec": ui_spec,
                    "quick_actions": ["Simulate Dispute", "Scan Shared Device Rings"]
                }
            except Exception as e:
                print("Failed to parse JSON UI spec:", e)

        # Fallback hardcoded spec
        fallback_spec = {
            "root": "root",
            "elements": {
                "root": {
                    "type": "Container",
                    "props": { "direction": "col", "gap": 4, "padding": 4 },
                    "children": ["title", "card1"]
                },
                "title": {
                    "type": "Text",
                    "props": { "content": "Generative UI (Fallback)", "style": "bold" }
                },
                "card1": {
                    "type": "DossierCard",
                    "props": { "title": "System Status" },
                    "children": ["v1"]
                },
                "v1": {
                    "type": "Verdict",
                    "props": { "status": "investigating", "reason": "Connecting to LLM..." }
                }
            }
        }

        return {
            "reply": "Fallback Generative UI",
            "case_id": detected_case_id,
            "model_used": "Fallback Engine",
            "ui_spec": fallback_spec,
            "quick_actions": ["Retry"]
        }
