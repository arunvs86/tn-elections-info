#!/usr/bin/env python3
"""
Verify ~50 major DMK 2021 promises with Claude web search.
Batch size = 3, max_uses = 5 for thorough verification.
"""

import httpx, os, json, sys, time

def load_env():
    with open(os.path.join(os.path.dirname(__file__), "..", "backend", ".env")) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

load_env()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
BASE = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}
client = httpx.Client(timeout=60)

# ── The 50 major promises that TN voters care about ───
# These are the headline promises from DMK's 2021 manifesto
MAJOR_PROMISES = [
    # Welfare & Women
    {"promise": "Free bus travel for women on government buses", "category": "women"},
    {"promise": "Rs 1,000 monthly assistance to women heads of family (Kalaignar Magalir Urimai Thogai)", "category": "women"},
    {"promise": "Free breakfast scheme for government school students", "category": "education"},
    {"promise": "Free laptops for government school and college students", "category": "education"},
    {"promise": "Repeal NEET exam for medical admissions in Tamil Nadu", "category": "education"},
    {"promise": "7.5% reservation in medical seats for government school students", "category": "education"},
    {"promise": "Establish AIIMS in Madurai", "category": "healthcare"},
    {"promise": "Kalaignar Magalir Urimai Thogai - Increase health insurance coverage under Makkalai Thedi Maruthuvam scheme", "category": "healthcare"},
    {"promise": "Reduce milk price by Rs 3 per litre", "category": "welfare"},
    {"promise": "Provide rice at Rs 3 per kg through ration shops", "category": "welfare"},
    {"promise": "Reduce petrol and diesel prices by cutting state taxes", "category": "economy"},
    {"promise": "Waive farm loans and jewel loans of small and medium farmers", "category": "agriculture"},
    {"promise": "Increase old age pension to Rs 2,500 per month", "category": "welfare"},
    {"promise": "Create 20 lakh new jobs in 5 years", "category": "economy"},
    {"promise": "Naan Mudhalvan skill development programme for youth", "category": "education"},

    # Infrastructure
    {"promise": "Complete Chennai Metro Phase 2", "category": "infrastructure"},
    {"promise": "Build new desalination plants for Chennai water supply", "category": "infrastructure"},
    {"promise": "Sethusamudram Shipping Canal Project", "category": "infrastructure"},
    {"promise": "Athikadavu-Avinashi groundwater recharge scheme", "category": "infrastructure"},
    {"promise": "Smart classrooms in all government schools", "category": "education"},

    # Governance
    {"promise": "Probe Jayalalithaa's death and take legal action", "category": "law_and_order"},
    {"promise": "Right to Services Act for streamlining public services", "category": "governance"},
    {"promise": "Ensure DVAC (anti-corruption) functions independently", "category": "governance"},
    {"promise": "Install CCTV cameras in all government offices", "category": "governance"},
    {"promise": "Lokayukta Act for anti-corruption", "category": "governance"},

    # Agriculture
    {"promise": "Increase paddy MSP (Minimum Support Price) from Rs 2,000 to Rs 2,500 per quintal", "category": "agriculture"},
    {"promise": "Revitalise and expand Uzhavar Santhai (farmers markets)", "category": "agriculture"},
    {"promise": "Create organic farming department and research centre", "category": "agriculture"},
    {"promise": "90% subsidy for drip irrigation up to 5 acres", "category": "agriculture"},
    {"promise": "Resolve Cauvery water dispute with Karnataka", "category": "agriculture"},

    # Social Justice
    {"promise": "Increase reservation in education and jobs beyond 69%", "category": "governance"},
    {"promise": "Cancel CAA/NRC implementation in Tamil Nadu", "category": "governance"},
    {"promise": "Two Leaves symbol case - ensure AIADMK dispute resolution", "category": "governance"},
    {"promise": "Establish Non-Resident Tamils Department", "category": "minorities"},
    {"promise": "Action against caste discrimination and honour killings", "category": "law_and_order"},

    # Economy
    {"promise": "Revive loss-making PSUs including transport corporations", "category": "economy"},
    {"promise": "New industrial policy to attract investments", "category": "economy"},
    {"promise": "Special economic zones and IT corridors", "category": "economy"},
    {"promise": "Reduce state debt burden", "category": "economy"},
    {"promise": "Reform TASMAC (state liquor corporation)", "category": "economy"},

    # Health
    {"promise": "Upgrade all PHCs (Primary Health Centres) with doctors and medicines", "category": "healthcare"},
    {"promise": "Free medical treatment up to Rs 5 lakh under state health insurance", "category": "healthcare"},
    {"promise": "Makkalai Thedi Maruthuvam - doorstep healthcare delivery", "category": "healthcare"},
    {"promise": "New medical colleges in every district", "category": "healthcare"},
    {"promise": "Mental health awareness and treatment centres", "category": "healthcare"},

    # Housing & Urban
    {"promise": "Build 10 lakh affordable houses", "category": "housing"},
    {"promise": "Free house site pattas for urban poor", "category": "housing"},
    {"promise": "Drinking water to all households through Jal Jeevan Mission", "category": "infrastructure"},
    {"promise": "Complete all pending PMAY (housing) projects", "category": "housing"},
    {"promise": "Regularise unapproved plots and layouts", "category": "housing"},
]

