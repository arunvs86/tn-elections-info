"""
Scrape MyNeta.info for Tamil Nadu 2016 candidate asset & criminal data.
Unlocks: Asset Growth Heatmap, Dynastic Politics Tracker, Party Hopper Tracker.

Usage:
  python3 scripts/scrape_myneta_2016.py scrape     # Phase 1: scrape → CSV
  python3 scripts/scrape_myneta_2016.py import     # Phase 2: CSV → Supabase

Phase 1 saves to scripts/myneta_tn2016.csv.
Phase 2 inserts candidates into Supabase with election_year=2016,
then links persons across 2016 ↔ 2021 for cross-year analysis.
"""

import sys
import os
import csv
import time
import re
import requests
import json

# ── Config ──────────────────────────────────────────────
BASE_URL = "https://myneta.info/TamilNadu2016/candidate.php?candidate_id="
CSV_PATH = os.path.join(os.path.dirname(__file__), "myneta_tn2016.csv")
MAX_ID = 4000  # TN 2016 IDs go up to ~3500; use 4000 to be safe
DELAY = 0.5    # seconds between requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) tnelections.info research bot"
}

CSV_FIELDS = [
    "myneta_id", "name", "constituency", "district", "party",
    "age", "education",
    "criminal_cases", "criminal_details",
    "movable_self", "movable_spouse", "movable_dependents", "movable_total",
    "immovable_self", "immovable_spouse", "immovable_dependents", "immovable_total",
    "total_assets", "liabilities",
    "affidavit_url",
]

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Install beautifulsoup4: pip install beautifulsoup4 lxml")
    sys.exit(1)


def parse_rupees(text: str) -> int | None:
    if not text:
        return None
    text = text.replace("\xa0", " ").split("~")[0].strip()
    if not text or "Nil" in text or "None" in text:
        return 0
    match = re.search(r"(?:Rs\.?\s*)?(\d{1,2}(?:,\d{2})*(?:,\d{3}))", text)
    if match:
        try:
            return int(match.group(1).replace(",", ""))
        except ValueError:
            pass
    match2 = re.search(r"(?:Rs\.?\s*)?([\d,]+)", text)
    if match2:
        try:
            return int(match2.group(1).replace(",", ""))
        except ValueError:
            pass
    return None


def extract_asset_breakdown(table):
    """Extract (self, spouse, dependents, total) from an asset table."""
    self_val = spouse_val = dep_val = total_val = 0
    if not table:
        return self_val, spouse_val, dep_val, total_val
    for row in table.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if not cells:
            continue
        label = cells[0].get_text(strip=True).lower()
        val_text = cells[-1].get_text(strip=True)
        v = parse_rupees(val_text) or 0
        if "self" in label and "grand" not in label:
            self_val = v
        elif "spouse" in label:
            spouse_val = v
        elif "dependent" in label or "huf" in label:
            dep_val = v
        elif "grand total" in label or "total" in label:
            total_val = v
    if total_val == 0:
        total_val = self_val + spouse_val + dep_val
    return self_val, spouse_val, dep_val, total_val


