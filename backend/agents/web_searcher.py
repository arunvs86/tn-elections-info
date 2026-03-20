"""
Web Searcher — uses Tavily API to find real-time news articles,
fact-checks, and press releases about the claim.

Tavily is purpose-built for AI agents: returns clean text + URLs,
not raw HTML. Free tier = 1,000 searches/month.

API: POST https://api.tavily.com/search
"""
import os
import httpx

from agents.state import TNElectionState

_TAVILY_URL = "https://api.tavily.com/search"


def _msg(state: TNElectionState, text: str) -> dict:
    return {"session_id": state["session_id"], "agent": "web_searcher", "text": text, "type": "info"}


def _tavily_search(query: str, max_results: int = 5) -> list[dict]:
    """
    Call Tavily search API. Returns list of:
      {title, url, content, score}
    """
    api_key = os.getenv("TAVILY_API_KEY", "")
    if not api_key:
        return []

    try:
        r = httpx.post(
            _TAVILY_URL,
            json={
                "api_key": api_key,
                "query": query,
                "max_results": max_results,
                "search_depth": "basic",       # "basic" is faster, "advanced" is deeper
                "include_answer": False,
                "include_domains": [],          # No domain restriction
                "exclude_domains": [],
            },
            timeout=15.0,
        )
        r.raise_for_status()
        data = r.json()
        results = data.get("results", [])
        return [
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", "")[:800],  # Cap snippet length
                "score": item.get("score", 0),
            }
            for item in results
        ]
    except Exception:
        return []


def web_searcher_node(state: TNElectionState) -> dict:
    msgs = list(state.get("agent_messages", []))
    entities = state.get("extracted_entities") or {}
    queries = entities.get("search_queries", [])
    claim = state.get("claim_text", "")

    # Check if Tavily key is configured
    if not os.getenv("TAVILY_API_KEY"):
        msgs.append(_msg(state, "⚠️ No TAVILY_API_KEY configured — skipping web search"))
        return {"web_evidence": [], "agent_messages": msgs}

    # Build search queries: use entity-extracted queries + a direct claim search
    search_queries = []
    for q in queries[:2]:
        search_queries.append(q)
    # Add a direct fact-check query
    party = entities.get("party", "")
    topic = entities.get("topic", "")
    if party and topic:
        search_queries.append(f"{party} {topic} Tamil Nadu 2024 2025 fact check")
    elif claim:
        search_queries.append(f"Tamil Nadu {claim[:60]} fact check")

    msgs.append(_msg(state, f"🌐 Searching the web with {len(search_queries)} queries..."))

    # Collect results across all queries, deduplicate by URL
    all_results = []
    seen_urls = set()
    for query in search_queries[:3]:
        results = _tavily_search(query, max_results=3)
        for item in results:
            url = item["url"]
            if url not in seen_urls:
                seen_urls.add(url)
                all_results.append(item)

    if not all_results:
        msgs.append(_msg(state, "⚠️ No web results found"))
        return {"web_evidence": [], "agent_messages": msgs}

    # Log what we found
    for item in all_results[:5]:
        msgs.append(_msg(state, f"📰 {item['title'][:80]} — {item['url']}"))

    msgs.append(_msg(state, f"✅ Found {len(all_results)} web sources"))

    return {"web_evidence": all_results[:8], "agent_messages": msgs}
