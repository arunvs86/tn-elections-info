"""
TN Elections FastAPI backend.
Single endpoint: POST /api/investigate
"""
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

# Disable LangSmith tracing (no key configured)
os.environ["LANGCHAIN_TRACING_V2"] = "false"

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents.graph import election_graph
from agents.chat_agent import handle_chat
from agents.summary_agent import generate_candidate_summary
from agents.briefing_agent import generate_briefing, get_latest_briefing
from tools.db_tools import save_messages

app = FastAPI(title="TN Elections API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class InvestigateRequest(BaseModel):
    query_type: str = "constituency"   # constituency | candidate | factcheck | promises
    constituency_name: str = ""
    candidate_name: str = ""
    claim_text: str = ""
    party: str = ""


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


@app.post("/api/investigate")
def investigate(req: InvestigateRequest):
    session_id = str(uuid.uuid4())

    # Build initial state
    initial_state = {
        "session_id": session_id,
        "query_type": req.query_type,
        "constituency_name": req.constituency_name,
        "candidate_name": req.candidate_name,
        "claim_text": req.claim_text,
        "party": req.party,
        # Defaults
        "constituency": None,
        "candidates": [],
        "election_results": [],
        "criminal_records": [],
        "promises": [],
        "factcheck_result": None,
        "extracted_entities": None,
        "wikipedia_evidence": [],
        "db_evidence": [],
        "web_evidence": [],
        "next_agent": "",
        "agent_messages": [],
        "final_summary": "",
    }

    try:
        result = election_graph.invoke(initial_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Persist messages to Supabase in background (non-blocking)
    save_messages(result.get("agent_messages", []))

    return {
        "session_id": session_id,
        "constituency": result.get("constituency"),
        "candidates": result.get("candidates", []),
        "election_results": result.get("election_results", []),
        "criminal_records": result.get("criminal_records", []),
        "promises": result.get("promises", []),
        "factcheck_result": result.get("factcheck_result"),
        "agent_messages": result.get("agent_messages", []),
    }


class ChatRequest(BaseModel):
    message: str
    context: list = []


@app.post("/api/chat")
def chat(req: ChatRequest):
    try:
        result = handle_chat(req.message, req.context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result


class SummaryRequest(BaseModel):
    candidate_id: int


@app.post("/api/candidate-summary")
def candidate_summary(req: SummaryRequest):
    try:
        result = generate_candidate_summary(req.candidate_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result


@app.post("/api/generate-briefing")
def api_generate_briefing():
    """Generate today's daily election briefing (scrape RSS + Claude summary)."""
    try:
        result = generate_briefing()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result


@app.get("/api/briefing/latest")
def api_latest_briefing():
    """Return the most recent daily briefing."""
    result = get_latest_briefing()
    if not result:
        raise HTTPException(status_code=404, detail="No briefings found")
    return result
