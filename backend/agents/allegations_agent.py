"""
Allegations agent: searches web for candidate news, allegations, controversies.
Uses Google Custom Search API + Claude for severity classification.
"""
import os
import json
import httpx

_GOOGLE_CSE_URL = "https://www.googleapis.com/customsearch/v1"

# Domains to exclude from results (appended to query as -site:)
_EXCLUDE_SITES = [
    "reddit.com", "facebook.com", "twitter.com", "x.com",
    "instagram.com", "youtube.com", "quora.com", "wikipedia.org",
    "scribd.com", "slideshare.net", "academia.edu",
]
_EXCLUDE_QUERY = " ".join(f"-site:{s}" for s in _EXCLUDE_SITES)


def _google_search(query: str, max_results: int = 10) -> list[dict]:
    """Search using Google Custom Search JSON API. Returns up to 10 results."""
    api_key = os.getenv("GOOGLE_CSE_KEY", "")
    cx = os.getenv("GOOGLE_CSE_ID", "")
    if not api_key or not cx:
        return []
    try:
        full_query = f"{query} {_EXCLUDE_QUERY}"
        r = httpx.get(
            _GOOGLE_CSE_URL,
            params={
                "key": api_key,
                "cx": cx,
                "q": full_query,
                "num": min(max_results, 10),
                "gl": "in",        # India results
                "lr": "lang_en",   # English pages (Tamil outlets publish English too)
            },
            timeout=15.0,
        )
        r.raise_for_status()
        items = r.json().get("items", [])
        return [
            {
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "content": item.get("snippet", ""),
                "score": 1.0,  # Google doesn't give a relevance score
            }
            for item in items
        ]
    except Exception:
        return []


def _claude_classify(name: str, party: str, constituency: str, results: list[dict]) -> list[dict]:
    """Ask Claude to disambiguate and classify each result."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return []

    snippets = "\n".join([
        f"{i+1}. [{r['title']}]\nURL: {r['url']}\n{r['content'][:500]}"
        for i, r in enumerate(results[:12])
    ])

    system = """You are a political news analyst for Tamil Nadu elections.

You will receive news snippets about a specific Tamil Nadu politician. For each snippet:

STEP 1 — Disambiguation: Check if this article is genuinely about THIS specific candidate
(matching name, party, and constituency). If it's about a different person who shares the
same name, mark is_about_candidate: false.

STEP 2 — Classification: If it IS about this candidate, mark is_allegation: true for ANY of:
- Physical altercations (slapping, assaulting, beating, threatening anyone)
- Verbal abuse, offensive remarks, hate speech, derogatory statements
- Corruption, bribery, scams, financial irregularities, DA cases
- Criminal cases, FIRs, arrests, raids, court cases, bail
- Misconduct, disciplinary action, party suspension/expulsion, show-cause notice
- Protests or public complaints filed against the candidate
- Controversies, scandals, public disputes, rows
- Abuse of power, misuse of government resources
- Land grab, illegal encroachment, property disputes
- Election code violations, poll malpractice

Mark is_allegation: false ONLY for genuinely neutral/positive news
(election wins, inaugurations, welfare work, policy speeches, awards).

For each snippet return:
- index: snippet number
- is_about_candidate: true or false
- is_allegation: true or false
- title: short descriptive title (max 10 words)
- summary: one clear sentence of what happened
- severity: "serious" | "moderate" | "minor"

