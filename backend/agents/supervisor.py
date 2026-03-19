"""
Supervisor — the entry node of the LangGraph.
Decides which agent(s) should run based on the incoming query.

Routing logic:
  "factcheck"    → factcheck_agent → END
  "constituency" → eci_agent → criminal_agent → promise_agent → END
  "candidate"    → eci_agent → criminal_agent → promise_agent → END
  anything else  → eci_agent → END  (safe fallback)
"""
from agents.state import TNElectionState


def _msg(state: TNElectionState, text: str) -> dict:
    return {"session_id": state["session_id"], "agent": "supervisor", "text": text, "type": "info"}


def supervisor_node(state: TNElectionState) -> dict:
    """Classify the query and set next_agent for the router."""
    msgs = list(state.get("agent_messages", []))
    query_type = state.get("query_type", "constituency").strip().lower()

    msgs.append(_msg(state, f"🧠 Supervisor received query_type='{query_type}'"))

    if query_type == "factcheck":
        msgs.append(_msg(state, "→ Routing to fact-check agent"))
        next_agent = "factcheck"
    elif query_type in ("constituency", "candidate", "promises"):
        msgs.append(_msg(state, "→ Routing to ECI → Criminal → Promise pipeline"))
        next_agent = "eci"
    else:
        msgs.append(_msg(state, f"→ Unknown type '{query_type}', defaulting to ECI lookup"))
        next_agent = "eci"

    return {"next_agent": next_agent, "agent_messages": msgs}


def route(state: TNElectionState) -> str:
    """
    Conditional edge function.
    LangGraph calls this after supervisor_node to pick the next node name.
    """
    return state.get("next_agent", "eci")
