"""
Scrape MyNeta.info for Tamil Nadu 2026 candidate asset & criminal data.

This is the 2026-specific version of scrape_myneta.py.
Uses https://myneta.info/TamilNadu2026/ as the base URL.

Usage:
  python3 scripts/scrape_myneta_2026.py scrape   # Phase 1: scrape → CSV
  python3 scripts/scrape_myneta_2026.py import   # Phase 2: CSV → Supabase

Phase 1 saves to scripts/myneta_tn2026.csv
Phase 2 upserts into Supabase candidates table (election_year=2026)

Resume-safe: re-running scrape skips already-scraped IDs.
"""

import sys, os, csv, time, re, signal
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL  = "https://myneta.info/TamilNadu2026/candidate.php?candidate_id="
CSV_PATH  = os.path.join(os.path.dirname(__file__), "myneta_tn2026.csv")
MAX_ID    = 5000      # TN 2026 has ~234×8–12 = ~2000-2800 candidates; 5000 is safe ceiling
DELAY     = 0.4       # seconds between requests

HEADERS_HTTP = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) tnelections.info/research-bot"
}

CSV_FIELDS = [
    "myneta_id", "name", "constituency", "party",
    "age", "education",
    "criminal_cases", "criminal_details",
    "movable_total", "immovable_total", "total_assets", "liabilities",
    "affidavit_url",
]

# ── Supabase REST helpers ─────────────────────────────────────────────────────
def sb_get(table, params):
    r = httpx.get(f"{SUPABASE_URL}/rest/v1/{table}", params=params, headers={
        "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
    }, timeout=20)
    r.raise_for_status()
    return r.json()

def sb_post(table, body, upsert=False):
    headers = {
        "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json", "Prefer": "return=representation",
    }
    if upsert:
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    r = httpx.post(f"{SUPABASE_URL}/rest/v1/{table}", json=body, headers=headers, timeout=20)
    r.raise_for_status()
    return r.json()

def sb_patch(table, params, body):
    r = httpx.patch(f"{SUPABASE_URL}/rest/v1/{table}", params=params, json=body, headers={
        "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json", "Prefer": "return=representation",
    }, timeout=20)
    r.raise_for_status()
    return r.json()

# ── Parsing helpers ───────────────────────────────────────────────────────────
def parse_rupees(text: str):
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

def extract_asset_total(table):
    """Pull the grand total from a movable/immovable asset table."""
    if not table:
        return 0
    for row in table.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if not cells:
            continue
        label = cells[0].get_text(strip=True).lower()
        if "totals" in label and "calculated" in label:
            return parse_rupees(cells[-1].get_text(strip=True)) or 0
    for row in table.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if not cells:
            continue
        label = cells[0].get_text(strip=True).lower()
        if "gross total" in label or "total current market" in label:
            return parse_rupees(cells[-1].get_text(strip=True)) or 0
    return 0

