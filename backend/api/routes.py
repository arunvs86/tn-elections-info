"""
routes.py — FastAPI HTTP endpoints.

WHAT THIS FILE DOES:
    Defines all the HTTP endpoints the Next.js frontend calls.
    Each endpoint triggers a LangGraph investigation run.

    POST /api/investigate    → runs the full multi-agent graph
    POST /api/factcheck      → runs only the factcheck agent
    GET  /api/health         → health check for Railway

WHY THIS WAY:
    FastAPI uses Python type hints + Pydantic for automatic request
    validation and Swagger docs. You get docs at /docs for free.
    We use async endpoints so the server handles multiple concurrent
    investigations without blocking.

WHAT BREAKS WITHOUT IT:
    The frontend has no way to trigger agent investigations.
    Everything becomes a static site with no AI features.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from agents.graph import investigation_graph
from tools.db_tools import save_all_messages

router = APIRouter()


# ── Request models (Pydantic validates these automatically) ───────────
class InvestigateRequest(BaseModel):
    query_type: str = "constituency"   # constituency | candidate | factcheck | manifesto
    constituency_name: str = ""
    candidate_name: str = ""
    claim_text: str = ""
    party: str = ""


class FactCheckRequest(BaseModel):
    claim_text: str
    party: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────────

@router.get("/health")
async def health_check():
    """Railway uses this to verify the server is alive."""
    return {"status": "ok", "service": "tnelections-backend"}


@router.post("/investigate")
async def investigate(req: InvestigateRequest, background_tasks: BackgroundTasks):
    """
    Main endpoint. Triggers the full LangGraph investigation.

    Flow:
    1. Create a unique session_id
    2. Build the initial state
    3. Run the graph (.invoke() runs all agents synchronously)
    4. Save all messages to Supabase in the background
    5. Return session_id so frontend can subscribe to live updates

    Note on sync vs async:
    LangGraph .invoke() is synchronous. For production, use .astream()
    which is async and lets you stream results as they arrive.
    For Day 2 we use .invoke() for simplicity.
    """
    session_id = str(uuid.uuid4())

    initial_state = {
        "query_type": req.query_type,
        "constituency_name": req.constituency_name,
        "candidate_name": req.candidate_name,
        "claim_text": req.claim_text,
        "party": req.party,
        "candidates": [],
        "criminal_findings": {},
        "promise_scores": {},
        "fact_check_result": {},
        "manifesto_scores": [],
        "agent_messages": [],
        "session_id": session_id,
        "next_agent": "",
        "final_result": {},
        "error": None,
    }

    try:
        # Run the full agent graph
        final_state = investigation_graph.invoke(initial_state)

        # Save all agent messages to Supabase (for the live feed history)
        background_tasks.add_task(
            save_all_messages,
            final_state.get("agent_messages", [])
        )

        return {
            "session_id": session_id,
            "status": "complete",
            "candidates": final_state.get("candidates", []),
            "criminal_findings": final_state.get("criminal_findings", {}),
            "promise_scores": final_state.get("promise_scores", {}),
            "fact_check_result": final_state.get("fact_check_result", {}),
            "agent_messages": final_state.get("agent_messages", []),
            "error": final_state.get("error"),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/factcheck")
async def factcheck(req: FactCheckRequest):
    """
    Shortcut endpoint for just fact-checking a claim.
    Skips ECI and criminal agents.
    """
    session_id = str(uuid.uuid4())

    initial_state = {
        "query_type": "factcheck",
        "constituency_name": "",
        "candidate_name": "",
        "claim_text": req.claim_text,
        "party": req.party or "",
        "candidates": [],
        "criminal_findings": {},
        "promise_scores": {},
        "fact_check_result": {},
        "manifesto_scores": [],
        "agent_messages": [],
        "session_id": session_id,
        "next_agent": "",
        "final_result": {},
        "error": None,
    }

    try:
        final_state = investigation_graph.invoke(initial_state)
        return {
            "session_id": session_id,
            "fact_check_result": final_state.get("fact_check_result", {}),
            "agent_messages": final_state.get("agent_messages", []),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
