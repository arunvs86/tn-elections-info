"""
Process DMK 2021 manifesto promises:
1. Categorize into standard categories
2. Generate Tamil translations
3. Score each promise (fiscal, specificity, past_delivery, overall)
4. Insert into Supabase manifesto_promises table

Uses Claude API for categorization, translation, and scoring.
Processes in batches of 20 promises to be efficient with API calls.
"""
import json
import os
import sys
import time
import httpx
from dotenv import load_dotenv

# ── Load env ──
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend', '.env')
load_dotenv(dotenv_path)

# Also manually parse .env as fallback (python-dotenv can miss lines without trailing newline)
def _manual_env(path):
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                if not os.getenv(k.strip()):
                    os.environ[k.strip()] = v.strip()
_manual_env(dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY]):
    print("ERROR: Missing SUPABASE_URL, SUPABASE_SERVICE_KEY, or ANTHROPIC_API_KEY in .env")
    sys.exit(1)

BASE = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
CLIENT = httpx.Client(timeout=60.0)

MANIFESTO_JSON = os.path.join(os.path.dirname(__file__), 'dmk_manifesto_2021_promises.json')

CATEGORIES = [
    "governance", "education", "healthcare", "agriculture", "infrastructure",
    "women", "welfare", "economy", "environment", "law_and_order",
    "housing", "transport", "culture", "labour", "minorities",
    "fisheries", "youth", "sports", "technology", "other"
]

def claude_call(system_prompt, user_prompt, max_tokens=4096):
    """Call Claude API directly via httpx."""
    r = CLIENT.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        },
        timeout=120.0,
    )
    r.raise_for_status()
    return r.json()["content"][0]["text"]


def process_batch(promises_batch):
    """Process a batch of promises: categorize, translate to Tamil, score."""
    promises_text = "\n".join(
        f"{p['number']}. {p['text']}" for p in promises_batch
    )

    system_prompt = """You are a Tamil Nadu political analyst. For each election promise, you must:
1. Assign a category from this list: governance, education, healthcare, agriculture, infrastructure, women, welfare, economy, environment, law_and_order, housing, transport, culture, labour, minorities, fisheries, youth, sports, technology, other
2. Translate to conversational Tamil (spoken Tamil, not literary)
3. Score on 3 dimensions (1-10):
   - fiscal_score: How financially feasible is this? (10=very feasible, 1=impossible)
   - specificity_score: How specific and measurable? (10=very specific with numbers, 1=vague)
   - past_delivery_score: Based on DMK's track record, how likely to deliver? (10=already delivered, 1=never delivered similar promises)
4. overall_score: weighted average (fiscal*0.3 + specificity*0.3 + past_delivery*0.4)
5. believability_label: "Very Likely" (8-10), "Likely" (6-7), "Uncertain" (4-5), "Unlikely" (1-3)

Return ONLY valid JSON array. Each item must have: number, category, tamil, fiscal_score, specificity_score, past_delivery_score, overall_score, believability_label

Example:
[{"number": 1, "category": "governance", "tamil": "மாநில உரிமைகளை மீட்க தொடர்ந்து போராடுவோம்", "fiscal_score": 8, "specificity_score": 3, "past_delivery_score": 7, "overall_score": 6, "believability_label": "Likely"}]"""

    user_prompt = f"Process these DMK 2021 manifesto promises:\n\n{promises_text}\n\nReturn JSON array only, no markdown."

    try:
        response = claude_call(system_prompt, user_prompt)
        # Parse JSON from response
        # Sometimes Claude wraps in ```json ... ```
        response = response.strip()
        if response.startswith("```"):
            response = response.split("\n", 1)[1]
            response = response.rsplit("```", 1)[0]
        return json.loads(response)
    except Exception as e:
        print(f"  ERROR in Claude call: {e}")
        return None


