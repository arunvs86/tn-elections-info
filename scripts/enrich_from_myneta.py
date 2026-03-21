"""
Enrich candidates table with MyNeta data (assets, criminal cases, affidavit URLs)
and populate criminal_cases table with parsed IPC sections.

Also fills constituency.current_mla / current_mla_party from 2021 winners.

Uses httpx REST API (no supabase-py).
"""
import csv
import os
import re
import sys
import time
import httpx
from dotenv import load_dotenv

# Load env
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend', '.env')
load_dotenv(dotenv_path)
print(f"Loading .env from: {dotenv_path}")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY missing in .env")
    sys.exit(1)

BASE = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

MYNETA_CSV = os.path.join(os.path.dirname(__file__), 'myneta_tn2021.csv')
CLIENT = httpx.Client(timeout=30.0)


# ─── Helpers ───────────────────────────────────────────────────────

def safe_int(val):
    try:
        return int(float(val)) if val and val.strip() != '' else None
    except:
        return None

def safe_float(val):
    try:
        return float(val) if val and val.strip() != '' else None
    except:
        return None

def rest_get(table, params):
    r = CLIENT.get(f"{BASE}/{table}", params=params, headers=HEADERS)
    r.raise_for_status()
    return r.json()

def rest_patch(table, params, payload):
    """PATCH (update) rows matching filter."""
    r = CLIENT.patch(f"{BASE}/{table}", params=params, json=payload, headers=HEADERS)
    r.raise_for_status()
    return r.json()

def rest_post_batch(table, rows):
    """Insert a batch of rows."""
    if not rows:
        return []
    r = CLIENT.post(f"{BASE}/{table}", json=rows, headers=HEADERS)
    r.raise_for_status()
    return r.json()