# ── Candidate page scraper ────────────────────────────────────────────────────
def scrape_candidate(candidate_id: int):
    """Scrape one 2026 candidate page. Returns dict or None."""
    url = f"{BASE_URL}{candidate_id}"
    try:
        resp = httpx.get(url, headers=HEADERS_HTTP, timeout=15, follow_redirects=True)
        if resp.status_code != 200:
            return None
        if len(resp.text) > 300_000:
            return None
    except Exception:
        return None

    soup = BeautifulSoup(resp.text, "lxml")

    title = soup.find("title")
    if not title:
        return None
    title_text = title.text.strip()
    if "not found" in title_text.lower() or "Constituency-" not in title_text:
        return None

    # Parse: "Name(Party):Constituency- CONST(DISTRICT) -"
    match = re.match(
        r"(.+?)\((.+?)\)\s*:\s*Constituency-\s*(.+?)\([^)]+\)\s*-",
        title_text,
    )
    if not match:
        return None

    name  = match.group(1).strip()
    party_raw = match.group(2).strip()
    constituency = match.group(3).strip()

    # Extract abbreviation: "Indian National Congress(INC)" → "INC"
    abbr = re.search(r"\(([A-Z]+)\)$", party_raw)
    party = abbr.group(1) if abbr else party_raw

    page_text = soup.get_text()

    # Age
    age = None
    am = re.search(r"Age\s*[:\-]?\s*(\d+)", page_text)
    if am:
        age = int(am.group(1))

    # Education
    education = ""
    for h3 in soup.find_all("h3"):
        if "educational" in h3.get_text(strip=True).lower():
            parent = h3.parent
            if parent:
                text = parent.get_text()
                idx = text.find("Educational Details")
                if idx >= 0:
                    cat_m = re.search(r"Category\s*:\s*(.+?)(?:\n|$)", text[idx:])
                    if cat_m:
                        education = cat_m.group(1).strip()
            break

    # Criminal cases
    criminal_cases = 0
    all_sections   = []

    for h3 in soup.find_all("h3"):
        if "cases where pending" in h3.get_text(strip=True).lower():
            tbl = h3.find_next("table")
            if tbl:
                if "no cases" not in tbl.get_text(strip=True).lower():
                    rows = tbl.find_all("tr")
                    criminal_cases += max(0, len(rows) - 1)
                    for row in rows[1:]:
                        cells = row.find_all(["td", "th"])
                        if len(cells) >= 5:
                            ipc = cells[4].get_text(strip=True)
                            if ipc and ipc != "-":
                                all_sections.append(ipc)
            break

    for h3 in soup.find_all("h3"):
        if "cases where convicted" in h3.get_text(strip=True).lower():
            tbl = h3.find_next("table")
            if tbl:
                if "no cases" not in tbl.get_text(strip=True).lower():
                    rows = tbl.find_all("tr")
                    criminal_cases += max(0, len(rows) - 1)
            break

    # Assets
    movable_total = 0
    immovable_total = 0
    liabilities = 0

    for h3 in soup.find_all("h3"):
        h3_text = h3.get_text(strip=True).lower()
        if "details of movable assets" in h3_text:
            movable_total = extract_asset_total(h3.find_next("table"))
        elif "details of immovable assets" in h3_text:
            immovable_total = extract_asset_total(h3.find_next("table"))
        elif "details of liabilities" in h3_text:
            tbl = h3.find_next("table")
            if tbl:
                for row in tbl.find_all("tr"):
                    cells = row.find_all(["td", "th"])
                    if cells and "total" in cells[0].get_text(strip=True).lower():
                        liabilities = parse_rupees(cells[-1].get_text(strip=True)) or 0
                        break

    return {
        "myneta_id":       candidate_id,
        "name":            name,
        "constituency":    constituency,
        "party":           party,
        "age":             age,
        "education":       education,
        "criminal_cases":  criminal_cases,
        "criminal_details": "; ".join(all_sections),
        "movable_total":   movable_total,
        "immovable_total": immovable_total,
        "total_assets":    movable_total + immovable_total,
        "liabilities":     liabilities,
        "affidavit_url":   url,
    }

