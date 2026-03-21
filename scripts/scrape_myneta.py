"""
Scrape MyNeta.info for Tamil Nadu 2021 candidate asset & criminal data.

Usage:
  python3 scripts/scrape_myneta.py scrape     # Phase 1: scrape → CSV
  python3 scripts/scrape_myneta.py import     # Phase 2: CSV → Supabase

Phase 1 saves to scripts/myneta_tn2021.csv (raw scraped data).
Phase 2 matches by name+constituency and updates Supabase candidates table.
"""

import sys
import os
import csv
import time
import re
import requests
from bs4 import BeautifulSoup

# ── Config ──────────────────────────────────────────────
BASE_URL = "https://myneta.info/TamilNadu2021/candidate.php?candidate_id="
CSV_PATH = os.path.join(os.path.dirname(__file__), "myneta_tn2021.csv")
MAX_ID = 4300  # MyNeta IDs go up to ~4261 for TN 2021
DELAY = 0.5  # seconds between requests (be polite)

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


def parse_rupees(text: str) -> int | None:
    """Convert 'Rs 3,25,17,877~3 Crore+' or 'Rs 3,25,17,8773 Crore+' to int."""
    if not text:
        return None
    # Normalize: replace non-breaking spaces with regular spaces
    text = text.replace("\xa0", " ")
    # Split at ~ if present (summary tables use ~)
    text = text.split("~")[0].strip()
    if not text or "Nil" in text or "None" in text:
        return 0
    # Extract the Rs amount: "Rs 3,25,17,877" pattern
    # This handles both "Rs 3,25,17,877" and "Rs 3,25,17,8773 Crore+"
    # by matching the Indian number format (groups of 2 after initial group)
    match = re.search(r"(?:Rs\.?\s*)?(\d{1,2}(?:,\d{2})*(?:,\d{3}))", text)
    if match:
        cleaned = match.group(1).replace(",", "")
        try:
            return int(cleaned)
        except ValueError:
            pass
    # Fallback: just grab all digits before any alpha chars
    match2 = re.search(r"(?:Rs\.?\s*)?([\d,]+)", text)
    if match2:
        cleaned = match2.group(1).replace(",", "")
        try:
            return int(cleaned)
        except ValueError:
            pass
    return None


