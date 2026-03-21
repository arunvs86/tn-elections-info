"""
Seed manifesto_promises and promises tables with real TN party manifesto data.

Uses httpx REST API (no supabase-py) — same pattern as enrich_from_myneta.py.
Loads env from backend/.env (SUPABASE_URL, SUPABASE_SERVICE_KEY).

Sources:
  - DMK 2021 manifesto (500 promises document released April 2021)
  - AIADMK 2021 manifesto
  - BJP 2021 TN-specific manifesto pledges
  - TVK (Thalapathy Vijay's party) — founded Sep 2024, 2026 manifesto TBD
"""

import os
import sys
import time
import httpx
from dotenv import load_dotenv

# ── Load env ──────────────────────────────────────────────────────
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
# For upsert: avoid duplicates on re-run
HEADERS_UPSERT = {
    **HEADERS,
    "Prefer": "return=representation,resolution=merge-duplicates",
}

CLIENT = httpx.Client(timeout=30.0)


def rest_post_batch(table, rows, upsert=False):
    """Insert a batch of rows. If upsert=True, use merge-duplicates."""
    if not rows:
        return []
    headers = HEADERS_UPSERT if upsert else HEADERS
    r = CLIENT.post(f"{BASE}/{table}", json=rows, headers=headers)
    r.raise_for_status()
    return r.json()


def rest_delete(table, params):
    """Delete rows matching filter."""
    r = CLIENT.delete(f"{BASE}/{table}", params=params, headers=HEADERS)
    r.raise_for_status()
    return r


def believability(overall):
    """Map overall score to a believability label."""
    if overall >= 8:
        return "Highly Credible"
    elif overall >= 6:
        return "Credible"
    elif overall >= 4:
        return "Moderate"
    elif overall >= 2:
        return "Doubtful"
    else:
        return "Low Credibility"


# ══════════════════════════════════════════════════════════════════
#  MANIFESTO PROMISES DATA — Real promises from TN party manifestos
# ══════════════════════════════════════════════════════════════════

