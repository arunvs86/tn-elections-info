"""
state.py — The shared memory of the entire LangGraph system.

WHAT THIS FILE DOES:
    Defines TNElectionState — a Python TypedDict (typed dictionary) that acts
    as the single source of truth shared between ALL agents.

WHY THIS WAY:
    In LangGraph, agents don't talk to each other directly.
    Instead, they all read from and write to this one shared state object.
    The Supervisor reads the state to decide who to route to next.
    Each specialist agent reads what it needs and writes its results back.

WHAT BREAKS WITHOUT IT:
    Nothing would work. This is the backbone. Without a shared state,
    agents can't coordinate, and the supervisor can't route.
"""

from typing import TypedDict, Optional


class TNElectionState(TypedDict):
    # ── Input (set by the API route, never changed after) ────────────────
    query_type: str
    # One of: "constituency" | "candidate" | "factcheck" | "manifesto"

    constituency_name: str    # e.g. "Saidapet"
    candidate_name: str       # e.g. "P. Chidambaram"
    claim_text: str           # e.g. "TVK has no political experience"
    party: str                # e.g. "DMK"

    # ── Agent outputs (each specialist agent writes to its own key) ──────
    candidates: list
    # Written by ECI agent. List of candidate dicts with name, party, affidavit data.

    criminal_findings: dict
    # Written by Criminal agent. Maps candidate_id → list of case dicts.

    promise_scores: dict
    # Written by Promise agent. Maps candidate_id → {kept, broken, partial, total}.

    fact_check_result: dict
    # Written by Factcheck agent. {verdict, confidence, explanation, sources}.

    manifesto_scores: list
    # Written by Manifesto agent. List of {party, promise, scores, label}.

    # ── Communication (the live feed) ────────────────────────────────────
    agent_messages: list
    # Every agent appends a message dict here:
    # { from_agent, to_agent, message, message_type, created_at }
    # These are ALSO written to Supabase agent_messages table in real time.
    # Supabase Realtime pushes them to the browser — that's the live feed.

    session_id: str
    # UUID for this investigation run. Used to filter messages per session.

    next_agent: str
    # Written by Supervisor. Tells LangGraph which node to route to.
    # Special value: "END" means the investigation is complete.

    # ── Final output ──────────────────────────────────────────────────────
    final_result: dict
    # Assembled by the last agent. Merged summary of all findings.

    error: Optional[str]
    # If any agent fails, it writes a human-readable error here.
