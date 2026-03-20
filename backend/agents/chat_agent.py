"""
Chat agent: Natural language → intent routing → Supabase query → rich response.
Powers the "Ask TN Elections" chatbot.
"""
import os
import json
from tools.db_tools import rest_get


def _claude_call(system: str, user: str) -> str:
    """Quick Claude Haiku call for intent classification and response generation."""
    import httpx

    r = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": os.getenv("ANTHROPIC_API_KEY"),
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
        timeout=15.0,
    )
    r.raise_for_status()
    return r.json()["content"][0]["text"]


def classify_intent(message: str, context: list) -> dict:
    """
    Classify user message into an intent with extracted entities.
    Returns: { intent, constituency, candidate, district, party, comparison_target }
    """
    system = """You are an intent classifier for a Tamil Nadu Elections 2026 chatbot.
Given a user message and conversation context, extract:
1. intent: one of [constituency_info, candidate_info, compare, district_stats, swing_seats, factcheck, party_stats, general]
2. constituency: constituency name if mentioned (e.g., "Singanallur", "Coimbatore South")
3. candidate: candidate name if mentioned
4. district: district name if mentioned (e.g., "Coimbatore", "Chennai")
5. party: party name if mentioned (e.g., "DMK", "ADMK", "BJP", "TVK")
6. comparison_target: second candidate/party for comparisons

Rules:
- "Who is the MLA of X" → constituency_info, constituency=X
- "Tell me about [person name]" → candidate_info, candidate=[name]
- "Compare X and Y" → compare
- "Richest/most cases in [district]" → district_stats
- "How many seats did X win" → party_stats
- "Swing seats in [district]" → swing_seats
- "Is it true that..." → factcheck
- Use context to resolve pronouns: "Compare him" → look at previous message for candidate name

Return ONLY valid JSON, no markdown:
{"intent":"...","constituency":"...","candidate":"...","district":"...","party":"...","comparison_target":"..."}
Use empty string "" for missing fields."""

    context_str = "\n".join(
        [f"{m.get('role','user')}: {m.get('text','')}" for m in (context or [])[-4:]]
    )
    user_prompt = f"Context:\n{context_str}\n\nCurrent message: {message}"

    try:
        raw = _claude_call(system, user_prompt)
        # Strip markdown code blocks if present
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception:
        return {"intent": "general", "constituency": "", "candidate": "",
                "district": "", "party": "", "comparison_target": ""}


def query_constituency(name: str) -> dict:
    """Fetch constituency + all candidates."""
    # Find constituency
    rows = rest_get("constituencies", {
        "name": f"ilike.*{name}*",
        "select": "id,name,district,current_mla,current_mla_party",
        "limit": "1",
    })
    if not rows:
        return {"found": False}

    constituency = rows[0]

    # Get candidates
    candidates = rest_get("candidates", {
        "constituency_id": f"eq.{constituency['id']}",
        "election_year": "eq.2021",
        "select": "id,name,party,votes_received,vote_share,is_winner,criminal_cases_declared,net_worth,assets_movable,assets_immovable,liabilities,age,education",
        "order": "votes_received.desc.nullslast",
    })

    return {"found": True, "constituency": constituency, "candidates": candidates}


def query_candidate(name: str) -> dict:
    """Fetch a specific candidate by name."""
    rows = rest_get("candidates", {
        "name": f"ilike.*{name}*",
        "election_year": "eq.2021",
        "select": "id,name,party,constituency_id,votes_received,vote_share,is_winner,criminal_cases_declared,net_worth,assets_movable,assets_immovable,liabilities,age,education",
        "limit": "5",
    })
    if not rows:
        return {"found": False}

    # Get constituency name for each candidate
    for c in rows:
        if c.get("constituency_id"):
            cons = rest_get("constituencies", {
                "id": f"eq.{c['constituency_id']}",
                "select": "name,district",
            })
            if cons:
                c["constituency"] = cons[0]["name"]
                c["district"] = cons[0]["district"]

    return {"found": True, "candidates": rows}