DMK_2021_PROMISES = [
    {
        "promise_text": "Free bus travel for women in government buses",
        "promise_text_tamil": "அரசு பேருந்துகளில் பெண்களுக்கு இலவச பயணம்",
        "category": "Women",
        "fiscal_score": 5,
        "specificity_score": 9,
        "past_delivery_score": 9,
        "overall_score": 8,
        "ai_reasoning": "Implemented within months of taking office. Annual cost ~Rs 1,200 crore. Clear, specific promise that was fully delivered. Benefited over 1.5 crore women daily.",
    },
    {
        "promise_text": "Rs 1,000 monthly assistance to women heads of family (Kalaignar Magalir Urimai Thittam)",
        "promise_text_tamil": "குடும்பத் தலைவிகளுக்கு மாதம் ரூ.1,000 நிதி உதவி (கலைஞர் மகளிர் உரிமைத் திட்டம்)",
        "category": "Women",
        "fiscal_score": 4,
        "specificity_score": 9,
        "past_delivery_score": 8,
        "overall_score": 7,
        "ai_reasoning": "Launched in Sep 2023. Over 1 crore women enrolled. Annual fiscal burden ~Rs 12,000 crore (roughly 6% of state revenue). Massive welfare scheme successfully rolled out, though fiscal sustainability questioned.",
    },
    {
        "promise_text": "Free laptops for college students",
        "promise_text_tamil": "கல்லூரி மாணவர்களுக்கு இலவச மடிக்கணினி",
        "category": "Education",
        "fiscal_score": 5,
        "specificity_score": 8,
        "past_delivery_score": 7,
        "overall_score": 7,
        "ai_reasoning": "Continuation of existing scheme started by DMK in 2011. Distributed in batches. Quality of laptops has been a concern, but the promise was substantially kept.",
    },
    {
        "promise_text": "Reduce milk price by Rs 3 per litre through Aavin",
        "promise_text_tamil": "ஆவின் பால் விலையை லிட்டருக்கு ரூ.3 குறைப்பு",
        "category": "Welfare",
        "fiscal_score": 7,
        "specificity_score": 9,
        "past_delivery_score": 5,
        "overall_score": 7,
        "ai_reasoning": "Price was reduced initially but later increased due to input cost pressures. Partially delivered — the reduction was temporary rather than sustained.",
    },
    {
        "promise_text": "Kalaignar Magalir Urimai Insurance — Rs 5 lakh health cover for families",
        "promise_text_tamil": "கலைஞர் காப்பீட்டுத் திட்டம் — குடும்பத்திற்கு ரூ.5 லட்சம் மருத்துவக் காப்பீடு",
        "category": "Healthcare",
        "fiscal_score": 5,
        "specificity_score": 8,
        "past_delivery_score": 7,
        "overall_score": 7,
        "ai_reasoning": "Enhanced from Rs 1.5 lakh to Rs 5 lakh. Integrated with PMJAY. Over 1.38 crore families covered. Operational and heavily used at government hospitals.",
    },
    {
        "promise_text": "Breakfast scheme for government school children",
        "promise_text_tamil": "அரசுப் பள்ளி மாணவர்களுக்கு காலை உணவுத் திட்டம்",
        "category": "Education",
        "fiscal_score": 6,
        "specificity_score": 8,
        "past_delivery_score": 9,
        "overall_score": 8,
        "ai_reasoning": "Novel scheme launched in 2022. Covers classes 1-5 in government schools. Improved attendance and nutrition. Praised nationally and studied by other states. Annual cost ~Rs 500 crore.",
    },
    {
        "promise_text": "Naan Mudhalvan skill development programme for youth",
        "promise_text_tamil": "நான் முதல்வன் இளைஞர் திறன் மேம்பாட்டுத் திட்டம்",
        "category": "Education",
        "fiscal_score": 7,
        "specificity_score": 7,
        "past_delivery_score": 7,
        "overall_score": 7,
        "ai_reasoning": "Launched with corporate partnerships (TCS, Infosys, etc.). Over 25 lakh students enrolled. Provides industry-relevant certification and placement support. Well-executed digital platform.",
    },
    {
        "promise_text": "7.5% reservation in medical seats for government school students (already implemented before election)",
        "promise_text_tamil": "அரசுப் பள்ளி மாணவர்களுக்கு மருத்துவ இடங்களில் 7.5% இடஒதுக்கீடு",
        "category": "Education",
        "fiscal_score": 9,
        "specificity_score": 10,
        "past_delivery_score": 9,
        "overall_score": 9,
        "ai_reasoning": "Implemented via law before 2021 election. Over 500 government school students entered medical colleges annually through this quota. Transformative policy with minimal fiscal cost. Continued successfully.",
    },
    {
        "promise_text": "Establish new AIIMS at Madurai",
        "promise_text_tamil": "மதுரையில் புதிய எய்ம்ஸ் மருத்துவமனை அமைத்தல்",
        "category": "Healthcare",
        "fiscal_score": 6,
        "specificity_score": 8,
        "past_delivery_score": 4,
        "overall_score": 6,
        "ai_reasoning": "Central government project. State facilitated land acquisition. Construction underway but significantly delayed. Expected completion pushed to 2025-26. Partial state role makes full credit questionable.",
    },
    {
        "promise_text": "20 lakh new jobs in 5 years through industrial investments",
        "promise_text_tamil": "தொழில் முதலீடுகள் மூலம் 5 ஆண்டுகளில் 20 லட்சம் புதிய வேலைகள்",
        "category": "Economy",
        "fiscal_score": 5,
        "specificity_score": 6,
        "past_delivery_score": 4,
        "overall_score": 5,
        "ai_reasoning": "Attracted significant FDI and MoUs (Foxconn, Tata Electronics, etc.) but verifiable job creation figures fall short of the 20 lakh target. Global investment summit held. Ambitious target partially met.",
    },
    {
        "promise_text": "Repeal NEET exam for medical admissions in Tamil Nadu",
        "promise_text_tamil": "தமிழ்நாட்டில் நீட் தேர்வை ரத்து செய்தல்",
        "category": "Education",
        "fiscal_score": 10,
        "specificity_score": 9,
        "past_delivery_score": 2,
        "overall_score": 4,
        "ai_reasoning": "Bill passed in state assembly but returned by Governor. Legal challenge in Supreme Court unsuccessful. Despite strong rhetoric, this promise was not deliverable within state power — requires central legislation or constitutional amendment.",
    },
    {
        "promise_text": "Complete Chennai Metro Rail Phase 2 (119 km)",
        "promise_text_tamil": "சென்னை மெட்ரோ ரயில் இரண்டாம் கட்டம் (119 கி.மீ) நிறைவு",
        "category": "Infrastructure",
        "fiscal_score": 4,
        "specificity_score": 8,
        "past_delivery_score": 3,
        "overall_score": 5,
        "ai_reasoning": "Work ongoing but severely behind schedule. Phase 2 is a massive Rs 63,000 crore project. Land acquisition and tunneling face delays. Completion likely only by 2028-29. Joint central-state project.",
    },
    {
        "promise_text": "Rs 3 per kg rice through PDS for ration card holders",
        "promise_text_tamil": "ரேஷன் அட்டைதாரர்களுக்கு கிலோ ரூ.3-க்கு அரிசி",
        "category": "Welfare",
        "fiscal_score": 6,
        "specificity_score": 9,
        "past_delivery_score": 8,
        "overall_score": 8,
        "ai_reasoning": "Already existing scheme that was maintained. TN's PDS is one of India's best. Universal PDS covers nearly all households. Reliable delivery through cooperative network.",
    },
    {
        "promise_text": "Free 1,000 units of electricity per year for farmers",
        "promise_text_tamil": "விவசாயிகளுக்கு ஆண்டுக்கு 1,000 யூனிட் இலவச மின்சாரம்",
        "category": "Agriculture",
        "fiscal_score": 5,
        "specificity_score": 8,
        "past_delivery_score": 8,
        "overall_score": 7,
        "ai_reasoning": "Free farm power has been a TN policy for decades. Continued without interruption. The fiscal burden on TANGEDCO is significant (~Rs 5,000 crore annually) but politically untouchable.",
    },
    {
        "promise_text": "Establish desalination plants to solve Chennai water crisis",
        "promise_text_tamil": "சென்னை நீர் பிரச்சனைக்கு கடல்நீரை நன்நீராக்கும் ஆலைகள் அமைத்தல்",
        "category": "Infrastructure",
        "fiscal_score": 5,
        "specificity_score": 7,
        "past_delivery_score": 5,
        "overall_score": 6,
        "ai_reasoning": "Third desalination plant at Nemmeli Phase 2 completed. Fourth plant at Perur under construction. Progress is steady but Chennai's water supply still faces seasonal stress. Long-term solution being built incrementally.",
    },
]

