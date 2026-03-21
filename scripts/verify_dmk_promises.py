#!/usr/bin/env python3
"""
DMK 2021 Promise Verification with Web Sources
------------------------------------------------
For each DMK 2021 promise:
1. Web search for evidence of delivery
2. Classify as kept/partially_kept/broken/pending based on ACTUAL sources
3. Include source URL as evidence
"""

import httpx, os, json, sys, time, re

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

# ── Web search via Brave Search API (free) or fallback to Google ──
def web_search(query):
    """Search the web for evidence. Returns list of {title, url, snippet}."""
    # Use httpx to hit a search API
    # We'll use DuckDuckGo HTML since it doesn't need API keys
    try:
        r = httpx.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=15,
            follow_redirects=True,
        )
        results = []
        # Simple regex extraction from DDG HTML results
        links = re.findall(r'<a rel="nofollow" class="result__a" href="(.*?)">(.*?)</a>', r.text)
        snippets = re.findall(r'<a class="result__snippet".*?>(.*?)</a>', r.text, re.DOTALL)

        for i, (url, title) in enumerate(links[:5]):
            snippet = snippets[i].strip() if i < len(snippets) else ""
            snippet = re.sub(r'<.*?>', '', snippet)  # Strip HTML tags
            title = re.sub(r'<.*?>', '', title)
            # DDG wraps URLs in a redirect, extract actual URL
            if "uddg=" in url:
                url = re.search(r'uddg=(.*?)(&|$)', url)
                url = httpx.URL(url.group(1)).path if url else ""
            results.append({"title": title, "url": url, "snippet": snippet})
        return results
    except Exception as e:
        return []

# ── Claude classify with search results ───────────────
def verify_batch(promises_batch):
    """
    For each promise: search web, then ask Claude to classify based on real sources.
    """
    # First, do web searches for each promise
    search_context = ""
    for i, p in enumerate(promises_batch):
        query = f"DMK Tamil Nadu 2021 promise {p['promise_text'][:80]} implementation status"
        results = web_search(query)

        search_context += f"\n--- Promise {i+1} [ID:{p['id']}]: {p['promise_text']} ---\n"
        if results:
            for r in results[:3]:
                search_context += f"  Source: {r['title']}\n  URL: {r['url']}\n  Snippet: {r['snippet']}\n\n"
        else:
            search_context += "  No search results found.\n"

        time.sleep(0.5)  # Rate limit searches

    system_prompt = """You are verifying DMK 2021 election promises against web search results.

For each promise, based on the search results provided:
- "kept": Clear evidence the promise was implemented (scheme launched, policy enacted)
- "partially_kept": Some action taken but not fully delivered
- "broken": Evidence shows promise was NOT fulfilled or abandoned
- "pending": No clear evidence found, or implementation status unknown

RULES:
1. ONLY classify based on the search results provided. If no relevant results, mark as "pending"
2. For evidence: Write ONE sentence summarizing what the sources say
3. For evidence_ta: Translate to spoken Tamil
4. For source_url: Include the most relevant URL from search results. If no relevant URL, leave empty string.
5. Be honest — if search results don't clearly show the promise was kept, don't say it was kept.

Return ONLY a JSON array: [{"id": <id>, "status": "<status>", "evidence": "<text>", "evidence_ta": "<tamil>", "source_url": "<url>"}]"""

    promises_text = ""
    for i, p in enumerate(promises_batch):
        promises_text += f"{i+1}. [ID:{p['id']}] {p['promise_text']}\n"

    payload = {
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": [
            {
                "role": "user",
                "content": f"Verify these DMK 2021 promises using the search results below.\n\nPromises:\n{promises_text}\n\nSearch Results:\n{search_context}",
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
        timeout=120,
    )
    r.raise_for_status()
    text = r.json()["content"][0]["text"]

    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

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
    print("  DMK 2021 Promise Verification (with Web Sources)")
    print("=" * 60)

    cache_path = os.path.join(os.path.dirname(__file__), "dmk_2021_verified_results.json")

    promises = fetch_promises()
    print(f"\n  Found {len(promises)} DMK 2021 promises in DB")

    if os.path.exists(cache_path):
        print(f"  Loading cached verified results...")
        with open(cache_path) as f:
            all_results = json.load(f)
        print(f"  Cached: {len(all_results)} results")
    else:
        all_results = []
        batch_size = 5  # Smaller batches since each needs web searches
        batches = [promises[i:i + batch_size] for i in range(0, len(promises), batch_size)]
        print(f"\n  Processing {len(batches)} batches of ~{batch_size} promises each...")
        print(f"  (Each promise gets a web search + Claude verification)\n")

        for i, batch in enumerate(batches):
            print(f"  Batch {i+1}/{len(batches)}...", end=" ", flush=True)
            try:
                results = verify_batch(batch)
                all_results.extend(results)

                # Quick stats
                statuses = [r.get("status", "?") for r in results]
                print(f"Got {len(results)} — {', '.join(statuses)}", flush=True)
            except Exception as e:
                print(f"ERROR: {e}", flush=True)
                # Mark these as pending
                for p in batch:
                    all_results.append({
                        "id": p["id"],
                        "status": "pending",
                        "evidence": "Verification failed — will retry later",
                        "evidence_ta": "சரிபார்ப்பு தோல்வி — பின்னர் முயற்சிக்கப்படும்",
                        "source_url": "",
                    })

            # Save cache periodically
            if (i + 1) % 10 == 0:
                with open(cache_path, "w") as f:
                    json.dump(all_results, f, ensure_ascii=False, indent=2)
                print(f"    [Cached {len(all_results)} results]", flush=True)

            time.sleep(1)  # Rate limit

        # Final cache
        with open(cache_path, "w") as f:
            json.dump(all_results, f, ensure_ascii=False, indent=2)
        print(f"\n  Cached {len(all_results)} verified results")

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