def main():
    print("=" * 60)
    print("  DMK 2021 Manifesto → Categorize + Score + Translate")
    print("=" * 60)

    # Load promises
    with open(MANIFESTO_JSON) as f:
        promises = json.load(f)
    print(f"  Loaded {len(promises)} promises from JSON")

    # Clear existing DMK 2021 promises
    print("  Clearing existing DMK 2021 manifesto promises...")
    r = CLIENT.delete(f"{BASE}/manifesto_promises",
                      params={"party": "eq.DMK", "election_year": "eq.2021"},
                      headers=HEADERS)
    print(f"  Cleared (status: {r.status_code})")

    # Process in batches of 15
    BATCH_SIZE = 15
    all_results = []
    total_batches = (len(promises) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(promises), BATCH_SIZE):
        batch = promises[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        print(f"\n  Processing batch {batch_num}/{total_batches} (promises {batch[0]['number']}-{batch[-1]['number']})...")

        results = process_batch(batch)
        if results:
            all_results.extend(results)
            print(f"    ✅ Got {len(results)} results")
        else:
            # Fallback: insert without AI processing
            print(f"    ⚠️ Claude failed, inserting with defaults")
            for p in batch:
                all_results.append({
                    "number": p["number"],
                    "category": "other",
                    "tamil": "",
                    "fiscal_score": 5,
                    "specificity_score": 5,
                    "past_delivery_score": 5,
                    "overall_score": 5,
                    "believability_label": "Uncertain"
                })

        time.sleep(1)  # Rate limit

    # Build lookup: promise number -> original text
    promise_lookup = {p["number"]: p for p in promises}

    # Insert into Supabase
    print(f"\n  Inserting {len(all_results)} scored promises into Supabase...")
    rows_to_insert = []
    for r in all_results:
        orig = promise_lookup.get(r["number"])
        if not orig:
            continue
        rows_to_insert.append({
            "party": "DMK",
            "election_year": 2021,
            "promise_text": orig["text"],
            "promise_text_tamil": r.get("tamil", ""),
            "category": r.get("category", "other"),
            "fiscal_score": r.get("fiscal_score", 5),
            "specificity_score": r.get("specificity_score", 5),
            "past_delivery_score": r.get("past_delivery_score", 5),
            "overall_score": r.get("overall_score", 5),
            "believability_label": r.get("believability_label", "Uncertain"),
            "ai_reasoning": f"Promise #{r['number']} from DMK 2021 manifesto. Section: {orig.get('section', 'General')}",
        })

    # Sanitize all rows before insert
    for row in rows_to_insert:
        # Ensure scores are ints between 0-10
        for key in ['fiscal_score', 'specificity_score', 'past_delivery_score', 'overall_score']:
            try:
                val = int(float(row.get(key, 5)))
                row[key] = max(0, min(10, val))
            except (TypeError, ValueError):
                row[key] = 5
        # Ensure text fields are strings
        for key in ['promise_text', 'promise_text_tamil', 'category', 'believability_label', 'ai_reasoning']:
            if row.get(key) is None:
                row[key] = ''
            row[key] = str(row[key])[:2000]  # Truncate long text

    # Save results to disk cache (so we don't need to re-call Claude on retry)
    cache_path = os.path.join(os.path.dirname(__file__), 'dmk_manifesto_2021_scored.json')
    with open(cache_path, 'w') as f:
        json.dump(rows_to_insert, f, ensure_ascii=False, indent=2)
    print(f"  Cached scored results to {cache_path}")

    # Insert in batches of 20 (smaller batches to isolate errors)
    inserted = 0
    for i in range(0, len(rows_to_insert), 20):
        batch = rows_to_insert[i:i + 20]
        try:
            resp = CLIENT.post(f"{BASE}/manifesto_promises", json=batch, headers=HEADERS)
            resp.raise_for_status()
            inserted += len(batch)
            if inserted % 100 == 0 or i + 20 >= len(rows_to_insert):
                print(f"    Inserted {inserted}/{len(rows_to_insert)}...")
        except Exception as e:
            # Try one by one to find the bad row
            for row in batch:
                try:
                    resp2 = CLIENT.post(f"{BASE}/manifesto_promises", json=[row], headers=HEADERS)
                    resp2.raise_for_status()
                    inserted += 1
                except Exception as e2:
                    print(f"    SKIP promise: {row.get('promise_text', '')[:60]}... ({e2})")
        time.sleep(0.3)

    print(f"\n  ✅ Done! Inserted {inserted} DMK 2021 promises")

    # Summary
    from collections import Counter
    cats = Counter(r.get("category", "other") for r in all_results)
    print(f"\n  Category distribution:")
    for cat, count in cats.most_common(20):
        print(f"    {cat:20s} {count:3d}")

    labels = Counter(r.get("believability_label", "?") for r in all_results)
    print(f"\n  Believability:")
    for label, count in labels.most_common():
        print(f"    {label:15s} {count:3d}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