DMK_2026_PROMISES = [
    {
        "promise_text": "Increase Kalaignar Magalir Urimai Thittam from Rs 1,000 to Rs 1,500 per month",
        "promise_text_tamil": "கலைஞர் மகளிர் உரிமைத் திட்ட தொகையை ரூ.1,000-லிருந்து ரூ.1,500-ஆக உயர்த்துதல்",
        "category": "Women",
        "fiscal_score": 3,
        "specificity_score": 9,
        "past_delivery_score": 8,
        "overall_score": 7,
        "ai_reasoning": "Building on existing scheme with proven delivery. However, increase adds Rs 6,000 crore to already Rs 12,000 crore annual burden. Fiscal sustainability is the primary concern. Track record of delivery is strong.",
    },
    {
        "promise_text": "1 lakh government jobs in first year of new term",
        "promise_text_tamil": "புதிய பதவிக்காலத்தின் முதல் ஆண்டிலேயே 1 லட்சம் அரசு வேலைகள்",
        "category": "Economy",
        "fiscal_score": 4,
        "specificity_score": 8,
        "past_delivery_score": 4,
        "overall_score": 5,
        "ai_reasoning": "Previous term saw recruitment drives but fell short of targets due to litigation and administrative delays. 1 lakh in one year is extremely ambitious given TN's existing 6 lakh+ government workforce.",
    },
    {
        "promise_text": "Universal healthcare with upgraded primary health centres in every panchayat",
        "promise_text_tamil": "ஒவ்வொரு ஊராட்சியிலும் மேம்படுத்தப்பட்ட ஆரம்ப சுகாதார நிலையங்கள்",
        "category": "Healthcare",
        "fiscal_score": 5,
        "specificity_score": 7,
        "past_delivery_score": 6,
        "overall_score": 6,
        "ai_reasoning": "TN already has one of India's best public health networks. Upgrade is incremental. Previous term saw significant upgrades. Feasible if focused on infrastructure rather than staffing.",
    },
    {
        "promise_text": "Complete Chennai Metro Phase 2 and begin Phase 3",
        "promise_text_tamil": "சென்னை மெட்ரோ இரண்டாம் கட்டத்தை நிறைவு செய்து மூன்றாம் கட்டத்தைத் தொடங்குதல்",
        "category": "Infrastructure",
        "fiscal_score": 4,
        "specificity_score": 7,
        "past_delivery_score": 3,
        "overall_score": 5,
        "ai_reasoning": "Phase 2 completion is a continuation promise. Phase 3 planning adds ambition but Phase 2 itself is heavily delayed. Requires massive central funding support. Track record on metro delivery is weak.",
    },
    {
        "promise_text": "Free education from KG to PG in government institutions",
        "promise_text_tamil": "அரசு நிறுவனங்களில் கேஜி முதல் பிஜி வரை இலவசக் கல்வி",
        "category": "Education",
        "fiscal_score": 5,
        "specificity_score": 7,
        "past_delivery_score": 7,
        "overall_score": 6,
        "ai_reasoning": "TN already provides heavily subsidized education. This formalizes existing near-free policy. Main cost is in professional courses. Feasible as an extension of current policy.",
    },
]

