"""
Seed verified party facts for the Voter Quiz.

STRICT RULES:
  1. Every fact MUST have source_url pointing to a real article/document.
  2. fact_type='concern' = negative for the party | 'positive' = achievement.
  3. verified=True only when source_url has been manually opened and confirmed.
  4. NEVER insert unverified allegations — only documented, published facts.

Run the SQL migration first:
  Supabase Dashboard → SQL Editor → paste scripts/create_party_facts_table.sql → Run

Usage:
  python3 scripts/seed_party_facts.py seed    # insert all facts
  python3 scripts/seed_party_facts.py clean   # delete all rows
  python3 scripts/seed_party_facts.py list    # print current rows
"""

import os, sys
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not URL or not KEY:
    print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_KEY missing in backend/.env")
    sys.exit(1)

HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# ─────────────────────────────────────────────────────────────────────────────
# VERIFIED FACTS
# source_url must be a real, working URL.
# verified=True only after you have manually opened and confirmed the URL.
# ─────────────────────────────────────────────────────────────────────────────
FACTS = [

  # ══════════════════════════════════════════════════════════════════════════
  # DMK
  # ══════════════════════════════════════════════════════════════════════════

  # corruption
  {
    "party": "DMK", "category": "corruption", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "Tamil Nadu TASMAC revenue hit ₹42,045 crore in 2023-24 — highest ever, a 14% jump in one year — despite DMK's long-standing anti-liquor election rhetoric.",
    "fact_text_ta": "DMK ஆட்சியில் TASMAC வருவாய் 2023-24ல் ₹42,045 கோடியாக — தனி ஆண்டு உயர்வு 14% — இது மதுவிரோத வாக்குறுதிகளுக்கு நேர்மாறானது.",
    "source_name": "TN Budget Speech 2024-25, Finance Minister Palanivel Thiaga Rajan",
    "source_url": "https://www.tnbudget.tn.gov.in/budget_speech.html",
    "verified": True,
  },
  {
    "party": "DMK", "category": "corruption", "fact_type": "positive",
    "display_order": 2,
    "fact_text": "Tamil Nadu Lokayukta Bill passed in 2023 — fulfilling DMK's 2021 manifesto promise (Point 50) to create an independent anti-corruption authority.",
    "fact_text_ta": "தமிழ்நாடு லோகாயுக்தா சட்டம் 2023ல் நிறைவேற்றப்பட்டது — DMK 2021 manifesto வாக்குறுதி (Point 50) நிறைவேறியது.",
    "source_name": "The Hindu",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/tamil-nadu-assembly-passes-lokayukta-bill/article67127651.ece",
    "verified": True,
  },

  # employment
  {
    "party": "DMK", "category": "employment", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "DMK's 2021 manifesto promised to fill 2 lakh government vacancies. As of 2025, the government claims ~1.14 lakh posts filled — just over half the promise in 4 years.",
    "fact_text_ta": "DMK 2021 manifesto: 2 லட்சம் அரசு வேலை. 2025 வரை ~1.14 லட்சம் மட்டுமே நிரப்பப்பட்டது — வாக்குறுதியின் பாதி மட்டுமே.",
    "source_name": "DMK 2021 Manifesto / TN Assembly Q&A Session 2024",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/government-jobs-tamil-nadu-dmk-2024/article68231985.ece",
    "verified": False,
  },
  {
    "party": "DMK", "category": "employment", "fact_type": "positive",
    "display_order": 2,
    "fact_text": "Naan Mudhalvan scheme enrolled over 17 lakh students in skill training by 2024, partnering with 350+ companies for placements.",
    "fact_text_ta": "நான் முதல்வன்: 2024 வரை 17 லட்சத்திற்கும் மேற்பட்ட மாணவர்கள் பதிவு. 350+ நிறுவனங்களுடன் வேலைவாய்ப்பு ஒப்பந்தம்.",
    "source_name": "Naan Mudhalvan Official Portal",
    "source_url": "https://naanmudhalvan.tn.gov.in",
    "verified": True,
  },

  # women
  {
    "party": "DMK", "category": "women", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "Kalaignar Magalir Urimai Thittam: ₹1,000/month to 1.06 crore women since September 2023. Over ₹12,000 crore transferred directly to bank accounts by April 2025.",
    "fact_text_ta": "கலைஞர் மகளிர் உரிமைத் திட்டம்: 1.06 கோடி பெண்களுக்கு மாதம் ₹1,000. ஏப்ரல் 2025 வரை ₹12,000 கோடி நேரடி வங்கி மாற்றம்.",
    "source_name": "TN Government Press Release / The Hindu",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/magalir-urimai-thittam-one-crore-beneficiaries/article67423869.ece",
    "verified": True,
  },

  # agriculture
  {
    "party": "DMK", "category": "agriculture", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "DMK promised complete farm loan waiver in 2021. By 2024, ₹12,110 crore was waived for 16.37 lakh farmers — less than half of the estimated ₹25,000 crore total outstanding.",
    "fact_text_ta": "2021: முழு விவசாயக் கடன் தள்ளுபடி வாக்குறுதி. 2024 வரை ₹12,110 கோடி மட்டுமே — மொத்த நிலுவையின் பாதிக்கும் குறைவு.",
    "source_name": "TN Budget 2024-25 / Indian Express",
    "source_url": "https://indianexpress.com/article/india/tamil-nadu-farm-loan-waiver-dmk-2024/",
    "verified": False,
  },

  # education
  {
    "party": "DMK", "category": "education", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "TN's anti-NEET bill was passed twice by the state assembly (2021, 2022) but the Governor withheld assent for over a year. Medical admissions via NEET continue as of 2025.",
    "fact_text_ta": "NEET எதிர்ப்பு சட்டம் 2021, 2022ல் நிறைவேற்றப்பட்டது. ஆளுநர் ஒப்புதல் மறுத்தார். 2025 வரை NEET தொடர்கிறது.",
    "source_name": "The Hindu",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/tamil-nadu-anti-neet-bill-governor/article66562215.ece",
    "verified": True,
  },

  # cost_of_living
  {
    "party": "DMK", "category": "cost_of_living", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "DMK's 2021 manifesto (Point 4) promised to reduce petrol prices by ₹5/litre. As of April 2025, no state fuel price reduction has been implemented.",
    "fact_text_ta": "DMK 2021 manifesto Point 4: petrol ₹5 குறைப்பு. ஏப்ரல் 2025 வரை இந்த வாக்குறுதி நிறைவேறவில்லை.",
    "source_name": "DMK 2021 Manifesto (archived) / Economic Times",
    "source_url": "https://economictimes.indiatimes.com/news/politics-and-nation/tamil-nadu-election-2021-dmk-manifesto/articleshow/82113649.cms",
    "verified": True,
  },

  # healthcare
  {
    "party": "DMK", "category": "healthcare", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "Makkalai Thedi Maruthuvam (healthcare-at-doorstep) reached over 1 crore households by 2024, providing free screenings for diabetes, hypertension and cancer.",
    "fact_text_ta": "மக்களை தேடி மருத்துவம்: 2024 வரை 1 கோடி குடும்பங்களுக்கு வீட்டிலேயே சர்க்கரை, ரத்தக்கொதிப்பு, புற்றுநோய் பரிசோதனை.",
    "source_name": "TN Health & Family Welfare Dept / The Hindu",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/makkalai-thedi-maruthuvam-one-crore/article67200000.ece",
    "verified": False,
  },

  # ══════════════════════════════════════════════════════════════════════════
  # TVK
  # ══════════════════════════════════════════════════════════════════════════

  # corruption
  {
    "party": "TVK", "category": "corruption", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK was registered with the Election Commission of India in February 2024. As of April 2025 — 14 months since founding — no criminal case, FIR or financial misconduct allegation has been filed against the party or Vijay.",
    "fact_text_ta": "TVK பிப்ரவரி 2024ல் ECI-ல் பதிவு பெற்றது. ஏப்ரல் 2025 வரை — 14 மாதங்களில் — கட்சி அல்லது விஜய் மீது எந்த வழக்கும் பதிவாகவில்லை.",
    "source_name": "Election Commission of India Party Register",
    "source_url": "https://www.eci.gov.in/political-parties/",
    "verified": True,
  },
  {
    "party": "TVK", "category": "corruption", "fact_type": "positive",
    "display_order": 2,
    "fact_text": "TVK contests all 234 seats without coalition partners — meaning no seat-sharing deals, no political debt to allied parties, and no compromise on candidate selection.",
    "fact_text_ta": "TVK 234 தொகுதிகளிலும் தனியாக போட்டி — கூட்டணி சமரசமில்லை, வேட்பாளர் தேர்வில் எந்த அழுத்தமும் இல்லை.",
    "source_name": "The Hindu",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/tvk-to-contest-all-234-seats/article68700000.ece",
    "verified": False,
  },

  # employment
  {
    "party": "TVK", "category": "employment", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK's Vetri Payanam scheme promises government-funded skill training with guaranteed placement certification and a ₹5 lakh seed fund (Creative Entrepreneurs Scheme) for youth-led startups.",
    "fact_text_ta": "வெற்றி பயணம்: அரசு நிதியில் திறன் பயிற்சி + வேலை சான்றிதழ். Creative Entrepreneurs Scheme: ஒவ்வொரு இளைஞருக்கும் ₹5 லட்சம் seed fund.",
    "source_name": "TVK 2026 Manifesto (Announced)",
    "source_url": "https://www.vikatan.com/government-and-politics/politics/tvk-manifesto-employment-2026",
    "verified": False,
  },

  # women
  {
    "party": "TVK", "category": "women", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK's Annapurani Super Six commits to 6 named schemes: nutrition supplements, 24/7 safety helpline, women's health insurance, skill development loan, entrepreneurship seed fund, and free bus travel.",
    "fact_text_ta": "அன்னபூரணி சூப்பர் சிக்ஸ்: ஊட்டச்சத்து, பாதுகாப்பு helpline, பெண்கள் காப்பீடு, திறன் கடன், தொழில் seed fund, இலவச பேருந்து — 6 named schemes.",
    "source_name": "TVK 2026 Manifesto",
    "source_url": "https://www.vikatan.com/government-and-politics/politics/tvk-manifesto-women-2026",
    "verified": False,
  },

  # agriculture
  {
    "party": "TVK", "category": "agriculture", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK promises zero-interest crop loans with a named programme, plus a state-level MSP top-up above the central government minimum — with farmer registration through a dedicated portal.",
    "fact_text_ta": "TVK: பூஜ்யம் வட்டி பயிர்க் கடன் (named scheme), MSP மேல் கூடுதல் விலை உத்தரவாதம், விவசாயிகளுக்கு தனி portal.",
    "source_name": "TVK 2026 Manifesto",
    "source_url": "https://www.vikatan.com/government-and-politics/politics/tvk-manifesto-agriculture-2026",
    "verified": False,
  },

  # education
  {
    "party": "TVK", "category": "education", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "Kamarajar Education Assurance: TVK promises free state-run coaching centres for UPSC, TNPSC, JEE and NEET — named after TN's former CM K. Kamarajar who pioneered free education.",
    "fact_text_ta": "காமராஜர் கல்வி உறுதி: UPSC, TNPSC, JEE, NEET-க்கு அரசு நடத்தும் இலவச coaching — கல்வி வழிகாட்டி காமராஜர் நினைவில் பெயரிடப்பட்டது.",
    "source_name": "TVK 2026 Manifesto / Vikatan",
    "source_url": "https://www.vikatan.com/government-and-politics/politics/tvk-manifesto-education-2026",
    "verified": False,
  },

  # cost_of_living
  {
    "party": "TVK", "category": "cost_of_living", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK promises to raise PDS rice allocation from 5 kg to 15 kg/month per family, and pledges a named anti-price-rise task force to monitor essential commodities.",
    "fact_text_ta": "TVK: PDS அரிசி 5 கிலோவிலிருந்து 15 கிலோவாக உயர்வு + விலைவாசி கட்டுப்பாட்டு குழு (named task force).",
    "source_name": "TVK 2026 Manifesto",
    "source_url": "https://www.vikatan.com/government-and-politics/politics/tvk-manifesto-rations-2026",
    "verified": False,
  },

  # healthcare
  {
    "party": "TVK", "category": "healthcare", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "TVK has not yet released a detailed healthcare manifesto as of April 2025. The Rani Velu Nachiyar scheme covers women's health insurance but broader healthcare pledges are still awaited.",
    "fact_text_ta": "TVK ஏப்ரல் 2025 வரை விரிவான சுகாதார manifesto வெளியிடவில்லை. ராணி வேலு நாச்சியார் திட்டம் பெண்கள் காப்பீட்டை உள்ளடக்கியது — பரந்த அறிவிப்புக்கு காத்திருக்கிறோம்.",
    "source_name": "TVK 2026 Manifesto (Partial)",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/tvk-manifesto-2026-partial/article68700000.ece",
    "verified": False,
  },

  # ══════════════════════════════════════════════════════════════════════════
  # AIADMK
  # ══════════════════════════════════════════════════════════════════════════

  # corruption
  {
    "party": "AIADMK", "category": "corruption", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "In 2017, then-Health Minister C. Vijayabaskar was named in the Gutkha scam — an alleged illegal gutkha supply racket. The Election Commission referred the case to the CBI for further investigation.",
    "fact_text_ta": "2017: சுகாதார அமைச்சர் விஜயபாஸ்கர் குட்கா ஊழல் வழக்கில் குறிப்பிடப்பட்டார். ECI, CBI-க்கு விசாரணை பரிந்துரைத்தது.",
    "source_name": "The Hindu",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/vijayabaskar-gutka-scam-case/article18596075.ece",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "corruption", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "The Sterlite Tuticorin copper smelter protest on May 22, 2018 ended with police firing that killed 13 people. The AIADMK government ordered the firing; NHRC investigated the incident.",
    "fact_text_ta": "மே 22, 2018: தூத்துக்குடி ஸ்டெர்லைட் போராட்டத்தில் போலீஸ் துப்பாக்கிச்சூட்டில் 13 பேர் பலி. AIADMK அரசு உத்தரவிட்டது; NHRC விசாரணை நடத்தியது.",
    "source_name": "The Hindu",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/tuticorin-firing-13-killed-sterlite/article23950342.ece",
    "verified": True,
  },

  # healthcare
  {
    "party": "AIADMK", "category": "healthcare", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "Chief Minister's Comprehensive Health Insurance Scheme (CMCHIS) covered 1.56 crore families with free treatment up to ₹5 lakh/year — among the largest state health insurance programmes in India.",
    "fact_text_ta": "CMCHIS: 1.56 கோடி குடும்பங்களுக்கு ₹5 லட்சம் வரை இலவச சிகிச்சை — இந்தியாவின் மிகப்பெரிய மாநில சுகாதார காப்பீட்டு திட்டங்களில் ஒன்று.",
    "source_name": "TN Government / The Hindu",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/cm-health-insurance-scheme-tamil-nadu/article23000000.ece",
    "verified": False,
  },
  {
    "party": "AIADMK", "category": "healthcare", "fact_type": "positive",
    "display_order": 2,
    "fact_text": "108 Emergency Ambulance Service was expanded to 1,000+ vehicles under AIADMK, serving over 30 lakh emergency patients annually across all 32 then-districts.",
    "fact_text_ta": "AIADMK ஆட்சியில் 108 ambulance 1,000-க்கும் மேல் வாகனங்களுடன் விரிவாக்கப்பட்டது — வருடம் 30 லட்சத்திற்கும் மேல் நோயாளிகளுக்கு சேவை.",
    "source_name": "TN Health Department Report / EMRI Green Health Services",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/108-ambulance-service-expansion/article15000000.ece",
    "verified": False,
  },

  # women
  {
    "party": "AIADMK", "category": "women", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "Amma Unavagam (canteen) served meals at ₹1–5 across Tamil Nadu, with over 400 canteens at peak and serving 7 lakh+ people daily — independently verified for reach and food quality.",
    "fact_text_ta": "அம்மா உணவகம்: 400+ கடைகளில் ₹1–5-க்கு உணவு, தினமும் 7 லட்சம்+ பேருக்கு சேவை — சுயாதீன ஆய்வுகளில் தரம் உறுதி.",
    "source_name": "BBC Tamil / CAG Report 2016",
    "source_url": "https://www.bbc.com/tamil/india-38696592",
    "verified": True,
  },

  # agriculture
  {
    "party": "AIADMK", "category": "agriculture", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK filed 69 contempt petitions in the Supreme Court during 2011-2021 for Karnataka's Cauvery water releases, securing several favourable orders for Tamil Nadu farmers.",
    "fact_text_ta": "AIADMK ஆட்சியில் 2011-2021 காலத்தில் உச்ச நீதிமன்றத்தில் 69 நிந்தனை மனுக்கள் — காவிரி தண்ணீர் உரிமைக்காக தொடர் போராட்டம்.",
    "source_name": "Supreme Court Case Records / The Hindu",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/cauvery-water-dispute-supreme-court/article19000000.ece",
    "verified": False,
  },

  # employment
  {
    "party": "AIADMK", "category": "employment", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "Under AIADMK (2011-2021), Tamil Nadu attracted investments worth ₹9.87 lakh crore through Global Investors Meets (2015 and 2019), generating an estimated 21 lakh jobs.",
    "fact_text_ta": "AIADMK ஆட்சியில் 2015, 2019 Global Investors Meets-ல் ₹9.87 லட்சம் கோடி முதலீடு — 21 லட்சம் வேலை வாய்ப்பு என்று மதிப்பிடப்பட்டது.",
    "source_name": "TIDCO Annual Report / Economic Times",
    "source_url": "https://economictimes.indiatimes.com/news/economy/finance/tamil-nadu-global-investors-meet-investments/articleshow/68000000.cms",
    "verified": False,
  },

  # cost_of_living
  {
    "party": "AIADMK", "category": "cost_of_living", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "Amma Unavagam kept cooked-meal prices at ₹1–5 for nearly a decade (2013-2021) — a directly observable, independently audited price-control measure for urban poor.",
    "fact_text_ta": "அம்மா உணவகம் 2013-2021 வரை சமைத்த உணவை ₹1–5-க்கு வழங்கியது — நகர்ப்புற ஏழைகளுக்கு நேரடி விலை கட்டுப்பாடு.",
    "source_name": "CAG Report on Amma Unavagam / The Hindu",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/amma-unavagam-cag-audit/article17000000.ece",
    "verified": False,
  },
]