def scrape_candidate(candidate_id: int) -> dict | None:
    url = f"{BASE_URL}{candidate_id}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return None
        if len(resp.text) > 250000:
            return None
    except requests.RequestException:
        return None

    soup = BeautifulSoup(resp.text, "lxml")

    title = soup.find("title")
    if not title:
        return None
    title_text = title.text.strip()
    if "not found" in title_text.lower() or "Constituency-" not in title_text:
        return None

    match = re.match(
        r"(.+?)\((.+?)\)\s*:\s*Constituency-\s*(.+?)\(([^)]+)\)\s*-",
        title_text,
    )
    if not match:
        return None

    name = match.group(1).strip()
    party_full = match.group(2).strip()
    constituency = match.group(3).strip()
    district = match.group(4).strip()

    party_abbr_match = re.search(r"\(([A-Z]+)\)$", party_full)
    party = party_abbr_match.group(1) if party_abbr_match else party_full

    page_text = soup.get_text()

    age = None
    age_match = re.search(r"Age\s*[:\-]?\s*(\d+)", page_text)
    if age_match:
        age = int(age_match.group(1))

    education = ""
    for h3 in soup.find_all("h3"):
        if "educational" in h3.get_text(strip=True).lower():
            parent = h3.parent
            if parent:
                text = parent.get_text()
                idx = text.find("Educational Details")
                if idx >= 0:
                    snippet = text[idx + len("Educational Details"):]
                    cat_match = re.search(r"Category\s*:\s*(.+?)(?:\n|$)", snippet)
                    if cat_match:
                        education = cat_match.group(1).strip()
            break

    criminal_cases = 0
    criminal_details = ""
    all_ipc_sections = []

    CRIMINAL_HEADINGS_2016 = [
        "cases where charges framed",
        "cases where cognizance taken",
        "cases where convicted",
    ]

    for h3 in soup.find_all("h3"):
        h3_text = h3.get_text(strip=True).lower()
        if any(hd in h3_text for hd in CRIMINAL_HEADINGS_2016):
            table = h3.find_next("table")
            if not table:
                continue
            for tr in table.find_all("tr"):
                cells = tr.find_all(["td", "th"])
                if len(cells) < 2:
                    continue
                first = cells[0].get_text(strip=True)
                if first.isdigit():
                    criminal_cases += 1
                    # IPC sections in column index 1 for 2016 format
                    if len(cells) > 1:
                        ipc = cells[1].get_text(strip=True)
                        if ipc:
                            all_ipc_sections.append(ipc)

    if all_ipc_sections:
        criminal_details = "; ".join(all_ipc_sections)

    movable_self = movable_spouse = movable_dep = movable_total = 0
    immovable_self = immovable_spouse = immovable_dep = immovable_total = 0
    liabilities = 0

    for h3 in soup.find_all("h3"):
        h3_text = h3.get_text(strip=True).lower()
        if "details of movable assets" in h3_text:
            table = h3.find_next("table")
            movable_self, movable_spouse, movable_dep, movable_total = extract_asset_breakdown(table)
        elif "details of immovable assets" in h3_text:
            table = h3.find_next("table")
            immovable_self, immovable_spouse, immovable_dep, immovable_total = extract_asset_breakdown(table)
        elif "details of liabilities" in h3_text:
            table = h3.find_next("table")
            if table:
                for row in table.find_all("tr"):
                    cells = row.find_all(["td", "th"])
                    if not cells:
                        continue
                    label = cells[0].get_text(strip=True).lower()
                    if "gross total" in label or "total" in label:
                        liabilities = parse_rupees(cells[-1].get_text(strip=True)) or 0
                        break

    total_assets = movable_total + immovable_total

    return {
        "myneta_id": candidate_id,
        "name": name,
        "constituency": constituency,
        "district": district,
        "party": party,
        "age": age,
        "education": education,
        "criminal_cases": criminal_cases,
        "criminal_details": criminal_details,
        "movable_self": movable_self,
        "movable_spouse": movable_spouse,
        "movable_dependents": movable_dep,
        "movable_total": movable_total,
        "immovable_self": immovable_self,
        "immovable_spouse": immovable_spouse,
        "immovable_dependents": immovable_dep,
        "immovable_total": immovable_total,
        "total_assets": total_assets,
        "liabilities": liabilities,
        "affidavit_url": url,
    }