def verify_promise(promise_text, category):
    """Verify a single promise with Claude web search."""
    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 2048,
        "tools": [{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}],
        "system": """You are verifying a DMK Tamil Nadu 2021 election manifesto promise.
Search the web to find if the DMK government (2021-2025, led by CM M.K. Stalin) actually implemented this promise.

Return ONLY a JSON object:
{
  "status": "kept|partially_kept|broken|pending",
  "evidence": "One clear sentence explaining what happened, with specific facts/dates/numbers",
  "evidence_ta": "Same in conversational Tamil (spoken Tamil, not literary)",
  "source_url": "Most relevant source URL"
}

Rules:
- "kept": Scheme/policy clearly launched and running
- "partially_kept": Some action taken but not fully as promised
- "broken": Clearly not done, or opposite happened
- "pending": Cannot determine from available sources
- Be honest and specific. Include dates, scheme names, numbers.""",
        "messages": [
            {"role": "user", "content": f"Did the DMK government (2021-2025) fulfill this election promise?\n\nPromise: {promise_text}\nCategory: {category}\n\nSearch the web and verify with real sources."}
        ],
    }

    for attempt in range(3):
        r = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=payload,
            timeout=180,
        )
        if r.status_code == 429:
            wait = 30 * (attempt + 1)
            print(f"(rate limited, waiting {wait}s)...", end=" ", flush=True)
            time.sleep(wait)
            continue
        r.raise_for_status()
        break
    else:
        raise Exception("Rate limited after 3 retries")

    response = r.json()
    all_text = []
    for block in response.get("content", []):
        if block.get("type") == "text":
            all_text.append(block.get("text", ""))

    text = "".join(all_text)

    # Extract JSON
    if "```" in text:
        for part in text.split("```"):
            if part.strip().startswith("json"):
                text = part.strip()[4:]
                break
            elif part.strip().startswith("{"):
                text = part.strip()
                break

    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        text = text[start:end]

    return json.loads(text)

def main():
    print("=" * 60)
    print("  DMK 2021 — Major Promise Verification (Web Search)")
    print("=" * 60)
    print(f"\n  Verifying {len(MAJOR_PROMISES)} major promises...\n")

    cache_path = os.path.join(os.path.dirname(__file__), "dmk_major_verified.json")

    if os.path.exists(cache_path):
        with open(cache_path) as f:
            results = json.load(f)
        print(f"  Loaded {len(results)} cached results")
        start_idx = len(results)
    else:
        results = []
        start_idx = 0

    for i, p in enumerate(MAJOR_PROMISES[start_idx:], start=start_idx):
        print(f"  [{i+1}/{len(MAJOR_PROMISES)}] {p['promise'][:70]}...", end=" ", flush=True)
        try:
            result = verify_promise(p["promise"], p["category"])
            result["promise_text"] = p["promise"]
            result["category"] = p["category"]
            results.append(result)

            status = result.get("status", "?")
            has_url = "✓" if result.get("source_url") else "✗"
            print(f"{status} (source: {has_url})", flush=True)
        except Exception as e:
            print(f"ERROR: {e}", flush=True)
            results.append({
                "promise_text": p["promise"],
                "category": p["category"],
                "status": "pending",
                "evidence": "Verification failed",
                "evidence_ta": "சரிபார்ப்பு தோல்வி",
                "source_url": "",
            })

        # Cache every 5
        if (i + 1) % 5 == 0:
            with open(cache_path, "w") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)

        time.sleep(8)  # Rate limit — generous delay to avoid 429s

    # Final cache
    with open(cache_path, "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # Stats
    from collections import Counter
    counts = Counter(r.get("status") for r in results)
    with_urls = sum(1 for r in results if r.get("source_url"))

    print(f"\n  Results:")
    print(f"    ✅ Kept:      {counts.get('kept', 0)}")
    print(f"    ⚠️  Partial:   {counts.get('partially_kept', 0)}")
    print(f"    ❌ Broken:    {counts.get('broken', 0)}")
    print(f"    ⏳ Pending:   {counts.get('pending', 0)}")
    print(f"    Sources:     {with_urls}/{len(results)}")

    # Now clear the existing 503 promises and insert these 50 verified ones
    print(f"\n  Replacing DB data with {len(results)} verified promises...")

    # Delete existing DMK 2021
    r = client.delete(f"{BASE}/manifesto_promises",
        params={"party": "eq.DMK", "election_year": "eq.2021"},
        headers=HEADERS)
    print(f"    Cleared old data (status: {r.status_code})")

    # Insert verified promises
    rows = []
    for res in results:
        status = res.get("status", "pending")
        if status not in ("kept", "partially_kept", "broken", "pending"):
            status = "pending"
        rows.append({
            "party": "DMK",
            "election_year": 2021,
            "promise_text": res["promise_text"],
            "category": res.get("category", "other"),
            "status": status,
            "evidence": res.get("evidence", ""),
            "evidence_ta": res.get("evidence_ta", ""),
            "source_url": res.get("source_url", ""),
        })

    # Insert in batches of 10
    for i in range(0, len(rows), 10):
        batch = rows[i:i+10]
        r = client.post(f"{BASE}/manifesto_promises", json=batch, headers={**HEADERS, "Prefer": "return=minimal"})
        if r.status_code in (200, 201):
            print(f"    Inserted {min(i+10, len(rows))}/{len(rows)}", flush=True)
        else:
            print(f"    ERROR inserting batch: {r.status_code} {r.text[:200]}", flush=True)

    print(f"\n{'=' * 60}")
    print(f"  Done! {len(results)} verified promises in DB")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
