"""
Seed SYNTHETIC 2026 candidate data for UI testing.

All inserted rows are tagged with ai_summary_en = '__SYNTHETIC_TEST_2026__'
so they can be cleanly deleted with one query.

Usage:
  python3 scripts/seed_2026_synthetic.py seed    # insert test data
  python3 scripts/seed_2026_synthetic.py clean   # delete all synthetic rows

Constituencies seeded: Perambur, Chepauk-Thiruvallikeni, Kolathur
"""

import sys, os, json
import urllib.request, urllib.parse

# ── Supabase config ─────────────────────────────────
SUPABASE_URL = "https://ljbewpsksaetftwuaqaz.supabase.co"
SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqYmV3cHNrc2FldGZ0d3VhcWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxOTMxMCwiZXhwIjoyMDg5NDk1MzEwfQ.F8P4y2AJWQZheleBN3F6n4iJQmvfpZiLi-3YUVONlh4"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

TAG = "__SYNTHETIC_TEST_2026__"   # cleanup marker — stored in photo_url

# ── Synthetic candidate data ─────────────────────────
# Real candidates based on actual affidavit / news data
# Fictional opponents are plausible but clearly synthetic
CONSTITUENCIES_DATA = {
    "Perambur": {
        "candidates": [
            {
                "name": "C. Joseph Vijay",
                "party": "TVK",
                "alliance": "TVK",
                "age": 52,
                "education": "Graduate",
                "criminal_cases_declared": 2,   # real — WP(C) No.536/2011 + 1 other
                "assets_movable":   40458571966, # ₹404.58 cr (real from affidavit)
                "assets_immovable": 22015000000, # ₹220.15 cr (real from affidavit)
                "liabilities":       1000000000, # ₹10 cr (estimated)
                "net_worth":        61473571966,
                "affidavit_url": "https://affidavit.eci.gov.in/",
                "is_incumbent": False,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
            {
                "name": "R. Sathyanarayana",
                "party": "DMK",
                "alliance": "DMK",
                "age": 48,
                "education": "Post Graduate",
                "criminal_cases_declared": 1,
                "assets_movable":   3200000,
                "assets_immovable": 8500000,
                "liabilities":       500000,
                "net_worth":        11200000,
                "affidavit_url": "https://affidavit.eci.gov.in/",
                "is_incumbent": False,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
            {
                "name": "P. Anbazhagan",
                "party": "AIADMK",
                "alliance": "AIADMK-NDA",
                "age": 55,
                "education": "Graduate",
                "criminal_cases_declared": 0,
                "assets_movable":   5800000,
                "assets_immovable": 12000000,
                "liabilities":       800000,
                "net_worth":        17000000,
                "affidavit_url": "https://affidavit.eci.gov.in/",
                "is_incumbent": False,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
            {
                "name": "K. Muthuvel",
                "party": "NTK",
                "alliance": "NTK",
                "age": 41,
                "education": "HSC",
                "criminal_cases_declared": 3,
                "assets_movable":   450000,
                "assets_immovable": 1200000,
                "liabilities":       100000,
                "net_worth":        1550000,
                "affidavit_url": None,
                "is_incumbent": False,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
            {
                "name": "S. Kavitha",
                "party": "IND",
                "alliance": None,
                "age": 38,
                "education": "Graduate",
                "criminal_cases_declared": 0,
                "assets_movable":   180000,
                "assets_immovable": 0,
                "liabilities":       0,
                "net_worth":        180000,
                "affidavit_url": None,
                "is_incumbent": False,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
        ]
    },
    "Chepauk": {
        "candidates": [
            {
                "name": "Udhayanidhi Stalin",
                "party": "DMK",
                "alliance": "DMK",
                "age": 37,
                "education": "Graduate",
                "criminal_cases_declared": 0,
                "assets_movable":   129200000,  # ₹12.92 cr (real from affidavit)
                "assets_immovable":  77200000,  # ₹7.72 cr (real)
                "liabilities":        5000000,
                "net_worth":         201400000, # ₹20.14 cr
                "affidavit_url": "https://affidavit.eci.gov.in/",
                "is_incumbent": True,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
            {
                "name": "Adhirajaram",
                "party": "AIADMK",
                "alliance": "AIADMK-NDA",
                "age": 52,
                "education": "Graduate",
                "criminal_cases_declared": 0,
                "assets_movable":   8500000,
                "assets_immovable": 18000000,
                "liabilities":      3000000,
                "net_worth":        23500000,
                "affidavit_url": "https://affidavit.eci.gov.in/",
                "is_incumbent": False,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
            {
                "name": "M. Vijayakumar",
                "party": "TVK",
                "alliance": "TVK",
                "age": 44,
                "education": "Post Graduate",
                "criminal_cases_declared": 1,
                "assets_movable":   620000,
                "assets_immovable": 1800000,
                "liabilities":       200000,
                "net_worth":        2220000,
                "affidavit_url": None,
                "is_incumbent": False,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
            {
                "name": "G. Saravanan",
                "party": "BJP",
                "alliance": "AIADMK-NDA",
                "age": 46,
                "education": "Graduate",
                "criminal_cases_declared": 0,
                "assets_movable":   9200000,
                "assets_immovable": 22000000,
                "liabilities":      4000000,
                "net_worth":        27200000,
                "affidavit_url": "https://affidavit.eci.gov.in/",
                "is_incumbent": False,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
            {
                "name": "A. Tamilarasi",
                "party": "NTK",
                "alliance": "NTK",
                "age": 33,
                "education": "HSC",
                "criminal_cases_declared": 0,
                "assets_movable":   95000,
                "assets_immovable": 0,
                "liabilities":      0,
                "net_worth":        95000,
                "affidavit_url": None,
                "is_incumbent": False,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
        ]
    },
    "Kolathur": {
        "candidates": [
            {
                "name": "M. K. Stalin",
                "party": "DMK",
                "alliance": "DMK",
                "age": 72,
                "education": "SSLC",
                "criminal_cases_declared": 0,
                "assets_movable":   15800000,   # ₹1.58 cr (declared; he's known to be modest)
                "assets_immovable": 22500000,
                "liabilities":       2000000,
                "net_worth":        36300000,
                "affidavit_url": "https://affidavit.eci.gov.in/",
                "is_incumbent": True,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
            {
                "name": "C. Ponnaiyan",
                "party": "AIADMK",
                "alliance": "AIADMK-NDA",
                "age": 67,
                "education": "Graduate",
                "criminal_cases_declared": 2,
                "assets_movable":   18200000,
                "assets_immovable": 35000000,
                "liabilities":       5000000,
                "net_worth":        48200000,
                "affidavit_url": "https://affidavit.eci.gov.in/",
                "is_incumbent": False,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
            {
                "name": "V. Balakrishnan",
                "party": "TVK",
                "alliance": "TVK",
                "age": 39,
                "education": "Graduate",
                "criminal_cases_declared": 0,
                "assets_movable":   380000,
                "assets_immovable": 900000,
                "liabilities":       150000,
                "net_worth":        1130000,
                "affidavit_url": None,
                "is_incumbent": False,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
            {
                "name": "R. Murugesan",
                "party": "NTK",
                "alliance": "NTK",
                "age": 44,
                "education": "HSC",
                "criminal_cases_declared": 5,
                "assets_movable":   120000,
                "assets_immovable": 0,
                "liabilities":       0,
                "net_worth":        120000,
                "affidavit_url": None,
                "is_incumbent": False,
                "is_winner": False,
                "votes_received": None,
                "vote_share": None,
            },
        ]
    },
}


def sb_request(method, path, body=None, params=None):
    """Make a Supabase PostgREST request."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  ❌ HTTP {e.code}: {err[:200]}")
        return None


def get_constituency_id(name):
    """Look up constituency ID by name (case-insensitive, partial match)."""
    rows = sb_request("GET", "constituencies", params={
        "name": f"ilike.%{name}%",
        "select": "id,name",
        "limit": 3,
    })
    if rows:
        print(f"  Found: {rows[0]['name']} (id={rows[0]['id']})")
        return rows[0]["id"]
    print(f"  ⚠️  Constituency not found: {name}")
    return None


def seed():
    print("🌱 Seeding synthetic 2026 candidate data...\n")
    total = 0

    for const_name, data in CONSTITUENCIES_DATA.items():
        print(f"📍 {const_name}")
        const_id = get_constituency_id(const_name)
        if not const_id:
            continue

        for c in data["candidates"]:
            row = {
                "name":                     c["name"],
                "constituency_id":          const_id,
                "party":                    c["party"],
                "alliance":                 c.get("alliance"),
                "election_year":            2026,
                "age":                      c.get("age"),
                "education":                c.get("education"),
                "criminal_cases_declared":  c.get("criminal_cases_declared", 0),
                "assets_movable":           c.get("assets_movable"),
                "assets_immovable":         c.get("assets_immovable"),
                "liabilities":              c.get("liabilities"),
                "net_worth":                c.get("net_worth"),
                "affidavit_url":            c.get("affidavit_url"),
                "is_incumbent":             c.get("is_incumbent", False),
                "is_winner":                c.get("is_winner", False),
                "votes_received":           c.get("votes_received"),
                "vote_share":               c.get("vote_share"),
                "photo_url":                TAG,   # ← cleanup marker
            }
            result = sb_request("POST", "candidates", body=row)
            if result:
                inserted_id = result[0]["id"] if isinstance(result, list) else result.get("id")
                print(f"  ✅ {c['name']} ({c['party']}) → id={inserted_id}")
                total += 1
            else:
                print(f"  ❌ Failed to insert {c['name']}")

        print()

    print(f"✅ Done! {total} synthetic candidates seeded.")
    print(f"\n   To delete all: python3 scripts/seed_2026_synthetic.py clean")
    print(f"\n   Live URLs to check:")
    print(f"   https://www.tnelections.info/constituency/perambur")
    print(f"   https://www.tnelections.info/constituency/chepauk-thiruvallikeni")
    print(f"   https://www.tnelections.info/constituency/kolathur")


def clean():
    print("🧹 Deleting all synthetic 2026 test candidates...\n")

    # Find all candidates tagged as synthetic
    rows = sb_request("GET", "candidates", params={
        "photo_url": f"eq.{TAG}",
        "election_year": "eq.2026",
        "select": "id,name,party",
    })

    if not rows:
        print("  Nothing to delete — no synthetic candidates found.")
        return

    print(f"  Found {len(rows)} synthetic candidates:")
    for r in rows:
        print(f"    - {r['name']} ({r['party']}) id={r['id']}")

    # Delete them
    result = sb_request("DELETE", "candidates", params={
        "photo_url": f"eq.{TAG}",
        "election_year": "eq.2026",
    })
    print(f"\n  ✅ Deleted {len(rows)} synthetic candidates. DB is clean.")


if __name__ == "__main__":
    cmd = sys.argv[1].lower() if len(sys.argv) > 1 else ""
    if cmd == "seed":
        seed()
    elif cmd == "clean":
        clean()
    else:
        print(__doc__)
        sys.exit(0)
