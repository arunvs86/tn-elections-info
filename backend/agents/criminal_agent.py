"""
Criminal Agent — fetches criminal records for candidates already loaded
into state by the ECI agent.
"""
from agents.state import TNElectionState
from tools.db_tools import rest_get


def _msg(state: TNElectionState, text: str) -> dict:
    return {"session_id": state["session_id"], "agent": "criminal_agent", "text": text, "type": "info"}


def criminal_node(state: TNElectionState) -> dict:
    msgs = list(state.get("agent_messages", []))
    candidates = state.get("candidates", [])

    if not candidates:
        msgs.append(_msg(state, "⚠️ No candidates in state — skipping criminal records"))
        return {"criminal_records": [], "agent_messages": msgs}

    # Collect candidate IDs that have criminal_cases > 0
    ids_with_cases = [
        str(c["id"]) for c in candidates
        if isinstance(c.get("criminal_cases_declared"), (int, float)) and c["criminal_cases_declared"] > 0
    ]

    if not ids_with_cases:
        msgs.append(_msg(state, "✅ No candidates with declared criminal cases"))
        return {"criminal_records": [], "agent_messages": msgs}

    msgs.append(_msg(state, f"⚖️ Fetching criminal records for {len(ids_with_cases)} candidate(s)"))

    ids_str = ",".join(ids_with_cases)
    try:
        records = rest_get("criminal_records", {
            "candidate_id": f"in.({ids_str})",
            "select": "candidate_id,case_type,court,year,status,description",
            "order": "year.desc",
        })
        criminal_records = records or []
    except Exception:
        # Table may not be populated yet
        criminal_records = []

    msgs.append(_msg(state, f"📋 {len(criminal_records)} criminal record(s) found"))

    return {"criminal_records": criminal_records, "agent_messages": msgs}