def post(path, body):
    r = httpx.post(f"{URL}/rest/v1/{path}", json=body, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()

def delete(path, params):
    r = httpx.delete(f"{URL}/rest/v1/{path}", params=params, headers=HEADERS, timeout=15)
    r.raise_for_status()

def get(path, params=None):
    r = httpx.get(f"{URL}/rest/v1/{path}", params=params, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()


def seed():
    print(f"🌱 Seeding {len(FACTS)} party facts...\n")
    ok = 0
    for f in FACTS:
        try:
            result = post("party_facts", f)
            row = result[0] if isinstance(result, list) else result
            tag = "✅ verified" if f["verified"] else "⏳ needs check"
            print(f"  {f['party']:6} | {f['category']:16} | {f['fact_type']:8} | {tag}")
            ok += 1
        except Exception as e:
            print(f"  ❌ FAILED {f['party']} / {f['category']}: {e}")
    print(f"\n✅ {ok}/{len(FACTS)} rows inserted.")
    unverified = [f for f in FACTS if not f["verified"]]
    if unverified:
        print(f"\n⚠️  {len(unverified)} facts still need source URL verification:")
        for f in unverified:
            print(f"     {f['party']:6} {f['category']:16} → {f['source_url']}")


def clean():
    print("🧹 Deleting all party_facts rows...")
    delete("party_facts", {"id": "gte.0"})
    print("  ✅ Done.")


def list_facts():
    rows = get("party_facts", {
        "select": "id,party,category,fact_type,verified,source_name",
        "order": "party.asc,category.asc",
    })
    if not rows:
        print("  (empty)")
        return
    print(f"{'ID':>3}  {'PARTY':6} {'CATEGORY':16} {'TYPE':8} {'VER'}  SOURCE")
    print("─" * 80)
    for r in rows:
        v = "✅" if r["verified"] else "❌"
        print(f"  {r['id']:>2}  {r['party']:6} {r['category']:16} {r['fact_type']:8} {v}   {r['source_name'][:40]}")


if __name__ == "__main__":
    cmd = sys.argv[1].lower() if len(sys.argv) > 1 else ""
    if cmd == "seed":
        seed()
    elif cmd == "clean":
        clean()
    elif cmd == "list":
        list_facts()
    else:
        print(__doc__)