Return ONLY a JSON array, no markdown:
[{"index": 1, "is_about_candidate": true, "is_allegation": true, "title": "...", "summary": "...", "severity": "serious"}]"""

    user = (
        f"Candidate: {name}\nParty: {party}\nConstituency: {constituency}, Tamil Nadu\n\n"
        f"News snippets:\n{snippets}"
    )

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
            timeout=20.0,
        )
        r.raise_for_status()
        raw = r.json()["content"][0]["text"]
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception:
        return []


def _extract_source_name(url: str) -> str:
    try:
        parts = url.split("/")
        domain = parts[2] if len(parts) > 2 else url
        return domain.replace("www.", "").replace("m.", "")
    except Exception:
        return url


def _build_queries(short_name: str, party: str, constituency: str) -> list[str]:
    return [
        f'{short_name} {party} {constituency} controversy scandal misconduct complaint Tamil Nadu',
        f'{short_name} {party} assault attack slap beat threaten violence altercation',
        f'{short_name} {party} {constituency} arrest FIR case court criminal charges bail',
        f'{short_name} {party} MLA suspended expelled disciplinary action show cause notice',
        f'{short_name} {party} corruption fraud scam bribe illegal money raid disproportionate assets',
        f'{short_name} {constituency} MLA complaint protest petition residents public against',
        f'{short_name} {party} controversial statement remarks row hate speech offensive',
        f'{short_name} {party} election commission complaint violation code conduct poll',
        f'{short_name} {constituency} land grab encroachment property illegal construction',
        f'{short_name} {constituency} Tamil Nadu MLA news 2021 2022 2023 2024 2025',
    ]


def debug_raw_search(name: str, party: str, constituency: str) -> dict:
    """Returns raw Google search results per query with no filtering — for debugging."""
    api_key = os.getenv("GOOGLE_CSE_KEY", "")
    cx = os.getenv("GOOGLE_CSE_ID", "")

    # Check env vars first
    if not api_key or not cx:
        return {
            "error": "Missing env vars",
            "GOOGLE_CSE_KEY_set": bool(api_key),
            "GOOGLE_CSE_ID_set": bool(cx),
        }

    # Test a single raw call and capture any error
    test_query = f"{name} {party} Tamil Nadu"
    try:
        r = httpx.get(
            _GOOGLE_CSE_URL,
            params={"key": api_key, "cx": cx, "q": test_query, "num": 3, "gl": "in"},
            timeout=15.0,
        )
        raw_response = r.json()
        if r.status_code != 200:
            return {"error": raw_response, "status_code": r.status_code}
    except Exception as e:
        return {"error": str(e)}

    name_parts = [t for t in name.replace(".", " ").split() if len(t) >= 4]
    short_name = name_parts[0] if name_parts else name
    queries = _build_queries(short_name, party, constituency)

    output = []
    for query in queries[:3]:  # Only first 3 to save quota
        results = _google_search(query, max_results=5)
        output.append({
            "query": query,
            "count": len(results),
            "results": [{"title": r["title"], "url": r["url"]} for r in results],
        })
    return {"queries": output, "test_result_count": len(raw_response.get("items", []))}


def fetch_allegations(name: str, party: str, constituency: str) -> dict:
    """
    Main entry: search web for candidate allegations, classify with Claude.
    Returns {"allegations": [...], "source": "web|none", "ai_classified": bool}
    """
    if not name:
        return {"allegations": [], "source": "none", "ai_classified": False}

    # Primary name token — e.g. "Govindarajan" from "Govindarajan T.J"
    name_parts = [t for t in name.replace(".", " ").split() if len(t) >= 4]
    primary_token = name_parts[0].lower() if name_parts else name.lower()
    short_name = name_parts[0] if name_parts else name

    queries = _build_queries(short_name, party, constituency)

    all_results = []
    seen_urls = set()
    for query in queries:
        results = _google_search(query, max_results=5)
        for r in results:
            if r["url"] not in seen_urls:
                seen_urls.add(r["url"])
                all_results.append(r)

    if not all_results:
        return {"allegations": [], "source": "none", "ai_classified": False}

    def is_relevant(result: dict) -> bool:
        """
        Only check that the primary name token appears in the result.
        Claude handles disambiguation (including Tamil-script party/constituency names).
        """
        combined = (result["title"] + " " + result["content"]).lower()
        return primary_token in combined

    relevant_results = [r for r in all_results if is_relevant(r)]

    if not relevant_results:
        return {"allegations": [], "source": "none", "ai_classified": False}

    # Claude classifies and disambiguates
    classifications = _claude_classify(name, party, constituency, relevant_results)

    allegations = []

    if classifications:
        for item in classifications:
            if not item.get("is_about_candidate", True):
                continue
            if not item.get("is_allegation", False):
                continue
            idx = item.get("index", 0) - 1
            if 0 <= idx < len(relevant_results):
                result = relevant_results[idx]
                allegations.append({
                    "title": item.get("title", result["title"][:80]),
                    "summary": item.get("summary", result["content"][:200]),
                    "source_url": result["url"],
                    "source_name": _extract_source_name(result["url"]),
                    "severity": item.get("severity", "minor"),
                })
        return {"allegations": allegations[:8], "source": "web", "ai_classified": True}
    else:
        # Claude unavailable — keyword fallback
        controversy_keywords = [
            "allege", "accuse", "arrest", "case", "scam", "corrupt", "contro",
            "charge", "raid", "probe", "fraud", "complaint", "fir", "crime",
            "resign", "scandal", "bribe", "caught", "convicted", "bail",
            "slap", "assault", "attack", "abuse", "threaten",
            "suspend", "expel", "disciplin", "protest", "violence", "row",
        ]
        for r in relevant_results[:10]:
            combined = (r["title"] + " " + r["content"]).lower()
            if not any(kw in combined for kw in controversy_keywords):
                continue
            severity = (
                "serious" if any(kw in combined for kw in [
                    "arrest", "fir", "raid", "prison", "convicted", "bail",
                    "assault", "attack", "slap", "violence",
                ])
                else "moderate" if any(kw in combined for kw in [
                    "corrupt", "scam", "fraud", "bribe", "complaint",
                    "suspend", "expel", "disciplin",
                ])
                else "minor"
            )
            allegations.append({
                "title": r["title"][:80],
                "summary": r["content"][:200],
                "source_url": r["url"],
                "source_name": _extract_source_name(result["url"]),
                "severity": severity,
            })
        return {"allegations": allegations[:8], "source": "web", "ai_classified": False}