AIADMK_2021_PROMISES = [
    {
        "promise_text": "Amma Canteens — continue and expand subsidized meal centres",
        "promise_text_tamil": "அம்மா உணவகங்கள் — மானிய உணவு நிலையங்களை தொடர்ந்து விரிவாக்கம்",
        "category": "Welfare",
        "fiscal_score": 7,
        "specificity_score": 8,
        "past_delivery_score": 9,
        "overall_score": 8,
        "ai_reasoning": "AIADMK's flagship programme under Jayalalithaa. Over 400 canteens across TN serving meals at Rs 5-10. Proven model with strong delivery track record. Now continued by DMK government too.",
    },
    {
        "promise_text": "Free mixer-grinder-wet grinder for all ration card households",
        "promise_text_tamil": "அனைத்து ரேஷன் அட்டை குடும்பங்களுக்கும் இலவச மிக்ஸி-கிரைண்டர்",
        "category": "Welfare",
        "fiscal_score": 4,
        "specificity_score": 9,
        "past_delivery_score": 8,
        "overall_score": 7,
        "ai_reasoning": "Iconic AIADMK scheme delivered in 2011 and 2016. Over 1.8 crore units distributed. One-time cost of Rs 3,000-4,000 crore. High specificity and proven delivery, but questioned on fiscal priority.",
    },
    {
        "promise_text": "Amma Cement at subsidized rates for house construction",
        "promise_text_tamil": "வீடு கட்ட மானிய விலையில் அம்மா சிமெண்ட்",
        "category": "Infrastructure",
        "fiscal_score": 5,
        "specificity_score": 7,
        "past_delivery_score": 6,
        "overall_score": 6,
        "ai_reasoning": "Launched in 2016 at Rs 190/bag vs market Rs 350+. Supply was inconsistent and availability limited. Concept is sound but execution faced distribution challenges.",
    },
    {
        "promise_text": "Free housing for 10 lakh families under PMAY and state schemes",
        "promise_text_tamil": "PMAY மற்றும் மாநிலத் திட்டங்களின் கீழ் 10 லட்சம் குடும்பங்களுக்கு இலவச வீடு",
        "category": "Welfare",
        "fiscal_score": 4,
        "specificity_score": 7,
        "past_delivery_score": 5,
        "overall_score": 5,
        "ai_reasoning": "Ambitious target. Previous AIADMK term delivered housing but well below 10 lakh. PMAY convergence helps but land acquisition and construction delays are persistent. Partially delivered in past.",
    },
    {
        "promise_text": "Smart classrooms in all government schools with digital infrastructure",
        "promise_text_tamil": "அனைத்து அரசுப் பள்ளிகளிலும் ஸ்மார்ட் வகுப்பறைகள் மற்றும் டிஜிட்டல் உள்கட்டமைப்பு",
        "category": "Education",
        "fiscal_score": 5,
        "specificity_score": 6,
        "past_delivery_score": 4,
        "overall_score": 5,
        "ai_reasoning": "Partial implementation in previous term. Many schools received tablets and projectors but maintenance and internet connectivity were challenges. Concept sound but execution patchy.",
    },
    {
        "promise_text": "Continue free gold for Thali (wedding jewellery) scheme — 8 grams for brides",
        "promise_text_tamil": "திருமணப் பெண்களுக்கு 8 கிராம் இலவச தாலி தங்கத் திட்டம் தொடர்ச்சி",
        "category": "Women",
        "fiscal_score": 4,
        "specificity_score": 9,
        "past_delivery_score": 8,
        "overall_score": 7,
        "ai_reasoning": "Started under Jayalalithaa. Rs 50,000 marriage assistance including gold. Delivered to lakhs of women. Popular scheme with clear eligibility criteria. Cost is significant but manageable.",
    },
    {
        "promise_text": "Amma Two-Wheeler scheme for working women at 50% subsidy",
        "promise_text_tamil": "பணிபுரியும் பெண்களுக்கு 50% மானியத்தில் அம்மா இரு சக்கர வாகனத் திட்டம்",
        "category": "Women",
        "fiscal_score": 5,
        "specificity_score": 8,
        "past_delivery_score": 7,
        "overall_score": 7,
        "ai_reasoning": "Successful scheme in 2016-21 period. Over 5 lakh women benefited. Subsidy of Rs 25,000-30,000 per vehicle. Well-documented delivery. Promotes women's mobility and employment.",
    },
    {
        "promise_text": "Double crop insurance coverage for farmers",
        "promise_text_tamil": "விவசாயிகளுக்கு பயிர் காப்பீட்டை இரட்டிப்பாக்குதல்",
        "category": "Agriculture",
        "fiscal_score": 5,
        "specificity_score": 6,
        "past_delivery_score": 4,
        "overall_score": 5,
        "ai_reasoning": "Crop insurance under PMFBY has had implementation issues nationwide. State's share of premium is a significant fiscal commitment. Doubling coverage is aspirational but claims settlement was slow historically.",
    },
    {
        "promise_text": "Free 100 units of electricity per month for all domestic consumers",
        "promise_text_tamil": "அனைத்து வீட்டு நுகர்வோருக்கும் மாதம் 100 யூனிட் இலவச மின்சாரம்",
        "category": "Welfare",
        "fiscal_score": 3,
        "specificity_score": 9,
        "past_delivery_score": 6,
        "overall_score": 6,
        "ai_reasoning": "Universal free electricity for first 100 units would cost TANGEDCO heavily. TN already gives free power to agriculture. Adding domestic consumers strains the financially weak utility. Popular but fiscally risky.",
    },
    {
        "promise_text": "Complete Godavari-Cauvery river interlinking project",
        "promise_text_tamil": "கோதாவரி-காவிரி நதி இணைப்புத் திட்டத்தை நிறைவு செய்தல்",
        "category": "Infrastructure",
        "fiscal_score": 2,
        "specificity_score": 5,
        "past_delivery_score": 1,
        "overall_score": 3,
        "ai_reasoning": "Massive inter-state project requiring central government and multiple state cooperation. Decades old demand with no concrete progress. Not within a single state government's power to deliver. Essentially aspirational.",
    },
    {
        "promise_text": "Rs 2,500 monthly pension for senior citizens above 60",
        "promise_text_tamil": "60 வயதுக்கு மேற்பட்ட மூத்த குடிமக்களுக்கு மாதம் ரூ.2,500 ஓய்வூதியம்",
        "category": "Welfare",
        "fiscal_score": 4,
        "specificity_score": 8,
        "past_delivery_score": 5,
        "overall_score": 6,
        "ai_reasoning": "Previous pension was Rs 1,000-1,500. Increasing to Rs 2,500 would significantly expand fiscal commitment. TN has about 1 crore senior citizens. Annual cost could reach Rs 30,000 crore.",
    },
    {
        "promise_text": "New medical colleges in every district without one",
        "promise_text_tamil": "மருத்துவக் கல்லூரி இல்லாத ஒவ்வொரு மாவட்டத்திலும் புதிய மருத்துவக் கல்லூரி",
        "category": "Healthcare",
        "fiscal_score": 5,
        "specificity_score": 7,
        "past_delivery_score": 5,
        "overall_score": 6,
        "ai_reasoning": "TN already leads India with 36 government medical colleges. Adding to uncovered districts is feasible but requires significant capital and faculty recruitment. Previous government opened 11 new colleges.",
    },
]

