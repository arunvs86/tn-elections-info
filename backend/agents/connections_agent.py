"""
Connections agent v3: affidavit-first + targeted investigative news.
Uses search_depth="basic" to match working allegations agent pattern.
Sources:
  1. Myneta affidavit page (via Tavily search)
  2. News/investigative journalism (2 targeted Tavily calls)
  3. Claude synthesizes into a labelled graph with source URLs
"""
import os
import re
import json
import httpx
from tools.db_tools import rest_get, _base, _headers

_TAVILY_URL  = "https://api.tavily.com/search"
_CLAUDE_URL  = "https://api.anthropic.com/v1/messages"


# ── Supabase cache ─────────────────────────────────────────────────────────────

def _get_cached(candidate_id: int) -> dict | None:
    try:
        rows = rest_get("candidate_connections", {
            "candidate_id": f"eq.{candidate_id}",
            "select": "graph_data,generated_at",
        })
        if rows:
            return rows[0]
    except Exception:
        pass
    return None


def _save_cache(candidate_id: int, graph_data: dict) -> None:
    try:
        httpx.post(
            f"{_base()}/candidate_connections",
            headers={**_headers(), "Prefer": "resolution=merge-duplicates"},
            json={"candidate_id": candidate_id, "graph_data": graph_data},
            timeout=8.0,
        )
    except Exception:
        pass


# ── Tavily (basic depth — matches working allegations agent) ───────────────────

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
                "search_depth": "basic",       # same as working allegations agent
                "include_answer": False,
            },
            timeout=15.0,
        )
        r.raise_for_status()
        return [
            {
                "title": item.get("title", ""),
                "url":   item.get("url", ""),
                "content": item.get("content", "")[:800],
                "score": item.get("score", 0),
            }
            for item in r.json().get("results", [])
        ]
    except Exception:
        return []


# ── Myneta affidavit ───────────────────────────────────────────────────────────

def _find_myneta_url(name: str) -> str | None:
    """Single Tavily call to find Myneta affidavit page URL."""
    results = _tavily_search(
        f'"{name}" myneta.info affidavit TamilNadu2026 OR TamilNadu2021',
        max_results=5,
    )
    for r in results:
        url = r.get("url", "")
        if "myneta.info" in url and "candidate.php" in url:
            return url
    return None


def _fetch_myneta_text(url: str) -> str:
    """Fetch Myneta page and return plain text (strips HTML tags)."""
    try:
        r = httpx.get(url, timeout=12.0, follow_redirects=True,
                      headers={"User-Agent": "Mozilla/5.0 tnelections.info"})
        r.raise_for_status()
        html = r.text
        # Strip script/style blocks
        html = re.sub(r'<(script|style)[^>]*>.*?</(script|style)>', '', html,
                      flags=re.DOTALL | re.IGNORECASE)
        # Strip tags
        text = re.sub(r'<[^>]+>', ' ', html)
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:8000]
    except Exception:
        return ""


def _extract_affidavit(name: str, text: str, source_url: str) -> dict:
    """Ask Claude Haiku to extract structured affidavit data from Myneta page text."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or not text:
        return {}
    prompt = f"""Extract affidavit information from this Myneta.info page text for {name}.
Return ONLY valid JSON (no markdown):
{{
  "spouse_name": "name or null",
  "criminal_cases": 0,
  "companies_declared": [
    {{"name": "company", "role": "Director/MD/etc", "holder": "self/spouse"}}
  ],
  "total_assets_self_cr": 0.0,
  "total_assets_spouse_cr": 0.0,
  "source_url": "{source_url}"
}}
Page text:
{text[:6000]}"""
    try:
        r = httpx.post(
            _CLAUDE_URL,
            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01",
                     "content-type": "application/json"},
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 600,
                "temperature": 0,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=20.0,
        )
        r.raise_for_status()
        raw = r.json()["content"][0]["text"].strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception:
        return {}


# ── News searches (3 focused queries with quoted names) ────────────────────────

def _search_news(name: str, party: str, constituency: str) -> list[dict]:
    """
    5 targeted Tavily searches — Zauba/IndiaFilings, family companies, news.
    basic depth, quoted names, score-filtered.
    """
    last_name = name.split()[-1]

    queries = [
        # ROC aggregator sites — finds declared + undeclared directorships
        f'"{name}" zaubacorp.com OR indiafilings.com OR tofler.in director company',
        # Family company connections — son/daughter/wife often hold companies
        f'"{last_name}" family son daughter wife company director business Tamil Nadu',
        # Asset declaration gaps and transfers
        f'"{name}" affidavit assets declared wife company minister',
        # Investigative journalism
        f'"{name}" {party} conflict interest allegation undisclosed business',
        # Specific business interests and film/media connections
        f'"{name}" company Red Giant OR cinema OR production OR media OR trust',
    ]

    all_results: list[dict] = []
    seen_urls: set[str] = set()

    for q in queries:
        for r in _tavily_search(q, max_results=5):
            if r["url"] not in seen_urls and r.get("score", 0) > 0.1:
                seen_urls.add(r["url"])
                all_results.append(r)

    # Keep results mentioning the candidate (name tokens ≥ 4 chars)
    name_tokens = [t.lower() for t in name.replace(".", " ").split() if len(t) >= 4]
    relevant = [
        r for r in all_results
        if any(tok in (r["title"] + " " + r["content"]).lower() for tok in name_tokens)
    ]
    return relevant if relevant else all_results


# ── Claude synthesis ───────────────────────────────────────────────────────────

def _synthesize(name: str, party: str, constituency: str,
                affidavit: dict, news: list[dict]) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return _fallback(name, party)

    affidavit_str = json.dumps(affidavit, ensure_ascii=False) if affidavit else "Not found"

    news_str = "\n\n".join([
        f"[{r['url']}]\nTitle: {r['title']}\n{r['content'][:500]}"
        for r in news[:10]
    ])

    system = """You are a political transparency analyst for Tamil Nadu elections.
