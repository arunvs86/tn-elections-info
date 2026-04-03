"""
Connections agent v2: affidavit-first + targeted investigative news.

Sources (in order of reliability):
1. Myneta.info affidavit  → officially declared connections
2. Targeted news search   → reported but undeclared connections (with source URLs)

Each graph node is tagged with:
  source: "declared" | "reported" | "alleged"
  link:   URL to the affidavit page or news article
"""
import os
import re
import json
import httpx
from tools.db_tools import rest_get, _base, _headers

_TAVILY_URL = "https://api.tavily.com/search"
_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

# Investigative outlets most likely to have TN politician coverage
_INVESTIGATIVE_DOMAINS = [
    "thewire.in", "thenewsminute.com", "thehindu.com",
    "caravanmagazine.in", "scroll.in", "thefederal.com",
    "deccanherald.com", "outlookindia.com", "indiatoday.in",
    "ndtv.com", "theprint.in",
]


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


# ── Tavily search ──────────────────────────────────────────────────────────────

def _tavily_search(query: str, max_results: int = 8) -> list[dict]:
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
                "search_depth": "advanced",
                "include_answer": False,
            },
            timeout=20.0,
        )
        r.raise_for_status()
        return [
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", "")[:1000],
            }
            for item in r.json().get("results", [])
        ]
    except Exception:
        return []


# ── Myneta affidavit ───────────────────────────────────────────────────────────

def _html_to_text(html: str) -> str:
    """Strip HTML tags and collapse whitespace."""
    html = re.sub(r"<(script|style)[^>]*>.*?</(script|style)>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:10000]


def _find_myneta_url(name: str) -> str | None:
    """Find Myneta affidavit URL — search includes myneta.info naturally."""
    first = name.split()[0]
    results = _tavily_search(
        f"{name} myneta.info affidavit TamilNadu2026 OR TamilNadu2021 candidate",
        max_results=5,
    )
    for r in results:
        url = r.get("url", "")
        if "myneta.info" in url and "candidate.php" in url:
            return url

    # Direct fetch fallback: search Myneta's own candidate list
    for year in [2026, 2021]:
        try:
            search_url = f"https://myneta.info/TamilNadu{year}/index.php?action=show_candidates&constituency_id=0&name={first}"
            resp = httpx.get(search_url, timeout=10.0, follow_redirects=True,
                             headers={"User-Agent": "Mozilla/5.0 tnelections.info"})
            ids = re.findall(r'candidate\.php\?candidate_id=(\d+)', resp.text)
            names_in_page = re.findall(r'candidate_id=\d+"[^>]*>([^<]+)<', resp.text)
            # Pick the candidate ID whose surrounding name best matches
            for cid in ids[:10]:
                candidate_url = f"https://myneta.info/TamilNadu{year}/candidate.php?candidate_id={cid}"
                # Quick check: fetch page title to verify name
                try:
                    page = httpx.get(candidate_url, timeout=8.0, follow_redirects=True,
                                     headers={"User-Agent": "Mozilla/5.0 tnelections.info"})
                    if any(part.lower() in page.text.lower() for part in name.split() if len(part) > 3):
                        return candidate_url
                except Exception:
                    continue
        except Exception:
            continue
    return None


def _fetch_myneta_page(url: str) -> str:
    """Fetch Myneta candidate page and return plain text."""
    try:
        r = httpx.get(
            url,
            timeout=15.0,
            headers={"User-Agent": "Mozilla/5.0 tnelections.info research bot"},
            follow_redirects=True,
        )
        r.raise_for_status()
        return _html_to_text(r.text)
    except Exception:
        return ""


def _extract_affidavit(name: str, page_text: str, source_url: str) -> dict:
    """Ask Claude Haiku to extract structured data from Myneta page text."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or not page_text:
        return {}

    prompt = f"""Extract affidavit information from this Myneta.info candidate page for {name}.

Return ONLY valid JSON (no markdown):
{{
  "spouse_name": "name or null",
  "criminal_cases": 0,
  "criminal_sections": ["IPC 143", "IPC 188"],
  "total_assets_self_cr": 0.0,
  "total_assets_spouse_cr": 0.0,
  "companies_declared": [
    {{"name": "company name", "role": "Director/MD/Partner", "holder": "self or spouse"}}
  ],
  "source_url": "{source_url}"
}}

Rules:
- total_assets_self_cr and total_assets_spouse_cr must be in crores (divide rupees by 1,00,00,000)
- Only include companies explicitly listed on the page
- criminal_sections: list actual IPC section numbers found
- If a field is not found, use null or 0 or []

Page text:
{page_text}"""

    try:
        r = httpx.post(
            _ANTHROPIC_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 800,
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


# ── News search ────────────────────────────────────────────────────────────────

def _search_news(name: str, party: str, constituency: str) -> list[dict]:
    """2 Tavily searches for connections — broad + investigative."""
    last = name.split()[-1] if name.split() else name

    all_results: list[dict] = []
    seen_urls: set[str] = set()

    # Search 1: business, family, assets
    for r in _tavily_search(
        f"{name} company director family business assets wealth Tamil Nadu politician",
        max_results=8,
    ):
        if r["url"] not in seen_urls:
            seen_urls.add(r["url"])
            all_results.append(r)

    # Search 2: conflicts, allegations, political network
    for r in _tavily_search(
        f"{name} {party} conflict interest minister allegation undisclosed son wife Tamil Nadu",
        max_results=8,
    ):
        if r["url"] not in seen_urls:
            seen_urls.add(r["url"])
            all_results.append(r)

    # Keep results that mention the candidate by name
    name_tokens = [t.lower() for t in name.split() if len(t) >= 3]
    relevant = [
        r for r in all_results
        if any(tok in (r["title"] + " " + r["content"]).lower() for tok in name_tokens)
    ]
    return relevant if relevant else all_results


# ── Claude graph synthesis ─────────────────────────────────────────────────────

def _synthesize_graph(
    name: str,
    party: str,
    constituency: str,
    affidavit: dict,
    news_results: list[dict],
) -> dict:
    """Synthesize affidavit + news into a sourced connection graph."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return _fallback_graph(name, party)

    affidavit_str = json.dumps(affidavit, ensure_ascii=False) if affidavit else "Not available"
    news_str = "\n\n".join([
        f"[SOURCE URL: {r['url']}]\nTitle: {r['title']}\n{r['content'][:600]}"
        for r in news_results[:15]
    ])

    system = """You are a political transparency analyst for Tamil Nadu elections.
Build a connection graph from official affidavit data and news sources.

Return ONLY valid JSON (no markdown):
{
  "nodes": [
    {"id": "c0", "type": "candidate", "label": "<name>", "detail": "<party> · <constituency>", "source": "declared", "link": null},
    {"id": "f1", "type": "family", "label": "<spouse name>", "detail": "Spouse · declared", "source": "declared", "link": "<affidavit source_url>"},
    {"id": "f2", "type": "family", "label": "<son/daughter>", "detail": "<relation> · <role>", "source": "reported", "link": "<news url>"},
    {"id": "co1", "type": "company", "label": "<company>", "detail": "<role> · declared", "source": "declared", "link": "<affidavit source_url>"},
    {"id": "co2", "type": "company", "label": "<company>", "detail": "<role> · not declared", "source": "reported", "link": "<exact news url>"},
    {"id": "p1", "type": "politician", "label": "<name>", "detail": "<relation>", "source": "declared", "link": null}
  ],
  "edges": [
    {"from": "c0", "to": "f1", "label": "Spouse"},
    {"from": "c0", "to": "co1", "label": "Director"}
  ],
  "summary": "2-3 sentence summary covering key connections, conflicts of interest, and any wealth transfer patterns.",
  "red_flags": [
    {"text": "Specific conflict of interest description", "link": "<source url>"}
  ]
}

Rules:
- Candidate node id MUST be "c0", source MUST be "declared"
- source field: "declared" = from affidavit, "reported" = found in news (must have real URL), "alleged" = unverified claim
- Every "reported" or "alleged" node MUST have the exact URL from the news sources provided
- Declared nodes use the affidavit source_url as link
- Max 15 nodes total
- red_flags: only genuine conflicts of interest (e.g. spouse directs company in candidate's ministry portfolio; assets transferred to family before election; company received govt contract while candidate was minister)
- Each red_flag MUST have a source link
- If spouse declared in affidavit → always include as family node
- Detect wealth transfer: if news mentions assets moved to spouse/children → red flag
- Keep node labels concise (max 4 words)
- If data is limited, still write a useful summary from what is known"""

    user = f"""Candidate: {name}
Party: {party}
Constituency: {constituency}

OFFICIAL AFFIDAVIT DATA (ECI declaration via Myneta.info):
{affidavit_str}

NEWS SOURCES (titles and snippets with URLs):
{news_str}"""

    try:
        r = httpx.post(
            _ANTHROPIC_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 2000,
                "temperature": 0,
                "system": system,
                "messages": [{"role": "user", "content": user}],
            },
            timeout=45.0,
        )
        r.raise_for_status()
        raw = r.json()["content"][0]["text"].strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        # Ensure candidate node exists
        if not any(n["id"] == "c0" for n in result.get("nodes", [])):
            result.setdefault("nodes", []).insert(0, {
                "id": "c0", "type": "candidate", "label": name,
                "detail": f"{party} · {constituency}",
                "source": "declared", "link": None,
            })
        return result
    except Exception:
        return _fallback_graph(name, party)