def query_district_stats(district: str, sort_by: str = "net_worth") -> dict:
    """Fetch candidates in a district, sorted by a field."""
    # Get all constituencies in this district
    constituencies = rest_get("constituencies", {
        "district": f"ilike.*{district}*",
        "select": "id,name",
    })
    if not constituencies:
        return {"found": False}

    cons_ids = [str(c["id"]) for c in constituencies]

    # Get candidates
    candidates = rest_get("candidates", {
        "constituency_id": f"in.({','.join(cons_ids)})",
        "election_year": "eq.2021",
        "select": "id,name,party,constituency_id,votes_received,vote_share,is_winner,criminal_cases_declared,net_worth,assets_movable,assets_immovable,liabilities",
        "order": f"{sort_by}.desc.nullslast",
        "limit": "20",
    })

    # Map constituency names
    cons_map = {c["id"]: c["name"] for c in constituencies}
    for c in candidates:
        c["constituency"] = cons_map.get(c.get("constituency_id"), "")

    return {
        "found": True,
        "district": district,
        "constituency_count": len(constituencies),
        "candidates": candidates,
    }


def query_party_stats(party: str) -> dict:
    """Get aggregate stats for a party."""
    candidates = rest_get("candidates", {
        "party": f"ilike.*{party}*",
        "election_year": "eq.2021",
        "select": "id,name,party,is_winner,votes_received,vote_share,criminal_cases_declared,net_worth,constituency_id",
    })
    if not candidates:
        return {"found": False}

    winners = [c for c in candidates if c.get("is_winner")]
    total_cases = sum(c.get("criminal_cases_declared", 0) or 0 for c in candidates)
    with_cases = [c for c in candidates if (c.get("criminal_cases_declared") or 0) > 0]

    return {
        "found": True,
        "party": party,
        "total_candidates": len(candidates),
        "seats_won": len(winners),
        "total_criminal_cases": total_cases,
        "candidates_with_cases": len(with_cases),
        "top_winners": sorted(winners, key=lambda x: x.get("vote_share") or 0, reverse=True)[:5],
    }


def query_swing_seats(district: str = "") -> dict:
    """Get swing seats, optionally filtered by district."""
    params = {
        "select": "constituency_id,margin,winner_name,winner_party,runner_up_name,runner_up_party",
        "order": "margin.asc.nullslast",
        "limit": "20",
    }

    results = rest_get("election_results", params)
    if not results:
        return {"found": False}

    # Get constituency names
    cons_ids = list(set(str(r["constituency_id"]) for r in results if r.get("constituency_id")))
    if cons_ids:
        constituencies = rest_get("constituencies", {
            "id": f"in.({','.join(cons_ids)})",
            "select": "id,name,district",
        })
        cons_map = {c["id"]: c for c in constituencies}
    else:
        cons_map = {}

    seats = []
    for r in results:
        cons = cons_map.get(r.get("constituency_id"), {})
        cons_district = cons.get("district", "")
        if district and district.lower() not in cons_district.lower():
            continue
        seats.append({
            "constituency": cons.get("name", ""),
            "district": cons_district,
            "margin": r.get("margin"),
            "winner": f"{r.get('winner_name', '')} ({r.get('winner_party', '')})",
            "runner_up": f"{r.get('runner_up_name', '')} ({r.get('runner_up_party', '')})",
        })

    return {"found": True, "seats": seats[:15]}


def generate_response(message: str, intent: dict, data: dict, context: list) -> dict:
    """Use Claude to generate a natural language response from the data."""
    system = """You are the TN Elections 2026 chatbot assistant. You answer questions about Tamil Nadu elections.
Rules:
- Be concise — 2-4 sentences max for text response
- Use data provided to answer accurately
- If data shows candidates, mention top 2-3 by name
- If comparing, highlight key differences
- Never make up data — only use what's provided
- For winners, mention their party and vote share
- Be neutral — no party bias
- If data not found, say so honestly and suggest alternatives
Return ONLY the text response, no JSON."""

    data_str = json.dumps(data, default=str, indent=2)[:3000]  # Trim to fit context
    context_str = "\n".join(
        [f"{m.get('role','user')}: {m.get('text','')}" for m in (context or [])[-3:]]
    )

    user_prompt = f"""User question: {message}
Intent: {json.dumps(intent)}
Data from database:
{data_str}

Previous conversation:
{context_str}

Generate a helpful, concise response."""

    try:
        response_text = _claude_call(system, user_prompt)
    except Exception:
        response_text = "I'm having trouble processing that right now. Please try again."

    # Build suggestion chips based on intent and data
    suggestions = _generate_suggestions(intent, data)

    # Build candidate cards for frontend
    candidates = _extract_candidate_cards(data)

    # Build comparison if applicable
    comparison = None
    if intent.get("intent") == "compare" and len(candidates) >= 2:
        comparison = {"candidates": candidates[:2]}

    return {
        "response": response_text,
        "candidates": candidates[:5] if candidates else None,
        "comparison": comparison,
        "suggestions": suggestions,
    }


