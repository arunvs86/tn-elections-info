"""
Allegations agent: searches web for candidate news, allegations, controversies.
Uses Tavily for web search + Claude for severity classification.
Falls back to raw Tavily results if Claude API credits are unavailable.
"""
import os
import json
import httpx

_TAVILY_URL = "https://api.tavily.com/search"

# Low-credibility domains to exclude from results
_EXCLUDE_DOMAINS = [
    "reddit.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "youtube.com",
    "quora.com",
    "wikipedia.org",
]


def _tavily_search(query: str, max_results: int = 6) -> list[dict]:
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
                "exclude_domains": _EXCLUDE_DOMAINS,
            },
            timeout=15.0,
        )
        r.raise_for_status()
        results = r.json().get("results", [])
        return [
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", "")[:800],
                "score": item.get("score", 0),
            }
            for item in results
        ]
    except Exception:
        return []


def _claude_classify(name: str, party: str, results: list[dict]) -> list[dict]:
    """Ask Claude to classify each result. Returns enriched list or [] if credits unavailable."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return []

    snippets = "\n".join([
        f"{i+1}. [{r['title']}] {r['content'][:400]}"
        for i, r in enumerate(results[:10])
    ])

    system = """You are a political news analyst for Tamil Nadu elections. Your job is to surface ANY negative news about a politician — not just formal legal cases.

Mark is_allegation: true for ALL of the following:
- Physical altercations (slapping, assaulting, threatening anyone)
- Verbal abuse, offensive remarks, hate speech
- Corruption, bribery, scams, financial irregularities
- Criminal cases, FIRs, arrests, raids, court cases
- Misconduct, disciplinary action, party suspension/expulsion
- Protests or complaints filed against the candidate
- Controversies, scandals, public disputes
- Abuse of power, misuse of government resources
- Any negative news that reflects on the candidate's conduct or character

Mark is_allegation: false ONLY for genuinely neutral/positive news (election wins, inaugurations, welfare work, speeches on policy).

For each snippet extract:
- title: short descriptive title (max 10 words)
- summary: one clear sentence describing what happened
- severity: "serious" (criminal/violence/corruption/arrest) | "moderate" (financial/ethical/misconduct) | "minor" (verbal dispute/political controversy/criticism)
- is_allegation: true or false

Return ONLY a JSON array, no markdown:
[{"index": 1, "title": "...", "summary": "...", "severity": "...", "is_allegation": true}]"""

    user = f"Candidate: {name} ({party})\n\nNews snippets:\n{snippets}"

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


def fetch_allegations(name: str, party: str, constituency: str) -> dict:
    """
    Main entry: search web for candidate allegations, classify with Claude.
    Gracefully falls back to raw results if Claude credits unavailable.
    Returns {"allegations": [...], "source": "web|none", "ai_classified": bool}
    """
    if not name:
        return {"allegations": [], "source": "none", "ai_classified": False}

    # Primary name token (longest meaningful word, ≥4 chars) — e.g. "Govindarajan"
    name_parts = [t for t in name.replace(".", " ").split() if len(t) >= 4]
    primary_token = name_parts[0].lower() if name_parts else name.lower()
    short_name = name_parts[0] if name_parts else name

    # Disambiguation anchors — must appear alongside the name in a result
    party_token = party.lower() if party else ""
    constituency_token = constituency.lower() if constituency else ""

    # 10 queries covering every angle of negative coverage:
    # violence, legal cases, party discipline, corruption, public complaints,
    # controversial statements, local issues, election controversy, catch-all news
    queries = [
        # 1. General controversy + party + constituency
        f'{short_name} {party} {constituency} controversy scandal misconduct complaint Tamil Nadu',
        # 2. Physical violence / assault incidents
        f'{short_name} {party} assault attack slap beat threaten violence altercation',
        # 3. Arrests, FIRs, court cases, criminal charges
        f'{short_name} {party} {constituency} arrest FIR case court criminal charges bail',
        # 4. Party suspension, expulsion, disciplinary action
        f'{short_name} {party} MLA suspended expelled disciplinary action show cause notice',
        # 5. Corruption, financial crimes, raids
        f'{short_name} {party} corruption fraud scam bribe illegal money raid disproportionate assets',
        # 6. Public protests, petitions, residents complaints against MLA
        f'{short_name} {constituency} MLA complaint protest petition residents public against',
        # 7. Controversial remarks, offensive statements, hate speech
        f'{short_name} {party} controversial statement remarks row hate speech offensive',
        # 8. Election Commission complaints, poll violations
        f'{short_name} {party} election commission complaint violation code conduct poll',
        # 9. Land grab, encroachment, property dispute
        f'{short_name} {constituency} land grab encroachment property illegal construction',
        # 10. Broad recent news catch-all
        f'{short_name} {constituency} Tamil Nadu MLA news 2021 2022 2023 2024 2025',
    ]

    all_results = []
    seen_urls = set()
    for query in queries:
        results = _tavily_search(query, max_results=6)
        for r in results:
            if r["url"] not in seen_urls and r.get("score", 0) > 0.1:
                seen_urls.add(r["url"])
                all_results.append(r)

    if not all_results:
        return {"allegations": [], "source": "none", "ai_classified": False}

    def is_relevant(result: dict) -> bool:
        """
        Result must mention the candidate's primary name token AND at least one
        of: party name, constituency name. Prevents false matches on other
        politicians who share the same name.
        """
        combined = (result["title"] + " " + result["content"]).lower()
        has_name = primary_token in combined
        has_context = (
            (party_token and party_token in combined)
            or (constituency_token and constituency_token in combined)
        )
        return has_name and has_context

    relevant_results = [r for r in all_results if is_relevant(r)]

    if not relevant_results:
        return {"allegations": [], "source": "none", "ai_classified": False}

    # Try Claude classification
    classifications = _claude_classify(name, party, relevant_results)

    allegations = []

    if classifications:
        for item in classifications:
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
        # Claude unavailable — keyword fallback, broader list of terms
        controversy_keywords = [
            "allege", "accuse", "arrest", "case", "scam", "corrupt", "contro",
            "charge", "raid", "probe", "fraud", "complaint", "fir", "crime",
            "resign", "scandal", "bribe", "caught", "convicted", "bail",
            "slap", "assault", "attack", "assault", "abuse", "threaten",
            "suspend", "expel", "disciplin", "protest", "violence", "row",
        ]
        for r in relevant_results[:10]:
            combined = (r["title"] + " " + r["content"]).lower()
            has_controversy = any(kw in combined for kw in controversy_keywords)
            if not has_controversy:
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
                "source_name": _extract_source_name(r["url"]),
                "severity": severity,
            })

        return {"allegations": allegations[:8], "source": "web", "ai_classified": False}