Build the most complete possible connection graph from affidavit data, ROC filings (Zauba Corp, IndiaFilings), and news sources.

Return ONLY valid JSON (no markdown):
{
  "nodes": [
    {"id": "c0",  "type": "candidate", "label": "name",        "detail": "party · constituency",       "source": "declared", "link": null},
    {"id": "f1",  "type": "family",    "label": "spouse name", "detail": "Spouse",                     "source": "declared", "link": "<myneta_url>"},
    {"id": "f2",  "type": "family",    "label": "son name",    "detail": "Son · CEO of X",             "source": "reported", "link": "<news_url>"},
    {"id": "co1", "type": "company",   "label": "company",     "detail": "Director (declared)",        "source": "declared", "link": "<myneta_url>"},
    {"id": "co2", "type": "company",   "label": "Red Giant",   "detail": "Film co, son is CEO",        "source": "reported", "link": "<news_url>"},
    {"id": "p1",  "type": "politician","label": "name",        "detail": "Father · Chief Minister",    "source": "declared", "link": null}
  ],
  "edges": [
    {"from": "c0", "to": "f1",  "label": "Spouse"},
    {"from": "c0", "to": "f2",  "label": "Son"},
    {"from": "f2", "to": "co2", "label": "CEO"},
    {"from": "c0", "to": "co1", "label": "Director"}
  ],
  "summary": "3-4 sentence summary covering: declared assets, known family businesses, undeclared connections found in news/ROC, and any wealth transfers between election years.",
  "red_flags": [
    {"text": "Specific conflict description with amounts if known", "link": "<source_url>"}
  ]
}

Rules:
- Candidate node id MUST be "c0", source "declared"
- source: "declared" = explicitly in affidavit | "reported" = found in news/ROC with URL | "alleged" = unverified claim
- Every "reported" node MUST have a real URL from the provided sources
- ALWAYS include: spouse (if known), sons/daughters with businesses, any companies linked via family
- Node types: candidate, company, family, politician, donor
- Max 15 nodes, labels max 4 words
- CRITICAL: If a company appears in ROC (Zauba/IndiaFilings) sources but NOT in the affidavit → source="reported", add red flag "Not declared in affidavit"
- If son/daughter holds a company linked to the candidate's ministerial portfolio → red flag
- If spouse's assets grew significantly between election years → red flag with amounts
- If candidate resigned directorship just before filing (transferred to spouse/child same day) → red flag
- Include film production companies, trusts, holding companies even if held by family"""

    user = f"""Candidate: {name}
Party: {party}
Constituency: {constituency}

AFFIDAVIT (official ECI declaration):
{affidavit_str}

NEWS SOURCES:
{news_str}"""

    try:
        r = httpx.post(
            _CLAUDE_URL,
            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01",
                     "content-type": "application/json"},
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 2000,
                "temperature": 0,
                "system": system,
                "messages": [{"role": "user", "content": user}],
            },
            timeout=40.0,
        )
        r.raise_for_status()
        raw = r.json()["content"][0]["text"].strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        # Ensure candidate node always exists
        if not any(n["id"] == "c0" for n in result.get("nodes", [])):
            result.setdefault("nodes", []).insert(0, {
                "id": "c0", "type": "candidate", "label": name,
                "detail": f"{party} · {constituency}", "source": "declared", "link": None,
            })
        return result
    except Exception:
        return _fallback(name, party)


def _fallback(name: str, party: str) -> dict:
    return {
        "nodes": [{"id": "c0", "type": "candidate", "label": name,
                   "detail": party, "source": "declared", "link": None}],
        "edges": [],
        "summary": f"No connection data found for {name}. Try again or check back later.",
        "red_flags": [],
    }


# ── Main entry ─────────────────────────────────────────────────────────────────

def build_connections(candidate_id: int, name: str, party: str,
                      constituency: str, force_refresh: bool = False) -> dict:
    # Serve from cache unless forced
    if not force_refresh:
        cached = _get_cached(candidate_id)
        if cached:
            return {**cached["graph_data"], "cached": True,
                    "generated_at": cached["generated_at"]}

    # Step 1: Affidavit (best-effort)
    affidavit_data: dict = {}
    myneta_url = _find_myneta_url(name)
    if myneta_url:
        page_text = _fetch_myneta_text(myneta_url)
        if page_text:
            affidavit_data = _extract_affidavit(name, page_text, myneta_url)

    # Step 2: News (3 focused Tavily calls, basic depth)
    news_results = _search_news(name, party, constituency)

    # Step 3: Synthesize (or fallback)
    if not affidavit_data and not news_results:
        graph = _fallback(name, party)
    else:
        graph = _synthesize(name, party, constituency, affidavit_data, news_results)

    graph["cached"] = False
    _save_cache(candidate_id, {k: v for k, v in graph.items() if k != "cached"})
    return graph