def _extract_candidate_cards(data: dict) -> list:
    """Pull candidate card data from query results."""
    raw = data.get("candidates", [])
    if not raw:
        return []

    cards = []
    for c in raw[:10]:
        cards.append({
            "name": c.get("name", ""),
            "party": c.get("party", ""),
            "constituency": c.get("constituency", ""),
            "votes": c.get("votes_received"),
            "vote_share": c.get("vote_share"),
            "criminal_cases": c.get("criminal_cases_declared", 0) or 0,
            "net_worth": c.get("net_worth"),
            "is_winner": c.get("is_winner", False),
        })
    return cards


def _generate_suggestions(intent: dict, data: dict) -> list:
    """Generate follow-up suggestion chips."""
    suggestions = []
    intent_type = intent.get("intent", "")
    constituency = intent.get("constituency", "")
    candidate = intent.get("candidate", "")
    district = intent.get("district", "")

    if intent_type == "constituency_info" and data.get("candidates"):
        winner = next((c for c in data["candidates"] if c.get("is_winner")), None)
        if winner:
            suggestions.append(f"Criminal cases in {constituency}?")
            suggestions.append(f"Compare top 2 in {constituency}")
        suggestions.append(f"Swing seats near {constituency}")

    elif intent_type == "candidate_info":
        suggestions.append("Compare with opponents")
        suggestions.append("Criminal case details")
        suggestions.append("Asset history")

    elif intent_type == "district_stats":
        suggestions.append(f"Swing seats in {district}")
        suggestions.append(f"DMK vs ADMK in {district}")

    elif intent_type == "party_stats":
        party = intent.get("party", "")
        suggestions.append(f"{party} candidates with criminal cases")
        suggestions.append(f"Richest {party} candidate")

    elif intent_type == "swing_seats":
        suggestions.append("Show red-zone seats only")
        suggestions.append("Swing seats in Chennai")

    if not suggestions:
        suggestions = [
            "Who is the MLA of Singanallur?",
            "DMK seat count in 2021",
            "Swing seats in Coimbatore",
        ]

    return suggestions[:3]


def handle_chat(message: str, context: list) -> dict:
    """
    Main entry point: message + context → rich response.
    Called by the /api/chat endpoint.
    """
    # Step 1: Classify intent
    intent = classify_intent(message, context)

    # Step 2: Query data based on intent
    data = {"found": False}
    intent_type = intent.get("intent", "general")

    if intent_type == "constituency_info":
        name = intent.get("constituency", "")
        if name:
            data = query_constituency(name)

    elif intent_type == "candidate_info":
        name = intent.get("candidate", "")
        if name:
            data = query_candidate(name)

    elif intent_type == "compare":
        # Try constituency first, then candidate
        name = intent.get("constituency", "") or intent.get("candidate", "")
        if name:
            data = query_constituency(name) if intent.get("constituency") else query_candidate(name)

    elif intent_type == "district_stats":
        district = intent.get("district", "")
        if district:
            # Detect if user is asking about richest/most cases
            msg_lower = message.lower()
            sort_by = "net_worth"
            if "criminal" in msg_lower or "case" in msg_lower:
                sort_by = "criminal_cases_declared"
            data = query_district_stats(district, sort_by)

    elif intent_type == "party_stats":
        party = intent.get("party", "")
        if party:
            data = query_party_stats(party)

    elif intent_type == "swing_seats":
        district = intent.get("district", "")
        data = query_swing_seats(district)

    elif intent_type == "factcheck":
        # Delegate to the existing fact-check pipeline
        data = {"found": True, "note": "Use the Narrative Check page for detailed fact-checking with source citations."}

    # Step 3: Generate natural language response
    result = generate_response(message, intent, data, context)

    return result
