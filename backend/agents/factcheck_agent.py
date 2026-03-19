"""
factcheck_agent.py — Political claim verification specialist.

WHAT THIS FILE DOES:
    Given any political claim (in English or Tamil), this agent:
    1. Searches the web for evidence using Claude's reasoning
    2. Evaluates the claim against found sources
    3. Returns a verdict: true / misleading / false / unverifiable
    4. Writes a full reasoning trace visible to the user
    5. Saves result to Supabase fact_checks table for community reuse

WHY THIS WAY:
    We use Claude directly for fact-checking rather than a fixed ruleset
    because political claims are nuanced. "DMK reduced power cuts" might
    be TRUE for Madurai but FALSE statewide — Claude can reason about that.

    The reasoning_trace is stored in JSONB and displayed step-by-step
    so users can verify our AI's logic. Transparency builds trust.

WHAT BREAKS WITHOUT IT:
    The Narrative Check feature (Feature 5.1–5.7) doesn't work.
    This is the most shareable/viral feature.
"""

import json
import os
from datetime import datetime, timezone

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from supabase import create_client

from .state import TNElectionState

_llm = ChatAnthropic(model="claude-sonnet-4-6", temperature=0.1, max_tokens=2000)


def _get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    return create_client(url, key)


def _msg(state: TNElectionState, text: str, mtype: str = "info") -> dict:
    return {
        "from_agent": "factcheck_agent",
        "to_agent": "supervisor",
        "message": text,
        "message_type": mtype,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id", ""),
    }


FACTCHECK_SYSTEM = """You are a rigorous political fact-checker specialising in Tamil Nadu, India.

When given a political claim, you must:
1. Identify what is being claimed and who is making/affected by the claim
2. Consider what evidence would verify or refute this claim
3. Reason through what you know about Tamil Nadu politics, governance, and recent history
4. Assign a verdict: "true", "misleading", "false", or "unverifiable"
5. Provide confidence percentage (0-100)
6. List specific sources that support your verdict (government reports, news, official data)

IMPORTANT RULES:
- "misleading" means the claim contains truth but omits critical context
- "unverifiable" means you cannot find reliable evidence either way
- Always trace your reasoning step by step
- Tamil Nadu government data: tncouncil.tn.gov.in, tn.gov.in, eci.gov.in
- For criminal stats: ncrb.gov.in
- For promises/delivery: look for official government press releases and news

Respond in this exact JSON format:
{
  "verdict": "true|misleading|false|unverifiable",
  "confidence_pct": 85,
  "explanation": "Clear explanation in 3-5 sentences",
  "explanation_tamil": "Tamil translation of explanation (or null)",
  "party_about": "Party the claim is about",
  "reasoning_trace": [
    {"step": 1, "thought": "What I'm evaluating..."},
    {"step": 2, "thought": "Evidence I found..."},
    {"step": 3, "thought": "My conclusion..."}
  ],
  "sources": [
    {"title": "Source name", "url": "URL or 'Government report'", "relevance": "How it supports verdict"}
  ]
}"""


def factcheck_node(state: TNElectionState) -> TNElectionState:
    """
    Fact-checks the claim in state["claim_text"].
    Saves result to Supabase and returns structured verdict.
    """
    db = _get_supabase()
    msgs = list(state.get("agent_messages", []))
    claim = state.get("claim_text", "").strip()

    if not claim:
        msgs.append(_msg(state, "❌ No claim text provided", "error"))
        return {"fact_check_result": {}, "agent_messages": msgs, "error": "No claim text"}

    msgs.append(_msg(state, f"🔬 Fact-Check Agent: Analysing claim…"))
    msgs.append(_msg(state, f"📝 Claim: \"{claim[:100]}{'…' if len(claim) > 100 else ''}\""))
    msgs.append(_msg(state, "🧠 Reasoning through evidence…"))

    try:
        response = _llm.invoke([
            SystemMessage(content=FACTCHECK_SYSTEM),
            HumanMessage(content=f"Fact-check this claim about Tamil Nadu politics:\n\n{claim}"),
        ])

        # Parse the JSON response
        content = response.content
        # Find JSON in response (Claude sometimes adds explanation before the JSON)
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON found in response")

        result = json.loads(content[start:end])

        verdict = result.get("verdict", "unverifiable")
        confidence = result.get("confidence_pct", 50)

        verdict_emoji = {
            "true": "✅",
            "misleading": "⚠️",
            "false": "❌",
            "unverifiable": "❓",
        }.get(verdict, "❓")

        msgs.append(_msg(
            state,
            f"{verdict_emoji} VERDICT: {verdict.upper()} ({confidence}% confidence)",
            "verdict"
        ))
        msgs.append(_msg(state, f"💬 {result.get('explanation', '')[:200]}"))

        # Save to Supabase for community reuse
        try:
            db.table("fact_checks").insert({
                "claim_text": claim,
                "claim_language": "en",
                "party_about": result.get("party_about"),
                "verdict": verdict,
                "confidence_pct": confidence,
                "explanation": result.get("explanation", ""),
                "explanation_tamil": result.get("explanation_tamil"),
                "sources": result.get("sources", []),
                "reasoning_trace": result.get("reasoning_trace", []),
            }).execute()
            msgs.append(_msg(state, "💾 Fact-check saved to community database"))
        except Exception:
            pass  # Don't fail the whole check if DB save fails

        msgs.append(_msg(state, "✅ Fact-Check Agent complete."))

        return {"fact_check_result": result, "agent_messages": msgs}

    except Exception as e:
        msgs.append(_msg(state, f"❌ Fact-Check Agent error: {str(e)}", "error"))
        return {
            "fact_check_result": {"verdict": "unverifiable", "error": str(e)},
            "agent_messages": msgs,
            "error": str(e),
        }
