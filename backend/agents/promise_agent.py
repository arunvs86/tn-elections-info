"""
promise_agent.py — Incumbent promise tracker specialist.

WHAT THIS FILE DOES:
    For incumbent candidates (currently serving MLAs), this agent:
    1. Fetches their 2021 election promises from the DB
    2. Asks Claude to assess each promise as: kept / broken / partial / pending
    3. Calculates an overall "delivery score"
    4. Writes results to state["promise_scores"]

WHY THIS WAY:
    Promise tracking is the #1 accountability feature.
    We store raw promise text + Claude evaluates delivery based on
    publicly available information about what the MLA actually did.

WHAT BREAKS WITHOUT IT:
    Feature 4.6 (promise tracker on candidate page) doesn't work.
    Incumbents can't be held accountable for previous commitments.
"""

import json
import os
from datetime import datetime, timezone

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from supabase import create_client

from .state import TNElectionState

_llm = ChatAnthropic(model="claude-haiku-4-5-20251001", temperature=0)


def _get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    return create_client(url, key)


def _msg(state: TNElectionState, text: str, mtype: str = "info") -> dict:
    return {
        "from_agent": "promise_agent",
        "to_agent": "supervisor",
        "message": text,
        "message_type": mtype,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id", ""),
    }


PROMISE_SYSTEM = """You are a Tamil Nadu political accountability analyst.
Given a promise made by an incumbent MLA in 2021, assess its current status.

Consider:
- Tamil Nadu governance from 2021-2026 (DMK government under Stalin)
- District-level development projects, infrastructure works
- State budget allocations
- News reports about the specific constituency

Status options:
- "kept": Promise clearly fulfilled with evidence
- "partial": Partially fulfilled or in progress
- "broken": Definitively not fulfilled
- "pending": Cannot determine yet / insufficient information

Respond ONLY with JSON:
{"status": "kept|broken|partial|pending", "evidence": "One sentence of evidence", "confidence": 70}
"""


def promise_node(state: TNElectionState) -> TNElectionState:
    """
    Checks promises for all incumbent candidates in state["candidates"].
    """
    db = _get_supabase()
    msgs = list(state.get("agent_messages", []))
    candidates = state.get("candidates", [])

    # Only check incumbents
    incumbents = [c for c in candidates if c.get("is_incumbent")]

    if not incumbents:
        msgs.append(_msg(state, "ℹ️  No incumbent candidates — skipping promise check"))
        return {"promise_scores": {}, "agent_messages": msgs}

    msgs.append(_msg(state, f"📜 Promise Agent: Checking delivery for {len(incumbents)} incumbent(s)…"))

    scores = {}

    try:
        for incumbent in incumbents[:3]:  # Limit to 3 to avoid rate limits
            cid = incumbent.get("id")
            if not cid:
                continue

            # Fetch their promises
            promises_q = (
                db.table("promises")
                .select("id, promise_text, category, status, evidence_url")
                .eq("candidate_id", cid)
                .execute()
            )
            promises = promises_q.data or []

            if not promises:
                msgs.append(_msg(state, f"📭 No promises on record for {incumbent['name']}"))
                continue

            msgs.append(_msg(state, f"🔍 Checking {len(promises)} promises for {incumbent['name']} ({incumbent['party']})…"))

            kept = broken = partial = pending = 0
            evaluated_promises = []

            for promise in promises[:10]:  # Cap at 10 per candidate
                try:
                    resp = _llm.invoke([
                        SystemMessage(content=PROMISE_SYSTEM),
                        HumanMessage(content=(
                            f"Constituency: {state.get('constituency_name', 'Unknown')}\n"
                            f"MLA: {incumbent['name']} ({incumbent['party']})\n"
                            f"Promise made in 2021: {promise['promise_text']}"
                        )),
                    ])
                    content = resp.content
                    start = content.find("{")
                    end = content.rfind("}") + 1
                    assessment = json.loads(content[start:end]) if start != -1 else {"status": "pending"}
                except Exception:
                    assessment = {"status": "pending", "evidence": "Could not evaluate", "confidence": 0}

                status = assessment.get("status", "pending")
                if status == "kept":    kept += 1
                elif status == "broken": broken += 1
                elif status == "partial": partial += 1
                else: pending += 1

                evaluated_promises.append({
                    **promise,
                    "ai_status": status,
                    "ai_evidence": assessment.get("evidence", ""),
                    "ai_confidence": assessment.get("confidence", 0),
                })

            total = kept + broken + partial + pending
            delivery_score = round((kept + 0.5 * partial) / total * 100) if total > 0 else 0

            scores[str(cid)] = {
                "candidate_name": incumbent["name"],
                "party": incumbent["party"],
                "kept": kept,
                "broken": broken,
                "partial": partial,
                "pending": pending,
                "total": total,
                "delivery_score": delivery_score,
                "promises": evaluated_promises,
            }

            msgs.append(_msg(
                state,
                f"📊 {incumbent['name']}: {kept} kept, {broken} broken, {partial} partial "
                f"— Delivery score: {delivery_score}%",
                "summary"
            ))

        msgs.append(_msg(state, "✅ Promise Agent complete."))
        return {"promise_scores": scores, "agent_messages": msgs}

    except Exception as e:
        msgs.append(_msg(state, f"❌ Promise Agent error: {str(e)}", "error"))
        return {"promise_scores": {}, "agent_messages": msgs, "error": str(e)}
