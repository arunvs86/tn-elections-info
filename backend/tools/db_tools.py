"""
db_tools.py — Supabase database utility functions.

WHAT THIS FILE DOES:
    Helper functions that agents use to read/write Supabase.
    Most importantly: save_agent_message() which is called by every
    agent to push live messages to Supabase Realtime → browser.

WHY THIS WAY:
    We centralise DB logic here so agents don't repeat connection code.
    Also, save_agent_message() is the bridge between LangGraph and
    Supabase Realtime. Every time it inserts a row, Supabase pushes
    it to all subscribers — that's the live feed.

WHAT BREAKS WITHOUT IT:
    Agent messages won't appear live in the browser.
    The live agent feed (Feature 3.6) goes dark.
"""

import os
from typing import Optional
from supabase import create_client, Client


def get_db() -> Client:
    """Get Supabase client with service role key (bypasses Row Level Security)."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    return create_client(url, key)


def save_agent_message(
    session_id: str,
    from_agent: str,
    message: str,
    to_agent: Optional[str] = None,
    message_type: str = "info",
) -> None:
    """
    Insert one agent message into Supabase.
    Supabase Realtime detects the INSERT and pushes it to all
    browser clients subscribed to this session_id channel.

    This is called by each agent after appending to state["agent_messages"].
    """
    try:
        db = get_db()
        db.table("agent_messages").insert({
            "session_id": session_id,
            "from_agent": from_agent,
            "to_agent": to_agent,
            "message": message,
            "message_type": message_type,
        }).execute()
    except Exception as e:
        # Don't crash the agent if DB write fails — just log it
        print(f"[db_tools] Failed to save agent message: {e}")


def save_all_messages(messages: list) -> None:
    """
    Bulk-save all agent messages at the end of an investigation run.
    Used as a fallback if real-time saves fail.
    """
    if not messages:
        return
    try:
        db = get_db()
        rows = [
            {
                "session_id": m.get("session_id", ""),
                "from_agent": m.get("from_agent", "unknown"),
                "to_agent": m.get("to_agent"),
                "message": m.get("message", ""),
                "message_type": m.get("message_type", "info"),
            }
            for m in messages
        ]
        db.table("agent_messages").insert(rows).execute()
    except Exception as e:
        print(f"[db_tools] Failed to bulk-save messages: {e}")


def get_constituency(name: str) -> Optional[dict]:
    """Fetch a constituency by name (case-insensitive partial match)."""
    db = get_db()
    result = (
        db.table("constituencies")
        .select("*")
        .ilike("name", f"%{name}%")
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def get_candidates(constituency_id: int, election_year: Optional[int] = None) -> list:
    """Fetch all candidates for a constituency, optionally filtered by year."""
    db = get_db()
    query = (
        db.table("candidates")
        .select("*")
        .eq("constituency_id", constituency_id)
    )
    if election_year:
        query = query.eq("election_year", election_year)
    result = query.order("election_year", desc=True).execute()
    return result.data or []


def get_election_history(constituency_id: int) -> list:
    """Fetch full election history for a constituency."""
    db = get_db()
    result = (
        db.table("election_results")
        .select("*")
        .eq("constituency_id", constituency_id)
        .order("election_year", desc=True)
        .execute()
    )
    return result.data or []
