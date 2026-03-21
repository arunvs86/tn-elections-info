#!/usr/bin/env python3
"""
DMK 2021 Promise Verification v2
----------------------------------
Uses Claude with web_search tool to verify each promise with real sources.
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

# ── Fetch promises ────────────────────────────────────
def fetch_promises():
    r = client.get(
        f"{BASE}/manifesto_promises",
        params={
            "party": "eq.DMK",
            "election_year": "eq.2021",
            "select": "id,promise_text,promise_text_tamil,category",
            "order": "id",
        },
        headers=HEADERS,
    )
    r.raise_for_status()
    return r.json()

# ── Claude with web search ────────────────────────────
def verify_batch(promises_batch):
    """Send batch to Claude Sonnet with web_search tool enabled."""
    promises_text = ""
    for i, p in enumerate(promises_batch):
        promises_text += f"{i+1}. [ID:{p['id']}] {p['promise_text']}\n"

    system_prompt = """You are verifying DMK Tamil Nadu 2021 election manifesto promises.

For EACH promise, search the web to find if the DMK government (2021-2025) actually implemented it.

Search for: "DMK [promise topic] Tamil Nadu scheme launched" or similar queries.

Then classify:
- "kept": Clear evidence — scheme/policy launched with concrete implementation
- "partially_kept": Some action taken but incomplete or reduced scope
- "broken": Promise clearly not fulfilled
- "pending": Cannot find clear evidence either way

IMPORTANT:
- Base classification ONLY on what you find from web searches
- Include the most relevant source URL
- Write one-sentence evidence in English
- Write one-sentence evidence in conversational Tamil (spoken Tamil)
- If you can't find evidence, mark as "pending" honestly

Return ONLY a JSON array:
[{"id": <id>, "status": "<status>", "evidence": "<one sentence>", "evidence_ta": "<Tamil>", "source_url": "<url or empty string>"}]"""

    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 8192,
        "tools": [{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}],
        "system": system_prompt,
        "messages": [
            {
                "role": "user",
                "content": f"Search the web and verify these DMK 2021 manifesto promises. Find real sources:\n\n{promises_text}",
            }
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
        timeout=180,
    )
    r.raise_for_status()

    response = r.json()

    # Handle multi-turn web search (Claude may need to continue after searching)
    # Collect all text blocks
    all_text = []
    for block in response.get("content", []):
        if block.get("type") == "text":
            all_text.append(block.get("text", ""))

    text = "".join(all_text)

    if not text:
        raise ValueError(f"No text response from Claude. Stop reason: {response.get('stop_reason')}")

    # Extract JSON
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            if part.startswith("json"):
                text = part[4:]
                break
            elif part.strip().startswith("["):
                text = part
                break
    text = text.strip()

    # Find JSON array in text
    start = text.find("[")
    end = text.rfind("]") + 1
    if start >= 0 and end > start:
        text = text[start:end]

    return json.loads(text)

# ── Update DB ─────────────────────────────────────────
def update_promise(promise_id, status, evidence, evidence_ta, source_url=""):
    update = {
        "status": status,
        "evidence": evidence,
        "evidence_ta": evidence_ta,
    }
    if source_url:
        update["source_url"] = source_url

    r = client.patch(
        f"{BASE}/manifesto_promises",
        params={"id": f"eq.{promise_id}"},
        json=update,
        headers=HEADERS,
    )
    r.raise_for_status()

# ── Main ──────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  DMK 2021 Promise Verification v2 (Claude + Web Search)")
    print("=" * 60)

    cache_path = os.path.join(os.path.dirname(__file__), "dmk_2021_verified_v2.json")

    promises = fetch_promises()
    print(f"\n  Found {len(promises)} DMK 2021 promises in DB")

    if os.path.exists(cache_path):
        print(f"  Loading cached results...")
        with open(cache_path) as f:
            all_results = json.load(f)
        print(f"  Cached: {len(all_results)} results")

        # Find which promise IDs we still need to process
        done_ids = {r["id"] for r in all_results}
        remaining = [p for p in promises if p["id"] not in done_ids]
        print(f"  Remaining: {len(remaining)} promises")
    else:
        all_results = []
        remaining = promises

    if remaining:
        batch_size = 10  # 10 promises per batch with web search
        batches = [remaining[i:i + batch_size] for i in range(0, len(remaining), batch_size)]
        print(f"\n  Processing {len(batches)} batches of ~{batch_size} promises each...")
        print(f"  (Claude will web-search each promise for real sources)\n")

        for i, batch in enumerate(batches):
            print(f"  Batch {i+1}/{len(batches)}...", end=" ", flush=True)
            try:
                results = verify_batch(batch)
                all_results.extend(results)

                statuses = [r.get("status", "?") for r in results]
                sources = sum(1 for r in results if r.get("source_url"))
                print(f"Got {len(results)} ({sources} with sources) — {', '.join(statuses)}", flush=True)
            except Exception as e:
                print(f"ERROR: {e}", flush=True)
                for p in batch:
                    all_results.append({
                        "id": p["id"],
                        "status": "pending",
                        "evidence": "Verification pending — web search failed",
                        "evidence_ta": "சரிபார்ப்பு நிலுவையில்",
                        "source_url": "",
                    })

            # Cache every 5 batches
            if (i + 1) % 5 == 0:
                with open(cache_path, "w") as f:
                    json.dump(all_results, f, ensure_ascii=False, indent=2)
                print(f"    [Cached {len(all_results)} results]", flush=True)

            time.sleep(2)  # Rate limit for web search

        # Final cache
        with open(cache_path, "w") as f:
            json.dump(all_results, f, ensure_ascii=False, indent=2)
        print(f"\n  Saved {len(all_results)} verified results")

    # Stats
    from collections import Counter
    status_counts = Counter(r.get("status", "pending") for r in all_results)
    with_sources = sum(1 for r in all_results if r.get("source_url"))
    print(f"\n  Status distribution:")
    for status, count in sorted(status_counts.items()):
        print(f"    {status:20s} {count}")
    print(f"\n  Promises with source URLs: {with_sources}/{len(all_results)}")

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
                r.get("source_url", ""),
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
    print(f"  Verification complete!")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
