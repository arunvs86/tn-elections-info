#!/usr/bin/env python3
"""
DMK 2021 Manifesto Delivery Audit
----------------------------------
Takes the 503 DMK 2021 promises already in the DB and assigns:
  - status: kept | partially_kept | broken | pending
  - evidence: one-line English explanation
  - evidence_ta: one-line Tamil explanation

Uses Claude Haiku to classify each promise based on publicly known outcomes.
"""

import httpx, os, json, sys, time

# ── Load env ───────────────────────────────────────────
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

load_env()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_KEY]):
    print("ERROR: Missing env vars")
    sys.exit(1)

BASE = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

client = httpx.Client(timeout=60)

# ── Fetch DMK 2021 promises from DB ───────────────────
def fetch_promises():
    r = client.get(
        f"{BASE}/manifesto_promises",
        params={"party": "eq.DMK", "election_year": "eq.2021", "select": "id,promise_text,promise_text_tamil,category", "order": "id"},
        headers=HEADERS,
    )
    r.raise_for_status()
    return r.json()

# ── Claude call ───────────────────────────────────────
def classify_batch(promises_batch):
    """Send a batch of promises to Claude for delivery classification."""
    promises_text = ""
    for i, p in enumerate(promises_batch):
        promises_text += f"{i+1}. [ID:{p['id']}] {p['promise_text']}\n"

    system_prompt = """You are an expert on Tamil Nadu politics and the DMK government's performance from 2021-2025.

For each election promise, classify its delivery status based on publicly known outcomes.

RULES:
- "kept": Promise was clearly fulfilled with concrete action (scheme launched, law passed, policy implemented)
- "partially_kept": Some action taken but not fully delivered, or implemented with reduced scope
- "broken": Promise was clearly not fulfilled, or opposite action was taken
- "pending": Cannot determine status, or promise is too vague to verify, or ongoing without clear outcome

For evidence: Write ONE concise sentence explaining why you classified it that way. Be specific — mention scheme names, dates, numbers when known.

For evidence_ta: Translate the evidence to conversational Tamil (spoken Tamil, not formal literary Tamil).

Return ONLY a JSON array. Each item: {"id": <id>, "status": "<kept|partially_kept|broken|pending>", "evidence": "<one line>", "evidence_ta": "<one line Tamil>"}"""

    payload = {
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": f"Classify these DMK 2021 manifesto promises:\n\n{promises_text}"}
        ],
    }

    r = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json=payload,
        timeout=120,
    )
    r.raise_for_status()
    text = r.json()["content"][0]["text"]

    # Extract JSON
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    return json.loads(text)

# ── Update DB ─────────────────────────────────────────
def update_promise(promise_id, status, evidence, evidence_ta):
    r = client.patch(
        f"{BASE}/manifesto_promises",
        params={"id": f"eq.{promise_id}"},
        json={"status": status, "evidence": evidence, "evidence_ta": evidence_ta},
        headers=HEADERS,
    )
    r.raise_for_status()

# ── Main ──────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  DMK 2021 Manifesto — Delivery Audit")
    print("=" * 60)

    # Check for cached results
    cache_path = os.path.join(os.path.dirname(__file__), "dmk_2021_audit_results.json")

    promises = fetch_promises()
    print(f"\n  Found {len(promises)} DMK 2021 promises in DB")

    if os.path.exists(cache_path):
        print(f"  Loading cached audit results from {cache_path}")
        with open(cache_path) as f:
            all_results = json.load(f)
        print(f"  Cached: {len(all_results)} results")
    else:
        all_results = []
        batch_size = 15
        batches = [promises[i:i+batch_size] for i in range(0, len(promises), batch_size)]
        print(f"\n  Processing {len(batches)} batches of ~{batch_size} promises each...\n")

        for i, batch in enumerate(batches):
            print(f"  Batch {i+1}/{len(batches)} (promises {batch[0]['id']}-{batch[-1]['id']})...", flush=True)
            try:
                results = classify_batch(batch)
                all_results.extend(results)
                print(f"    Got {len(results)} results", flush=True)
            except Exception as e:
                print(f"    ERROR: {e}", flush=True)
                # Still continue with remaining batches

            if i < len(batches) - 1:
                time.sleep(1)  # Rate limit

        # Cache results
        with open(cache_path, "w") as f:
            json.dump(all_results, f, ensure_ascii=False, indent=2)
        print(f"\n  Cached {len(all_results)} results to {cache_path}")

    # Stats
    from collections import Counter
    status_counts = Counter(r.get("status", "pending") for r in all_results)
    print(f"\n  Status distribution:")
    for status, count in sorted(status_counts.items()):
        print(f"    {status:20s} {count}")

    # Update DB
    print(f"\n  Updating {len(all_results)} promises in DB...")
    success = 0
    errors = 0
    for i, r in enumerate(all_results):
        try:
            status = r.get("status", "pending")
            if status not in ("kept", "partially_kept", "broken", "pending"):
                status = "pending"
            update_promise(
                r["id"],
                status,
                r.get("evidence", ""),
                r.get("evidence_ta", ""),
            )
            success += 1
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"    ERROR updating {r.get('id')}: {e}")

        if (i + 1) % 100 == 0:
            print(f"    Updated {i+1}/{len(all_results)}...", flush=True)

    print(f"    Updated {success}, Errors: {errors}")
    print(f"\n{'=' * 60}")
    print(f"  Audit complete!")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