def phase1_scrape():
    print(f"Scraping MyNeta TN 2016 (IDs 1 to {MAX_ID})...")
    print(f"  Output: {CSV_PATH}")
    print(f"  Delay: {DELAY}s between requests")
    print()

    # Load existing rows, stripping any None keys from malformed CSV headers
    scraped_ids = set()
    existing_rows = []
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                clean_row = {k: v for k, v in row.items() if k is not None and k in CSV_FIELDS}
                if "myneta_id" not in clean_row:
                    continue
                existing_rows.append(clean_row)
                try:
                    scraped_ids.add(int(clean_row["myneta_id"]))
                except (ValueError, TypeError):
                    pass
        print(f"  Found {len(existing_rows)} existing records, resuming...")

    found = len(existing_rows)
    errors = 0

    with open(CSV_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for row in existing_rows:
            writer.writerow(row)

        for cid in range(1, MAX_ID + 1):
            if cid in scraped_ids:
                continue

            data = scrape_candidate(cid)
            if data:
                writer.writerow(data)
                found += 1
                f.flush()
                if found % 50 == 0:
                    print(f"  {found} candidates scraped (last ID: {cid})...", flush=True)
            else:
                errors += 1

            time.sleep(DELAY)

    print()
    print(f"Done! {found} candidates saved to {CSV_PATH}")
    print(f"  ({errors} empty/invalid IDs skipped)")


def _load_env():
    """Load env vars from frontend/.env.local if not already set."""
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if url and key:
        return url, key

    env_path = os.path.join(os.path.dirname(__file__), "..", "frontend", ".env.local")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip().strip('"')

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    return url, key


def _postgrest(supabase_url: str, key: str, method: str, path: str,
               params: dict = None, body=None, prefer: str = None):
    """Make a PostgREST API call (no supabase-py)."""
    url = f"{supabase_url}/rest/v1/{path}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    resp = requests.request(
        method, url, headers=headers,
        params=params,
        data=json.dumps(body) if body is not None else None,
        timeout=30,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"PostgREST {method} {path} -> {resp.status_code}: {resp.text[:300]}")
    return resp.json() if resp.text else []


def phase2_import():
    """Phase 2: Import CSV data into Supabase as election_year=2016 candidates."""
    sb_url, sb_key = _load_env()
    if not sb_url or not sb_key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    if not os.path.exists(CSV_PATH):
        print(f"CSV not found: {CSV_PATH}")
        print("Run 'python3 scripts/scrape_myneta_2016.py scrape' first")
        sys.exit(1)

    with open(CSV_PATH, "r") as f:
        reader = csv.DictReader(f)
        myneta_rows = list(reader)
    print(f"Loaded {len(myneta_rows)} 2016 candidates from CSV")

    # Load constituencies (id, name)
    const_data = _postgrest(sb_url, sb_key, "GET", "constituencies",
                            params={"select": "id,name", "limit": "300"})
    const_name_to_id = {c["name"].upper().strip(): c["id"] for c in const_data}
    print(f"Loaded {len(const_name_to_id)} constituencies")

    # Check which 2016 candidates already exist (for resume)
    existing_data = _postgrest(sb_url, sb_key, "GET", "candidates",
                               params={"select": "id,myneta_id_2016",
                                       "election_year": "eq.2016", "limit": "10000"})
    existing_myneta_ids = set()
    for c in existing_data:
        if c.get("myneta_id_2016"):
            existing_myneta_ids.add(int(c["myneta_id_2016"]))
    print(f"{len(existing_myneta_ids)} 2016 candidates already in DB (resume mode)")

    def fuzzy_const(name: str) -> int | None:
        upper = name.upper().strip()
        if upper in const_name_to_id:
            return const_name_to_id[upper]
        for k, v in const_name_to_id.items():
            if k.replace(" ", "") == upper.replace(" ", ""):
                return v
        return None

    inserted = 0
    skipped = 0
    unmatched_const = []
    BATCH = 50
    batch = []

    def flush_batch():
        nonlocal inserted
        if not batch:
            return
        _postgrest(sb_url, sb_key, "POST", "candidates",
                   body=batch, prefer="resolution=ignore-duplicates,return=minimal")
        inserted += len(batch)
        batch.clear()
        print(f"  Inserted {inserted} candidates...", flush=True)

    for row in myneta_rows:
        try:
            myneta_id = int(row["myneta_id"])
        except (ValueError, TypeError):
            continue

        if myneta_id in existing_myneta_ids:
            skipped += 1
            continue

        const_id = fuzzy_const(row["constituency"])
        if const_id is None:
            unmatched_const.append(row["constituency"])
            skipped += 1
            continue

        total_assets = int(row["total_assets"] or 0) if row.get("total_assets") else 0
        liabilities = int(row["liabilities"] or 0) if row.get("liabilities") else 0
        net_worth = total_assets - liabilities

        record = {
            "election_year": 2016,
            "name": row["name"],
            "constituency_id": const_id,
            "party": row["party"],
            "assets_movable": int(row["movable_total"] or 0) if row.get("movable_total") else None,
            "assets_immovable": int(row["immovable_total"] or 0) if row.get("immovable_total") else None,
            "assets_movable_self": int(row["movable_self"] or 0) if row.get("movable_self") else None,
            "assets_movable_spouse": int(row["movable_spouse"] or 0) if row.get("movable_spouse") else None,
            "assets_movable_dep": int(row["movable_dependents"] or 0) if row.get("movable_dependents") else None,
            "assets_immovable_self": int(row["immovable_self"] or 0) if row.get("immovable_self") else None,
            "assets_immovable_spouse": int(row["immovable_spouse"] or 0) if row.get("immovable_spouse") else None,
            "assets_immovable_dep": int(row["immovable_dependents"] or 0) if row.get("immovable_dependents") else None,
            "liabilities": liabilities if liabilities else None,
            "net_worth": net_worth if total_assets else None,
            "criminal_cases_declared": int(row["criminal_cases"] or 0) if row.get("criminal_cases") else 0,
            "affidavit_url": row["affidavit_url"],
            "myneta_id_2016": myneta_id,
        }

        batch.append(record)

        if len(batch) >= BATCH:
            flush_batch()

    flush_batch()

    if unmatched_const:
        unique_unmatched = list(set(unmatched_const))[:20]
        print(f"\n  {len(set(unmatched_const))} unmatched constituency names (first 20): {unique_unmatched}")

    print()
    print(f"Import complete! Inserted: {inserted}, Skipped: {skipped}")

    print()
    print("Linking 2016 candidates to existing persons by name+constituency...")
    _cross_link_persons(sb_url, sb_key)


