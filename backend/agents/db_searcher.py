"""
Database Searcher — queries our Supabase tables for evidence.
Uses extracted entities to find relevant candidates, election results,
and criminal records from our own verified dataset.
"""
from agents.state import TNElectionState
from tools.db_tools import rest_get


def _msg(state: TNElectionState, text: str) -> dict:
    return {"session_id": state["session_id"], "agent": "db_searcher", "text": text, "type": "info"}


def _safe_get(table: str, params: dict) -> list:
    """Query Supabase, return empty list on failure."""
    try:
        return rest_get(table, params)
    except Exception:
        return []


def db_searcher_node(state: TNElectionState) -> dict:
    msgs = list(state.get("agent_messages", []))
    entities = state.get("extracted_entities") or {}
    party = entities.get("party")
    people = entities.get("people", [])

    msgs.append(_msg(state, "🗄️ Searching our election database..."))

    evidence = []

    # --- Search by party ---
    if party:
        # Candidates from this party
        candidates = _safe_get("candidates", {
            "party": f"ilike.*{party}*",
            "select": "name,party,constituency_name,criminal_cases,criminal_cases_ecourts,is_winner,vote_share,assets_movable,assets_immovable,net_worth",
            "limit": "20",
        })
        if candidates:
            evidence.append({
                "source_table": "candidates",
                "query": f"party={party}",
                "count": len(candidates),
                "records": candidates,
            })
            msgs.append(_msg(state, f"👥 Found {len(candidates)} {party} candidates in database"))

        # Election results involving this party
        results = _safe_get("election_results", {
            "or": f"(winner_party.ilike.*{party}*,runner_up_party.ilike.*{party}*)",
            "select": "constituency_name,winner,winner_party,runner_up,runner_up_party,margin,total_votes",
            "limit": "20",
        })
        if results:
            evidence.append({
                "source_table": "election_results",
                "query": f"party={party}",
                "count": len(results),
                "records": results,
            })
            msgs.append(_msg(state, f"📊 Found {len(results)} election results for {party}"))

    # --- Search by person name ---
    for person in people[:3]:  # Max 3 people
        # Search candidates table
        candidates = _safe_get("candidates", {
            "name": f"ilike.*{person}*",
            "select": "name,party,constituency_name,criminal_cases,criminal_cases_ecourts,is_winner,vote_share,net_worth",
            "limit": "5",
        })
        if candidates:
            evidence.append({
                "source_table": "candidates",
                "query": f"person={person}",
                "count": len(candidates),
                "records": candidates,
            })
            msgs.append(_msg(state, f"🔎 Found {len(candidates)} records for {person}"))

    if not evidence:
        msgs.append(_msg(state, "⚠️ No matching records in our database"))
    else:
        total_records = sum(e["count"] for e in evidence)
        msgs.append(_msg(state, f"✅ Total: {total_records} records from {len(evidence)} queries"))

    return {"db_evidence": evidence, "agent_messages": msgs}
