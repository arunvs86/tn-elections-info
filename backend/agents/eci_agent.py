"""
eci_agent.py — Election Commission of India data specialist.

WHAT THIS FILE DOES:
    Fetches candidate data from Supabase (which was seeded from MyNeta/ECI).
    For each candidate it finds, it also reads their affidavit data
    (assets, liabilities, criminal declarations).
    It writes results to state["candidates"] and emits live messages.

WHY THIS WAY:
    We query Supabase directly (not the ECI website in real time) because:
    1. ECI website is slow and unreliable
    2. We've already ingested the data during seeding
    3. For 2026 nominations (after Apr 6), we'll add a scraper that
       runs on a cron job and keeps the DB updated

WHAT BREAKS WITHOUT IT:
    No candidate data = nothing to investigate. This is always the first
    agent to run for constituency/candidate queries.
"""

import os
from datetime import datetime, timezone

from supabase import create_client

from .state import TNElectionState


def _get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    return create_client(url, key)


def _msg(state: TNElectionState, text: str, mtype: str = "info") -> dict:
    return {
        "from_agent": "eci_agent",
        "to_agent": "supervisor",
        "message": text,
        "message_type": mtype,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id", ""),
    }


def eci_node(state: TNElectionState) -> TNElectionState:
    """
    Fetch all 2026 (or latest available) candidates for the given constituency,
    including their declared assets and criminal case counts.
    """
    db = _get_supabase()
    msgs = list(state.get("agent_messages", []))
    constituency_name = state.get("constituency_name", "")
    candidate_name = state.get("candidate_name", "")

    msgs.append(_msg(state, f"🔍 ECI Agent: Searching for candidates in {constituency_name or candidate_name}…"))

    try:
        # Step 1: find the constituency
        if constituency_name:
            cq = (
                db.table("constituencies")
                .select("id, name, district, current_mla, current_mla_party, total_voters_2021, turnout_2021")
                .ilike("name", f"%{constituency_name}%")
                .limit(1)
                .execute()
            )
            if not cq.data:
                msgs.append(_msg(state, f"❌ Constituency '{constituency_name}' not found in database", "error"))
                return {
                    "candidates": [],
                    "agent_messages": msgs,
                    "error": f"Constituency '{constituency_name}' not found",
                }

            constituency = cq.data[0]
            msgs.append(_msg(state, f"✅ Found constituency: {constituency['name']}, {constituency['district']} District"))

            # Step 2: get all candidates for this constituency (most recent year first)
            cand_q = (
                db.table("candidates")
                .select(
                    "id, name, party, alliance, election_year, is_incumbent, is_winner, "
                    "votes_received, vote_share, margin, assets_movable, assets_immovable, "
                    "liabilities, net_worth, education, age, criminal_cases_declared, "
                    "criminal_cases_ecourts, criminal_mismatch, affidavit_url, photo_url"
                )
                .eq("constituency_id", constituency["id"])
                .order("election_year", desc=True)
                .execute()
            )

            candidates = cand_q.data or []
            msgs.append(_msg(state, f"📋 Found {len(candidates)} candidate records across all elections"))

            # Flag mismatches for the live feed
            mismatches = [c for c in candidates if c.get("criminal_mismatch")]
            if mismatches:
                names = ", ".join(c["name"] for c in mismatches[:3])
                msgs.append(_msg(state, f"⚠️  Criminal record mismatch detected: {names}", "warning"))

        elif candidate_name:
            # Direct candidate search
            cand_q = (
                db.table("candidates")
                .select("*")
                .ilike("name", f"%{candidate_name}%")
                .order("election_year", desc=True)
                .limit(20)
                .execute()
            )
            candidates = cand_q.data or []
            msgs.append(_msg(state, f"📋 Found {len(candidates)} records for '{candidate_name}'"))

        else:
            msgs.append(_msg(state, "❌ No constituency or candidate name provided", "error"))
            return {"candidates": [], "agent_messages": msgs, "error": "No search target provided"}

        # Write to state
        msgs.append(_msg(state, f"✅ ECI Agent complete. Passing {len(candidates)} records to next agent."))
        return {
            "candidates": candidates,
            "agent_messages": msgs,
        }

    except Exception as e:
        msgs.append(_msg(state, f"❌ ECI Agent error: {str(e)}", "error"))
        return {
            "candidates": [],
            "agent_messages": msgs,
            "error": str(e),
        }
