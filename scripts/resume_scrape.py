#!/usr/bin/env python3
"""Resume MyNeta scraping with per-candidate timeout using multiprocessing."""

import csv, time, sys, os
from multiprocessing import Process, Queue

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.scrape_myneta import scrape_candidate, CSV_FIELDS, CSV_PATH

MAX_ID = 4300
TIMEOUT = 20  # seconds per candidate (lxml parser is fast)

def _scrape_worker(cid, q):
    """Run in subprocess — can be killed if it hangs."""
    try:
        data = scrape_candidate(cid)
        q.put(data)
    except:
        q.put(None)

def scrape_with_timeout(cid):
    """Scrape one candidate with a hard timeout."""
    q = Queue()
    p = Process(target=_scrape_worker, args=(cid, q))
    p.start()
    p.join(timeout=TIMEOUT)
    if p.is_alive():
        p.terminate()
        p.join(1)
        return "TIMEOUT"
    if not q.empty():
        return q.get()
    return None

def main():
    # Read existing IDs
    existing = set()
    with open(CSV_PATH) as f:
        for row in csv.DictReader(f):
            existing.add(int(row["myneta_id"]))
    print(f"Existing: {len(existing)} candidates", flush=True)

    found = 0
    skipped = 0
    timeouts = 0

    with open(CSV_PATH, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        for cid in range(1, MAX_ID + 1):
            if cid in existing:
                continue

            result = scrape_with_timeout(cid)

            if result == "TIMEOUT":
                timeouts += 1
                print(f"  ⏰ ID {cid} timed out, skipping", flush=True)
            elif result:
                writer.writerow(result)
                f.flush()
                found += 1
                if found % 50 == 0:
                    print(f"  ✅ {found} new candidates (ID {cid})...", flush=True)
            else:
                skipped += 1

            time.sleep(0.3)

    print(f"\n✅ Done! {found} new, {skipped} empty, {timeouts} timeouts")

if __name__ == "__main__":
    main()
