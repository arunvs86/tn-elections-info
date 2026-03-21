"""
Daily AI Briefing Agent.
Scrapes Tamil Nadu election news from RSS feeds, filters for election-related
stories, and generates bilingual (EN/TA) summaries using Claude Haiku.
Saves the briefing to the daily_briefings table in Supabase.
"""

import os
import json
import xml.etree.ElementTree as ET
from datetime import date

import httpx

from tools.db_tools import rest_get, rest_post


# ── RSS feeds for TN election news ────────────────────
RSS_FEEDS = [
    {
        "name": "The Hindu - Tamil Nadu",
        "url": "https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss",
    },
    {
        "name": "Times of India - Tamil Nadu",
        "url": "https://timesofindia.indiatimes.com/rssfeeds/4859228.cms",
    },
]

# Keywords to filter election-related stories
ELECTION_KEYWORDS = [
    "election", "vote", "voting", "candidate", "dmk", "admk", "aiadmk",
    "bjp", "tvk", "constituency", "mla", "mp", "poll", "ballot",
    "campaign", "manifesto", "alliance", "coalition", "seat", "winner",
    "nomination", "commission", "eci", "swearing", "assembly",
    "stalin", "palaniswami", "annamalai", "vijay", "kamal",
    "congress", "inc", "pmk", "vck", "ntk", "mdmk", "cpim", "cpi",
    "dravidian", "legislature", "minister", "chief minister",
    "governor", "political", "party", "opposition", "ruling",
    "ward", "panchayat", "rally", "speech",
]


def _claude_call(system: str, user: str, max_tokens: int = 2000) -> str:
    """Claude Haiku call for summarisation."""
    r = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": os.getenv("ANTHROPIC_API_KEY"),
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": max_tokens,
            "temperature": 0,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        },
        timeout=30.0,
    )
    r.raise_for_status()
    return r.json()["content"][0]["text"]


# ── RSS fetching ──────────────────────────────────────

def _fetch_rss(feed_url: str, timeout: float = 10.0) -> list[dict]:
    """Fetch and parse an RSS feed, returning a list of story dicts."""
    try:
        r = httpx.get(feed_url, timeout=timeout, follow_redirects=True)
        r.raise_for_status()
    except Exception:
        return []

    stories = []
    try:
        root = ET.fromstring(r.text)
        # Handle both RSS 2.0 (<channel><item>) and Atom (<entry>)
        items = root.findall(".//item") or root.findall(
            ".//{http://www.w3.org/2005/Atom}entry"
        )
        for item in items:
            title = (
                item.findtext("title")
                or item.findtext("{http://www.w3.org/2005/Atom}title")
                or ""
            ).strip()
            link = (
                item.findtext("link")
                or (item.find("{http://www.w3.org/2005/Atom}link") or {}).get("href", "")
            ).strip()
            desc = (
                item.findtext("description")
                or item.findtext("{http://www.w3.org/2005/Atom}summary")
                or ""
            ).strip()
            pub_date = (
                item.findtext("pubDate")
                or item.findtext("{http://www.w3.org/2005/Atom}published")
                or ""
            ).strip()

            if title:
                stories.append({
                    "title": title,
                    "link": link,
                    "description": desc[:500],  # trim long descriptions
                    "pub_date": pub_date,
                })
    except ET.ParseError:
        pass

    return stories


def _is_election_related(story: dict) -> bool:
    """Check if a story is election-related based on keywords."""
    text = f"{story.get('title', '')} {story.get('description', '')}".lower()
    return any(kw in text for kw in ELECTION_KEYWORDS)


def fetch_election_stories() -> list[dict]:
    """Fetch election-related stories from all configured RSS feeds."""
    all_stories = []
    for feed in RSS_FEEDS:
        raw = _fetch_rss(feed["url"])
        for story in raw:
            if _is_election_related(story):
                story["source"] = feed["name"]
                all_stories.append(story)

    # Deduplicate by title similarity (exact match)
    seen_titles = set()
    unique = []
    for s in all_stories:
        norm = s["title"].lower().strip()
        if norm not in seen_titles:
            seen_titles.add(norm)
            unique.append(s)

    return unique[:20]  # cap at 20 stories


# ── Briefing generation ──────────────────────────────