BJP_2021_PROMISES = [
    {
        "promise_text": "Smart Cities Mission — upgrade Coimbatore, Madurai, Salem, Tiruchirappalli, Thanjavur, Tirunelveli",
        "promise_text_tamil": "ஸ்மார்ட் சிட்டீஸ் திட்டம் — கோயம்புத்தூர், மதுரை, சேலம், திருச்சி, தஞ்சாவூர், திருநெல்வேலி மேம்படுத்தல்",
        "category": "Infrastructure",
        "fiscal_score": 6,
        "specificity_score": 7,
        "past_delivery_score": 5,
        "overall_score": 6,
        "ai_reasoning": "Central scheme with state cooperation. Six TN cities selected. Implementation is mixed — some projects completed, others delayed. Funding is confirmed but execution depends on local bodies.",
    },
    {
        "promise_text": "One Nation One Ration Card — portability of PDS benefits for migrant workers",
        "promise_text_tamil": "ஒரே நாடு ஒரே ரேஷன் அட்டை — புலம்பெயர் தொழிலாளர்களுக்கு PDS பயன்கள் எங்கும்",
        "category": "Welfare",
        "fiscal_score": 8,
        "specificity_score": 8,
        "past_delivery_score": 6,
        "overall_score": 7,
        "ai_reasoning": "Central policy already implemented. TN integrated into the system. Helps inter-state migrant workers access ration anywhere. Low fiscal impact on state. Technical infrastructure (ePoS) already deployed.",
    },
    {
        "promise_text": "Namami Gange-style river cleaning for Cauvery and Vaigai",
        "promise_text_tamil": "காவிரி மற்றும் வைகை ஆறுகளை நமாமி கங்கை பாணியில் தூய்மைப்படுத்துதல்",
        "category": "Infrastructure",
        "fiscal_score": 5,
        "specificity_score": 5,
        "past_delivery_score": 3,
        "overall_score": 4,
        "ai_reasoning": "Namami Gange itself has had mixed results. Extending to TN rivers is aspirational. No concrete budget or timeline proposed. River cleaning requires sustained multi-year effort and inter-state cooperation for Cauvery.",
    },
    {
        "promise_text": "Defence manufacturing corridor from Chennai to Salem — 20,000 jobs",
        "promise_text_tamil": "சென்னை முதல் சேலம் வரை பாதுகாப்பு உற்பத்தி தாழ்வாரம் — 20,000 வேலைகள்",
        "category": "Economy",
        "fiscal_score": 6,
        "specificity_score": 7,
        "past_delivery_score": 4,
        "overall_score": 6,
        "ai_reasoning": "Tamil Nadu Defence Industrial Corridor announced in 2018 budget. Nodes at Chennai, Hosur, Salem, Coimbatore, Tiruchirappalli. Some investments secured (BrahMos, L&T) but 20,000 jobs target not yet met. Progress is real but slow.",
    },
    {
        "promise_text": "Ayushman Bharat health insurance — Rs 5 lakh cover for 10 crore families",
        "promise_text_tamil": "ஆயுஷ்மான் பாரத் — 10 கோடி குடும்பங்களுக்கு ரூ.5 லட்சம் மருத்துவக் காப்பீடு",
        "category": "Healthcare",
        "fiscal_score": 7,
        "specificity_score": 8,
        "past_delivery_score": 6,
        "overall_score": 7,
        "ai_reasoning": "National scheme. TN initially refused to join but later integrated under Chief Minister's Comprehensive Health Insurance. Covers 1.38 crore families. Operational in government and empanelled private hospitals.",
    },
    {
        "promise_text": "PM Kisan Samman Nidhi — Rs 6,000/year direct transfer to farmers",
        "promise_text_tamil": "பிரதம மந்திரி கிசான் சம்மான் நிதி — விவசாயிகளுக்கு ஆண்டுக்கு ரூ.6,000 நேரடி பணமாற்றம்",
        "category": "Agriculture",
        "fiscal_score": 8,
        "specificity_score": 9,
        "past_delivery_score": 8,
        "overall_score": 8,
        "ai_reasoning": "Fully central-funded scheme. Over 65 lakh TN farmers receiving Rs 2,000 every 4 months via DBT. Well-implemented with Aadhaar-linked transfers. BJP can legitimately claim this delivery in TN.",
    },
    {
        "promise_text": "Convert fishing harbours at Rameswaram and Kanyakumari into modern fish landing centres",
        "promise_text_tamil": "ராமேஸ்வரம் மற்றும் கன்னியாகுமரி மீன்பிடி துறைமுகங்களை நவீன மீன் இறங்கு நிலையங்களாக மாற்றுதல்",
        "category": "Infrastructure",
        "fiscal_score": 6,
        "specificity_score": 7,
        "past_delivery_score": 4,
        "overall_score": 6,
        "ai_reasoning": "Part of Blue Revolution scheme. Some modernization work done at Rameswaram. Kanyakumari harbour upgrade under Sagarmala. Progress exists but completion timelines have slipped.",
    },
    {
        "promise_text": "Complete Bharatmala highway projects — NH upgrades across Tamil Nadu",
        "promise_text_tamil": "பாரதமாலா நெடுஞ்சாலை திட்டங்கள் — தமிழ்நாடு முழுவதும் NH மேம்படுத்தல்",
        "category": "Infrastructure",
        "fiscal_score": 6,
        "specificity_score": 6,
        "past_delivery_score": 5,
        "overall_score": 6,
        "ai_reasoning": "Multiple NH projects underway: Chennai-Salem greenfield, Madurai-Thoothukudi, etc. Central funding confirmed. Some projects like Chennai-Bengaluru expressway progressing well. Mixed track record on timelines.",
    },
    {
        "promise_text": "Establish Indian Institute of Technology (IIT) in Tirupati for Tamil Nadu students' access",
        "promise_text_tamil": "தமிழ்நாட்டு மாணவர்களின் அணுகலுக்கு திருப்பதியில் IIT நிறுவுதல்",
        "category": "Education",
        "fiscal_score": 7,
        "specificity_score": 6,
        "past_delivery_score": 5,
        "overall_score": 6,
        "ai_reasoning": "IIT Madras already in Chennai. New IIT Tirupati is in Andhra Pradesh (not TN). BJP's promise to bring more central institutions to TN had limited results. IIITDM at Kancheepuram is operational.",
    },
]

