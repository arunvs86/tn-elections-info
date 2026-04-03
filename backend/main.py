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
from agents.thamizhan_agent import trigger_vapi_call, call_all_pledgers, get_pledge_stats, send_whatsapp_reminder, send_sms_reminder, sms_all_pledgers
from agents.allegations_agent import fetch_allegations
from agents.connections_agent import build_connections
from tools.db_tools import save_messages, rest_get, rest_post

app = FastAPI(title="TN Elections API", version="2.0.0")

ALLOWED_ORIGINS = [
    "https://tnelections.info",
    "https://www.tnelections.info",
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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


class AllegationsRequest(BaseModel):
    name: str
    party: str
    constituency: str = ""


@app.post("/api/candidate-allegations")
def candidate_allegations(req: AllegationsRequest):
    """Search web for candidate allegations and controversies via Tavily + Claude."""
    try:
        result = fetch_allegations(req.name, req.party, req.constituency)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result


class ConnectionsRequest(BaseModel):
    candidate_id: int
    name: str
    party: str
    constituency: str = ""
    force_refresh: bool = False


@app.post("/api/candidate-connections")
def candidate_connections(req: ConnectionsRequest):
    """Build political network graph for a candidate on-demand. Results cached in Supabase."""
    try:
        result = build_connections(
            candidate_id=req.candidate_id,
            name=req.name,
            party=req.party,
            constituency=req.constituency,
            force_refresh=req.force_refresh,
        )
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


# ── Thamizhan Phone Agent ──────────────────────────────────────────────────

class SingleCallRequest(BaseModel):
    phone: str
    name: str
    constituency_name: str = ""
    non_voters: int | None = None
    margin: int | None = None
    call_type: str = "apr22"  # "apr22" | "apr23"


@app.post("/api/thamizhan/call-single")
def thamizhan_call_single(req: SingleCallRequest):
    """Trigger a single Vapi call to one pledger."""
    result = trigger_vapi_call(
        phone=req.phone,
        name=req.name,
        constituency_name=req.constituency_name,
        non_voters=req.non_voters,
        margin=req.margin,
        call_type=req.call_type,
    )
    if not result["success"]:
        raise HTTPException(status_code=502, detail=result["error"])
    return result


class BatchCallRequest(BaseModel):
    call_type: str = "apr22"  # "apr22" | "apr23"


@app.post("/api/thamizhan/call-all")
def thamizhan_call_all(req: BatchCallRequest):
    """
    Trigger Vapi calls to ALL pending pledgers with phone numbers.
    Safe to call multiple times — skips already-called rows.
    """
    result = call_all_pledgers(call_type=req.call_type)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
    return result


@app.get("/api/thamizhan/stats")
def thamizhan_stats():
    """Return pledge counts and call progress."""
    return get_pledge_stats()


class WhatsAppRequest(BaseModel):
    phone: str
    name: str
    constituency_name: str = ""
    call_type: str = "apr22"


@app.post("/api/thamizhan/whatsapp-single")
def thamizhan_whatsapp_single(req: WhatsAppRequest):
    """Send a single WhatsApp reminder (requires Twilio WhatsApp-enabled number)."""
    result = send_whatsapp_reminder(
        phone=req.phone,
        name=req.name,
        constituency_name=req.constituency_name,
        call_type=req.call_type,
    )
    if not result["success"]:
        raise HTTPException(status_code=502, detail=result["error"])
    return result


@app.post("/api/thamizhan/sms-single")
def thamizhan_sms_single(req: WhatsAppRequest):
    """Send a single SMS reminder via Twilio. Works immediately, no WhatsApp approval needed."""
    result = send_sms_reminder(
        phone=req.phone,
        name=req.name,
        constituency_name=req.constituency_name,
        call_type=req.call_type,
    )
    if not result["success"]:
        raise HTTPException(status_code=502, detail=result["error"])
    return result


class ReviewRequest(BaseModel):
    rating: int
    comment: str = ""


@app.post("/api/reviews")
def submit_review(req: ReviewRequest):
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    comment = req.comment.strip()[:1000] if req.comment else None
    rest_post("site_reviews", {"rating": req.rating, "comment": comment})
    return {"success": True}


@app.get("/api/reviews/summary")
def reviews_summary():
    rows = rest_get("site_reviews", {"select": "rating,comment,created_at", "order": "created_at.desc", "limit": "100"})
    if not rows:
        return {"average": 0, "total": 0, "recent": []}
    total = len(rows)
    average = round(sum(r["rating"] for r in rows) / total, 1)
    recent = [
        {"rating": r["rating"], "comment": r["comment"], "created_at": r["created_at"]}
        for r in rows[:5] if r.get("comment")
    ]
    return {"average": average, "total": total, "recent": recent}


@app.post("/api/thamizhan/sms-all")
def thamizhan_sms_all(req: BatchCallRequest):
    """
    Send SMS reminders to ALL pending pledgers with phone numbers.
    Safe to call multiple times — skips already-sent rows.
    Use call_type='apr22' (eve) or 'apr23' (election day).
    """
    result = sms_all_pledgers(call_type=req.call_type)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
    return result
