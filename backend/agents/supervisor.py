"""
supervisor.py — The orchestrator / router node.

WHAT THIS FILE DOES:
    The Supervisor is a special LangGraph node that runs FIRST and after EVERY
    specialist agent completes. It reads the current state and decides which
    agent should run next, or whether the investigation is complete.

WHY THIS WAY (Supervisor Pattern):
    Instead of hardcoding a fixed sequence (ECI → Criminal → Promise),
    the Supervisor uses Claude's reasoning to make dynamic decisions.
    This means: if ECI finds no criminal mismatch, it can skip the Criminal
    agent entirely. If the query is just a fact-check, it goes straight to
    the Factcheck agent. The graph adapts to each query.

WHAT BREAKS WITHOUT IT:
    Without a Supervisor, the graph has no intelligence — it would just
    run all agents in a fixed order for every query, wasting API calls.
"""

import json
import uuid
from datetime import datetime, timezone

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from .state import TNElectionState

# Initialise Claude. We use claude-3-5-haiku for the supervisor
# because it's cheap and fast — it just needs to route, not reason deeply.
_llm = ChatAnthropic(model="claude-haiku-4-5-20251001", temperature=0)

SUPERVISOR_SYSTEM = """You are the orchestrator for a Tamil Nadu election investigation system.

Given the current investigation state, decide which agent to run next.

Available agents:
- eci_agent: Fetches candidate data from ECI/MyNeta (run first for constituency queries)
- criminal_agent: Checks eCourts for criminal records (run when candidates are loaded)
- promise_agent: Tracks incumbent promises kept/broken (run for constituency/candidate queries)
- factcheck_agent: Fact-checks a political claim (run for factcheck queries)
- manifesto_agent: Scores manifesto promises (run for manifesto queries)
- briefing_agent: Generates daily intelligence briefing (run for briefing queries)
- END: Investigation is complete, return results

Rules:
1. For query_type="constituency": run eci_agent → criminal_agent → promise_agent → END
2. For query_type="candidate": run eci_agent → criminal_agent → promise_agent → END
3. For query_type="factcheck": run factcheck_agent → END
4. For query_type="manifesto": run manifesto_agent → END
5. If error is set, go to END immediately.
6. If next_agent is already set and not yet run, keep it.

Respond with ONLY a JSON object: {"next_agent": "agent_name", "reason": "one sentence why"}
"""


def _emit_message(state: TNElectionState, message: str, msg_type: str = "routing") -> dict:
    """
    Builds a message dict and returns it.
    The caller appends this to state["agent_messages"].
    db_tools.save_agent_message() writes it to Supabase.
    """
    return {
        "from_agent": "supervisor",
        "to_agent": None,
        "message": message,
        "message_type": msg_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id", ""),
    }


def supervisor_node(state: TNElectionState) -> TNElectionState:
    """
    LangGraph calls this function as a node.
    Input: current state dict.
    Output: updated state dict (only changed keys need to be returned).

    IMPORTANT: LangGraph merges the returned dict INTO the state.
    So you only need to return the keys you changed.
    """
    # If there's already an error, stop immediately
    if state.get("error"):
        msgs = state.get("agent_messages", [])
        msgs.append(_emit_message(state, f"Stopping due to error: {state['error']}", "error"))
        return {"next_agent": "END", "agent_messages": msgs}

    # Build context summary for Claude
    has_candidates = bool(state.get("candidates"))
    has_criminal = bool(state.get("criminal_findings"))
    has_promises = bool(state.get("promise_scores"))
    has_factcheck = bool(state.get("fact_check_result"))
    has_manifesto = bool(state.get("manifesto_scores"))

    context = f"""
query_type: {state.get("query_type", "constituency")}
constituency: {state.get("constituency_name", "")}
candidate: {state.get("candidate_name", "")}
claim: {state.get("claim_text", "")}

What has been completed:
- candidates loaded: {has_candidates}
- criminal check done: {has_criminal}
- promise check done: {has_promises}
- fact check done: {has_factcheck}
- manifesto scored: {has_manifesto}
"""

    response = _llm.invoke([
        SystemMessage(content=SUPERVISOR_SYSTEM),
        HumanMessage(content=context),
    ])

    try:
        parsed = json.loads(response.content)
        next_agent = parsed.get("next_agent", "END")
        reason = parsed.get("reason", "")
    except (json.JSONDecodeError, AttributeError):
        next_agent = "END"
        reason = "Could not parse routing decision"

    msgs = state.get("agent_messages", [])
    msgs.append(_emit_message(state, f"Routing to {next_agent} — {reason}"))

    return {
        "next_agent": next_agent,
        "agent_messages": msgs,
    }


def route_to_agent(state: TNElectionState) -> str:
    """
    This is the EDGE FUNCTION — not a node.
    LangGraph calls this after the supervisor_node runs
    to know which node to activate next.

    Think of it as: supervisor_node DECIDES, route_to_agent EXECUTES the decision.
    """
    return state.get("next_agent", "END")
