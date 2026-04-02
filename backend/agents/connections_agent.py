"""
Connections agent: builds a political network graph for a candidate on-demand.
Uses Tavily to search for companies, family, associates → Claude structures the graph.
Results are cached in Supabase candidate_connections table.
"""
import os
import json
import httpx

_TAVILY_URL = "https://api.tavily.com/search"
_SUPABASE_URL = os.getenv("SUPABASE_URL", "")
_SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")


# ── Supabase helpers ──────────────────────────────────────────────────────────

def _get_cached(candidate_id: int) -> dict | None:
    if not _SUPABASE_URL or not _SUPABASE_KEY:
        return None
    try:
        r = httpx.get(
            f"{_SUPABASE_URL}/rest/v1/candidate_connections",
            params={"candidate_id": f"eq.{candidate_id}", "select": "graph_data,generated_at"},
            headers={"apikey": _SUPABASE_KEY, "Authorization": f"Bearer {_SUPABASE_KEY}"},
            timeout=8.0,
        )
        rows = r.json()
        if rows and isinstance(rows, list) and len(rows) > 0:
            return rows[0]
    except Exception:
        pass
    return None


def _save_cache(candidate_id: int, graph_data: dict) -> None:
    if not _SUPABASE_URL or not _SUPABASE_KEY:
        return
    try:
        httpx.post(
            f"{_SUPABASE_URL}/rest/v1/candidate_connections",
            headers={
                "apikey": _SUPABASE_KEY,
                "Authorization": f"Bearer {_SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates",
            },
            json={"candidate_id": candidate_id, "graph_data": graph_data},
            timeout=8.0,
        )
    except Exception:
        pass


# ── Tavily search ─────────────────────────────────────────────────────────────

def _tavily_search(query: str, max_results: int = 5) -> list[dict]:
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
                "search_depth": "basic",
                "include_answer": False,
            },
            timeout=15.0,
        )
        r.raise_for_status()
        return [
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", "")[:800],
            }
            for item in r.json().get("results", [])
        ]
    except Exception:
        return []


# ── Claude graph extraction ───────────────────────────────────────────────────

def _claude_extract_graph(name: str, party: str, constituency: str, search_results: list[dict]) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return _fallback_graph(name, party, search_results)

    snippets = "\n\n".join([
        f"[{r['title']}]\n{r['content'][:500]}"
        for r in search_results[:10]
    ])

    system = """You are a political network analyst for Tamil Nadu elections.
Given news snippets about a politician, extract their network of connections.

Return ONLY valid JSON (no markdown, no explanation):
{
  "nodes": [
    {"id": "c0", "type": "candidate", "label": "<name>", "detail": "<party> · <constituency>"},
    {"id": "co1", "type": "company", "label": "<company name>", "detail": "<role e.g. Director, Shareholder>"},
    {"id": "f1", "type": "family", "label": "<person name>", "detail": "<relation e.g. Spouse, Son>"},
    {"id": "p1", "type": "politician", "label": "<name>", "detail": "<party / connection>"},
    {"id": "d1", "type": "donor", "label": "<company/person>", "detail": "Electoral donor · ₹<amount>"}
  ],
  "edges": [
    {"from": "c0", "to": "co1", "label": "Director"},
    {"from": "c0", "to": "f1", "label": "Spouse"},
    {"from": "c0", "to": "p1", "label": "Business associate"}
  ],
  "summary": "1-2 sentence plain English summary of key connections found",
  "red_flags": ["<specific concern if any, e.g. 'Company received ₹50cr govt contract while candidate was minister'>"]
}

Node types: candidate, company, family, politician, donor
Only include connections that are clearly stated in the snippets.
If nothing found for a type, just skip it.
The candidate node id must always be "c0".
Keep labels short (max 5 words). Max 15 nodes total."""

    user = f"Politician: {name} | Party: {party} | Constituency: {constituency}\n\nSearch results:\n{snippets}"

    try:
        r = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1500,
                "temperature": 0,
                "system": system,
                "messages": [{"role": "user", "content": user}],
            },
            timeout=25.0,
        )
        r.raise_for_status()
        raw = r.json()["content"][0]["text"].strip()
        # Strip markdown fences if present
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception:
        return _fallback_graph(name, party, search_results)


def _fallback_graph(name: str, party: str, results: list[dict]) -> dict:
    """Minimal graph with just the candidate node when Claude unavailable."""
    return {
        "nodes": [{"id": "c0", "type": "candidate", "label": name, "detail": party}],
        "edges": [],
        "summary": f"Limited data found for {name}. Try again or check news sources directly.",
        "red_flags": [],
    }


# ── Main entry ────────────────────────────────────────────────────────────────

def build_connections(candidate_id: int, name: str, party: str, constituency: str, force_refresh: bool = False) -> dict:
    """
    On-demand connection graph builder.
    Returns cached result if available (unless force_refresh=True).
    """
    # Check cache first
    if not force_refresh:
        cached = _get_cached(candidate_id)
        if cached:
            return {**cached["graph_data"], "cached": True, "generated_at": cached["generated_at"]}

    # Run searches
    queries = [
        f'"{name}" company director business Tamil Nadu',
        f'"{name}" {party} family relatives assets wealth',
        f'"{name}" {constituency} MLA politician associate partner',
        f'"{name}" Tamil Nadu government contract tender award',
    ]

    all_results: list[dict] = []
    seen_urls: set[str] = set()
    for q in queries:
        for r in _tavily_search(q, max_results=4):
            if r["url"] not in seen_urls:
                seen_urls.add(r["url"])
                all_results.append(r)

    # Filter to only results mentioning this candidate (name token check)
    name_tokens = [t.lower() for t in name.replace(".", " ").split() if len(t) >= 4]
    relevant = [
        r for r in all_results
        if any(tok in (r["title"] + r["content"]).lower() for tok in name_tokens)
    ]

    if not relevant:
        graph = _fallback_graph(name, party, [])
    else:
        graph = _claude_extract_graph(name, party, constituency, relevant)

    graph["cached"] = False

    # Save to cache
    _save_cache(candidate_id, {k: v for k, v in graph.items() if k != "cached"})

    return graph