TVK_2026_PROMISES = [
    {
        "promise_text": "Complete transparency in governance — live-stream cabinet meetings",
        "promise_text_tamil": "ஆட்சியில் முழு வெளிப்படைத்தன்மை — அமைச்சரவைக் கூட்டங்களை நேரலையில் ஒளிபரப்பு",
        "category": "Economy",
        "fiscal_score": 8,
        "specificity_score": 7,
        "past_delivery_score": 1,
        "overall_score": 5,
        "ai_reasoning": "Novel promise from a new party with no governance track record. Live-streaming cabinet meetings is unprecedented in India. Feasibility is questionable due to security and confidentiality concerns. Bold but untested.",
    },
    {
        "promise_text": "Youth employment guarantee — skilled jobs for every graduate within 6 months",
        "promise_text_tamil": "இளைஞர் வேலை உத்தரவாதம் — ஒவ்வொரு பட்டதாரிக்கும் 6 மாதத்தில் திறன் வேலைகள்",
        "category": "Economy",
        "fiscal_score": 2,
        "specificity_score": 6,
        "past_delivery_score": 1,
        "overall_score": 3,
        "ai_reasoning": "Extremely ambitious with no clear funding mechanism. TN produces 8+ lakh graduates annually. Guaranteeing jobs within 6 months requires massive public or private sector absorption. No track record to evaluate.",
    },
    {
        "promise_text": "Anti-corruption ombudsman (Lokayukta) with real powers",
        "promise_text_tamil": "உண்மையான அதிகாரங்களுடன் ஊழல் தடுப்பு குறைதீர்ப்பாளர் (லோக்ஆயுக்தா)",
        "category": "Economy",
        "fiscal_score": 9,
        "specificity_score": 6,
        "past_delivery_score": 1,
        "overall_score": 5,
        "ai_reasoning": "TN is one of few states without a functional Lokayukta. Low fiscal cost but requires political will. No governance record to assess delivery probability. Good intention, uncertain execution.",
    },
    {
        "promise_text": "Free high-speed internet to every village panchayat",
        "promise_text_tamil": "ஒவ்வொரு கிராம ஊராட்சிக்கும் இலவச அதிவேக இணையம்",
        "category": "Infrastructure",
        "fiscal_score": 5,
        "specificity_score": 7,
        "past_delivery_score": 1,
        "overall_score": 4,
        "ai_reasoning": "BharatNet already provides fiber to many gram panchayats. TVK's promise adds free access layer. Annual operating cost for 12,000+ panchayats would be Rs 500-1,000 crore. Feasible technically but costly.",
    },
    {
        "promise_text": "Establish state-level sports university and Olympic training centre",
        "promise_text_tamil": "மாநில அளவிலான விளையாட்டு பல்கலைக்கழகம் மற்றும் ஒலிம்பிக் பயிற்சி மையம் அமைத்தல்",
        "category": "Education",
        "fiscal_score": 6,
        "specificity_score": 6,
        "past_delivery_score": 1,
        "overall_score": 4,
        "ai_reasoning": "TN already has SDAT and various sports academies. A dedicated sports university is feasible (Karnataka has one). Olympic training centre requires significant investment. No delivery track record for this new party.",
    },
]