def _fallback_graph(name: str, party: str) -> dict:
    return {
        "nodes": [{
            "id": "c0", "type": "candidate", "label": name,
            "detail": party, "source": "declared", "link": None,
        }],
        "edges": [],
        "summary": f"Could not retrieve connection data for {name} at this time. Please try again.",
        "red_flags": [],
    }


# ── Main entry ─────────────────────────────────────────────────────────────────

def build_connections(
    candidate_id: int,
    name: str,
    party: str,
    constituency: str,
    force_refresh: bool = False,
) -> dict:
    # Check cache
    if not force_refresh:
        cached = _get_cached(candidate_id)
        if cached:
            return {**cached["graph_data"], "cached": True, "generated_at": cached["generated_at"]}

    # Step 1: Find and parse affidavit
    affidavit_data: dict = {}
    myneta_url = _find_myneta_url(name)
    if myneta_url:
        page_text = _fetch_myneta_page(myneta_url)
        if page_text:
            affidavit_data = _extract_affidavit(name, page_text, myneta_url)

    # Step 2: Search investigative news
    news_results = _search_news(name, party, constituency)

    # Step 3: Synthesize graph
    if not affidavit_data and not news_results:
        graph = _fallback_graph(name, party)
    else:
        graph = _synthesize_graph(name, party, constituency, affidavit_data, news_results)

    graph["cached"] = False
    _save_cache(candidate_id, {k: v for k, v in graph.items() if k != "cached"})

    return graph