# ── Phase 1: Scrape → CSV ─────────────────────────────────────────────────────
def phase1_scrape():
    print(f"🔍 Scraping MyNeta TN 2026 (IDs 1 – {MAX_ID})...")
    print(f"   Output : {CSV_PATH}")
    print(f"   Delay  : {DELAY}s\n")

    # Resume: load already-scraped IDs
    existing_ids = set()
    existing_rows = []
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, newline="") as f:
            for row in csv.DictReader(f):
                existing_rows.append(row)
                existing_ids.add(int(row["myneta_id"]))
        print(f"   ↺ Resuming — {len(existing_rows)} already scraped\n")

    found = len(existing_rows)
    skipped = 0
    empty_streak = 0

    with open(CSV_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for row in existing_rows:
            writer.writerow(row)

        for cid in range(1, MAX_ID + 1):
            if cid in existing_ids:
                continue

            # Per-candidate timeout via SIGALRM (Unix only)
            def _timeout(sig, frame):
                raise TimeoutError()
            signal.signal(signal.SIGALRM, _timeout)
            signal.alarm(25)
            try:
                data = scrape_candidate(cid)
                signal.alarm(0)
            except TimeoutError:
                signal.alarm(0)
                print(f"   ⏰ ID {cid} timed out", flush=True)
                continue
            except Exception as e:
                signal.alarm(0)
                print(f"   ❌ ID {cid} error: {e}", flush=True)
                continue

            if data:
                writer.writerow(data)
                f.flush()
                found += 1
                empty_streak = 0
                if found % 50 == 0:
                    print(f"   ✅ {found} candidates (ID {cid})...", flush=True)
            else:
                skipped += 1
                empty_streak += 1

            # Stop once 300 consecutive IDs return nothing
            if empty_streak >= 300:
                print(f"   300 empty IDs in a row at {cid} — stopping.", flush=True)
                break

            time.sleep(DELAY)

    print(f"\n✅ Done! {found} total candidates → {CSV_PATH}")
    print(f"   ({skipped} empty IDs skipped)")

# ── Phase 2: CSV → Supabase ───────────────────────────────────────────────────
def phase2_import():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in backend/.env")
        sys.exit(1)

    if not os.path.exists(CSV_PATH):
        print(f"❌ CSV not found: {CSV_PATH}")
        print("   Run 'python3 scripts/scrape_myneta_2026.py scrape' first")
        sys.exit(1)

    with open(CSV_PATH, newline="") as f:
        rows = list(csv.DictReader(f))
    print(f"📄 {len(rows)} candidates in CSV")

    # Load DB 2026 candidates with constituency info
    print("Loading 2026 candidates from Supabase...")
    db_candidates = []
    offset = 0
    while True:
        batch = sb_get("candidates", {
            "select": "id,name,constituency_id,party",
            "election_year": "eq.2026",
            "limit": 1000, "offset": offset,
        })
        db_candidates.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    print(f"   {len(db_candidates)} candidates in DB for 2026")

    # Load constituencies
    constituencies = sb_get("constituencies", {"select": "id,name", "limit": 300})
    const_id_to_name = {c["id"]: c["name"].upper().strip() for c in constituencies}
    const_name_to_id = {c["name"].upper().strip(): c["id"] for c in constituencies}

    # Constituency name aliases (same as 2021 — spelling diffs persist)
    ALIASES = {
        'ARAKKONAM': 'ARAKONAM', 'ARANTHANGI': 'ARANTANGI',
        'BODINAYAKKANUR': 'BODINAYAKANUR', 'COLACHAL': 'COLACHEL',
        'EDAPPADI': 'EDAPADI', 'ERODE EAST': 'ERODE (EAST)',
        'ERODE WEST': 'ERODE (WEST)', 'GANDARVAKOTTAI': 'GANDHARVAKOTTAI',
        'GUDIYATTAM': 'GUDIYATHAM', 'GUMMIDIPOONDI': 'GUMMIDIPUNDI',
        'MADHAVARAM': 'MADAVARAM', 'MADHURAVOYAL': 'MADURAVOYAL',
        'MADURANTAKAM': 'MADURANTHAKAM', 'MODAKKURICHI': 'MODAKURICHI',
        'NILAKKOTTAI': 'NILAKOTTAI', 'ORATHANADU': 'ORATHANAD',
        'PALAYAMKOTTAI': 'PALAYAMCOTTAI', 'RISHIVANDIYAM': 'RISHIVANDIAM',
        'SALEM NORTH': 'SALEM (NORTH)', 'SALEM SOUTH': 'SALEM (SOUTH)',
        'SALEM WEST': 'SALEM (WEST)', 'SENTHAMANGALAM': 'SENDAMANGALAM',
        'SHOLINGANALLUR': 'SHOZHINGANALLUR', 'SIRKAZHI': 'SIRKALI',
        'THALLY': 'THALLI', 'THIRUTHURAIPOONDI': 'THIRUTHURAIPUNDI',
        'THIRUVAUR': 'THIRUVARUR', 'THIRUVERUMBUR': 'THIRUVERAMBUR',
        'THIRUVIDAIMARUDUR': 'THIRUVIDAMARUDUR', 'THOOTHUKUDI': 'THOOTHUKKUDI',
        'TIRUCHENGODU': 'TIRUCHENGODE', 'TIRUCHIRAPPALLI EAST': 'TIRUCHIRAPALLI (EAST)',
        'TIRUCHIRAPPALLI WEST': 'TIRUCHIRAPALLI (WEST)', 'TIRUPATTUR': 'TIRUPPATTUR',
        'TIRUPPATHUR': 'TIRUPPATTUR', 'TIRUPPUR NORTH': 'TIRUPPUR (NORTH)',
        'TIRUPPUR SOUTH': 'TIRUPPUR (SOUTH)', 'UDUMALAIPETTAI': 'UDUMALPET',
        'ULUNDURPETTAI': 'ULUNDURPET', 'VANIYAMBADI': 'VANIAYAMBADI',
        'VEDHARANYAM': 'VEDARANYAM', 'VRIDHACHALAM': 'VRIDDHACHALAM',
    }

    def resolve_const(name):
        n = re.sub(r'\s*\((?:SC|ST|GEN)\)\s*$', '', name.upper().strip())
        n = re.sub(r'\s+', ' ', n).strip()
        return ALIASES.get(n, n)

    # Build lookup (NORM_NAME, NORM_CONSTITUENCY) → db candidate id
    lookup = {}
    by_const = {}
    for c in db_candidates:
        cn = const_id_to_name.get(c["constituency_id"], "")
        key = (c["name"].upper().strip(), cn)
        lookup[key] = c["id"]
        by_const.setdefault(cn, []).append((c["name"].upper().strip(), c["id"]))

    def fuzzy_match(mn_name, cands_in_const):
        mn_parts = set(re.sub(r'[,.]', ' ', mn_name).upper().split())
        mn_words = {p for p in mn_parts if len(p) > 1}
        best_id, best_score = None, 0
        for db_name, cid in cands_in_const:
            db_parts = set(re.sub(r'[,.]', ' ', db_name).split())
            db_words = {p for p in db_parts if len(p) > 1}
            score = len(mn_words & db_words) * 3
            if mn_words and db_words and max(mn_words, key=len) == max(db_words, key=len):
                score += 2
            if score > best_score:
                best_score, best_id = score, cid
        return best_id if best_score >= 3 else None

    print("\nMatching and importing...")
    matched = 0
    unmatched = 0
    inserted_new = 0
    updated = 0

    for row in rows:
        mn_name  = row["name"].upper().strip()
        mn_const = resolve_const(row["constituency"])
        db_id = lookup.get((mn_name, mn_const))

        if not db_id and mn_const in by_const:
            db_id = fuzzy_match(mn_name, by_const[mn_const])

        if db_id:
            # Update existing 2026 candidate
            matched += 1
            payload = {
                "assets_movable":          int(row["movable_total"] or 0),
                "assets_immovable":        int(row["immovable_total"] or 0),
                "net_worth":               int(row["total_assets"] or 0) - int(row["liabilities"] or 0),
                "liabilities":             int(row["liabilities"] or 0),
                "criminal_cases_declared": int(row["criminal_cases"] or 0),
                "affidavit_url":           row["affidavit_url"],
                "myneta_id_2026":          int(row["myneta_id"]),
            }
            try:
                sb_patch("candidates", {"id": f"eq.{db_id}"}, payload)
                updated += 1
            except Exception as e:
                print(f"   ❌ Update failed for {row['name']}: {e}")
        else:
            # New candidate — insert into candidates table
            unmatched += 1
            const_id = const_name_to_id.get(mn_const)
            if not const_id:
                # Try with alias resolution already done
                continue

            new_row = {
                "name":                    row["name"],
                "party":                   row["party"],
                "constituency_id":         const_id,
                "election_year":           2026,
                "age":                     int(row["age"]) if row["age"] else None,
                "education":               row["education"] or None,
                "assets_movable":          int(row["movable_total"] or 0),
                "assets_immovable":        int(row["immovable_total"] or 0),
                "net_worth":               int(row["total_assets"] or 0) - int(row["liabilities"] or 0),
                "liabilities":             int(row["liabilities"] or 0),
                "criminal_cases_declared": int(row["criminal_cases"] or 0),
                "affidavit_url":           row["affidavit_url"],
                "myneta_id_2026":          int(row["myneta_id"]),
            }
            try:
                sb_post("candidates", new_row)
                inserted_new += 1
            except Exception as e:
                print(f"   ❌ Insert failed for {row['name']} ({row['constituency']}): {e}")

        if (updated + inserted_new) % 100 == 0 and (updated + inserted_new) > 0:
            print(f"   ... {updated} updated, {inserted_new} inserted", flush=True)
            time.sleep(0.3)

    print(f"\n✅ Import complete!")
    print(f"   Matched & updated : {updated}")
    print(f"   New inserts       : {inserted_new}")
    print(f"   Could not match   : {unmatched - inserted_new}")


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    cmd = sys.argv[1].lower() if len(sys.argv) > 1 else ""
    if cmd == "scrape":
        phase1_scrape()
    elif cmd == "import":
        phase2_import()
    else:
        print(__doc__)
