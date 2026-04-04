"""
Seed TVK 2026 manifesto promises into Supabase.
Source: Official TVK manifesto released March 29, 2026
Covers: Women, Agriculture, Youth (partial manifesto — only these 3 sectors announced)

Usage:
  python3 scripts/seed_tvk_manifesto_2026.py
"""

import urllib.request, urllib.parse, json, sys, os

SUPABASE_URL = "https://ljbewpsksaetftwuaqaz.supabase.co"
SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqYmV3cHNrc2FldGZ0d3VhcWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxOTMxMCwiZXhwIjoyMDg5NDk1MzEwfQ.F8P4y2AJWQZheleBN3F6n4iJQmvfpZiLi-3YUVONlh4"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# ── Scoring guide ─────────────────────────────────────────────────────────────
# fiscal_score     (1-10): 10 = very cheap for state, 1 = fiscally reckless
# specificity_score(1-10): 10 = exact number/target, 1 = vague aspiration
# past_delivery_score(1-10): TVK = new party, no track record → 2 across the board
# overall_score    (1-10): weighted: fiscal×0.35 + specificity×0.35 + delivery×0.30
# believability_label: "Very Likely" | "Likely" | "Uncertain" | "Unlikely"
# ─────────────────────────────────────────────────────────────────────────────

