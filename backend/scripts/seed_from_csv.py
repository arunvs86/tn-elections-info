"""
Seed script — reads tn_2021_election_results.csv and populates:
1. constituencies table
2. candidates table
3. election_results table
"""

import csv
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from backend/.env
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
load_dotenv(dotenv_path)
print(f"Loading .env from: {dotenv_path}")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY missing in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'tn_2021_election_results.csv')

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

def seed():
    print("Reading CSV...")
    rows = []
    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    print(f"Total rows: {len(rows)}")

    # ----------------------------------------------------------------
    # STEP 1 — Build unique constituencies
    # ----------------------------------------------------------------
    print("\nSeeding constituencies...")
    constituencies_map = {}  # constituency_name -> id in supabase

    seen = set()
    constituency_rows = []
    for row in rows:
        name = row['Constituency_Name'].strip().title()
        if name not in seen:
            seen.add(name)
            constituency_rows.append({
                "name": name,
                "district": row['District_Name'].strip().title(),
                "constituency_number": safe_int(row['Constituency_No']),
                "total_voters_2021": safe_int(row['Electors']),
                "turnout_2021": safe_float(row['Turnout_Percentage']),
            })

    print(f"  Inserting {len(constituency_rows)} constituencies...")

    # Insert in batches of 50
    for i in range(0, len(constituency_rows), 50):
        batch = constituency_rows[i:i+50]
        result = supabase.table("constituencies").insert(batch).execute()
        if result.data:
            for c in result.data:
                constituencies_map[c['name']] = c['id']

    print(f"  Done. {len(constituencies_map)} constituencies inserted.")

    # ----------------------------------------------------------------
    # STEP 2 — Seed candidates
    # ----------------------------------------------------------------
    print("\nSeeding candidates...")
    candidates_map = {}  # (name, constituency_name) -> id in supabase

    candidate_rows = []
    for row in rows:
        constituency_name = row['Constituency_Name'].strip().title()
        constituency_id = constituencies_map.get(constituency_name)
        if not constituency_id:
            print(f"  WARNING: No constituency_id found for {constituency_name}")
            continue

        position = safe_int(row['Position'])
        is_winner = position == 1
        is_incumbent = row['Incumbent'].strip() == '1' if row.get('Incumbent') else False

        candidate_rows.append({
            "name": row['Candidate'].strip().title(),
            "constituency_id": constituency_id,
            "party": row['Party'].strip(),
            "election_year": 2021,
            "is_winner": is_winner,
            "is_incumbent": is_incumbent,
            "votes_received": safe_int(row['Votes']),
            "vote_share": safe_float(row['Vote_Share_Percentage']),
            "margin": safe_int(row['Margin']) if is_winner else None,
            "age": safe_int(row['Age']),
            "education": row['MyNeta_education'].strip() if row.get('MyNeta_education') else None,
        })

    print(f"  Inserting {len(candidate_rows)} candidates...")

    for i in range(0, len(candidate_rows), 50):
        batch = candidate_rows[i:i+50]
        result = supabase.table("candidates").insert(batch).execute()
        if result.data:
            for c in result.data:
                candidates_map[(c['name'], c['constituency_id'])] = c['id']

    print(f"  Done. {len(candidates_map)} candidates inserted.")

    # ----------------------------------------------------------------
    # STEP 3 — Seed election_results (winner + runner-up per constituency)
    # ----------------------------------------------------------------
    print("\nSeeding election results...")

    # Group rows by constituency
    from collections import defaultdict
    by_constituency = defaultdict(list)
    for row in rows:
        name = row['Constituency_Name'].strip().title()
        by_constituency[name].append(row)

    result_rows = []
    for const_name, const_rows in by_constituency.items():
        # Sort by position
        const_rows_sorted = sorted(const_rows, key=lambda r: safe_int(r['Position']) or 999)

        winner = const_rows_sorted[0] if len(const_rows_sorted) > 0 else None
        runner_up = const_rows_sorted[1] if len(const_rows_sorted) > 1 else None

        constituency_id = constituencies_map.get(const_name)
        if not constituency_id or not winner:
            continue

        total_votes = safe_int(winner['Valid_Votes'])
        n_cand = safe_int(winner['N_Cand'])

        result_rows.append({
            "constituency_id": constituency_id,
            "election_year": 2021,
            "winner_name": winner['Candidate'].strip().title(),
            "winner_party": winner['Party'].strip(),
            "winner_votes": safe_int(winner['Votes']),
            "winner_vote_share": safe_float(winner['Vote_Share_Percentage']),
            "runner_up_name": runner_up['Candidate'].strip().title() if runner_up else None,
            "runner_up_party": runner_up['Party'].strip() if runner_up else None,
            "runner_up_votes": safe_int(runner_up['Votes']) if runner_up else None,
            "margin": safe_int(winner['Margin']),
            "total_votes": total_votes,
            "turnout": safe_float(winner['Turnout_Percentage']),
            "total_candidates": n_cand,
        })

    print(f"  Inserting {len(result_rows)} election results...")

    for i in range(0, len(result_rows), 50):
        batch = result_rows[i:i+50]
        supabase.table("election_results").insert(batch).execute()

    print(f"  Done.")
    print("\n✅ Seeding complete!")
    print(f"   Constituencies: {len(constituency_rows)}")
    print(f"   Candidates:     {len(candidate_rows)}")
    print(f"   Results:        {len(result_rows)}")

if __name__ == "__main__":
    seed()