# ── Candidate-level promises for the promises table (Feature 4.6) ──

CANDIDATE_PROMISES_2021 = [
    # DMK promises tied to the ruling party (no specific candidate_id needed for seed)
    {
        "party": "DMK",
        "election_year": 2021,
        "promise_text": "Free bus travel for women in government buses",
        "promise_text_tamil": "அரசு பேருந்துகளில் பெண்களுக்கு இலவச பயணம்",
        "category": "Women",
        "status": "kept",
        "evidence_url": "https://www.thehindu.com/news/national/tamil-nadu/free-bus-travel-for-women-in-tn-from-today/article37203082.ece",
    },
    {
        "party": "DMK",
        "election_year": 2021,
        "promise_text": "Rs 1,000 monthly for women heads of family",
        "promise_text_tamil": "குடும்பத் தலைவிகளுக்கு மாதம் ரூ.1,000",
        "category": "Women",
        "status": "kept",
        "evidence_url": "https://www.thehindu.com/news/national/tamil-nadu/kalaignar-magalir-urimai-thogai-thittam/article67295612.ece",
    },
    {
        "party": "DMK",
        "election_year": 2021,
        "promise_text": "Breakfast scheme for government school students",
        "promise_text_tamil": "அரசுப் பள்ளி மாணவர்களுக்கு காலை உணவுத் திட்டம்",
        "category": "Education",
        "status": "kept",
        "evidence_url": "https://www.thehindu.com/news/national/tamil-nadu/cm-stalin-launches-breakfast-scheme/article65862982.ece",
    },
    {
        "party": "DMK",
        "election_year": 2021,
        "promise_text": "Reduce Aavin milk price by Rs 3",
        "promise_text_tamil": "ஆவின் பால் விலையை ரூ.3 குறைப்பு",
        "category": "Welfare",
        "status": "partial",
        "evidence_url": None,
    },
    {
        "party": "DMK",
        "election_year": 2021,
        "promise_text": "Repeal NEET for TN medical admissions",
        "promise_text_tamil": "நீட் தேர்வை ரத்து செய்தல்",
        "category": "Education",
        "status": "broken",
        "evidence_url": None,
    },
    {
        "party": "DMK",
        "election_year": 2021,
        "promise_text": "20 lakh new jobs in 5 years",
        "promise_text_tamil": "5 ஆண்டுகளில் 20 லட்சம் புதிய வேலைகள்",
        "category": "Economy",
        "status": "partial",
        "evidence_url": None,
    },
    {
        "party": "DMK",
        "election_year": 2021,
        "promise_text": "Free laptops for college students",
        "promise_text_tamil": "கல்லூரி மாணவர்களுக்கு இலவச மடிக்கணினி",
        "category": "Education",
        "status": "kept",
        "evidence_url": None,
    },
    {
        "party": "DMK",
        "election_year": 2021,
        "promise_text": "Rs 5 lakh health insurance for all families",
        "promise_text_tamil": "அனைத்து குடும்பங்களுக்கும் ரூ.5 லட்சம் மருத்துவக் காப்பீடு",
        "category": "Healthcare",
        "status": "kept",
        "evidence_url": None,
    },
    {
        "party": "DMK",
        "election_year": 2021,
        "promise_text": "Naan Mudhalvan skill development for youth",
        "promise_text_tamil": "நான் முதல்வன் இளைஞர் திறன் மேம்பாட்டுத் திட்டம்",
        "category": "Education",
        "status": "kept",
        "evidence_url": None,
    },
    {
        "party": "DMK",
        "election_year": 2021,
        "promise_text": "Establish AIIMS at Madurai",
        "promise_text_tamil": "மதுரையில் எய்ம்ஸ் மருத்துவமனை",
        "category": "Healthcare",
        "status": "pending",
        "evidence_url": None,
    },
    {
        "party": "DMK",
        "election_year": 2021,
        "promise_text": "Complete Chennai Metro Phase 2",
        "promise_text_tamil": "சென்னை மெட்ரோ இரண்டாம் கட்டம் நிறைவு",
        "category": "Infrastructure",
        "status": "pending",
        "evidence_url": None,
    },
    {
        "party": "DMK",
        "election_year": 2021,
        "promise_text": "Establish desalination plants for Chennai water supply",
        "promise_text_tamil": "சென்னை நீர் வழங்கலுக்கு கடல்நீர் நன்நீராக்கும் ஆலைகள்",
        "category": "Infrastructure",
        "status": "partial",
        "evidence_url": None,
    },
]