TVK_PROMISES = [

    # ══ WOMEN ══════════════════════════════════════════════════════════════════

    {
        "category": "women",
        "is_flagship": True,
        "promise_text": "₹2,500/month cash transfer to all women (excluding government employees) until age 60 — outbids current DMK Kalaignar Magalir Urimai Thogai of ₹1,000",
        "promise_text_tamil": "அரசு ஊழியர்கள் அல்லாத அனைத்து பெண்களுக்கும் மாதம் ₹2,500 நேரடி பண உதவி (60 வயது வரை) — தற்போதைய DMK திட்டத்தை விட அதிகம்",
        "fiscal_score": 3,
        "specificity_score": 10,
        "overall_score": 6,
        "believability_label": "Uncertain",
        "ai_reasoning": "Flagship welfare promise. At ~2.5 crore eligible women, this costs ~₹37,500 crore/year — nearly 15% of TN's entire budget. Fiscally very ambitious for a new party with no revenue plan. High specificity but delivery track record is zero.",
        "source_url": "https://www.tconews.in/blog/news-2/tvk-chief-vijay-rolls-out-women-centric-welfare-promises-847",
    },
    {
        "category": "women",
        "is_flagship": True,
        "promise_text": "6 free LPG cylinders per household annually under 'Annapurani Super Six Scheme'",
        "promise_text_tamil": "'அன்னபூரணி சூப்பர் சிக்ஸ் திட்டம்' — வீட்டுக்கு ஆண்டுக்கு 6 இலவச சமையல் கேஸ் சிலிண்டர்",
        "fiscal_score": 4,
        "specificity_score": 10,
        "overall_score": 7,
        "believability_label": "Uncertain",
        "ai_reasoning": "~2 crore households × 6 cylinders × ~₹900 subsidy = ~₹10,800 crore/year. Doable but expensive. DMK already gives 3 free cylinders; this doubles it.",
        "source_url": "https://newsable.asianetnews.com/india/vijays-tvk-poll-promises-6-free-lpg-cylinders-rs-2500-for-women",
    },
    {
        "category": "women",
        "is_flagship": True,
        "promise_text": "Free bus travel for all women in government-run buses with no restrictions ('Vetri Payanam Scheme')",
        "promise_text_tamil": "'வெற்றி பயணம் திட்டம்' — அரசு பேருந்துகளில் பெண்களுக்கு எந்த கட்டுப்பாடும் இல்லாமல் இலவச பயணம்",
        "fiscal_score": 5,
        "specificity_score": 10,
        "overall_score": 8,
        "believability_label": "Likely",
        "ai_reasoning": "DMK already provides free bus travel for women. TVK's version removes restrictions. Cost is incremental. High feasibility if DMK's scheme is already working.",
        "source_url": "https://newsable.asianetnews.com/india/vijays-tvk-poll-promises-6-free-lpg-cylinders-rs-2500-for-women",
    },
    {
        "category": "women",
        "is_flagship": False,
        "promise_text": "Free sanitary pads distributed through ration shops, schools, and colleges across Tamil Nadu",
        "promise_text_tamil": "ரேஷன் கடைகள், பள்ளிகள், கல்லூரிகள் வழியாக இலவச சானிட்டரி பேட் வழங்கல்",
        "fiscal_score": 7,
        "specificity_score": 7,
        "overall_score": 7,
        "believability_label": "Likely",
        "ai_reasoning": "Several states have implemented this. Relatively low cost. Deliverable through existing ration shop infrastructure. Good specificity on distribution channels.",
        "source_url": "https://www.tconews.in/blog/news-2/tvk-chief-vijay-rolls-out-women-centric-welfare-promises-847",
    },
    {
        "category": "women",
        "is_flagship": False,
        "promise_text": "1 sovereign of gold and a silk saree as wedding gift to brides from poor families under 'Annan Seer Scheme'",
        "promise_text_tamil": "'அண்ணன் சீர் திட்டம்' — ஏழை குடும்பத்தின் மணமகளுக்கு 1 பவுன் தங்கம் மற்றும் பட்டுப்புடவை",
        "fiscal_score": 5,
        "specificity_score": 10,
        "overall_score": 8,
        "believability_label": "Uncertain",
        "ai_reasoning": "Similar to existing Tamil Nadu marriage assistance schemes. Dependent on defining 'poor families'. 1 sovereign gold at current prices (~₹9,000) per eligible marriage. Cost manageable if restricted to BPL families.",
        "source_url": "https://www.indiatvnews.com/tamil-nadu/news-rs-2-500-cash-gold-baby-kits-and-more-tvk-s-vijay-resorts-to-freebies",
    },
    {
        "category": "women",
        "is_flagship": False,
        "promise_text": "Newborn welcome kit — gold ring + baby products (powder, oil, diapers) for every child born in Tamil Nadu",
        "promise_text_tamil": "தமிழ்நாட்டில் பிறக்கும் ஒவ்வொரு குழந்தைக்கும் தங்க மோதிரம் + குழந்தைப் பொருட்கள் கொண்ட வரவேற்பு கிட்",
        "fiscal_score": 6,
        "specificity_score": 8,
        "overall_score": 7,
        "believability_label": "Likely",
        "ai_reasoning": "~9 lakh births/year in TN. Kit cost ~₹5,000 each = ~₹450 crore/year. Affordable and similar to schemes in other states. Good specificity.",
        "source_url": "https://www.indiatvnews.com/tamil-nadu/news-rs-2-500-cash-gold-baby-kits-and-more-tvk-s-vijay-resorts-to-freebies",
    },
    {
        "category": "women",
        "is_flagship": False,
        "promise_text": "Dedicated women's police unit 'Rani Velu Nachiyar' with zero tolerance for crimes against women + 500 safety teams statewide",
        "promise_text_tamil": "'ராணி வேலு நாச்சியார்' பெண்கள் பாதுகாப்பு காவல் படை + 500 பாதுகாப்பு குழுக்கள்",
        "fiscal_score": 6,
        "specificity_score": 10,
        "overall_score": 8,
        "believability_label": "Likely",
        "ai_reasoning": "Existing women's police cells in Tamil Nadu can be expanded. 500 teams is specific. Requires recruitment and training but operationally feasible.",
        "source_url": "https://www.tconews.in/blog/news-2/tvk-chief-vijay-rolls-out-women-centric-welfare-promises-847",
    },
    {
        "category": "women",
        "is_flagship": False,
        "promise_text": "Smart panic buttons in public transport and share autos linked to 24×7 command centres for women's safety",
        "promise_text_tamil": "பொது போக்குவரத்து மற்றும் ஷேர் ஆட்டோவில் 24×7 கட்டளை மையங்களுடன் இணைக்கப்பட்ட ஸ்மார்ட் பேனிக் பட்டன்கள்",
        "fiscal_score": 6,
        "specificity_score": 7,
        "overall_score": 6,
        "believability_label": "Likely",
        "ai_reasoning": "Technology-based safety solution. Several cities have piloted this. Hardware cost per vehicle ~₹2,000-5,000; scalable. Backend infrastructure is the bigger cost.",
        "source_url": "https://www.tconews.in/blog/news-2/tvk-chief-vijay-rolls-out-women-centric-welfare-promises-847",
    },
    {
        "category": "women",
        "is_flagship": False,
        "promise_text": "Fast-track courts exclusively for crimes against women in every district",
        "promise_text_tamil": "ஒவ்வொரு மாவட்டத்திலும் பெண்களுக்கு எதிரான குற்றங்களுக்காக மட்டுமே விரைவு நீதிமன்றங்கள்",
        "fiscal_score": 6,
        "specificity_score": 7,
        "overall_score": 6,
        "believability_label": "Likely",
        "ai_reasoning": "Fast-track courts already exist in TN. Expanding to all 38 districts is feasible with central govt FTSC scheme funding. Requires judiciary cooperation.",
        "source_url": "https://www.tconews.in/blog/news-2/tvk-chief-vijay-rolls-out-women-centric-welfare-promises-847",
    },
    {
        "category": "women",
        "is_flagship": False,
        "promise_text": "Interest-free loans up to ₹5 lakh for women's Self-Help Groups (SHGs)",
        "promise_text_tamil": "மகளிர் சுய உதவிக் குழுக்களுக்கு ₹5 லட்சம் வரை வட்டியில்லா கடன்",
        "fiscal_score": 7,
        "specificity_score": 8,
        "overall_score": 8,
        "believability_label": "Likely",
        "ai_reasoning": "SHG lending is well-established in Tamil Nadu. Interest subvention cost is manageable. TANWA and cooperative banks can implement. Practical and deliverable.",
        "source_url": "https://www.tconews.in/blog/news-2/tvk-chief-vijay-rolls-out-women-centric-welfare-promises-847",
    },
    {
        "category": "women",
        "is_flagship": False,
        "promise_text": "₹15,000/year to mothers/guardians of school children (Classes 1–12) under 'Kamarajar Education Assurance Scheme'",
        "promise_text_tamil": "'காமராஜர் கல்வி உத்தரவாட திட்டம்' — 1 முதல் 12 வரை படிக்கும் குழந்தைகளின் தாய்/பாதுகாவலருக்கு ஆண்டுக்கு ₹15,000",
        "fiscal_score": 3,
        "specificity_score": 10,
        "overall_score": 6,
        "believability_label": "Uncertain",
        "ai_reasoning": "~1.5 crore school children × ₹15,000 = ₹22,500 crore/year. Very expensive on top of the ₹2,500/month scheme. Fiscal burden is significant if both are implemented simultaneously.",
        "source_url": "https://www.tconews.in/blog/news-2/tvk-chief-vijay-rolls-out-women-centric-welfare-promises-847",
    },

    # ══ AGRICULTURE ════════════════════════════════════════════════════════════

    {
        "category": "agriculture",
        "is_flagship": True,
        "promise_text": "Full waiver of crop loans from agricultural cooperative banks for farmers owning less than 5 acres",
        "promise_text_tamil": "5 ஏக்கருக்கும் குறைவான நிலம் உடைய விவசாயிகளுக்கு கூட்டுறவு வங்கி பயிர்க்கடன் முழுமையாக தள்ளுபடி",
        "fiscal_score": 3,
        "specificity_score": 8,
        "overall_score": 6,
        "believability_label": "Uncertain",
        "ai_reasoning": "TN cooperative bank crop loans outstanding ~₹25,000 crore. Full waiver for small farmers is significant one-time cost. DMK already promised loan waivers in 2021 but took years to implement. TVK has no track record here.",
        "source_url": "https://www.newsbytesapp.com/news/politics/tvk-s-vijay-unveils-poll-manifesto/story",
    },
    {
        "category": "agriculture",
        "is_flagship": False,
        "promise_text": "50% waiver on crop loans from cooperative banks for farmers owning more than 5 acres",
        "promise_text_tamil": "5 ஏக்கருக்கு மேல் நிலம் உடைய விவசாயிகளுக்கு கூட்டுறவு வங்கி பயிர்க்கடனில் 50% தள்ளுபடி",
        "fiscal_score": 4,
        "specificity_score": 8,
        "overall_score": 6,
        "believability_label": "Uncertain",
        "ai_reasoning": "More targeted than full waiver. 50% partial relief reduces fiscal cost but is still significant. Tiered approach shows some fiscal awareness.",
        "source_url": "https://www.newsbytesapp.com/news/politics/tvk-s-vijay-unveils-poll-manifesto/story",
    },
    {
        "category": "agriculture",
        "is_flagship": False,
        "promise_text": "Free higher education for children of small and marginal farmers owning less than 2 acres (families with no government employment)",
        "promise_text_tamil": "2 ஏக்கருக்கும் குறைவான நிலம் உடைய சிறு, குறு விவசாயிகளின் பிள்ளைகளுக்கு இலவச உயர்கல்வி (அரசு வேலை இல்லாத குடும்பங்கள்)",
        "fiscal_score": 6,
        "specificity_score": 8,
        "overall_score": 7,
        "believability_label": "Likely",
        "ai_reasoning": "Targeted eligibility (< 2 acres, no govt employment) makes this fiscally manageable. TN already has free education in govt colleges. This extends private college coverage. Deliverable.",
        "source_url": "https://www.newsbytesapp.com/news/politics/tvk-s-vijay-unveils-poll-manifesto/story",
    },
    {
        "category": "agriculture",
        "is_flagship": False,
        "promise_text": "One dedicated weigher appointed per village to prevent manipulation at paddy procurement centres",
        "promise_text_tamil": "நெல் கொள்முதல் மையங்களில் முறைகேட்டை தடுக்க ஒவ்வொரு கிராமத்திலும் ஒரு தராசு ஆய்வாளர் நியமிப்பு",
        "fiscal_score": 8,
        "specificity_score": 9,
        "overall_score": 8,
        "believability_label": "Likely",
        "ai_reasoning": "Very specific, low-cost promise. ~12,500 revenue villages in TN. A weigher salary ~₹25,000/month = ~₹375 crore/year. Addresses a real grassroots problem. Most feasible agricultural promise.",
        "source_url": "https://www.newsbytesapp.com/news/politics/tvk-s-vijay-unveils-poll-manifesto/story",
    },
    {
        "category": "agriculture",
        "is_flagship": False,
        "promise_text": "Strict enforcement against illegal commissions charged during loading/unloading at paddy procurement centres",
        "promise_text_tamil": "நெல் கொள்முதல் மையங்களில் ஏற்றி இறக்கும்போது வசூலிக்கப்படும் சட்டவிரோத கமிஷனுக்கு எதிராக கடுமையான நடவடிக்கை",
        "fiscal_score": 9,
        "specificity_score": 6,
        "overall_score": 8,
        "believability_label": "Likely",
        "ai_reasoning": "Governance/enforcement promise — near-zero fiscal cost. But 'strict action' is vague and depends on political will. Implementation requires consistent monitoring.",
        "source_url": "https://www.newsbytesapp.com/news/politics/tvk-s-vijay-unveils-poll-manifesto/story",
    },
    {
        "category": "agriculture",
        "is_flagship": False,
        "promise_text": "One ration shop for every 500 family cards to improve last-mile PDS delivery",
        "promise_text_tamil": "கடைக்கோடி பொது விநியோக அமைப்பை மேம்படுத்த 500 குடும்ப அட்டைகளுக்கு ஒரு ரேஷன் கடை",
        "fiscal_score": 5,
        "specificity_score": 8,
        "overall_score": 6,
        "believability_label": "Uncertain",
        "ai_reasoning": "TN has ~2 crore ration cards. At 500/shop ratio, this means ~40,000 shops — significant expansion from current ~34,000. Infrastructure and staffing cost is substantial.",
        "source_url": "https://www.newsbytesapp.com/news/politics/tvk-s-vijay-unveils-poll-manifesto/story",
    },

    # ══ YOUTH / EMPLOYMENT ══════════════════════════════════════════════════════

    {
        "category": "employment",
        "is_flagship": True,
        "promise_text": "₹4,000/month unemployment allowance for graduates above 29 years without employment; ₹2,000/month for diploma holders",
        "promise_text_tamil": "வேலையில்லாத 29 வயதுக்கு மேற்பட்ட பட்டதாரிகளுக்கு மாதம் ₹4,000; டிப்ளோமா தாரர்களுக்கு ₹2,000 வேலையிலா உதவித்தொகை",
        "fiscal_score": 3,
        "specificity_score": 10,
        "overall_score": 6,
        "believability_label": "Uncertain",
        "ai_reasoning": "~25 lakh eligible unemployed graduates × ₹4,000 = ₹12,000 crore/year. Very expensive. DMK tried a similar scheme with limited coverage. Defining 'unemployed' requires robust verification mechanism TVK has not outlined.",
        "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    },
    {
        "category": "employment",
        "is_flagship": True,
        "promise_text": "5 lakh internship opportunities/year — ₹10,000/month stipend for graduates, ₹8,000 for IT diploma holders, through govt and private sector",
        "promise_text_tamil": "ஆண்டுக்கு 5 லட்சம் இன்டர்ன்ஷிப் வாய்ப்புகள் — பட்டதாரிகளுக்கு மாதம் ₹10,000; IT டிப்ளோமா தாரர்களுக்கு ₹8,000",
        "fiscal_score": 4,
        "specificity_score": 9,
        "overall_score": 6,
        "believability_label": "Uncertain",
        "ai_reasoning": "5 lakh internships × ₹10,000 = ₹6,000 crore/year. Private sector participation is not guaranteed. National internship scheme by centre provides a framework but TVK's scale is ambitious.",
        "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    },
    {
        "category": "employment",
        "is_flagship": False,
        "promise_text": "'CM's People's Service Friend Scheme' — 5 lakh jobs for youth through village panchayats across Tamil Nadu",
        "promise_text_tamil": "'முதல்வரின் மக்கள் சேவை நண்பன் திட்டம்' — கிராம பஞ்சாயத்துகள் வழியாக 5 லட்சம் இளையோருக்கு வேலை",
        "fiscal_score": 4,
        "specificity_score": 9,
        "overall_score": 6,
        "believability_label": "Uncertain",
        "ai_reasoning": "Panchayat-level employment schemes exist but 5 lakh new positions is a massive expansion of local body capacity. Job quality, pay scale, and sustainability not specified.",
        "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    },
    {
        "category": "employment",
        "is_flagship": False,
        "promise_text": "75% reservation for Tamil Nadu natives in private companies — companies complying get 2.5% GST subsidy + 5% electricity tariff concession",
        "promise_text_tamil": "தனியார் நிறுவனங்களில் 75% தமிழர் வேலைவாய்ப்பு — இணங்கும் நிறுவனங்களுக்கு 2.5% GST சலுகை + 5% மின்சார கட்டண தள்ளுபடி",
        "fiscal_score": 7,
        "specificity_score": 9,
        "overall_score": 8,
        "believability_label": "Likely",
        "ai_reasoning": "Andhra Pradesh has a similar 75% local employment law. Very specific incentive structure. Moderate fiscal cost (revenue loss from subsidies). Legally complex but precedent exists.",
        "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    },
    {
        "category": "education",
        "is_flagship": False,
        "promise_text": "Interest-free loans up to ₹20 lakh for students from Class XII through PhD — no collateral, no guarantor required",
        "promise_text_tamil": "12ஆம் வகுப்பு முதல் PhD வரை மாணவர்களுக்கு ₹20 லட்சம் வரை வட்டியில்லா கல்விக்கடன் — ஜாமீன் தேவையில்லை",
        "fiscal_score": 5,
        "specificity_score": 9,
        "overall_score": 7,
        "believability_label": "Likely",
        "ai_reasoning": "Interest subvention model is well-tested. No-collateral requirement is the distinguishing feature. Cost depends on uptake. Deliverable through existing bank networks with govt guarantee.",
        "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    },
    {
        "category": "education",
        "is_flagship": False,
        "promise_text": "Interest-free loans up to ₹25 lakh for young entrepreneurs — no guarantors, no collateral ('Creative Entrepreneurs Scheme')",
        "promise_text_tamil": "'படைப்பாற்றல் தொழில்முனைவோர் திட்டம்' — இளம் தொழில்முனைவோருக்கு ₹25 லட சம் வரை வட்டியில்லா கடன் — ஜாமீன் இல்லை",
        "fiscal_score": 5,
        "specificity_score": 9,
        "overall_score": 7,
        "believability_label": "Likely",
        "ai_reasoning": "Startup lending with govt guarantee is a proven model. SIDBI and TIDCO can implement. The ₹25 lakh cap and no-collateral terms require robust credit guarantee fund.",
        "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    },
    {
        "category": "education",
        "is_flagship": False,
        "promise_text": "500 creative schools across Tamil Nadu to develop youth talent — arts, technology, sports, entrepreneurship",
        "promise_text_tamil": "தமிழ்நாடு முழுவதும் 500 படைப்பாற்றல் பள்ளிகள் — கலை, தொழில்நுட்பம், விளையாட்டு, தொழில்முனைவு",
        "fiscal_score": 5,
        "specificity_score": 7,
        "overall_score": 6,
        "believability_label": "Uncertain",
        "ai_reasoning": "Infrastructure-heavy promise. Building/upgrading 500 schools requires multi-year investment. Curriculum design and teacher training are key bottlenecks not addressed.",
        "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    },
    {
        "category": "social_welfare",
        "is_flagship": False,
        "promise_text": "Anti-drug protection zones in every school and college with stricter enforcement laws — target: completely drug-free Tamil Nadu",
        "promise_text_tamil": "ஒவ்வொரு பள்ளி, கல்லூரியிலும் போதைப்பொருள் எதிர்ப்பு பாதுகாப்பு மண்டலங்கள் — கடுமையான சட்டங்கள் — முற்றிலும் போதை இல்லா தமிழ்நாடு",
        "fiscal_score": 7,
        "specificity_score": 7,
        "overall_score": 7,
        "believability_label": "Likely",
        "ai_reasoning": "Low-cost enforcement and awareness programme. TN already has anti-drug campaigns. Stricter laws need legislative process. Framing as 'protection zones' is specific and actionable.",
        "source_url": "https://newstodaynet.com/2026/03/29/vijay-unveils-tvk-manifesto-promises-drug-free-tamil-nadu-and-youth-empowerment/",
    },
    {
        "category": "governance",
        "is_flagship": False,
        "promise_text": "White papers for all major government deals and contracts — full transparency and accountability in governance",
        "promise_text_tamil": "அனைத்து முக்கிய அரசு ஒப்பந்தங்களுக்கும் வெள்ளை அறிக்கை — ஆட்சியில் முழு வெளிப்படைத்தன்மை",
        "fiscal_score": 9,
        "specificity_score": 6,
        "overall_score": 8,
        "believability_label": "Likely",
        "ai_reasoning": "Zero direct cost. Political will is the only requirement. Many govts promise transparency but delivery is mixed. RTI already mandates some disclosure. This goes further.",
        "source_url": "https://www.newsbytesapp.com/news/politics/tvk-s-vijay-unveils-poll-manifesto/story",
    },
    {
        "category": "employment",
        "is_flagship": False,
        "promise_text": "Tamil Nadu Youth Advisory Council — dedicated body to give youth direct input into state policy decisions",
        "promise_text_tamil": "தமிழ்நாடு இளையோர் ஆலோசனை மன்றம் — அரசின் கொள்கை முடிவுகளில் இளையோருக்கு நேரடி பங்கு",
        "fiscal_score": 9,
        "specificity_score": 6,
        "overall_score": 8,
        "believability_label": "Likely",
        "ai_reasoning": "Near-zero cost. Easy to establish as an advisory committee. Risk is it becomes ceremonial. Several states have similar youth bodies with varying effectiveness.",
        "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    },
]


def sb_post(path, body):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  ❌ HTTP {e.code}: {e.read().decode()[:200]}")
        return None


def seed():
    print(f"🌱 Seeding {len(TVK_PROMISES)} TVK 2026 manifesto promises...\n")
    inserted = 0
    for p in TVK_PROMISES:
        row = {
            "party": "TVK",
            "election_year": 2026,
            "promise_text": p["promise_text"],
            "promise_text_tamil": p.get("promise_text_tamil"),
            "category": p["category"],
            "is_flagship": p.get("is_flagship", False),
            "fiscal_score": p["fiscal_score"],
            "specificity_score": p["specificity_score"],
            "overall_score": p["overall_score"],
            "believability_label": p["believability_label"],
            "ai_reasoning": p["ai_reasoning"],
            "source_url": p.get("source_url"),
            "status": "pending",
        }
        result = sb_post("manifesto_promises", row)
        if result:
            print(f"  ✅ [{p['category']}] {p['promise_text'][:70]}...")
            inserted += 1

    print(f"\n✅ Inserted {inserted}/{len(TVK_PROMISES)} TVK promises.")


if __name__ == "__main__":
    seed()
