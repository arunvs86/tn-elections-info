"""
seed_tvk_manifesto_full.py
Full TVK 2026 manifesto seed — replaces all existing TVK 2026 promises.
Source: Official TVK manifesto released March 29, 2026.
Covers ALL sectors from the complete manifesto.

Usage:
  python3 scripts/seed_tvk_manifesto_full.py
"""

import json, os, sys
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")
HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

SOURCE = "https://voterlist.co.in/tvk-manifesto-2026/"
SOURCE2 = "https://www.thenewsminute.com/tamil-nadu/rs-2500-for-homemakers-free-lpg-cylinders-what-tvk-manifesto-2026-promises"

PROMISES = [

    # ══ WOMEN ═══════════════════════════════════════════════════════════════════
    {"category":"women","is_flagship":True,
     "promise_text":"₹2,500/month cash transfer to all women (excluding government employees) until age 60 — 'Vettri Pengal Urimai Thogai'",
     "promise_text_tamil":"அரசு ஊழியர்கள் அல்லாத அனைத்து பெண்களுக்கும் 60 வயது வரை மாதம் ₹2,500 — வெற்றி பெண்கள் உரிமைத் தொகை",
     "fiscal_score":3,"specificity_score":10,"overall_score":5.5,"believability_label":"Uncertain",
     "ai_reasoning":"~₹37,500 Cr/year for ~2.5 Cr women — roughly 15% of TN's entire budget. Highest welfare promise of any party. Delivery track record: zero (new party).",
     "source_url":SOURCE2},

    {"category":"women","is_flagship":True,
     "promise_text":"6 free LPG cylinders per household per year — 'Annapurani Super Six Scheme'",
     "promise_text_tamil":"ஒவ்வொரு குடும்பத்திற்கும் ஆண்டுக்கு 6 இலவச சமையல் கேஸ் சிலிண்டர் — அன்னபூரணி சூப்பர் சிக்ஸ்",
     "fiscal_score":4,"specificity_score":9,"overall_score":6,"believability_label":"Uncertain",
     "ai_reasoning":"All parties promise LPG subsidies. Cost ~₹6,000–8,000 Cr/year. Feasible if Centre cooperates.",
     "source_url":SOURCE2},

    {"category":"women","is_flagship":True,
     "promise_text":"8 grams of gold + silk saree as wedding gift to brides from poor families — 'Manjal Maangalyam Scheme'",
     "promise_text_tamil":"ஏழை குடும்பப் பெண்களுக்கு திருமண சமயம் 8 கிராம் தங்கம் + பட்டுப் புடவை — மஞ்சள் மாங்கல்யம் திட்டம்",
     "fiscal_score":5,"specificity_score":9,"overall_score":6,"believability_label":"Uncertain",
     "ai_reasoning":"TN already has Moovalur Ramamirtham scheme (8g gold). TVK adds silk saree. Incremental cost is manageable.",
     "source_url":SOURCE2},

    {"category":"women","is_flagship":False,
     "promise_text":"Newborn welcome kit — gold ring + baby products (powder, oil, diapers) for every newborn",
     "promise_text_tamil":"ஒவ்வொரு குழந்தைக்கும் பிறப்பு வரவேற்பு பொதி — தங்க மோதிரம் + குழந்தை பொருட்கள்",
     "fiscal_score":5,"specificity_score":7,"overall_score":5.5,"believability_label":"Uncertain",
     "ai_reasoning":"Novel promise. Cost depends on gold weight — likely small ring (1–2g). Symbolic but fiscally manageable.",
     "source_url":SOURCE},

    {"category":"women","is_flagship":False,
     "promise_text":"₹15,000/year to mothers/guardians of school children (Classes 1–12) — 'Kamalam Scheme'",
     "promise_text_tamil":"1–12 வகுப்பு பிள்ளைகளின் தாய்/பாதுகாவலருக்கு ஆண்டுக்கு ₹15,000 — கமலம் திட்டம்",
     "fiscal_score":3,"specificity_score":9,"overall_score":5,"believability_label":"Uncertain",
     "ai_reasoning":"With ~1.2 Cr school students, cost ~₹18,000 Cr/year. Significant fiscal burden layered on top of ₹2,500/month scheme.",
     "source_url":SOURCE},

    {"category":"women","is_flagship":False,
     "promise_text":"Free sanitary pads through ration shops, schools, and colleges",
     "promise_text_tamil":"ரேஷன் கடைகள், பள்ளிகள், கல்லூரிகள் வழியாக இலவச மாதவிடாய் நேப்கின்",
     "fiscal_score":7,"specificity_score":7,"overall_score":6,"believability_label":"Likely",
     "ai_reasoning":"TN already has Vaanavil scheme in some schools. Expansion is feasible and low-cost.",
     "source_url":SOURCE},

    {"category":"women","is_flagship":False,
     "promise_text":"Free bus travel for all women in government buses — 'Vetri Pengal Pyana Thittam'",
     "promise_text_tamil":"அரசு பேருந்துகளில் அனைத்து பெண்களுக்கும் இலவச பயணம்",
     "fiscal_score":5,"specificity_score":8,"overall_score":5.5,"believability_label":"Likely",
     "ai_reasoning":"DMK already implemented this. TVK promises continuation. Cost well-understood (~₹1,500 Cr/year).",
     "source_url":SOURCE},

    {"category":"women","is_flagship":False,
     "promise_text":"Interest-free loans up to ₹5 lakh for women's Self-Help Groups (SHGs)",
     "promise_text_tamil":"பெண்கள் சுய உதவிக் குழுக்களுக்கு ₹5 லட்சம் வரை வட்டியில்லா கடன்",
     "fiscal_score":6,"specificity_score":8,"overall_score":6,"believability_label":"Likely",
     "ai_reasoning":"SHG lending is proven model. TN already has strong SHG network. Feasible through cooperative banks.",
     "source_url":SOURCE},

    # ══ WOMEN SAFETY ═════════════════════════════════════════════════════════════
    {"category":"women_safety","is_flagship":True,
     "promise_text":"Dedicated all-women police unit 'Rani Velu Nachiyar Padai' — 500 plain-clothes teams across state with body cameras, zero tolerance for crimes against women",
     "promise_text_tamil":"'ராணி வேலு நாச்சியார் படை' — 500 சாதாரண ஆடை குழுக்கள், உடல் கேமராக்கள், பெண்களுக்கு எதிரான குற்றங்களில் சுழீரோ சகிப்புத்தன்மை",
     "fiscal_score":7,"specificity_score":9,"overall_score":7,"believability_label":"Likely",
     "ai_reasoning":"Specific, actionable, costed. TN police already has women wings — expansion is realistic.",
     "source_url":SOURCE},

    {"category":"women_safety","is_flagship":True,
     "promise_text":"'Anjalai Ammal Fast Track Courts' — exclusive fast-track courts for crimes against women in every district",
     "promise_text_tamil":"'அஞ்சலை அம்மாள் விரைவு நீதிமன்றங்கள்' — ஒவ்வொரு மாவட்டத்திலும் பெண்களுக்கு எதிரான குற்றங்களுக்கு விரைவு நீதிமன்றம்",
     "fiscal_score":7,"specificity_score":8,"overall_score":7,"believability_label":"Likely",
     "ai_reasoning":"Fast-track courts already exist in some districts. Extension state-wide is feasible. Requires judiciary coordination.",
     "source_url":SOURCE},

    {"category":"women_safety","is_flagship":False,
     "promise_text":"Smart panic buttons in all public transport and share autos linked to 24×7 command centre — 5-minute police response target",
     "promise_text_tamil":"அனைத்து பொதுப்போக்குவரத்தும் ஷேர் ஆட்டோக்களிலும் ஸ்மார்ட் பேனிக் பட்டன் — 5 நிமிட போலீஸ் வருகை இலக்கு",
     "fiscal_score":6,"specificity_score":8,"overall_score":6.5,"believability_label":"Uncertain",
     "ai_reasoning":"Technology integration with lakhs of vehicles is complex. 5-minute response in rural TN is unrealistic.",
     "source_url":SOURCE},

    # ══ HEALTHCARE ═══════════════════════════════════════════════════════════════
    {"category":"healthcare","is_flagship":True,
     "promise_text":"Universal family health insurance up to ₹25 lakh per family — extending beyond current Chief Minister's Comprehensive Health Insurance",
     "promise_text_tamil":"ஒவ்வொரு குடும்பத்திற்கும் ₹25 லட்சம் வரை மருத்துவ காப்பீடு",
     "fiscal_score":4,"specificity_score":8,"overall_score":5.5,"believability_label":"Uncertain",
     "ai_reasoning":"TN's current CMCHIS covers ₹5 lakh. Expanding to ₹25 lakh for all families would cost ₹15,000–20,000 Cr/year in premiums. Highly ambitious.",
     "source_url":"https://newstodaynet.com/2026/04/16/tvk-releases-2026-election-manifesto-%E2%82%B92500-monthly-aid-ai-governance-and-welfare-push/"},

    {"category":"healthcare","is_flagship":False,
     "promise_text":"Annual free full-body health check-up for all citizens",
     "promise_text_tamil":"அனைத்து குடிமக்களுக்கும் ஆண்டுதோறும் இலவச முழு உடல் பரிசோதனை",
     "fiscal_score":5,"specificity_score":6,"overall_score":5,"believability_label":"Uncertain",
     "ai_reasoning":"Vague on delivery mechanism. Existing primary health centres lack capacity for universal annual check-ups.",
     "source_url":SOURCE},

    {"category":"healthcare","is_flagship":False,
     "promise_text":"Free medicines through expanded government pharmacy network; dedicated cancer insurance coverage",
     "promise_text_tamil":"விரிவாக்கப்பட்ட அரசு மருந்தகங்கள் வழியாக இலவச மருந்துகள்; கான்சர் காப்பீடு",
     "fiscal_score":5,"specificity_score":5,"overall_score":5,"believability_label":"Uncertain",
     "ai_reasoning":"TN already has free medicine scheme. Cancer coverage is a meaningful addition but lacks specific details.",
     "source_url":SOURCE},

    # ══ EMPLOYMENT ════════════════════════════════════════════════════════════════
    {"category":"employment","is_flagship":True,
     "promise_text":"5 lakh internship opportunities per year — ₹10,000/month for graduates, ₹8,000 for diploma holders, ₹6,000 for Class 12 pass",
     "promise_text_tamil":"ஆண்டுக்கு 5 லட்சம் இன்டர்ன்ஷிப் வாய்ப்புகள் — பட்டதாரிகளுக்கு ₹10,000, டிப்ளோமாவிற்கு ₹8,000, 12ஆம் வகுப்புக்கு ₹6,000",
     "fiscal_score":4,"specificity_score":10,"overall_score":6,"believability_label":"Uncertain",
     "ai_reasoning":"5 lakh internships at avg ₹8,000/month = ₹4,800 Cr/year. Where do companies come from? Govt-funded internships risk becoming temporary jobs.",
     "source_url":SOURCE},

    {"category":"employment","is_flagship":True,
     "promise_text":"75% reservation for Tamil Nadu natives in private companies — violating companies lose SGST subsidy (2.5%) and electricity subsidy (5%)",
     "promise_text_tamil":"தனியார் நிறுவனங்களில் தமிழ்நாட்டினருக்கு 75% இட ஒதுக்கீடு",
     "fiscal_score":5,"specificity_score":9,"overall_score":6,"believability_label":"Uncertain",
     "ai_reasoning":"Politically popular but legally complex — private employment reservations have been challenged in courts. Enforcement mechanism unclear.",
     "source_url":SOURCE},

    {"category":"employment","is_flagship":False,
     "promise_text":"₹4,000/month unemployment allowance for graduates above 29 years without employment",
     "promise_text_tamil":"29 வயதுக்கு மேற்பட்ட வேலையற்ற பட்டதாரிகளுக்கு மாதம் ₹4,000 வேலையின்மை கொடுப்பனவு",
     "fiscal_score":4,"specificity_score":8,"overall_score":5,"believability_label":"Uncertain",
     "ai_reasoning":"Defining and verifying eligibility for lakhs of unemployed graduates is administratively challenging. Risk of indefinite dependency.",
     "source_url":SOURCE},

    {"category":"employment","is_flagship":False,
     "promise_text":"5 lakh government jobs for youth as 'Mudhavar Makkal Seva Nanban' in local bodies at ₹18,000/month",
     "promise_text_tamil":"உள்ளாட்சி அமைப்புகளில் ₹18,000 மாத சம்பளத்தில் 5 லட்சம் 'முதவர் மக்கள் சேவை நண்பர்' வேலைகள்",
     "fiscal_score":3,"specificity_score":9,"overall_score":5,"believability_label":"Unlikely",
     "ai_reasoning":"5 lakh govt jobs at ₹18,000/month = ₹10,800 Cr/year in salaries alone. Creating 5 lakh new permanent positions is fiscally and administratively very unlikely.",
     "source_url":SOURCE},

    {"category":"employment","is_flagship":False,
     "promise_text":"Tamil Nadu Youth Advisory Council — dedicated body to give youth direct input into government policy (first state-level initiative)",
     "promise_text_tamil":"தமிழ்நாடு இளைஞர் ஆலோசனை மன்றம் — இளைஞர்களுக்கு நேரடி கொள்கை பங்கேற்பு",
     "fiscal_score":9,"specificity_score":7,"overall_score":7,"believability_label":"Likely",
     "ai_reasoning":"Low cost, high symbolic value. Easy to implement. Similar councils exist elsewhere.",
     "source_url":SOURCE},

    # ══ AGRICULTURE ═══════════════════════════════════════════════════════════════
    {"category":"agriculture","is_flagship":True,
     "promise_text":"Full crop loan waiver from cooperative banks for farmers owning up to 5 acres",
     "promise_text_tamil":"5 ஏக்கர் வரை நிலமுள்ள விவசாயிகளுக்கு கூட்டுறவு வங்கி பயிர்க்கடன் முழு தள்ளுபடி",
     "fiscal_score":4,"specificity_score":9,"overall_score":5.5,"believability_label":"Uncertain",
     "ai_reasoning":"Total TN cooperative crop loans ~₹18,000 Cr. Full waiver for small farmers is ~₹12,000 Cr. Significant but precedented.",
     "source_url":SOURCE},

    {"category":"agriculture","is_flagship":False,
     "promise_text":"50% crop loan waiver for farmers owning more than 5 acres from cooperative banks",
     "promise_text_tamil":"5 ஏக்கருக்கும் அதிகமான நிலமுள்ள விவசாயிகளுக்கு 50% பயிர்க்கடன் தள்ளுபடி",
     "fiscal_score":5,"specificity_score":9,"overall_score":6,"believability_label":"Uncertain",
     "ai_reasoning":"Balanced approach differentiating by farm size is more fiscally responsible than blanket waiver.",
     "source_url":SOURCE},

    {"category":"agriculture","is_flagship":True,
     "promise_text":"MSP of ₹3,500 per quintal for paddy; ₹4,500 per tonne for sugarcane; 100% crop insurance",
     "promise_text_tamil":"நெல்லுக்கு குவிண்டாலுக்கு ₹3,500 MSP; கரும்புக்கு டன்னுக்கு ₹4,500; 100% பயிர் காப்பீடு",
     "fiscal_score":4,"specificity_score":9,"overall_score":5.5,"believability_label":"Uncertain",
     "ai_reasoning":"MSP is central subject — state can only supplement. 100% crop insurance requires massive premium funding. Ambitious.",
     "source_url":SOURCE},

    {"category":"agriculture","is_flagship":False,
     "promise_text":"5 lakh free solar pumps for farmers; ₹10,000 annual support for farm labourers",
     "promise_text_tamil":"விவசாயிகளுக்கு 5 லட்சம் இலவச சோலார் பம்புகள்; வேளாண் தொழிலாளர்களுக்கு ₹10,000 ஆண்டு உதவி",
     "fiscal_score":4,"specificity_score":8,"overall_score":5.5,"believability_label":"Uncertain",
     "ai_reasoning":"5 lakh solar pumps at ~₹1.5 lakh each = ₹75,000 Cr capital cost. Phased delivery over 5 years is more realistic.",
     "source_url":SOURCE},

    {"category":"agriculture","is_flagship":False,
     "promise_text":"Free higher education for children of small and marginal farmers owning up to 5 acres",
     "promise_text_tamil":"5 ஏக்கர் வரை நிலமுள்ள சிறு விவசாயிகளின் பிள்ளைகளுக்கு இலவச உயர் கல்வி",
     "fiscal_score":6,"specificity_score":8,"overall_score":6,"believability_label":"Likely",
     "ai_reasoning":"TN already has many fee waivers. Extending to all farmers' children is a meaningful expansion, relatively low additional cost.",
     "source_url":SOURCE},

    {"category":"agriculture","is_flagship":False,
     "promise_text":"One dedicated weigher per village; strict enforcement against illegal commissions at paddy procurement centres",
     "promise_text_tamil":"ஒவ்வொரு கிராமத்திலும் ஒரு தராசு — நெல் கொள்முதல் மையங்களில் சட்டவிரோத கமிஷன் கட்டுப்பாடு",
     "fiscal_score":8,"specificity_score":8,"overall_score":7,"believability_label":"Likely",
     "ai_reasoning":"Low cost, high farmer benefit. Addresses real ground-level corruption. Implementable.",
     "source_url":SOURCE},

    # ══ FISHERIES ════════════════════════════════════════════════════════════════
    {"category":"fisheries","is_flagship":True,
     "promise_text":"Country's first statutory MSP for fish — covering sardine, mackerel, prawn, and squid — 'Meen Vilaiyum Neethi'",
     "promise_text_tamil":"மீனுக்கு நாட்டின் முதல் சட்டப்பூர்வ MSP — மத்தி, கானாங்கெளுத்தி, இறால், கணவாய் — மீன் விலையும் நீதி",
     "fiscal_score":6,"specificity_score":8,"overall_score":6.5,"believability_label":"Uncertain",
     "ai_reasoning":"Novel promise. Statutory MSP for fish requires central legislation or state ordinance. Legally complex but fishermen-friendly.",
     "source_url":"https://telanganatoday.com/2026-tn-assembly-elections-vijays-tvk-poll-manifesto-outlines-inclusive-reforms"},

    {"category":"fisheries","is_flagship":False,
     "promise_text":"₹27,000 lean-season relief for fishermen; subsidised diesel; ₹25 lakh accident insurance; permanent housing",
     "promise_text_tamil":"மீனவர்களுக்கு ₹27,000 கடல் தடை நிவாரணம்; மானிய டீசல்; ₹25 லட்சம் விபத்து காப்பீடு; நிரந்தர வீடு",
     "fiscal_score":5,"specificity_score":8,"overall_score":6,"believability_label":"Uncertain",
     "ai_reasoning":"Specific amounts show detailed manifesto work. Diesel subsidy and accident insurance are feasible. Housing is the costly component.",
     "source_url":"https://telanganatoday.com/2026-tn-assembly-elections-vijays-tvk-poll-manifesto-outlines-inclusive-reforms"},

    # ══ EDUCATION ════════════════════════════════════════════════════════════════
    {"category":"education","is_flagship":True,
     "promise_text":"Interest-free collateral-free loans up to ₹20 lakh for students from Class XII through PhD — no guarantor required — 'Thozhilir Kalvi Scheme'",
     "promise_text_tamil":"12ஆம் வகுப்பு முதல் PhD வரை ₹20 லட்சம் வரை வட்டியில்லா கல்விக்கடன் — ஜாமீன் தேவையில்லை",
     "fiscal_score":5,"specificity_score":9,"overall_score":6,"believability_label":"Uncertain",
     "ai_reasoning":"Education loans without collateral = high default risk. Requires credit guarantee fund. Innovative but fiscally risky at scale.",
     "source_url":SOURCE},

    {"category":"education","is_flagship":False,
     "promise_text":"Interest-free loans up to ₹25 lakh for young entrepreneurs — no guarantors required",
     "promise_text_tamil":"இளம் தொழில்முனைவோருக்கு ₹25 லட்சம் வரை வட்டியில்லா கடன் — ஜாமீன் இல்லாமல்",
     "fiscal_score":4,"specificity_score":9,"overall_score":5.5,"believability_label":"Uncertain",
     "ai_reasoning":"Collateral-free startup loans at scale require strong NPA management. Without guarantors, default rates could be very high.",
     "source_url":SOURCE},

    {"category":"education","is_flagship":False,
     "promise_text":"500 'Padaipali Thozhilmunaivor' creative schools — arts, technology, and startup incubation — with funding for 1.5 lakh creative entrepreneurs",
     "promise_text_tamil":"500 'படைப்பாளி தொழிற்முனைவோர்' படைப்பு பள்ளிகள் — கலை, தொழில்நுட்பம், தொடக்க நிறுவன ஊக்குவிப்பு",
     "fiscal_score":5,"specificity_score":8,"overall_score":6,"believability_label":"Uncertain",
     "ai_reasoning":"Bold vision for youth entrepreneurship. 500 schools at quality level requires significant infrastructure investment.",
     "source_url":SOURCE},

    {"category":"education","is_flagship":False,
     "promise_text":"AI-driven preparation platform for competitive exams; AI University; AI Ministry for governance",
     "promise_text_tamil":"போட்டித் தேர்வுகளுக்கு AI தயாரிப்பு தளம்; AI பல்கலைக்கழகம்; AI அமைச்சகம்",
     "fiscal_score":6,"specificity_score":7,"overall_score":6,"believability_label":"Uncertain",
     "ai_reasoning":"Trendy but realistic — AI integration in governance is global trend. AI University is an exciting proposal. Details sparse.",
     "source_url":"https://newstodaynet.com/2026/04/16/tvk-releases-2026-election-manifesto-%E2%82%B92500-monthly-aid-ai-governance-and-welfare-push/"},

    # ══ SOCIAL WELFARE / SENIOR CITIZENS ══════════════════════════════════════
    {"category":"social_welfare","is_flagship":True,
     "promise_text":"₹3,000/month for senior citizens, widows, and persons with disabilities — covering 15 lakh beneficiaries",
     "promise_text_tamil":"முதியோர், விதவைகள், மாற்றுத்திறனாளிகளுக்கு மாதம் ₹3,000 — 15 லட்சம் பயனாளிகள்",
     "fiscal_score":5,"specificity_score":9,"overall_score":6,"believability_label":"Uncertain",
     "ai_reasoning":"TN currently pays ₹1,000–1,500 in social security pensions. Tripling is significant. ~₹5,400 Cr/year for 15 lakh people.",
     "source_url":SOURCE},

    {"category":"social_welfare","is_flagship":False,
     "promise_text":"Dedicated government department for senior citizens; doorstep delivery of all welfare scheme benefits",
     "promise_text_tamil":"முதியோருக்கு தனி அரசு துறை; அனைத்து நலத்திட்ட பலன்களும் வீட்டு வாசலில் வழங்கல்",
     "fiscal_score":7,"specificity_score":7,"overall_score":6.5,"believability_label":"Likely",
     "ai_reasoning":"Administrative reform — low cost. Doorstep delivery of benefits is practical with digital infrastructure.",
     "source_url":SOURCE},

    {"category":"social_welfare","is_flagship":False,
     "promise_text":"Anti-drug protection zones in every school and college; strict enforcement with dedicated youth anti-narcotics police",
     "promise_text_tamil":"ஒவ்வொரு பள்ளி, கல்லூரி வளாகத்திலும் போதைப்பொருள் தடை மண்டலம்; சிறப்பு காவல் படை",
     "fiscal_score":7,"specificity_score":8,"overall_score":7,"believability_label":"Likely",
     "ai_reasoning":"Widely popular promise. Low cost. Builds on existing narcotic cell infrastructure.",
     "source_url":SOURCE},

    {"category":"social_welfare","is_flagship":False,
     "promise_text":"Free house pattas (property documents) for those living on government land without any property",
     "promise_text_tamil":"அரசு நிலத்தில் வசிக்கும் நிலமற்ற குடும்பங்களுக்கு இலவச வீட்டு பட்டா",
     "fiscal_score":7,"specificity_score":6,"overall_score":6,"believability_label":"Likely",
     "ai_reasoning":"TN has large inventory of encroached government land. Regularisation through pattas is administratively complex but politically popular.",
     "source_url":SOURCE},

    # ══ GOVERNANCE / ECONOMY ══════════════════════════════════════════════════
    {"category":"governance","is_flagship":True,
     "promise_text":"Target: $1.5 trillion state economy by 2036; ₹15,000 crore MSME safety net fund",
     "promise_text_tamil":"2036-ல் $1.5 ட்ரில்லியன் மாநில பொருளாதாரம்; ₹15,000 கோடி MSME பாதுகாப்பு நிதி",
     "fiscal_score":7,"specificity_score":7,"overall_score":6.5,"believability_label":"Uncertain",
     "ai_reasoning":"Ambitious but TN is already growing at 8%+ GDP. $1.5T target is aspirational. MSME fund is concrete and useful.",
     "source_url":"https://www.newkerala.com/news/a/vijay-unveils-tvk-manifesto-welfare-push-ai-governance-257.htm"},

    {"category":"governance","is_flagship":False,
     "promise_text":"White papers for all major government deals — full transparency and public disclosure",
     "promise_text_tamil":"அனைத்து முக்கிய அரசு ஒப்பந்தங்களுக்கும் வெள்ளை அறிக்கை — முழு வெளிப்படைத்தன்மை",
     "fiscal_score":9,"specificity_score":7,"overall_score":7,"believability_label":"Likely",
     "ai_reasoning":"Administrative commitment, low cost. Builds public trust. Easy to implement on day one.",
     "source_url":SOURCE},

    {"category":"governance","is_flagship":False,
     "promise_text":"Tamil Nadu Recruitment Accountability & Transparency Act — all government hiring completed within 365 days",
     "promise_text_tamil":"தமிழ்நாடு வேலைவாய்ப்பு வெளிப்படைத்தன்மை சட்டம் — 365 நாட்களில் அரசு வேலை நியமனம்",
     "fiscal_score":9,"specificity_score":9,"overall_score":8,"believability_label":"Likely",
     "ai_reasoning":"Specific law promise. Addresses real complaint about delayed TNPSC/TANGEDCO hiring. Highly feasible.",
     "source_url":SOURCE},

    # ══ BASIC UTILITIES ═══════════════════════════════════════════════════════
    {"category":"basic_utilities","is_flagship":True,
     "promise_text":"200 units free electricity per household per month",
     "promise_text_tamil":"ஒவ்வொரு குடும்பத்திற்கும் மாதம் 200 யூனிட் இலவச மின்சாரம்",
     "fiscal_score":4,"specificity_score":10,"overall_score":6,"believability_label":"Uncertain",
     "ai_reasoning":"DMK already gives 100 units free. Doubling costs ~₹12,000 Cr/year. TANGEDCO already loss-making. Very expensive promise.",
     "source_url":SOURCE2},

    {"category":"basic_utilities","is_flagship":False,
     "promise_text":"Universal piped drinking water to all households",
     "promise_text_tamil":"அனைத்து குடும்பங்களுக்கும் குழாய் குடிநீர் இணைப்பு",
     "fiscal_score":5,"specificity_score":6,"overall_score":5,"believability_label":"Uncertain",
     "ai_reasoning":"Centre's Jal Jeevan Mission already working on this. State can accelerate. Implementation challenge in rural/hilly areas.",
     "source_url":SOURCE},

    # ══ GOVERNMENT WORKERS ════════════════════════════════════════════════════
    {"category":"govt_workers","is_flagship":False,
     "promise_text":"Anganwadi workers: ₹18,000/month salary; sanitation workers: ₹10,000/month; government employees with 20+ years service: ₹15 lakh retirement benefit",
     "promise_text_tamil":"அங்கன்வாடி ஊழியர்களுக்கு ₹18,000; சுகாதாரத் தொழிலாளர்களுக்கு ₹10,000; 20+ ஆண்டு ஊழியர்களுக்கு ₹15 லட்சம் ஓய்வூதிய சலுகை",
     "fiscal_score":4,"specificity_score":9,"overall_score":5.5,"believability_label":"Uncertain",
     "ai_reasoning":"Anganwadi workers' salaries are partly Centre-funded. Doubling to ₹18,000 requires significant state top-up. All three together are a large fiscal commitment.",
     "source_url":"https://newstodaynet.com/2026/04/16/tvk-releases-2026-election-manifesto-%E2%82%B92500-monthly-aid-ai-governance-and-welfare-push/"},

]

