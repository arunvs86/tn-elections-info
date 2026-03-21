#!/usr/bin/env python3
"""Fast MyNeta scraper — direct lxml parsing, no multiprocessing overhead."""

import csv, time, sys, os, signal

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.scrape_myneta import scrape_candidate, CSV_FIELDS, CSV_PATH

MAX_ID = 4300
TIMEOUT_SEC = 25

def timeout_handler(signum, frame):
    raise TimeoutError("Scrape timed out")

def main():
    # Read existing IDs
    existing = set()
    with open(CSV_PATH) as f:
        for row in csv.DictReader(f):
            existing.add(int(row["myneta_id"]))
    print(f"Existing: {len(existing)} candidates", flush=True)

    # Find the max existing ID to start from there
    max_existing = max(existing) if existing else 0
    start_id = max_existing + 1
    print(f"Starting from ID {start_id} (max existing: {max_existing})", flush=True)

    found = 0
    skipped = 0
    timeouts = 0
    empty_streak = 0

    with open(CSV_PATH, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        for cid in range(start_id, MAX_ID + 1):
            if cid in existing:
                continue

            try:
                # Set alarm for timeout (works on Unix)
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(TIMEOUT_SEC)

                result = scrape_candidate(cid)

                signal.alarm(0)  # Cancel alarm
            except TimeoutError:
                timeouts += 1
                print(f"  ⏰ ID {cid} timed out", flush=True)
                continue
            except Exception as e:
                print(f"  ❌ ID {cid} error: {e}", flush=True)
                continue

            if result:
                writer.writerow(result)
                f.flush()
                found += 1
                empty_streak = 0
                if found % 10 == 0:
                    print(f"  ✅ {found} new (ID {cid}, total {len(existing)+found})...", flush=True)
            else:
                skipped += 1
                empty_streak += 1

            # If we get 200 empty in a row, we're past the valid range
            if empty_streak > 200:
                print(f"  200 empty IDs in a row at {cid}, stopping.", flush=True)
                break

            time.sleep(0.3)

    print(f"\n✅ Done! {found} new, {skipped} empty, {timeouts} timeouts")
    print(f"Total rows: {len(existing) + found}")

if __name__ == "__main__":
    main()
