"""
Verdict Agent — the final node in the fact-check pipeline.
Reviews ALL collected evidence (Wikipedia + database + web articles)
and produces an evidence-backed verdict WITH source citations.

This is RAG (Retrieval-Augmented Generation):
  Instead of Claude guessing from memory, it reasons over real data.
"""
import json

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from agents.state import TNElectionState
from tools.db_tools import rest_post

_llm = ChatAnthropic(model="claude-haiku-4-5-20251001", temperature=0, max_tokens=2500)

_SYSTEM = """You are a Tamil Nadu political fact-checker with access to multiple real evidence sources.
You will receive:
1. A political claim to verify
2. Wikipedia article extracts (background knowledge)
3. Election database records (official ECI/MyNeta data: candidates, votes, criminal cases, assets)
4. Web search results (recent news articles, fact-checks, government press releases)

Your job: cross-reference the claim against ALL evidence sources and return a verdict.

VERDICT RULES:
- TRUE: Evidence directly supports the claim with matching facts/numbers
- FALSE: Evidence directly contradicts the claim
- MISLEADING: Partially true but key details are wrong (numbers, dates, context)
- UNVERIFIABLE: Evidence is insufficient — but explain what you DID find

CITATION RULES (CRITICAL):
- You MUST cite specific sources for every factual statement in your explanation
- Reference articles by their title and URL
- Reference database records by table name (e.g. "ECI candidate data shows...")
- If a web article supports or contradicts the claim, quote the relevant part
- The sources_used array MUST contain objects with "title" and "url" fields
- Include ALL sources you referenced, even if they didn't have conclusive info

EXPLANATION RULES:
- Write 4-6 sentences
- First sentence: state the verdict clearly
- Middle sentences: cite specific evidence that supports your verdict
- Last sentence: note any caveats or limitations

Return ONLY valid JSON (no markdown):
{
  "verdict": "TRUE" | "FALSE" | "MISLEADING" | "UNVERIFIABLE",
  "confidence_pct": 0-100,
  "explanation": "4-6 sentence explanation with inline source references",
  "party_about": "party name or null",
  "sources_used": [
    {"title": "Article or source name", "url": "https://..."},
    {"title": "ECI/MyNeta Database", "url": "https://myneta.info"}
  ]
}"""


def _msg(state: TNElectionState, text: str) -> dict:
    return {"session_id": state["session_id"], "agent": "verdict_agent", "text": text, "type": "info"}


def _build_evidence_prompt(state: TNElectionState) -> str:
    """
    Assemble all evidence into a single prompt for Claude.
    This is the 'augmentation' step of RAG.
    """
    sections = []

    # Claim
    claim = state.get("claim_text", "")
    sections.append(f"## CLAIM TO VERIFY\n\"{claim}\"")

    # Extracted entities (for context)
    entities = state.get("extracted_entities") or {}
    if entities:
        sections.append(
            f"## EXTRACTED ENTITIES\n"
            f"Party: {entities.get('party', 'unknown')}\n"
            f"People: {', '.join(entities.get('people', [])) or 'none'}\n"
            f"Topic: {entities.get('topic', 'unknown')}\n"
            f"Numbers mentioned: {entities.get('numbers', [])}"
        )

    # Wikipedia evidence
    wiki_evidence = state.get("wikipedia_evidence", [])
    if wiki_evidence:
        wiki_text = ""
        for i, article in enumerate(wiki_evidence[:5], 1):
            wiki_text += f"\n### Source W{i}: {article['title']}\n"
            wiki_text += f"URL: {article['url']}\n"
            wiki_text += f"{article['extract'][:800]}\n"
        sections.append(f"## WIKIPEDIA EVIDENCE ({len(wiki_evidence)} articles){wiki_text}")
    else:
        sections.append("## WIKIPEDIA EVIDENCE\nNo relevant articles found.")

    # Database evidence
    db_evidence = state.get("db_evidence", [])
    if db_evidence:
        db_text = ""
        for group in db_evidence:
            table = group["source_table"]
            count = group["count"]
            records = group["records"][:10]
            db_text += f"\n### Source DB: {table} ({count} records, showing first {len(records)})\n"
            for rec in records:
                db_text += f"  - {json.dumps(rec, default=str)}\n"
        sections.append(f"## DATABASE EVIDENCE (verified ECI/MyNeta data){db_text}")
    else:
        sections.append("## DATABASE EVIDENCE\nNo matching records in our database.")

    # Web search evidence (NEW)
    web_evidence = state.get("web_evidence", [])
    if web_evidence:
        web_text = ""
        for i, article in enumerate(web_evidence[:8], 1):
            web_text += f"\n### Source N{i}: {article['title']}\n"
            web_text += f"URL: {article['url']}\n"
            web_text += f"{article['content'][:600]}\n"
        sections.append(f"## WEB SEARCH EVIDENCE ({len(web_evidence)} articles — news, fact-checks, press releases){web_text}")
    else:
        sections.append("## WEB SEARCH EVIDENCE\nNo relevant web articles found.")

    return "\n\n".join(sections)


def verdict_agent_node(state: TNElectionState) -> dict:
    msgs = list(state.get("agent_messages", []))
    claim = state.get("claim_text", "").strip()

    if not claim:
        msgs.append(_msg(state, "⚠️ No claim to verify"))
        return {"factcheck_result": None, "agent_messages": msgs}

    # Count all evidence
    wiki_count = len(state.get("wikipedia_evidence", []))
    db_count = sum(e["count"] for e in state.get("db_evidence", []))
    web_count = len(state.get("web_evidence", []))
    msgs.append(_msg(state, f"⚖️ Reviewing evidence: {wiki_count} Wikipedia articles, {db_count} database records, {web_count} web sources"))

    # Build the full evidence prompt
    evidence_prompt = _build_evidence_prompt(state)
    msgs.append(_msg(state, "🧠 Forming verdict based on all evidence..."))

    # Call Claude with ALL the evidence
    response = _llm.invoke([
        SystemMessage(content=_SYSTEM),
        HumanMessage(content=evidence_prompt),
    ])

    content = response.content.strip()

    # Strip markdown code blocks
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = {
            "verdict": "UNVERIFIABLE",
            "confidence_pct": 0,
            "explanation": content,
            "party_about": None,
            "sources_used": [],
        }

    verdict = result.get("verdict", "UNVERIFIABLE")
    confidence = result.get("confidence_pct", 0)
    sources = result.get("sources_used", [])

    msgs.append(_msg(state, f"📊 Verdict: {verdict} (confidence: {confidence}%)"))
    msgs.append(_msg(state, f"💬 {result.get('explanation', '')}"))
    if sources:
        source_names = [s["title"] if isinstance(s, dict) else str(s) for s in sources[:5]]
        msgs.append(_msg(state, f"📎 Sources cited: {', '.join(source_names)}"))

    # Save to Supabase (include sources as JSONB)
    try:
        rest_post("fact_checks", {
            "claim_text": claim,
            "verdict": verdict.lower(),
            "confidence_pct": confidence,
            "explanation": result.get("explanation", ""),
            "party_about": result.get("party_about"),
            "sources": json.dumps(sources) if sources else None,
        })
        msgs.append(_msg(state, "💾 Saved to community database"))
    except Exception:
        pass

    return {"factcheck_result": result, "agent_messages": msgs}
