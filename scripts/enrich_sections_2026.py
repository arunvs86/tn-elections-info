#!/usr/bin/env python3
"""
enrich_sections_2026.py
Fetches IPC/BNS section details for all 2026 candidates that have criminal cases.
Requires migration_018_sections_column.sql to be run in Supabase first.

Usage:
    python3 scripts/enrich_sections_2026.py
"""

import re, time, os, signal
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
DELAY        = 0.5   # seconds between requests
TIMEOUT      = 20    # per-page timeout

HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
}

# ── Supabase helpers ───────────────────────────────────
def sb_get(table, params):
    r = httpx.get(f"{SUPABASE_URL}/rest/v1/{table}", params=params, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()

def sb_patch(table, match_params, payload):
    r = httpx.patch(
        f"{SUPABASE_URL}/rest/v1/{table}",
        params=match_params,
        json=payload,
        headers={**HEADERS, "Prefer": "return=minimal"},
        timeout=15,
    )
    r.raise_for_status()

# ── Parse IPC/BNS sections from MyNeta page ───────────
def fetch_sections(affidavit_url: str) -> str | None:
    """
    Returns comma-separated section codes e.g. "420,406,307,143"
    or None if no sections found or page fails.
    """
    # SIGALRM timeout (Unix only)
    def _timeout(signum, frame):
        raise TimeoutError()
    signal.signal(signal.SIGALRM, _timeout)
    signal.alarm(TIMEOUT)

    try:
        resp = httpx.get(affidavit_url, timeout=TIMEOUT, follow_redirects=True)
        signal.alarm(0)
        if resp.status_code != 200 or len(resp.text) < 500:
            return None

        soup = BeautifulSoup(resp.text, "lxml")
        page_text = soup.get_text()

        # Extract all IPC/BNS section codes from "Brief Details of IPC / BNS"
        # Pattern: "(IPC Section-420)" or "(BNS Section-123)"
        sections = re.findall(r'\((?:IPC|BNS) Section-([^)]+)\)', page_text)

        if not sections:
            return None

        # Deduplicate while preserving order
        seen = set()
        unique = []
        for s in sections:
            s = s.strip()
            if s not in seen:
                seen.add(s)
                unique.append(s)

        return ",".join(unique)

    except (TimeoutError, Exception):
        signal.alarm(0)
        return None

# ── Main ───────────────────────────────────────────────
def main():
    print("Loading 2026 candidates with criminal cases...")

    # Fetch in pages (PostgREST default limit 1000)
    candidates = []
    offset = 0
    while True:
        batch = sb_get("candidates", {
            "select":       "id,name,party,affidavit_url,criminal_cases_declared,sections",
            "election_year": "eq.2026",
            "criminal_cases_declared": "gt.0",
            "limit":  1000,
            "offset": offset,
        })
        if not batch:
            break
        candidates.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000

    # Filter: those without sections yet (or empty)
    todo = [c for c in candidates if not c.get("sections")]
    print(f"  {len(candidates)} candidates with cases · {len(todo)} need section enrichment\n")

    updated = 0
    failed  = 0

    for i, c in enumerate(todo, 1):
        url = c.get("affidavit_url")
        if not url:
            failed += 1
            continue

        sections = fetch_sections(url)

        if sections:
            try:
                sb_patch("candidates", {"id": f"eq.{c['id']}"}, {"sections": sections})
                updated += 1
                print(f"  [{i}/{len(todo)}] ✅ {c['name']} ({c['party'][:15]}) → {sections[:60]}")
            except Exception as e:
                failed += 1
                print(f"  [{i}/{len(todo)}] ❌ DB update failed for {c['name']}: {e}")
        else:
            failed += 1
            print(f"  [{i}/{len(todo)}] ⚠️  No sections found for {c['name']} (cases: {c['criminal_cases_declared']})")

        if i % 50 == 0:
            print(f"\n  --- Progress: {updated} updated, {failed} failed ---\n")

        time.sleep(DELAY)

    print(f"\n✅ Done! {updated} updated · {failed} failed")

if __name__ == "__main__":
    main()