def _cross_link_persons(sb_url: str, sb_key: str):
    """Link 2016 candidates to existing persons (from 2021) by name match."""
    cands_2016 = _postgrest(sb_url, sb_key, "GET", "candidates",
                            params={"select": "id,name,constituency_id",
                                    "election_year": "eq.2016",
                                    "person_id": "is.null",
                                    "limit": "10000"})
    if not cands_2016:
        print("  No unlinked 2016 candidates found.")
        return

    persons = _postgrest(sb_url, sb_key, "GET", "persons",
                         params={"select": "id,canonical_name", "limit": "10000"})
    person_by_name = {p["canonical_name"].upper().strip(): p["id"] for p in persons}

    linked = 0
    new_persons = 0

    for c in cands_2016:
        c_name_upper = c["name"].upper().strip()
        person_id = person_by_name.get(c_name_upper)

        if person_id:
            _postgrest(sb_url, sb_key, "PATCH", "candidates",
                       params={"id": f"eq.{c['id']}"},
                       body={"person_id": person_id},
                       prefer="return=minimal")
            linked += 1
        else:
            new_p = _postgrest(sb_url, sb_key, "POST", "persons",
                               body={"canonical_name": c["name"]},
                               prefer="return=representation")
            if new_p and isinstance(new_p, list) and new_p[0].get("id"):
                new_person_id = new_p[0]["id"]
                person_by_name[c_name_upper] = new_person_id
                _postgrest(sb_url, sb_key, "PATCH", "candidates",
                           params={"id": f"eq.{c['id']}"},
                           body={"person_id": new_person_id},
                           prefer="return=minimal")
                new_persons += 1

        if (linked + new_persons) % 200 == 0 and (linked + new_persons) > 0:
            print(f"  Linked {linked} + created {new_persons} persons...", flush=True)

    print(f"  Linked {linked} to existing persons")
    print(f"  Created {new_persons} new person records for 2016-only politicians")
    print()
    print("Next: run migration_012 to create the asset_growth view for the heatmap")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    cmd = sys.argv[1].lower()
    if cmd == "scrape":
        phase1_scrape()
    elif cmd == "import":
        phase2_import()
    else:
        print(f"Unknown command: {cmd}")
        print("Usage: python3 scripts/scrape_myneta_2016.py [scrape|import]")
        sys.exit(1)
