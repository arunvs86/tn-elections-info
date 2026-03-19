"""
ECI Agent — looks up constituency, candidates, and election results
from Supabase via httpx (no supabase-py).
"""
from agents.state import TNElectionState
from tools.db_tools import rest_get


def _msg(state: TNElectionState, text: str) -> dict:
    return {"session_id": state["session_id"], "agent": "eci_agent", "text": text, "type": "info"}


def eci_node(state: TNElectionState) -> dict:
    msgs = list(state.get("agent_messages", []))
    constituency_name = state.get("constituency_name", "").strip()
    candidate_name = state.get("candidate_name", "").strip()

    constituency = None
    candidates = []
    election_results = []

    # --- Constituency lookup ---
    if constituency_name:
        msgs.append(_msg(state, f"🔍 Searching for constituency: {constituency_name}"))
        rows = rest_get("constituencies", {"name": f"ilike.*{constituency_name}*", "limit": "1"})
        if rows:
            constituency = rows[0]
            msgs.append(_msg(state, f"✅ Found: {constituency['name']} (ID {constituency['id']})"))

            # Candidates in this constituency
            cands = rest_get("candidates", {
                "constituency_id": f"eq.{constituency['id']}",
                "select": "id,name,party,age,education,net_worth,criminal_cases_declared,votes_received,vote_share,is_winner,is_incumbent",
                "order": "name.asc",
            })
            candidates = cands or []
            msgs.append(_msg(state, f"👥 {len(candidates)} candidates found"))

            # Election result
            results = rest_get("election_results", {
                "constituency_id": f"eq.{constituency['id']}",
                "select": "election_year,winner_name,winner_party,winner_votes,winner_vote_share,runner_up_name,runner_up_party,margin,total_votes,turnout",
                "order": "election_year.desc",
                "limit": "5",
            })
            election_results = results or []
            if election_results:
                msgs.append(_msg(state, f"📊 Election results loaded"))
        else:
            msgs.append(_msg(state, f"⚠️ No constituency found matching '{constituency_name}'"))

    # --- Candidate lookup by name ---
    if candidate_name and not constituency_name:
        msgs.append(_msg(state, f"🔍 Searching for candidate: {candidate_name}"))
        cands = rest_get("candidates", {
            "name": f"ilike.*{candidate_name}*",
            "select": "id,name,party,age,education,net_worth,criminal_cases_declared,votes_received,vote_share,is_winner,is_incumbent,constituency_id",
            "limit": "5",
        })
        candidates = cands or []
        msgs.append(_msg(state, f"👤 {len(candidates)} candidates found matching '{candidate_name}'"))

    return {
        "constituency": constituency,
        "candidates": candidates,
        "election_results": election_results,
        "agent_messages": msgs,
    }
