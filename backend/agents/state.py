"""
Shared state for the LangGraph election intelligence graph.
Every node reads from and writes to this TypedDict.
"""
from typing import TypedDict, Optional


class TNElectionState(TypedDict):
    # --- Input ---
    session_id: str          # Unique ID for this request
    query_type: str          # "constituency" | "candidate" | "factcheck" | "promises"
    constituency_name: str   # e.g. "Saidapet"
    candidate_name: str      # e.g. "M.K. Stalin"
    claim_text: str          # For fact-check queries
    party: str               # Optional party filter

    # --- Populated by agents ---
    constituency: Optional[dict]        # Row from constituencies table
    candidates: list                    # Rows from candidates table
    election_results: list              # Rows from election_results table
    criminal_records: list             # Rows from criminal_records table
    promises: list                      # Rows from promises table
    factcheck_result: Optional[dict]    # Verdict from factcheck agent

    # --- Routing ---
    next_agent: str          # Which node the supervisor routes to next

    # --- Output ---
    agent_messages: list     # Accumulated messages shown in the UI feed
    final_summary: str       # Plain-English summary returned to frontend
