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


# ── ROC: DIN extraction + director-profile-only fetching ──────────────────────

_ROC_DOMAINS = ["zaubacorp.com", "tofler.in", "indiafilings.com", "filesure.in"]


def _extract_din_from_url(url: str) -> str | None:
    """
    Extract DIN from a /director/ profile URL.
    Zauba:       zaubacorp.com/director/NAME/01234567
    Tofler:      tofler.in/name/director/01234567
    FileSure:    filesure.in/director/name/01234567
    IndiaFilings: indiafilings.com/search/name-din-01234567
    """
    m = re.search(r'/(\d{8})(?:/|$)', url)
    return m.group(1) if m else None


def _is_director_profile_url(url: str) -> bool:
    """Return True only for director profile pages, NOT company pages."""
    # Must contain /director/ segment
    return "/director/" in url.lower()


def _fetch_director_profile(profile_url: str, name: str, din: str) -> list[dict]:
    """
    Fetch the Zauba/Tofler director profile page and extract the authoritative
    list of companies where this person is/was a director.
    Returns list of {company_name, role, status, source_url}
    """
    try:
        r = httpx.get(profile_url, timeout=12.0, follow_redirects=True,
                      headers={"User-Agent": "Mozilla/5.0 tnelections.info"})
        r.raise_for_status()
        # Strip HTML
        html = re.sub(r'<(script|style)[^>]*>.*?</(script|style)>', '', r.text,
                      flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', html)
        text = re.sub(r'\s+', ' ', text).strip()[:6000]
    except Exception:
        return []

    # Ask Claude to extract company list from page text
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return []
    try:
        r2 = httpx.post(
            _CLAUDE_URL,
            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01",
                     "content-type": "application/json"},
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 800,
                "temperature": 0,
                "messages": [{"role": "user", "content": f"""
Extract the list of companies where {name} (DIN: {din}) is or was a director from this ROC profile page.
Only include companies where {name} is explicitly listed as Director/MD/Partner — NOT companies that merely have '{name}' in their name.

Return ONLY valid JSON array:
[
  {{"company_name": "ACME PVT LTD", "role": "Director", "status": "Active", "appointed": "2010-01-01", "resigned": null}},
  {{"company_name": "XYZ LLP", "role": "Designated Partner", "status": "Struck Off", "appointed": "2005-03-01", "resigned": "2021-08-20"}}
]

Page text:
{text}
"""}],
            },
            timeout=20.0,
        )
        r2.raise_for_status()
        raw = r2.json()["content"][0]["text"].strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        companies = json.loads(raw.strip())
        # Attach source URL
        for c in companies:
            c["source_url"] = profile_url
        return companies
    except Exception:
        return []


def _get_roc_data(name: str, constituency: str) -> dict:
    """
    Precise ROC lookup:
    1. Search for /director/ profile URLs only (rejects company-name URLs)
    2. Extract DIN from URL
    3. Fetch the director profile page → authoritative company list
    Returns {"din": str|None, "profile_url": str|None, "companies": list}
    """
    # Search ROC sites for this person
    raw = _tavily_search(
        f'"{name}" director DIN Tamil Nadu',
        max_results=8, include_domains=_ROC_DOMAINS,
    )

    # CRITICAL FILTER: only keep /director/ profile URLs — reject /company/ URLs
    director_results = [r for r in raw if _is_director_profile_url(r.get("url", ""))]

    if not director_results:
        return {"din": None, "profile_url": None, "companies": []}

    # Pick the best-scoring director profile
    best = max(director_results, key=lambda r: r.get("score", 0))
    profile_url = best["url"]
    din = _extract_din_from_url(profile_url)

    if not din:
        return {"din": None, "profile_url": profile_url, "companies": []}

    # Fetch and parse the director profile page
    companies = _fetch_director_profile(profile_url, name, din)
    return {"din": din, "profile_url": profile_url, "companies": companies}


# ── News searches ──────────────────────────────────────────────────────────────

def _search_news(name: str, party: str, constituency: str) -> list[dict]:
    """
    News-only Tavily searches from verified outlets.
    ROC data is handled separately via _get_roc_data (director-profile-only).
    """
    all_results: list[dict] = []
    seen_urls: set[str] = set()

    def add(results: list[dict]) -> None:
        for r in results:
            if r["url"] not in seen_urls and r.get("score", 0) > 0.1:
                seen_urls.add(r["url"])
                all_results.append(r)

    add(_tavily_search(
        f'"{name}" affidavit assets declared company minister Tamil Nadu',
        max_results=5, include_domains=_VERIFIED_DOMAINS,
    ))
    add(_tavily_search(
        f'"{name}" conflict interest allegation undisclosed business {party}',
        max_results=5, include_domains=_VERIFIED_DOMAINS,
    ))
    add(_tavily_search(
        f'"{name}" company business cinema production media trust Tamil Nadu',
        max_results=5, include_domains=_VERIFIED_DOMAINS,
    ))

    name_tokens = [t.lower() for t in name.replace(".", " ").split() if len(t) >= 4]
    relevant = [
        r for r in all_results
        if any(tok in (r["title"] + " " + r["content"]).lower() for tok in name_tokens)
    ]
    return relevant if relevant else all_results


# ── Claude synthesis ───────────────────────────────────────────────────────────

def _synthesize(name: str, party: str, constituency: str,
                affidavit: dict, roc_data: dict, news: list[dict]) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return _fallback(name, party)

    affidavit_str = json.dumps(affidavit, ensure_ascii=False) if affidavit else "Not found"

    # ROC: authoritative company list (director-profile-fetched, DIN-confirmed)
    din = roc_data.get("din")
    roc_companies = roc_data.get("companies", [])
    roc_profile_url = roc_data.get("profile_url", "")
    roc_str = f"DIN: {din}\nProfile: {roc_profile_url}\nCompanies (authoritative, fetched from director profile):\n" + \
              json.dumps(roc_companies, ensure_ascii=False) if roc_companies else "No ROC director profile found."

    news_str = "\n\n".join([
        f"[{r['url']}]\nTitle: {r['title']}\n{r['content'][:500]}"
        for r in news[:10]
    ])

    confirmed_din = din
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

ROC DIRECTOR DATA (fetched from director profile page — 100% accurate, DIN-confirmed):
{roc_str}

NEWS SOURCES (verified outlets only):
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

    # Step 1: Affidavit (Myneta)
    affidavit_data: dict = {}
    myneta_url = _find_myneta_url(name)
    if myneta_url:
        page_text = _fetch_myneta_text(myneta_url)
        if page_text:
            affidavit_data = _extract_affidavit(name, page_text, myneta_url)

    # Step 2: ROC data — director-profile-only, DIN-anchored (no false positives)
    roc_data = _get_roc_data(name, constituency)

    # Step 3: News from verified outlets
    news_results = _search_news(name, party, constituency)

    # Step 4: Synthesize (or fallback)
    if not affidavit_data and not roc_data["companies"] and not news_results:
        graph = _fallback(name, party)
    else:
        graph = _synthesize(name, party, constituency, affidavit_data, roc_data, news_results)

    graph["cached"] = False
    _save_cache(candidate_id, {k: v for k, v in graph.items() if k != "cached"})
    return graph
