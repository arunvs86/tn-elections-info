"""
Allegations agent: searches web for candidate news, allegations, controversies.
Uses Tavily for web search + Claude for severity classification.
Falls back to raw Tavily results if Claude API credits are unavailable.
"""
import os
import json
import httpx

_TAVILY_URL = "https://api.tavily.com/search"

# Verified Tamil Nadu / Indian news domains only
_VERIFIED_DOMAINS = [
    "thehindu.com",
    "thenewsminute.com",
    "ndtv.com",
    "timesofindia.com",
    "indiatoday.in",
    "deccanherald.com",
    "indianexpress.com",
    "scroll.in",
    "thewire.in",
    "dinamalar.com",
    "dinamani.com",
    "puthiyathalaimurai.tv",
    "polimer.com",
    "news18.com",
    "theprint.in",
    "hindustantimes.com",
    "outlookindia.com",
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
                "include_domains": _VERIFIED_DOMAINS,
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

    # 5 focused queries covering: formal allegations, physical incidents,
    # party/disciplinary issues, general news, and local Tamil Nadu coverage
    queries = [
        f'"{name}" {party} Tamil Nadu controversy scandal misconduct complaint',
        f'"{name}" {constituency} assault attack slap violence arrest FIR case',
        f'"{name}" Tamil Nadu MLA suspended expelled expelled disciplinary action protest',
        f'"{name}" corruption fraud scam bribe charge probe raid',
        f'"{name}" Tamil Nadu news incident 2021 2022 2023 2024 2025',
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

    # Build name tokens for relevance check — significant words only (≥4 chars)
    name_tokens = [
        t.lower() for t in name.replace(".", " ").split()
        if len(t) >= 4
    ]

    def is_relevant(result: dict) -> bool:
        """Return True only if the result is genuinely about this candidate."""
        combined = (result["title"] + " " + result["content"]).lower()
        return any(token in combined for token in name_tokens)

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
