"""
Verdict Agent — the final node in the fact-check pipeline.
Reviews ALL collected evidence (Wikipedia + database + entities)
and produces an evidence-backed verdict.

This is RAG (Retrieval-Augmented Generation):
  Instead of Claude guessing from memory, it reasons over real data.
"""
import json

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from agents.state import TNElectionState
from tools.db_tools import rest_post

_llm = ChatAnthropic(model="claude-haiku-4-5-20251001", temperature=0, max_tokens=2000)

_SYSTEM = """You are a Tamil Nadu political fact-checker with access to real evidence.
You will receive:
1. A political claim to verify
2. Wikipedia article extracts (background knowledge)
3. Election database records (official ECI/MyNeta data: candidates, votes, criminal cases, assets)

Your job: cross-reference the claim against the evidence and return a verdict.

Rules:
- If the evidence directly supports the claim → TRUE
- If the evidence directly contradicts the claim → FALSE
- If the evidence partially supports but key details are wrong (numbers, names, dates) → MISLEADING
- If the evidence is insufficient to verify → UNVERIFIABLE
- Always cite which specific evidence you used
- Be specific about what's true and what's false in the claim
- Confidence should reflect how strong the evidence is (not your general knowledge)

Return ONLY valid JSON (no markdown):
{
  "verdict": "TRUE" | "FALSE" | "MISLEADING" | "UNVERIFIABLE",
  "confidence_pct": 0-100,
  "explanation": "3-5 sentence explanation citing specific evidence",
  "party_about": "party name or null",
  "sources_used": ["list of sources cited in your explanation"]
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
            wiki_text += f"\n### Article {i}: {article['title']}\n"
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
            records = group["records"][:10]  # Limit to 10 records per group
            db_text += f"\n### {table} ({count} records, showing first {len(records)})\n"
            for rec in records:
                # Compact representation of each record
                db_text += f"  - {json.dumps(rec, default=str)}\n"
        sections.append(f"## DATABASE EVIDENCE (our verified ECI/MyNeta data){db_text}")
    else:
        sections.append("## DATABASE EVIDENCE\nNo matching records in our database.")

    return "\n\n".join(sections)


def verdict_agent_node(state: TNElectionState) -> dict:
    msgs = list(state.get("agent_messages", []))
    claim = state.get("claim_text", "").strip()

    if not claim:
        msgs.append(_msg(state, "⚠️ No claim to verify"))
        return {"factcheck_result": None, "agent_messages": msgs}

    # Count evidence
    wiki_count = len(state.get("wikipedia_evidence", []))
    db_count = sum(e["count"] for e in state.get("db_evidence", []))
    msgs.append(_msg(state, f"⚖️ Reviewing evidence: {wiki_count} Wikipedia articles, {db_count} database records"))

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
        msgs.append(_msg(state, f"📎 Sources: {', '.join(sources[:5])}"))

    # Save to Supabase
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
