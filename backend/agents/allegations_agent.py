"""
Allegations agent: searches web for candidate news, allegations, controversies.
Uses Tavily for web search + Claude for severity classification.
Falls back to raw Tavily results if Claude API credits are unavailable.
"""
import os
import json
import httpx

_TAVILY_URL = "https://api.tavily.com/search"


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
        results = r.json().get("results", [])
        return [
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", "")[:600],
                "score": item.get("score", 0),
            }
            for item in results
        ]
    except Exception:
        return []


def _claude_classify(name: str, party: str, results: list[dict]) -> list[dict]:
    """Ask Claude to classify each result's severity. Returns enriched list or [] if credits unavailable."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return []

    snippets = "\n".join([
        f"{i+1}. [{r['title']}] {r['content'][:300]}"
        for i, r in enumerate(results[:8])
    ])

    system = """You are a political news classifier for Tamil Nadu elections.
Given news snippets about a candidate, classify each as an allegation/controversy or neutral news.
For each, extract:
- title: short title (max 10 words)
- summary: one sentence summary of what the article is about
- severity: "serious" (criminal/corruption/arrest) | "moderate" (financial/ethical issue) | "minor" (political controversy/criticism)
- is_allegation: true if it's an allegation or controversy, false if it's neutral/positive news

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
                "max_tokens": 1000,
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

    # Build focused search queries
    queries = [
        f'"{name}" {party} allegations controversy Tamil Nadu 2024 2025',
        f'"{name}" {constituency} corruption arrest scam case news',
        f'"{name}" Tamil Nadu politician controversy charges',
    ]

    all_results = []
    seen_urls = set()
    for query in queries:
        results = _tavily_search(query, max_results=4)
        for r in results:
            if r["url"] not in seen_urls and r.get("score", 0) > 0.2:
                seen_urls.add(r["url"])
                all_results.append(r)

    if not all_results:
        return {"allegations": [], "source": "none", "ai_classified": False}

    # Try Claude classification
    classifications = _claude_classify(name, party, all_results)

    allegations = []

    if classifications:
        # Claude successfully classified — use its output
        for item in classifications:
            if not item.get("is_allegation", False):
                continue
            idx = item.get("index", 0) - 1
            if 0 <= idx < len(all_results):
                result = all_results[idx]
                allegations.append({
                    "title": item.get("title", result["title"][:80]),
                    "summary": item.get("summary", result["content"][:200]),
                    "source_url": result["url"],
                    "source_name": _extract_source_name(result["url"]),
                    "severity": item.get("severity", "minor"),
                })
        return {"allegations": allegations[:6], "source": "web", "ai_classified": True}
    else:
        # Claude unavailable — return raw Tavily results as-is
        # Filter out obviously irrelevant results using simple keyword check
        controversy_keywords = [
            "allege", "accuse", "arrest", "case", "scam", "corrupt", "contro",
            "charge", "raid", "probe", "fraud", "complaint", "fir", "crime",
            "resign", "scandal", "money", "bribe", "caught"
        ]
        for r in all_results[:8]:
            combined = (r["title"] + " " + r["content"]).lower()
            has_keyword = any(kw in combined for kw in controversy_keywords)
            severity = "serious" if any(kw in combined for kw in ["arrest", "fir", "raid", "prison", "convicted"]) else \
                       "moderate" if any(kw in combined for kw in ["corrupt", "scam", "fraud", "bribe"]) else "minor"
            allegations.append({
                "title": r["title"][:80],
                "summary": r["content"][:200],
                "source_url": r["url"],
                "source_name": _extract_source_name(r["url"]),
                "severity": severity if has_keyword else "minor",
            })

        return {"allegations": allegations[:6], "source": "web", "ai_classified": False}
