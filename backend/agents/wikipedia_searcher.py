"""
Wikipedia Searcher — fetches relevant Wikipedia articles for fact-checking.
Uses the free MediaWiki API (no key required).

Two-step process:
  1. Search Wikipedia for relevant articles using extracted queries
  2. Fetch article extracts (first 2-3 paragraphs) for each result
"""
import httpx

from agents.state import TNElectionState

_WIKI_API = "https://en.wikipedia.org/w/api.php"


def _msg(state: TNElectionState, text: str) -> dict:
    return {"session_id": state["session_id"], "agent": "wikipedia_searcher", "text": text, "type": "info"}


def _search_wikipedia(query: str, limit: int = 3) -> list[str]:
    """
    Step 1: Search Wikipedia and return article titles.
    Uses the 'list=search' API — returns titles ranked by relevance.
    """
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srlimit": limit,
        "format": "json",
    }
    try:
        r = httpx.get(_WIKI_API, params=params, timeout=8.0)
        r.raise_for_status()
        results = r.json().get("query", {}).get("search", [])
        return [item["title"] for item in results]
    except Exception:
        return []


def _fetch_extracts(titles: list[str]) -> list[dict]:
    """
    Step 2: Fetch article extracts (plain text, first 1500 chars).
    Uses the 'prop=extracts' API — returns clean, readable text.
    """
    if not titles:
        return []

    params = {
        "action": "query",
        "titles": "|".join(titles[:5]),  # Max 5 articles
        "prop": "extracts",
        "exintro": True,         # Only the intro section
        "explaintext": True,     # Plain text, not HTML
        "exchars": 1500,         # Limit extract length
        "format": "json",
    }
    try:
        r = httpx.get(_WIKI_API, params=params, timeout=10.0)
        r.raise_for_status()
        pages = r.json().get("query", {}).get("pages", {})
        results = []
        for page_id, page in pages.items():
            if page_id == "-1" or not page.get("extract"):
                continue
            title = page["title"]
            results.append({
                "title": title,
                "extract": page["extract"][:1500],
                "url": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
            })
        return results
    except Exception:
        return []


def wikipedia_searcher_node(state: TNElectionState) -> dict:
    msgs = list(state.get("agent_messages", []))
    entities = state.get("extracted_entities") or {}
    queries = entities.get("search_queries", [])

    if not queries:
        # Fallback: construct a basic query from the claim
        claim = state.get("claim_text", "")
        party = entities.get("party", "")
        topic = entities.get("topic", "")
        queries = [f"{party} {topic} Tamil Nadu" if party else f"Tamil Nadu {claim[:40]}"]

    msgs.append(_msg(state, f"📚 Searching Wikipedia with {len(queries)} queries..."))

    # Collect unique article titles across all queries
    all_titles = []
    seen = set()
    for query in queries[:3]:  # Max 3 queries
        titles = _search_wikipedia(query, limit=3)
        for t in titles:
            if t not in seen:
                seen.add(t)
                all_titles.append(t)

    if not all_titles:
        msgs.append(_msg(state, "⚠️ No Wikipedia articles found"))
        return {"wikipedia_evidence": [], "agent_messages": msgs}

    msgs.append(_msg(state, f"📄 Found {len(all_titles)} articles: {', '.join(all_titles[:5])}"))

    # Fetch extracts for all unique articles
    evidence = _fetch_extracts(all_titles[:5])

    msgs.append(_msg(state, f"✅ Retrieved {len(evidence)} Wikipedia extracts"))

    return {"wikipedia_evidence": evidence, "agent_messages": msgs}
