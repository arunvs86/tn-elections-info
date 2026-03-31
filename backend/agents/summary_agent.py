"""
Candidate summary generator: produces a 5-bullet Tamil summary.
Cached in the candidates table (ai_summary_ta column).
"""
import os
import httpx
from tools.db_tools import rest_get


def _claude_call(system: str, user: str, max_tokens: int = 1500) -> str:
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
            "temperature": 0.3,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        },
        timeout=30.0,
    )
    r.raise_for_status()
    return r.json()["content"][0]["text"]


def generate_candidate_summary(candidate_id: int) -> dict:
    """
    Generate a 5-bullet Tamil summary for a candidate.
    Returns cached summary immediately if available.
    Falls back gracefully if Claude credits are unavailable.
    Returns {summary_ta, summary_en, cached}
    """

    # Fetch candidate data
    rows = rest_get("candidates", {
        "id": f"eq.{candidate_id}",
        "select": "*",
    })
    if not rows:
        return {"summary_ta": "", "summary_en": "Candidate not found", "cached": False}

    c = rows[0]

    # Return cached summary immediately if it exists
    cached = c.get("ai_summary_ta", "")
    if cached and len(cached.strip()) > 20:
        return {"summary_ta": cached, "summary_en": "", "cached": True}

    c = rows[0]

    # Fetch constituency name
    const_name = ""
    if c.get("constituency_id"):
        const_rows = rest_get("constituencies", {
            "id": f"eq.{c['constituency_id']}",
            "select": "name,district",
        })
        if const_rows:
            const_name = const_rows[0].get("name", "")

    # Fetch criminal case details
    cases = rest_get("criminal_cases", {
        "candidate_id": f"eq.{candidate_id}",
        "select": "case_type,sections,status,court_name",
    })

    # Build data context for Claude
    data_text = f"""
Candidate: {c.get('name', 'Unknown')}
Party: {c.get('party', 'Unknown')}
Constituency: {const_name}
Election Year: {c.get('election_year', '')}
Age: {c.get('age', 'N/A')}
Education: {c.get('education', 'N/A')}
Is Winner: {c.get('is_winner', False)}
Votes Received: {c.get('votes_received', 'N/A')}
Vote Share: {c.get('vote_share', 'N/A')}%
Margin: {c.get('margin', 'N/A')}
Movable Assets: ₹{c.get('assets_movable', 'N/A')}
Immovable Assets: ₹{c.get('assets_immovable', 'N/A')}
Liabilities: ₹{c.get('liabilities', 'N/A')}
Net Worth: ₹{c.get('net_worth', 'N/A')}
Criminal Cases Declared: {c.get('criminal_cases_declared', 0)}
Criminal Cases (eCourts): {c.get('criminal_cases_ecourts', 0)}
Criminal Mismatch: {c.get('criminal_mismatch', False)}
"""

    if cases:
        data_text += "\nCriminal Case Details:\n"
        for case in cases:
            data_text += f"- {case.get('case_type', 'Unknown')} | Sections: {case.get('sections', 'N/A')} | Status: {case.get('status', 'N/A')} | Court: {case.get('court_name', 'N/A')}\n"

    system_prompt = """You are a Tamil Nadu elections analyst. Generate a concise 5-bullet summary
about this candidate in SIMPLE SPOKEN TAMIL (not formal literary Tamil).
The audience is everyday Tamil voters — use conversational Tamil they'd hear on the street.

Rules:
- Exactly 5 bullets, one per line, starting with a bullet point (•)
- Cover: party & constituency, assets/wealth, criminal record, education, election performance
- Use Tamil numerals formatting (₹2.3 கோடி, not ₹23000000)
- If data is missing/null, say "தகவல் இல்ல" (no info) for that point
- If criminal cases = 0, say "கிரிமினல் கேஸ் இல்ல — க்ளீன் ரெகார்ட்"
- Keep each bullet under 30 words
- Do NOT add any header or footer — just the 5 bullets
- For asset amounts: convert to Crores (கோடி) or Lakhs (லட்சம்) for readability"""

    try:
        summary_ta = _claude_call(system_prompt, data_text)
    except Exception as e:
        err = str(e)
        # Credit exhausted or auth error — return a structured fallback
        if "credit" in err.lower() or "529" in err or "overloaded" in err.lower() or "401" in err:
            return {
                "summary_ta": "",
                "summary_en": "",
                "cached": False,
                "error": "credits_unavailable",
            }
        return {
            "summary_ta": "",
            "summary_en": "",
            "cached": False,
            "error": "generation_failed",
        }

    # Cache the summary back to the candidate record
    try:
        url = f"{os.getenv('SUPABASE_URL')}/rest/v1/candidates?id=eq.{candidate_id}"
        key = os.getenv("SUPABASE_SERVICE_KEY")
        httpx.patch(
            url,
            json={"ai_summary_ta": summary_ta},
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            timeout=10.0,
        )
    except Exception:
        pass  # caching failure is non-critical

    return {"summary_ta": summary_ta, "summary_en": "", "cached": False}
