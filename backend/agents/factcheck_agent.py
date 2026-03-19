"""
Factcheck Agent — uses Claude to verify a political claim.
Saves result to Supabase for community reuse.
"""
import json
import os

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from agents.state import TNElectionState
from tools.db_tools import rest_post

_llm = ChatAnthropic(model="claude-haiku-4-5-20251001", temperature=0, max_tokens=1500)

_SYSTEM = """You are a Tamil Nadu political fact-checker.
Given a claim, return ONLY valid JSON (no markdown, no explanation):
{
  "verdict": "TRUE" | "FALSE" | "MISLEADING" | "UNVERIFIABLE",
  "confidence_pct": 0-100,
  "explanation": "2-3 sentence explanation in English",
  "party_about": "party name or null"
}"""


def _msg(state: TNElectionState, text: str) -> dict:
    return {"session_id": state["session_id"], "agent": "factcheck_agent", "text": text, "type": "info"}


def factcheck_node(state: TNElectionState) -> dict:
    msgs = list(state.get("agent_messages", []))
    claim = state.get("claim_text", "").strip()

    if not claim:
        msgs.append(_msg(state, "⚠️ No claim provided for fact-check"))
        return {"factcheck_result": None, "agent_messages": msgs}

    msgs.append(_msg(state, f"🔎 Fact-checking: \"{claim[:80]}...\"" if len(claim) > 80 else f"🔎 Fact-checking: \"{claim}\""))

    response = _llm.invoke([
        SystemMessage(content=_SYSTEM),
        HumanMessage(content=f"Claim: {claim}"),
    ])

    content = response.content.strip()

    # Strip markdown code blocks if Claude wraps the JSON
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = {"verdict": "UNVERIFIABLE", "confidence_pct": 0, "explanation": content, "party_about": None}

    verdict = result.get("verdict", "UNVERIFIABLE")
    confidence = result.get("confidence_pct", 0)
    msgs.append(_msg(state, f"📊 Verdict: {verdict} (confidence: {confidence}%)"))
    msgs.append(_msg(state, f"💬 {result.get('explanation', '')}"))

    # Save to Supabase for community reuse
    try:
        rest_post("fact_checks", {
            "claim_text": claim,
            "verdict": verdict,
            "confidence_pct": confidence,
            "explanation": result.get("explanation", ""),
            "party_about": result.get("party_about"),
        })
        msgs.append(_msg(state, "💾 Saved to community database"))
    except Exception:
        pass  # Don't fail the whole check if DB save fails

    return {"factcheck_result": result, "agent_messages": msgs}