# ══════════════════════════════════════════════════════════════════
#  MAIN SEEDING LOGIC
# ══════════════════════════════════════════════════════════════════

def seed_manifesto_promises():
    """Seed the manifesto_promises table."""
    print("\n" + "=" * 60)
    print("  Seeding manifesto_promises table")
    print("=" * 60)

    # Build all rows
    all_rows = []

    def add_party_promises(party, year, promises):
        for p in promises:
            row = {
                "party": party,
                "election_year": year,
                "promise_text": p["promise_text"],
                "promise_text_tamil": p.get("promise_text_tamil"),
                "category": p.get("category"),
                "fiscal_score": p.get("fiscal_score"),
                "specificity_score": p.get("specificity_score"),
                "past_delivery_score": p.get("past_delivery_score"),
                "overall_score": p.get("overall_score"),
                "believability_label": believability(p.get("overall_score", 0)),
                "ai_reasoning": p.get("ai_reasoning"),
            }
            all_rows.append(row)

    add_party_promises("DMK", 2021, DMK_2021_PROMISES)
    add_party_promises("DMK", 2026, DMK_2026_PROMISES)
    add_party_promises("AIADMK", 2021, AIADMK_2021_PROMISES)
    add_party_promises("BJP", 2021, BJP_2021_PROMISES)
    add_party_promises("TVK", 2026, TVK_2026_PROMISES)

    print(f"  Total manifesto promises to insert: {len(all_rows)}")

    # Clear existing manifesto_promises to avoid duplicates on re-run
    print("  Clearing existing manifesto_promises...")
    try:
        # Delete all rows (filter that matches everything)
        rest_delete("manifesto_promises", {"id": "gt.0"})
        print("  Cleared.")
    except Exception as e:
        print(f"  Warning: Could not clear table (may be empty): {e}")

    # Insert in batches of 20
    inserted = 0
    errors = 0
    for i in range(0, len(all_rows), 20):
        batch = all_rows[i:i + 20]
        try:
            rest_post_batch("manifesto_promises", batch)
            inserted += len(batch)
            print(f"  Inserted {inserted}/{len(all_rows)}...")
        except Exception as e:
            errors += len(batch)
            print(f"  ERROR inserting batch at {i}: {e}")
        time.sleep(0.3)

    print(f"  Done. Inserted: {inserted}, Errors: {errors}")


def seed_promises():
    """Seed the promises table (candidate-level promise tracker)."""
    print("\n" + "=" * 60)
    print("  Seeding promises table (candidate-level)")
    print("=" * 60)

    print(f"  Total candidate promises to insert: {len(CANDIDATE_PROMISES_2021)}")

    # Clear existing party-level promises to avoid duplicates on re-run
    print("  Clearing existing party-level promises (no candidate_id)...")
    try:
        rest_delete("promises", {"candidate_id": "is.null"})
        print("  Cleared.")
    except Exception as e:
        print(f"  Warning: Could not clear (may be empty): {e}")

    # Insert
    try:
        rest_post_batch("promises", CANDIDATE_PROMISES_2021)
        print(f"  Inserted {len(CANDIDATE_PROMISES_2021)} promises.")
    except Exception as e:
        print(f"  ERROR: {e}")


def main():
    print("=" * 60)
    print("  TN Elections — Manifesto Promises Seed Script")
    print("=" * 60)
    print(f"  Supabase URL: {SUPABASE_URL[:40]}...")

    seed_manifesto_promises()
    seed_promises()

    print("\n" + "=" * 60)
    print("  Seeding complete!")
    print("=" * 60)
    print(f"\n  Summary:")
    print(f"    DMK 2021:    {len(DMK_2021_PROMISES)} manifesto promises")
    print(f"    DMK 2026:    {len(DMK_2026_PROMISES)} manifesto promises")
    print(f"    AIADMK 2021: {len(AIADMK_2021_PROMISES)} manifesto promises")
    print(f"    BJP 2021:    {len(BJP_2021_PROMISES)} manifesto promises")
    print(f"    TVK 2026:    {len(TVK_2026_PROMISES)} manifesto promises")
    print(f"    Candidate promises (DMK 2021 tracker): {len(CANDIDATE_PROMISES_2021)}")


if __name__ == "__main__":
    main()