def scrape_candidate(candidate_id: int) -> dict | None:
    """Scrape one candidate page. Returns dict or None if page doesn't exist."""
    url = f"{BASE_URL}{candidate_id}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return None
        # Skip abnormally large pages (>250KB) — they cause parser hangs
        # Pages 100-200KB are normal for candidates with many assets
        if len(resp.text) > 250000:
            print(f"   ⚠️ Skipping ID {candidate_id} — page too large ({len(resp.text)} bytes)", flush=True)
            return None
    except requests.RequestException:
        return None

    soup = BeautifulSoup(resp.text, "lxml")

    # ── Validate page ──
    title = soup.find("title")
    if not title:
        return None
    title_text = title.text.strip()
    if "not found" in title_text.lower() or "Constituency-" not in title_text:
        return None

    # ── Name, Party, Constituency, District from <title> ──
    # Format: "Name(FullParty(Abbrev)):Constituency- CONST(DISTRICT) - Affidavit..."
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

    # Extract party abbreviation: "Indian National Congress(INC)" → "INC"
    party_abbr_match = re.search(r"\(([A-Z]+)\)$", party_full)
    party = party_abbr_match.group(1) if party_abbr_match else party_full

    page_text = soup.get_text()

    # ── Age ──
    age = None
    age_match = re.search(r"Age\s*[:\-]?\s*(\d+)", page_text)
    if age_match:
        age = int(age_match.group(1))

    # ── Education ──
    # Text after "Educational Details" h3: "Category: Graduate Professional\n B.L(...)"
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

    # ── Criminal Cases ──
    criminal_cases = 0
    all_ipc_sections = []

    # Count rows in the "Cases where Pending" table + extract IPC sections
    for h3 in soup.find_all("h3"):
        if "cases where pending" in h3.get_text(strip=True).lower():
            table = h3.find_next("table")
            if table:
                table_text = table.get_text(strip=True)
                if "no cases" in table_text.lower():
                    criminal_cases = 0
                else:
                    rows = table.find_all("tr")
                    criminal_cases = max(0, len(rows) - 1)
                    # Extract IPC sections from each case row
                    # Column 4 (index 4) is "IPC Sections Applicable"
                    for row in rows[1:]:  # skip header
                        cells = row.find_all(["td", "th"])
                        if len(cells) >= 5:
                            ipc = cells[4].get_text(strip=True)
                            if ipc and ipc != "-":
                                all_ipc_sections.append(ipc)
            break

    # Also check convicted cases
    convicted = 0
    for h3 in soup.find_all("h3"):
        if "cases where convicted" in h3.get_text(strip=True).lower():
            table = h3.find_next("table")
            if table:
                table_text = table.get_text(strip=True)
                if "no cases" not in table_text.lower():
                    rows = table.find_all("tr")
                    convicted = max(0, len(rows) - 1)
                    for row in rows[1:]:
                        cells = row.find_all(["td", "th"])
                        if len(cells) >= 4:
                            ipc = cells[3].get_text(strip=True)
                            if ipc and ipc != "-":
                                all_ipc_sections.append(ipc)
            break
    criminal_cases += convicted

    # Build criminal details: unique IPC sections across all cases
    # e.g., "IPC 143, 341, 269, 188 | Epidemic Disease Act"
    criminal_details = "; ".join(all_ipc_sections) if all_ipc_sections else ""

    # ── Assets & Liabilities ──
    # We extract from detail tables: self, spouse, dependents, total
    # Table structure:
    #   Header: Sr No | Description | self | spouse | huf | dependent1 | dependent2 | dependent3
    #   ...item rows...
    #   Total row: "Gross Total Value (as per Affidavit)" | self_val | spouse_val | dep_val | ... | grand_total
    #   Calculated row: "Totals (Calculated...)" | self_val | spouse_val | dep_val | ... | grand_total

    def _parse_total_row(cells):
        """Parse a total row into (self, spouse, dependents, total)."""
        a_self = parse_rupees(cells[1].get_text(strip=True)) if len(cells) >= 3 else 0
        a_spouse = parse_rupees(cells[2].get_text(strip=True)) if len(cells) >= 4 else 0
        # Dependents: sum huf + dep1 + dep2 + dep3 (cells 3 to second-last)
        dep_sum = 0
        for i in range(3, min(len(cells) - 1, 7)):
            val = parse_rupees(cells[i].get_text(strip=True))
            if val:
                dep_sum += val
        # Grand total is always the last cell
        a_total = parse_rupees(cells[-1].get_text(strip=True)) if len(cells) >= 2 else 0
        return a_self or 0, a_spouse or 0, dep_sum, a_total or 0

    def extract_asset_breakdown(table):
        """Extract self/spouse/dependents/total from a movable or immovable asset table.
        Prefers 'Totals Calculated' row (matches MyNeta display).
        Falls back to 'Gross Total / Total Current Market Value' row.
        Returns (self, spouse, dependents, total) as ints."""
        if not table:
            return 0, 0, 0, 0

        rows = table.find_all("tr")

        # Priority 1: "Totals (Calculated...)" — this is what MyNeta displays on the site
        for row in rows:
            cells = row.find_all(["td", "th"])
            if not cells:
                continue
            label = cells[0].get_text(strip=True).lower()
            if "totals" in label and "calculated" in label:
                return _parse_total_row(cells)

        # Priority 2: "Gross Total Value (as per Affidavit)" or "Total Current Market Value"
        for row in rows:
            cells = row.find_all(["td", "th"])
            if not cells:
                continue
            label = cells[0].get_text(strip=True).lower()
            if "gross total" in label or "total current market" in label:
                return _parse_total_row(cells)

        return 0, 0, 0, 0

        return a_self or 0, a_spouse or 0, a_dep or 0, a_total or 0

    movable_self, movable_spouse, movable_dep, movable_total = 0, 0, 0, 0
    immovable_self, immovable_spouse, immovable_dep, immovable_total = 0, 0, 0, 0
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
                # Liabilities total row: same pattern, last cell = grand total
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
    """Phase 1: Scrape all candidates from MyNeta → CSV."""
    print(f"🔍 Scraping MyNeta TN 2021 (IDs 1 to {MAX_ID})...")
    print(f"   Output: {CSV_PATH}")
    print(f"   Delay: {DELAY}s between requests")
    print()

    # Resume support: check existing CSV
    scraped_ids = set()
    existing_rows = []
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing_rows.append(row)
                scraped_ids.add(int(row["myneta_id"]))
        print(f"   Found {len(existing_rows)} existing records, resuming...")

    found = len(existing_rows)
    errors = 0

    with open(CSV_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()

        # Write existing rows back
        for row in existing_rows:
            writer.writerow(row)

        for cid in range(1, MAX_ID + 1):
            if cid in scraped_ids:
                continue

            data = scrape_candidate(cid)
            if data:
                writer.writerow(data)
                found += 1
                f.flush()  # flush after every write for resume safety
                if found % 50 == 0:
                    print(f"   ✅ {found} candidates scraped (ID {cid})...", flush=True)
            else:
                errors += 1

            time.sleep(DELAY)

    print()
    print(f"✅ Done! {found} candidates saved to {CSV_PATH}")
    print(f"   ({errors} empty/invalid IDs skipped)")


def phase2_import():
    """Phase 2: Import CSV data into Supabase candidates table."""
    from supabase import create_client

    # Load env vars
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not url or not key:
        # Try loading from .env.local
        env_path = os.path.join(os.path.dirname(__file__), "..", "frontend", ".env.local")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if "=" in line and not line.startswith("#"):
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip()
            url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
            key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not url or not key:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        print("   Set them as env vars or in frontend/.env.local")
        sys.exit(1)

    sb = create_client(url, key)

    # Load CSV
    if not os.path.exists(CSV_PATH):
        print(f"❌ CSV not found: {CSV_PATH}")
        print("   Run 'python3 scripts/scrape_myneta.py scrape' first")
        sys.exit(1)

    with open(CSV_PATH, "r") as f:
        reader = csv.DictReader(f)
        myneta_rows = list(reader)

    print(f"📄 Loaded {len(myneta_rows)} candidates from CSV")

    # Load our DB candidates (2021 only)
    result = sb.table("candidates").select("id, name, constituency_id, party").eq("election_year", 2021).execute()
    db_candidates = result.data
    print(f"📊 Loaded {len(db_candidates)} candidates from Supabase")

    # Load constituencies for name matching
    const_result = sb.table("constituencies").select("id, name").execute()
    const_map = {c["id"]: c["name"].upper() for c in const_result.data}
    const_name_to_id = {c["name"].upper(): c["id"] for c in const_result.data}

    # Build lookup: (constituency_name_upper, candidate_name_upper) → db row
    db_lookup = {}
    for c in db_candidates:
        const_name = const_map.get(c["constituency_id"], "")
        key = (const_name, c["name"].upper().strip())
        db_lookup[key] = c

    # Match and update
    matched = 0
    unmatched = 0
    updated = 0

    for row in myneta_rows:
        myneta_const = row["constituency"].upper().strip()
        myneta_name = row["name"].upper().strip()

        # Try exact match
        db_row = db_lookup.get((myneta_const, myneta_name))

        # Try fuzzy: sometimes MyNeta has extra initials or different formatting
        if not db_row:
            # Try matching just by constituency + first/last name parts
            for key, val in db_lookup.items():
                if key[0] == myneta_const:
                    # Check if names are similar enough
                    db_name_parts = set(key[1].split())
                    mn_name_parts = set(myneta_name.split())
                    # If 2+ name parts match, consider it a match
                    common = db_name_parts & mn_name_parts
                    if len(common) >= 2 or (len(common) >= 1 and len(db_name_parts) <= 2):
                        db_row = val
                        break

        if not db_row:
            unmatched += 1
            continue

        matched += 1

        # Build update payload
        update = {}
        if row["movable_assets"]:
            try:
                update["assets_movable"] = int(row["movable_assets"])
            except (ValueError, TypeError):
                pass
        if row["immovable_assets"]:
            try:
                update["assets_immovable"] = int(row["immovable_assets"])
            except (ValueError, TypeError):
                pass
        if row["liabilities"]:
            try:
                update["liabilities"] = int(row["liabilities"])
            except (ValueError, TypeError):
                pass
        if row["total_assets"]:
            try:
                update["net_worth"] = int(row["total_assets"]) - int(row.get("liabilities") or 0)
            except (ValueError, TypeError):
                pass
        if row["criminal_cases"]:
            try:
                update["criminal_cases_declared"] = int(row["criminal_cases"])
            except (ValueError, TypeError):
                pass
        if row["affidavit_url"]:
            update["affidavit_url"] = row["affidavit_url"]

        if update:
            sb.table("candidates").update(update).eq("id", db_row["id"]).execute()
            updated += 1
            if updated % 100 == 0:
                print(f"   ✅ Updated {updated} candidates...")

    print()
    print(f"✅ Import complete!")
    print(f"   Matched:   {matched}/{len(myneta_rows)}")
    print(f"   Updated:   {updated}")
    print(f"   Unmatched: {unmatched}")


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
        print("Usage: python3 scripts/scrape_myneta.py [scrape|import]")
        sys.exit(1)
