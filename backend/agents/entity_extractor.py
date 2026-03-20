"""
Entity Extractor — first node in the fact-check pipeline.
Uses Claude to pull structured entities from a raw political claim,
producing search queries for Wikipedia and database lookups.
"""
import json

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from agents.state import TNElectionState

_llm = ChatAnthropic(model="claude-haiku-4-5-20251001", temperature=0, max_tokens=800)

_SYSTEM = """You are an entity extractor for Tamil Nadu political claims.
Given a claim, extract structured entities and return ONLY valid JSON:
{
  "party": "party name or null",
  "people": ["person names mentioned"],
  "topic": "one-word topic like education, healthcare, jobs, infrastructure, corruption, crime",
  "numbers": [any specific numbers mentioned],
  "search_queries": ["2-3 Wikipedia search queries to verify this claim, include Tamil Nadu context"]
}
Examples:
Claim: "DMK promised 1000 schools but only built 200"
→ {"party": "DMK", "people": [], "topic": "education", "numbers": [1000, 200], "search_queries": ["DMK education policy Tamil Nadu", "Tamil Nadu government schools construction"]}

Claim: "Edappadi Palaniswami was involved in a corruption case"
→ {"party": "AIADMK", "people": ["Edappadi Palaniswami"], "topic": "corruption", "numbers": [], "search_queries": ["Edappadi Palaniswami corruption", "AIADMK corruption cases Tamil Nadu"]}

Return ONLY JSON. No markdown, no explanation."""


def _msg(state: TNElectionState, text: str) -> dict:
    return {"session_id": state["session_id"], "agent": "entity_extractor", "text": text, "type": "info"}


def entity_extractor_node(state: TNElectionState) -> dict:
    msgs = list(state.get("agent_messages", []))
    claim = state.get("claim_text", "").strip()

    if not claim:
        msgs.append(_msg(state, "⚠️ No claim provided"))
        return {"extracted_entities": None, "agent_messages": msgs}

    msgs.append(_msg(state, f"🔍 Extracting entities from claim..."))

    response = _llm.invoke([
        SystemMessage(content=_SYSTEM),
        HumanMessage(content=f"Claim: {claim}"),
    ])

    content = response.content.strip()

    # Strip markdown code blocks if present
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    try:
        entities = json.loads(content)
    except json.JSONDecodeError:
        entities = {
            "party": None,
            "people": [],
            "topic": "politics",
            "numbers": [],
            "search_queries": [f"Tamil Nadu {claim[:50]}"],
        }

    party = entities.get("party", "unknown")
    topic = entities.get("topic", "unknown")
    queries = entities.get("search_queries", [])

    msgs.append(_msg(state, f"📋 Entities: party={party}, topic={topic}"))
    msgs.append(_msg(state, f"🔎 Search queries: {', '.join(queries[:3])}"))

    return {"extracted_entities": entities, "agent_messages": msgs}
