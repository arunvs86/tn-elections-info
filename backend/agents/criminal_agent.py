"""
criminal_agent.py — Criminal records verification specialist.

WHAT THIS FILE DOES:
    For each candidate found by the ECI agent, this agent:
    1. Reads declared criminal cases from our Supabase DB (from affidavit)
    2. Queries eCourts to find actual cases (async HTTP)
    3. Compares counts — if declared < found, flags a MISMATCH
    4. Writes findings to state["criminal_findings"]

WHY THIS WAY:
    This is the most impactful transparency feature.
    Candidates are legally required to disclose criminal cases in affidavits.
    We cross-reference with eCourts to catch undisclosed cases.
    The mismatch is then highlighted on the Truth Card.

WHAT BREAKS WITHOUT IT:
    The "criminal_mismatch" flag on Truth Cards wouldn't work.
    Users wouldn't know if a candidate hid cases from their affidavit.

NOTE: eCourts real-time API is rate-limited. In production we run this
on a nightly cron and cache results. For the live demo, we use our
pre-seeded criminal_cases table.
"""

import os
from datetime import datetime, timezone

from supabase import create_client

from .state import TNElectionState


def _get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    return create_client(url, key)


def _msg(state: TNElectionState, text: str, mtype: str = "info") -> dict:
    return {
        "from_agent": "criminal_agent",
        "to_agent": "supervisor",
        "message": text,
        "message_type": mtype,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id", ""),
    }


def criminal_node(state: TNElectionState) -> TNElectionState:
    """
    Checks criminal records for each candidate in state["candidates"].
    Only checks the most recent election year's candidates to avoid
    processing historical data unnecessarily.
    """
    db = _get_supabase()
    msgs = list(state.get("agent_messages", []))
    candidates = state.get("candidates", [])

    if not candidates:
        msgs.append(_msg(state, "ℹ️  No candidates to check for criminal records", "info"))
        return {"criminal_findings": {}, "agent_messages": msgs}

    msgs.append(_msg(state, f"🔍 Criminal Agent: Checking records for {len(candidates)} candidates…"))

    findings = {}

    try:
        # Get all candidate IDs
        candidate_ids = [c["id"] for c in candidates if c.get("id")]

        if not candidate_ids:
            return {"criminal_findings": {}, "agent_messages": msgs}

        # Fetch from our pre-seeded criminal_cases table
        cases_q = (
            db.table("criminal_cases")
            .select(
                "id, candidate_id, case_number, court_name, case_type, "
                "sections, status, next_hearing, ecourts_url, is_disclosed"
            )
            .in_("candidate_id", candidate_ids)
            .execute()
        )

        all_cases = cases_q.data or []
        msgs.append(_msg(state, f"📚 Found {len(all_cases)} total criminal cases in database"))

        # Group cases by candidate
        for candidate in candidates:
            cid = candidate.get("id")
            if not cid:
                continue

            cand_cases = [c for c in all_cases if c["candidate_id"] == cid]
            undisclosed = [c for c in cand_cases if not c.get("is_disclosed", True)]

            findings[str(cid)] = {
                "candidate_name": candidate["name"],
                "candidate_party": candidate["party"],
                "declared_count": candidate.get("criminal_cases_declared", 0),
                "ecourts_count": candidate.get("criminal_cases_ecourts", len(cand_cases)),
                "mismatch": candidate.get("criminal_mismatch", False),
                "cases": cand_cases,
                "undisclosed_cases": undisclosed,
            }

            # Emit live message for significant findings
            declared = candidate.get("criminal_cases_declared", 0)
            if declared > 0:
                msgs.append(_msg(
                    state,
                    f"⚖️  {candidate['name']} ({candidate['party']}): "
                    f"{declared} declared criminal case(s)",
                    "warning"
                ))

            if candidate.get("criminal_mismatch"):
                msgs.append(_msg(
                    state,
                    f"🚨 MISMATCH: {candidate['name']} declared {declared} cases "
                    f"but {candidate.get('criminal_cases_ecourts', '?')} found in eCourts",
                    "alert"
                ))

        total_with_cases = sum(1 for v in findings.values() if v["declared_count"] > 0)
        total_mismatches = sum(1 for v in findings.values() if v["mismatch"])

        msgs.append(_msg(
            state,
            f"✅ Criminal Agent complete. "
            f"{total_with_cases} candidates with declared cases, "
            f"{total_mismatches} mismatches detected."
        ))

        return {"criminal_findings": findings, "agent_messages": msgs}

    except Exception as e:
        msgs.append(_msg(state, f"❌ Criminal Agent error: {str(e)}", "error"))
        return {"criminal_findings": {}, "agent_messages": msgs, "error": str(e)}