def generate_briefing() -> dict:
    """
    Main entry point: fetch news, generate bilingual briefing, save to DB.
    Returns the saved briefing row.
    """
    today = date.today().isoformat()

    # Check if briefing already exists for today
    existing = rest_get("daily_briefings", {
        "briefing_date": f"eq.{today}",
        "select": "*",
        "limit": "1",
    })
    if existing:
        return existing[0]

    # Step 1: Fetch election stories
    stories = fetch_election_stories()

    if not stories:
        # No stories found — generate a generic briefing
        stories_text = "No election-specific news found today from RSS feeds."
    else:
        stories_text = "\n\n".join(
            f"[{i+1}] {s['title']} ({s['source']})\n{s['description']}"
            for i, s in enumerate(stories[:15])
        )

    # Step 2: Generate English briefing
    en_system = """You are a senior political journalist covering Tamil Nadu elections 2026.
Generate a daily election briefing from the news stories provided.

Rules:
- Write a crisp title (under 80 chars) and a 3-5 paragraph body
- Focus on what matters to voters: alliances, candidates, policy, controversies
- Be neutral — no party bias
- Mention specific party names, candidate names, and constituency names when available
- If no election stories are found, write a brief status update about the election timeline
- Return ONLY valid JSON: {"title": "...", "body": "..."}
- No markdown code blocks"""

    en_user = f"Today's date: {today}\n\nElection stories from Tamil Nadu:\n\n{stories_text}"

    try:
        en_raw = _claude_call(en_system, en_user)
        if "```" in en_raw:
            en_raw = en_raw.split("```")[1]
            if en_raw.startswith("json"):
                en_raw = en_raw[4:]
        en_data = json.loads(en_raw.strip())
    except Exception:
        en_data = {
            "title": f"TN Elections Daily Brief — {today}",
            "body": "Today's election briefing is being compiled. Check back shortly for the latest updates on Tamil Nadu's 2026 election race.",
        }

    # Step 3: Generate Tamil briefing
    ta_system = """You are a senior political journalist covering Tamil Nadu elections 2026.
Translate the following English election briefing into Tamil.

Rules:
- Keep party names (DMK, ADMK, BJP, TVK, etc.) in English
- Keep candidate names in English
- Keep numbers in English numerals
- Use natural, journalistic Tamil — not literal translation
- Return ONLY valid JSON: {"title": "...", "body": "..."}
- No markdown code blocks"""

    ta_user = f"English briefing to translate:\n\nTitle: {en_data['title']}\n\nBody: {en_data['body']}"

    try:
        ta_raw = _claude_call(ta_system, ta_user)
        if "```" in ta_raw:
            ta_raw = ta_raw.split("```")[1]
            if ta_raw.startswith("json"):
                ta_raw = ta_raw[4:]
        ta_data = json.loads(ta_raw.strip())
    except Exception:
        ta_data = {
            "title": f"தமிழ்நாடு தேர்தல் தினசரி சுருக்கம் — {today}",
            "body": "இன்றைய தேர்தல் சுருக்கம் தொகுக்கப்படுகிறது. தமிழ்நாடு 2026 தேர்தல் பற்றிய சமீபத்திய புதுப்பிப்புகளுக்கு விரைவில் மீண்டும் பாருங்கள்.",
        }

    # Step 4: Save to Supabase
    stories_json = [
        {
            "title": s.get("title", ""),
            "link": s.get("link", ""),
            "source": s.get("source", ""),
        }
        for s in stories[:15]
    ]

    payload = {
        "briefing_date": today,
        "title_en": en_data["title"],
        "title_ta": ta_data["title"],
        "body_en": en_data["body"],
        "body_ta": ta_data["body"],
        "stories": json.dumps(stories_json),
    }

    try:
        saved = rest_post("daily_briefings", payload)
    except Exception:
        # If insert fails (e.g. duplicate date), return the payload itself
        saved = payload

    return saved


def get_latest_briefing() -> dict | None:
    """Fetch the most recent briefing from Supabase."""
    rows = rest_get("daily_briefings", {
        "select": "*",
        "order": "briefing_date.desc",
        "limit": "1",
    })
    if not rows:
        return None

    briefing = rows[0]

    # Parse stories JSON if it's a string
    if isinstance(briefing.get("stories"), str):
        try:
            briefing["stories"] = json.loads(briefing["stories"])
        except (json.JSONDecodeError, TypeError):
            briefing["stories"] = []

    return briefing
