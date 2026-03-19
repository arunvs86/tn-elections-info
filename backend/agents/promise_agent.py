"""
Promise Agent — fetches election promises for candidates in state.
"""
from agents.state import TNElectionState
from tools.db_tools import rest_get


def _msg(state: TNElectionState, text: str) -> dict:
    return {"session_id": state["session_id"], "agent": "promise_agent", "text": text, "type": "info"}


def promise_node(state: TNElectionState) -> dict:
    msgs = list(state.get("agent_messages", []))
    candidates = state.get("candidates", [])

    if not candidates:
        msgs.append(_msg(state, "⚠️ No candidates in state — skipping promises"))
        return {"promises": [], "agent_messages": msgs}

    all_promises = []

    for candidate in candidates[:5]:  # Limit to top 5 to avoid huge payloads
        cid = candidate.get("id")
        if not cid:
            continue

        rows = rest_get("promises", {
            "candidate_id": f"eq.{cid}",
            "select": "id,promise_text,category,status,evidence_url",
            "order": "category.asc",
        })

        if rows:
            for row in rows:
                row["candidate_name"] = candidate.get("name", "Unknown")
                row["party"] = candidate.get("party", "")
            all_promises.extend(rows)

    msgs.append(_msg(state, f"📜 {len(all_promises)} promise(s) found across candidates"))
    return {"promises": all_promises, "agent_messages": msgs}
