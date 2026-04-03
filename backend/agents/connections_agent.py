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

# Verified credible sources only
_VERIFIED_DOMAINS = [
    # ROC / corporate registry aggregators
    "zaubacorp.com", "tofler.in", "indiafilings.com", "filesure.in", "mca.gov.in",
    # Official govt / election
    "myneta.info", "eci.gov.in", "adrindia.org",
    # Major Indian national news
    "thehindu.com", "indianexpress.com", "timesofindia.com", "ndtv.com",
    "livemint.com", "businessstandard.com", "hindustantimes.com", "aninews.in",
    # Investigative / digital media
    "thewire.in", "thenewsminute.com", "caravanmagazine.in", "scroll.in",
    "theprint.in", "thefederal.com", "deccanherald.com", "outlookindia.com",
    "firstpost.com", "moneycontrol.com", "theweek.in",
    # TN / regional credible
    "dinamalar.com", "dtnext.in", "pucl.org",
    # Reference
    "en.wikipedia.org",
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


# ── Tavily (basic depth — matches working allegations agent) ───────────────────

def _tavily_search(query: str, max_results: int = 5,
                   include_domains: list | None = None) -> list[dict]:
    api_key = os.getenv("TAVILY_API_KEY", "")
    if not api_key:
        return []
    body = {
        "api_key": api_key,
        "query": query,
        "max_results": max_results,
        "search_depth": "basic",
        "include_answer": False,
    }
    if include_domains:
        body["include_domains"] = include_domains
    try:
        r = httpx.post(_TAVILY_URL, json=body, timeout=15.0)
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
        include_domains=["myneta.info"],
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

def _extract_din_from_results(results: list[dict]) -> str | None:
    """Extract DIN from Zauba/Tofler/IndiaFilings URLs or content."""
    for r in results:
        url = r.get("url", "")
        # Zauba: zaubacorp.com/director/NAME/01234567
        # Tofler: tofler.in/name/director/01234567
        # IndiaFilings: indiafilings.com/search/name-din-01234567
        din_match = re.search(r'/(\d{8})(?:/|$)', url)
        if din_match:
            return din_match.group(1)
        # Also check content for "DIN: 01234567" or "DIN 01234567"
        content = r.get("content", "")
        din_in_content = re.search(r'DIN[:\s]+(\d{8})', content, re.IGNORECASE)
        if din_in_content:
            return din_in_content.group(1)
    return None


def _search_news(name: str, party: str, constituency: str) -> list[dict]:
    """
    5 targeted Tavily searches — verified domains only, DIN-anchored ROC search.
    Step 1: Find DIN from ROC profile search
    Step 2: Search all companies by confirmed DIN (eliminates wrong-person matches)
    Step 3: News/investigative from verified outlets only
    """
    last_name = name.split()[-1]
    _ROC_DOMAINS = ["zaubacorp.com", "tofler.in", "indiafilings.com", "filesure.in"]

    all_results: list[dict] = []
    seen_urls: set[str] = set()

    def add(results: list[dict]) -> None:
        for r in results:
            if r["url"] not in seen_urls and r.get("score", 0) > 0.1:
                seen_urls.add(r["url"])
                all_results.append(r)

    # Step 1: Find the candidate's ROC profile to extract DIN
    roc_profile = _tavily_search(
        f'"{name}" director Tamil Nadu',
        max_results=5, include_domains=_ROC_DOMAINS,
    )
    add(roc_profile)

    # Step 2: If DIN found, search by DIN — unambiguous, no wrong-person risk
    din = _extract_din_from_results(roc_profile)
    if din:
        din_results = _tavily_search(
            f'DIN {din} director company Tamil Nadu',
            max_results=5, include_domains=_ROC_DOMAINS,
        )
        add(din_results)
    else:
        # Fallback: name + Tamil Nadu to reduce ambiguity
        add(_tavily_search(
            f'"{name}" director company Tamil Nadu {constituency}',
            max_results=5, include_domains=_ROC_DOMAINS,
        ))

    # Step 3: Affidavit / wealth news
    add(_tavily_search(
        f'"{name}" affidavit assets declared company minister Tamil Nadu',
        max_results=5, include_domains=_VERIFIED_DOMAINS,
    ))

    # Step 4: Conflicts and investigative journalism
    add(_tavily_search(
        f'"{name}" conflict interest allegation undisclosed business {party}',
        max_results=5, include_domains=_VERIFIED_DOMAINS,
    ))

    # Step 5: Business / film / trust interests
    add(_tavily_search(
        f'"{name}" company business cinema production media trust Tamil Nadu',
        max_results=5, include_domains=_VERIFIED_DOMAINS,
    ))

    # Keep results mentioning the candidate (name tokens ≥ 4 chars)
    name_tokens = [t.lower() for t in name.replace(".", " ").split() if len(t) >= 4]
    relevant = [
        r for r in all_results
        if any(tok in (r["title"] + " " + r["content"]).lower() for tok in name_tokens)
    ]

    # Attach DIN to results metadata so Claude can use it
    output = relevant if relevant else all_results
    if din:
        for r in output:
            r["_confirmed_din"] = din
    return output


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

    # Check if DIN was confirmed during search
    confirmed_din = next(
        (r.get("_confirmed_din") for r in news if r.get("_confirmed_din")), None
    )
    din_note = f"Confirmed DIN for this candidate: {confirmed_din}. Only include ROC companies linked to this exact DIN." if confirmed_din else \
               "No DIN confirmed. For ROC results: only include a company if Tamil Nadu state AND address/constituency area matches. If name is common and match is uncertain, mark confidence as low."

    system = f"""You are a political transparency analyst for Tamil Nadu elections.
Build the most complete and ACCURATE connection graph. Accuracy is critical — do NOT include ROC company connections unless you can confirm it is the same person.

DISAMBIGUATION RULE: {din_note}

Return ONLY valid JSON (no markdown):
{{
  "nodes": [
    {{"id": "c0",  "type": "candidate", "label": "name",        "detail": "party · constituency",           "source": "declared",  "link": null,           "confidence": "confirmed"}},
    {{"id": "f1",  "type": "family",    "label": "spouse name", "detail": "Spouse",                         "source": "declared",  "link": "<myneta_url>", "confidence": "confirmed"}},
    {{"id": "co1", "type": "company",   "label": "company",     "detail": "Director · DIN confirmed",       "source": "reported",  "link": "<zauba_url>",  "confidence": "confirmed"}},
    {{"id": "co2", "type": "company",   "label": "company",     "detail": "Director · name match only",     "source": "reported",  "link": "<zauba_url>",  "confidence": "low"}},
    {{"id": "p1",  "type": "politician","label": "name",        "detail": "Father · Chief Minister",        "source": "declared",  "link": null,           "confidence": "confirmed"}}
  ],
  "edges": [
    {{"from": "c0", "to": "f1",  "label": "Spouse"}},
    {{"from": "c0", "to": "co1", "label": "Director"}}
  ],
  "summary": "3-4 sentence summary: declared assets, confirmed ROC companies (with DIN), undeclared connections, wealth transfers. Mention DIN if confirmed.",
  "red_flags": [
    {{"text": "Specific conflict with amounts if known", "link": "<source_url>"}}
  ]
}}

Rules:
- Candidate node id MUST be "c0"
- confidence field: "confirmed" = DIN verified OR in affidavit | "medium" = Tamil Nadu + address match | "low" = name match only, may not be same person
- source: "declared" = in affidavit | "reported" = ROC/news with URL | "alleged" = unverified
- Every "reported" node MUST have a real URL from the provided sources
- INCLUDE: spouse, family members with businesses, companies by confirmed DIN
- EXCLUDE: companies where match is uncertain for a common name without DIN confirmation
- Node types: candidate, company, family, politician, donor — max 15 nodes, labels max 4 words
- red_flags: ROC company not in affidavit | spouse company in minister's portfolio | directorship resigned day before filing | large asset transfer to spouse/child"""

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