def normalize_name(name):
    """Normalize candidate name for matching."""
    if not name:
        return ""
    name = name.strip().upper()
    # Remove dots, extra spaces
    name = re.sub(r'\.', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def normalize_constituency(name):
    """Normalize constituency name for matching."""
    if not name:
        return ""
    name = name.strip().upper()
    # Remove " : BYE ELECTION..." suffix
    name = re.sub(r'\s*:\s*BYE ELECTION.*', '', name)
    # Remove (SC), (ST), (GEN) suffixes — MyNeta includes these, DB doesn't
    name = re.sub(r'\s*\((?:SC|ST|GEN)\)\s*$', '', name)
    # Common normalization
    name = re.sub(r'\s+', ' ', name).strip()
    return name

# MyNeta constituency name → DB constituency name
# Built from analyzing all 47 mismatched constituencies in 2021 data
CONSTITUENCY_ALIASES = {
    'ARAKKONAM': 'ARAKONAM',
    'ARANTHANGI': 'ARANTANGI',
    'BODINAYAKKANUR': 'BODINAYAKANUR',
    'COLACHAL': 'COLACHEL',
    'DR.RADHAKRISHNAN NAGAR': 'DR. RADHAKRISHNAN NAGAR',
    'EDAPPADI': 'EDAPADI',
    'ERODE EAST': 'ERODE (EAST)',
    'ERODE WEST': 'ERODE (WEST)',
    'GANDARVAKOTTAI': 'GANDHARVAKOTTAI',
    'GUDIYATTAM': 'GUDIYATHAM',
    'GUMMIDIPOONDI': 'GUMMIDIPUNDI',
    'MADHAVARAM': 'MADAVARAM',
    'MADHURAVOYAL': 'MADURAVOYAL',
    'MADURANTAKAM': 'MADURANTHAKAM',
    'MODAKKURICHI': 'MODAKURICHI',
    'NILAKKOTTAI': 'NILAKOTTAI',
    'ORATHANADU': 'ORATHANAD',
    'PALAYAMKOTTAI': 'PALAYAMCOTTAI',
    'PAPPIREDDIPATTI': 'PAPPIREDDIPPATTI',
    'PARAMATHIVELUR': 'PARAMATHI-VELUR',
    'RISHIVANDIYAM': 'RISHIVANDIAM',
    'SALEM NORTH': 'SALEM (NORTH)',
    'SALEM SOUTH': 'SALEM (SOUTH)',
    'SALEM WEST': 'SALEM (WEST)',
    'SENTHAMANGALAM': 'SENDAMANGALAM',
    'SHOLINGANALLUR': 'SHOZHINGANALLUR',
    'SIRKAZHI': 'SIRKALI',
    'THALLY': 'THALLI',
    'THIRUTHURAIPOONDI': 'THIRUTHURAIPUNDI',
    'THIRUVAUR': 'THIRUVARUR',
    'THIRUVERUMBUR': 'THIRUVERAMBUR',
    'THIRUVIDAIMARUDUR': 'THIRUVIDAMARUDUR',
    'THIYAGARAYANAGAR': 'THEAYAGARAYA NAGAR',
    'THOOTHUKUDI': 'THOOTHUKKUDI',
    'TIRUCHENGODU': 'TIRUCHENGODE',
    'TIRUCHIRAPPALLI EAST': 'TIRUCHIRAPALLI (EAST)',
    'TIRUCHIRAPPALLI WEST': 'TIRUCHIRAPALLI (WEST)',
    'TIRUPATTUR': 'TIRUPPATTUR',
    'TIRUPPATHUR': 'TIRUPPATTUR',
    'TIRUPPUR NORTH': 'TIRUPPUR (NORTH)',
    'TIRUPPUR SOUTH': 'TIRUPPUR (SOUTH)',
    'UDUMALAIPETTAI': 'UDUMALPET',
    'ULUNDURPETTAI': 'ULUNDURPET',
    'VANIYAMBADI': 'VANIAYAMBADI',
    'VEDHARANYAM': 'VEDARANYAM',
    'VRIDHACHALAM': 'VRIDDHACHALAM',
}

def resolve_constituency(name):
    """Normalize and resolve constituency aliases."""
    norm = normalize_constituency(name)
    return CONSTITUENCY_ALIASES.get(norm, norm)


# ─── Step 0: Load all existing data from Supabase ─────────────────

def load_db_candidates():
    """Load all 2021 candidates from DB with their constituency info."""
    print("Loading candidates from Supabase...")
    all_candidates = []
    offset = 0
    while True:
        rows = rest_get("candidates", {
            "select": "id,name,constituency_id,party,election_year,is_winner",
            "election_year": "eq.2021",
            "limit": 1000,
            "offset": offset,
        })
        all_candidates.extend(rows)
        if len(rows) < 1000:
            break
        offset += 1000
    print(f"  Loaded {len(all_candidates)} candidates from DB")
    return all_candidates

def load_db_constituencies():
    """Load all constituencies from DB."""
    print("Loading constituencies from Supabase...")
    all_consts = []
    offset = 0
    while True:
        rows = rest_get("constituencies", {
            "select": "id,name,constituency_number",
            "limit": 1000,
            "offset": offset,
        })
        all_consts.extend(rows)
        if len(rows) < 1000:
            break
        offset += 1000
    print(f"  Loaded {len(all_consts)} constituencies from DB")
    return all_consts


# ─── Step 1: Match MyNeta rows to DB candidates ───────────────────

def build_match_index(db_candidates, db_constituencies):
    """Build lookup: (normalized_name, normalized_constituency) -> candidate_id

    Also builds a secondary index by constituency for fuzzy name matching.
    """
    # Build constituency id -> name map
    const_id_to_name = {}
    for c in db_constituencies:
        const_id_to_name[c['id']] = normalize_constituency(c['name'])

    # Build match index
    index = {}
    # Also build a by-constituency index for fuzzy name matching
    by_constituency = {}
    for cand in db_candidates:
        norm_name = normalize_name(cand['name'])
        const_name = const_id_to_name.get(cand['constituency_id'], '')
        key = (norm_name, const_name)
        index[key] = cand
        # Add to by-constituency index
        if const_name not in by_constituency:
            by_constituency[const_name] = []
        by_constituency[const_name].append((norm_name, cand))

    return index, by_constituency


def fuzzy_name_match(myneta_name, db_candidates_in_const):
    """Try fuzzy matching a MyNeta name against DB candidates in the same constituency.

    Handles:
    - Initial ordering: "GOVINDARAJAN T J" vs "T J GOVINDARAJAN"
    - Missing/extra initials: "M K STALIN" vs "STALIN M K"
    - Comma-separated names: "Ramchandran, M." vs "M RAMCHANDRAN"
    - Partial matches: if 2+ name parts match and one name has ≤3 parts
    """
    mn_parts = set(re.sub(r'[,.]', ' ', myneta_name).upper().split())
    # Remove single-letter parts for comparison (initials)
    mn_initials = {p for p in mn_parts if len(p) == 1}
    mn_words = {p for p in mn_parts if len(p) > 1}

    best_match = None
    best_score = 0

    for db_name, cand in db_candidates_in_const:
        db_parts = set(re.sub(r'[,.]', ' ', db_name).split())
        db_initials = {p for p in db_parts if len(p) == 1}
        db_words = {p for p in db_parts if len(p) > 1}

        # Score: count matching words (non-initials)
        common_words = mn_words & db_words
        common_initials = mn_initials & db_initials

        score = len(common_words) * 3 + len(common_initials)

        # If the longest word matches, bonus
        if mn_words and db_words:
            mn_longest = max(mn_words, key=len)
            db_longest = max(db_words, key=len)
            if mn_longest == db_longest:
                score += 2

        if score > best_score:
            best_score = score
            best_match = cand

    # Require at least one word match (score >= 3) to accept
    if best_score >= 3:
        return best_match
    return None


def load_myneta_csv():
    """Load and parse MyNeta CSV."""
    print(f"\nReading MyNeta CSV: {MYNETA_CSV}")
    rows = []
    with open(MYNETA_CSV, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    print(f"  {len(rows)} rows in CSV")
    return rows


# ─── Step 2: Enrich candidates with assets & criminal count ───────

def enrich_candidates(myneta_rows, match_index, by_constituency):
    """Match MyNeta data to DB candidates and update assets/criminal/affidavit."""
    print("\n── Step 2: Enriching candidates with MyNeta data ──")
    matched = 0
    unmatched = []
    updates = []

    for row in myneta_rows:
        norm_name = normalize_name(row['name'])
        norm_const = resolve_constituency(row['constituency'])
        key = (norm_name, norm_const)

        candidate = match_index.get(key)

        # Fuzzy name match if exact match fails
        if not candidate and norm_const in by_constituency:
            candidate = fuzzy_name_match(norm_name, by_constituency[norm_const])

        if not candidate:
            unmatched.append((row['name'], row['constituency'], row['party']))
            continue

        matched += 1
        update_payload = {}

        # New CSV columns: movable_self, movable_spouse, movable_dependents, movable_total,
        #                   immovable_self, immovable_spouse, immovable_dependents, immovable_total,
        #                   total_assets, liabilities
        # Fallback to old column names if new ones don't exist
        movable_self = safe_float(row.get('movable_self'))
        movable_spouse = safe_float(row.get('movable_spouse'))
        movable_dep = safe_float(row.get('movable_dependents'))
        movable_total = safe_float(row.get('movable_total')) or safe_float(row.get('movable_assets'))
        immovable_self = safe_float(row.get('immovable_self'))
        immovable_spouse = safe_float(row.get('immovable_spouse'))
        immovable_dep = safe_float(row.get('immovable_dependents'))
        immovable_total = safe_float(row.get('immovable_total')) or safe_float(row.get('immovable_assets'))
        total = safe_float(row.get('total_assets'))
        liabilities = safe_float(row.get('liabilities'))

        if movable_total is not None:
            update_payload['assets_movable'] = movable_total
        if movable_self is not None:
            update_payload['assets_movable_self'] = movable_self
        if movable_spouse is not None:
            update_payload['assets_movable_spouse'] = movable_spouse
        if movable_dep is not None:
            update_payload['assets_movable_dep'] = movable_dep
        if immovable_total is not None:
            update_payload['assets_immovable'] = immovable_total
        if immovable_self is not None:
            update_payload['assets_immovable_self'] = immovable_self
        if immovable_spouse is not None:
            update_payload['assets_immovable_spouse'] = immovable_spouse
        if immovable_dep is not None:
            update_payload['assets_immovable_dep'] = immovable_dep
        if total is not None:
            net_worth = total - (liabilities or 0)
            update_payload['net_worth'] = net_worth
        if liabilities is not None:
            update_payload['liabilities'] = liabilities

        criminal_count = safe_int(row.get('criminal_cases'))
        if criminal_count is not None:
            update_payload['criminal_cases_declared'] = criminal_count

        affidavit = row.get('affidavit_url', '').strip()
        if affidavit:
            update_payload['affidavit_url'] = affidavit

        if update_payload:
            updates.append((candidate['id'], update_payload))

    print(f"  Matched: {matched}")
    print(f"  Unmatched: {len(unmatched)}")

    if unmatched:
        print(f"\n  First 20 unmatched:")
        for name, const, party in unmatched[:20]:
            print(f"    {name} | {const} | {party}")

    # Apply updates in batches
    print(f"\n  Applying {len(updates)} updates...")
    success = 0
    errors = 0
    for i, (cand_id, payload) in enumerate(updates):
        try:
            rest_patch("candidates", {"id": f"eq.{cand_id}"}, payload)
            success += 1
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"    ERROR updating candidate {cand_id}: {e}")

        if (i + 1) % 200 == 0:
            print(f"    Updated {i+1}/{len(updates)}...")
            time.sleep(0.5)  # rate limit

    print(f"  Done. Success: {success}, Errors: {errors}")
    return matched


# ─── Step 3: Populate criminal_cases table ─────────────────────────

def populate_criminal_cases(myneta_rows, match_index, by_constituency):
    """Parse criminal_details from MyNeta and insert into criminal_cases table."""
    print("\n── Step 3: Populating criminal_cases table ──")

    cases_to_insert = []

    for row in myneta_rows:
        criminal_details = row.get('criminal_details', '').strip()
        if not criminal_details:
            continue

        norm_name = normalize_name(row['name'])
        norm_const = resolve_constituency(row['constituency'])
        key = (norm_name, norm_const)

        candidate = match_index.get(key)
        if not candidate and norm_const in by_constituency:
            candidate = fuzzy_name_match(norm_name, by_constituency[norm_const])
        if not candidate:
            continue

        # Each semicolon-separated chunk is a separate case
        # If no semicolons, the whole string is one case
        case_chunks = criminal_details.split(';') if ';' in criminal_details else [criminal_details]

        for chunk in case_chunks:
            chunk = chunk.strip()
            if not chunk:
                continue

            cases_to_insert.append({
                "candidate_id": candidate['id'],
                "sections": chunk,
                "case_type": "IPC",
                "is_disclosed": True,
                "status": "pending",
            })

    print(f"  Total criminal case rows to insert: {len(cases_to_insert)}")

    # Insert in batches of 50
    inserted = 0
    errors = 0
    for i in range(0, len(cases_to_insert), 50):
        batch = cases_to_insert[i:i+50]
        try:
            rest_post_batch("criminal_cases", batch)
            inserted += len(batch)
        except Exception as e:
            errors += len(batch)
            if errors <= 100:
                print(f"    ERROR inserting batch at {i}: {e}")

        if (i + 50) % 200 == 0:
            print(f"    Inserted {min(i+50, len(cases_to_insert))}/{len(cases_to_insert)}...")
            time.sleep(0.3)

    print(f"  Done. Inserted: {inserted}, Errors: {errors}")


# ─── Step 4: Fill constituency current_mla from 2021 winners ──────

def fill_current_mla(db_candidates, db_constituencies):
    """Set current_mla and current_mla_party on each constituency."""
    print("\n── Step 4: Filling current MLA on constituencies ──")

    # Find 2021 winners
    winners = [c for c in db_candidates if c.get('is_winner')]
    print(f"  Found {len(winners)} winners in 2021")

    # Map constituency_id -> winner
    const_to_winner = {}
    for w in winners:
        const_to_winner[w['constituency_id']] = w

    updated = 0
    errors = 0
    for const in db_constituencies:
        winner = const_to_winner.get(const['id'])
        if not winner:
            continue

        try:
            rest_patch("constituencies", {"id": f"eq.{const['id']}"}, {
                "current_mla": winner['name'],
                "current_mla_party": winner['party'],
            })
            updated += 1
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"    ERROR updating constituency {const['id']}: {e}")

        if updated % 50 == 0 and updated > 0:
            print(f"    Updated {updated} constituencies...")
            time.sleep(0.3)

    print(f"  Done. Updated: {updated}, Errors: {errors}")


# ─── Main ──────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  MyNeta Data Enrichment Pipeline")
    print("=" * 60)

    # Load existing DB data
    db_candidates = load_db_candidates()
    db_constituencies = load_db_constituencies()

    if not db_candidates:
        print("\nERROR: No candidates found in DB. Run seed_from_csv.py first!")
        sys.exit(1)

    # Build match index
    match_index, by_constituency = build_match_index(db_candidates, db_constituencies)
    print(f"  Match index: {len(match_index)} entries")

    # Load MyNeta CSV
    myneta_rows = load_myneta_csv()

    # Step 2: Enrich candidates
    enrich_candidates(myneta_rows, match_index, by_constituency)

    # Step 3: Populate criminal cases
    populate_criminal_cases(myneta_rows, match_index, by_constituency)

    # Step 4: Fill current MLA
    fill_current_mla(db_candidates, db_constituencies)

    print("\n" + "=" * 60)
    print("  ✅ Enrichment complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