def main():
    # Step 1: Delete all existing TVK 2026 promises
    print("Deleting existing TVK 2026 promises...")
    r = httpx.delete(
        f"{URL}/rest/v1/manifesto_promises",
        params={"party": "eq.TVK", "election_year": "eq.2026"},
        headers=HEADERS,
        timeout=15,
    )
    r.raise_for_status()
    print(f"  Deleted existing rows.")

    # Step 2: Insert all new promises
    print(f"\nInserting {len(PROMISES)} TVK promises...")
    inserted = 0
    for p in PROMISES:
        # Round scores to int since DB column is integer
        for score_col in ("fiscal_score", "specificity_score", "past_delivery_score", "overall_score"):
            if score_col in p:
                p[score_col] = round(p[score_col])
        row = {
            "party": "TVK",
            "election_year": 2026,
            **p,
        }
        r = httpx.post(f"{URL}/rest/v1/manifesto_promises", json=row, headers=HEADERS, timeout=15)
        if r.status_code in (200, 201):
            inserted += 1
        else:
            print(f"  ❌ Failed: {p['promise_text'][:60]} — {r.status_code} {r.text[:100]}")

    print(f"\n✅ Done! {inserted}/{len(PROMISES)} TVK promises seeded.")

    # Summary by category
    from collections import Counter
    cats = Counter(p["category"] for p in PROMISES)
    print("\nBy category:")
    for cat, count in sorted(cats.items()):
        print(f"  {cat}: {count}")

if __name__ == "__main__":
    main()
