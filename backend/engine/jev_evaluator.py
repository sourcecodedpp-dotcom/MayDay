import os
import time
import requests
from typing import Dict, Any, Optional

JEV_API_URL = "https://jev-ai.pro/api/v1"

class JevAPIError(Exception):
    def __init__(self, status_code: int, message: str, retry_after: Optional[int] = None):
        self.status_code = status_code
        self.retry_after = retry_after
        super().__init__(f"Jev API Error {status_code}: {message}")

def get_jev_headers() -> Dict[str, str]:
    api_key = os.environ.get("JEV_AI_API_KEY")
    if not api_key:
        raise ValueError("JEV_AI_API_KEY environment variable is not set")
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

def evaluate_state(state: str, questions: Dict[str, Any], model: str = "jev-latest") -> Dict[str, Any]:
    """
    Evaluates a state using the Jev AI System One API.
    Does not automatically retry POST requests to avoid uncertain duplicate executions.
    """
    payload = {
        "model": model,
        "state": state,
        "questions": questions
    }
    
    try:
        response = requests.post(
            f"{JEV_API_URL}/systemone",
            headers=get_jev_headers(),
            json=payload,
            timeout=10
        )
    except requests.exceptions.RequestException as e:
        raise JevAPIError(502, f"Network error contacting Jev AI: {e}")

    if response.status_code == 200:
        return response.json()
        
    # Handle specific errors
    retry_after = response.headers.get("Retry-After")
    retry_val = int(retry_after) if retry_after and retry_after.isdigit() else None
    
    error_detail = response.text
    try:
        err_json = response.json()
        if "error" in err_json:
            error_detail = str(err_json["error"])
    except Exception:
        pass

    if response.status_code == 401:
        raise JevAPIError(401, "Unauthorized - check JEV_AI_API_KEY")
    elif response.status_code == 402:
        raise JevAPIError(402, f"Payment Required / Quota Exceeded: {error_detail}")
    elif response.status_code == 422:
        raise JevAPIError(422, f"Unprocessable Entity - invalid request payload: {error_detail}")
    elif response.status_code == 429:
        raise JevAPIError(429, f"Too Many Requests: {error_detail}", retry_after=retry_val)
    elif response.status_code in (502, 504):
        raise JevAPIError(response.status_code, f"Bad Gateway / Timeout: {error_detail}")
    else:
        response.raise_for_status()

def get_available_models() -> list:
    """Returns a list of connected Jev models."""
    response = requests.get(f"{JEV_API_URL}/models", headers=get_jev_headers(), timeout=5)
    response.raise_for_status()
    return response.json().get("models", [])
