"""
Supabase REST helpers using httpx directly.
No supabase-py — avoids the Realtime WebSocket hang on init.
"""
import os
import httpx
from dotenv import load_dotenv

load_dotenv()


def _base() -> str:
    return f"{os.getenv('SUPABASE_URL')}/rest/v1"


def _headers() -> dict:
    key = os.getenv("SUPABASE_SERVICE_KEY")
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def rest_get(table: str, params: dict) -> list:
    """
    GET rows from a Supabase table.
    params follow PostgREST filter syntax, e.g.:
      {"name": "ilike.*Saidapet*", "select": "id,name,party"}
    """
    r = httpx.get(
        f"{_base()}/{table}",
        params=params,
        headers=_headers(),
        timeout=10.0,
    )
    r.raise_for_status()
    return r.json()


def rest_post(table: str, payload: dict) -> dict:
    """INSERT a single row into a Supabase table."""
    r = httpx.post(
        f"{_base()}/{table}",
        json=payload,
        headers=_headers(),
        timeout=10.0,
    )
    r.raise_for_status()
    result = r.json()
    return result[0] if isinstance(result, list) else result


def save_messages(messages: list) -> None:
    """
    Bulk-insert agent messages into agent_messages table.
    Silently ignores errors so a DB blip never crashes the graph.
    """
    if not messages:
        return
    try:
        rows = [
            {
                "session_id": m.get("session_id", ""),
                "agent_name": m.get("agent", ""),
                "message_text": m.get("text", ""),
                "message_type": m.get("type", "info"),
            }
            for m in messages
        ]
        httpx.post(
            f"{_base()}/agent_messages",
            json=rows,
            headers=_headers(),
            timeout=10.0,
        )
    except Exception:
        pass
