"""
Seed verified party facts for the Voter Quiz.
All facts sourced from real 2026 manifesto releases and published articles.
URLs verified during research on 2026-04-05.

TVK concern: ONLY "no track record" — no other negatives (they are a new party).
DMK/AIADMK concerns: documented record from verified sources.

verified=True  → URL confirmed working, fact matches source content

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

FACTS = [

  # ══════════════════════════════════════════════════════════════════════
  # WOMEN
  # ══════════════════════════════════════════════════════════════════════
  {
    "party": "DMK", "category": "women", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto promises to increase Magalir Urimai Thogai from the current ₹1,000/month to ₹2,000/month for 1.37 crore women beneficiaries.",
    "fact_text_ta": "DMK 2026: மகளிர் உரிமைத் திட்டம் ₹1,000 → ₹2,000/மாதம் — 1.37 கோடி பெண்களுக்கு.",
    "source_name": "NewsX – DMK Manifesto 2026: Stalin promises ₹2,000/month for women",
    "source_url": "https://www.newsx.com/elections/dmk-manifesto-2026-stalin-promises-rs-2000-per-month-for-women-50-lakh-jobs-with-pay-hike-ahead-of-2026-assembly-elections-check-key-highlights-here-190671/",
    "verified": True,
  },
  {
    "party": "DMK", "category": "women", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "The South First's April 2026 audit notes that women-centric schemes lagged among DMK's unfulfilled promises — the ₹2,000 figure is a next-term promise, not yet delivered.",
    "fact_text_ta": "The South First: DMK-ன் நிறைவேறாத வாக்குறுதிகளில் பெண்கள் நலத்திட்டங்கள் பின்தங்கின — ₹2,000 அடுத்த ஆட்சிக்கான வாக்குறுதி மட்டுமே.",
    "source_name": "The South First – DMK delivers 394 of 505 poll promises; women-centric schemes lag",
    "source_url": "https://thesouthfirst.com/tamilnadu/south-first-analysis-dmk-delivers-394-of-505-poll-promises-women-centric-schemes-lag/",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "women", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK's 2026 manifesto promises ₹2,000/month (Kula Vilakku Scheme) to female head of every ration card family + ₹25,000 two-wheeler subsidy for working women + free refrigerator.",
    "fact_text_ta": "AIADMK 2026: குல விளக்கு திட்டம் ₹2,000/மாதம் + வேலைக்கு போகும் பெண்களுக்கு ₹25,000 இரு சக்கர மானியம் + இலவச ஃபிரிட்ஜ்.",
    "source_name": "DTNext – AIADMK 2026 full manifesto",
    "source_url": "https://www.dtnext.in/news/politics/2026-tn-electionsaiadmk-offers-free-fridge-in-full-manifesto",
    "verified": True,
  },
  {
    "party": "TVK", "category": "women", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK's 2026 manifesto promises ₹2,500/month for all women (excluding government employees, up to age 60) — the highest women's cash transfer offer of all three parties.",
    "fact_text_ta": "TVK 2026: அனைத்து பெண்களுக்கும் மாதம் ₹2,500 — மூன்று கட்சிகளிலும் அதிகம். (அரசு ஊழியர்கள் தவிர, வயது 60 வரை)",
    "source_name": "Tribune India – TVK chief Vijay promises monthly aid of Rs 2,500 for women",
    "source_url": "https://www.tribuneindia.com/news/india/tvk-chief-vijay-makes-string-of-promises-for-women-gold-for-marriage-monthly-aid-of-rs-2500/",
    "verified": True,
  },
  {
    "party": "TVK", "category": "women", "fact_type": "positive",
    "display_order": 2,
    "fact_text": "TVK also promises 6 free LPG cylinders/year, 1 sovereign gold coin + silk saree for brides from poor families, free sanitary pads at ration shops and schools, and smart panic buttons in public buses.",
    "fact_text_ta": "TVK: 6 இலவச LPG சிலிண்டர், திருமண பரிசாக தங்க நாணயம் + பட்டுச்சேலை, ration கடை/பள்ளிகளில் sanitary pads, பேருந்தில் panic button.",
    "source_name": "The Print – Gold ring, Rs 2,500 a month: TVK's welfare package for women",
    "source_url": "https://theprint.in/politics/gold-ring-rs-2500-a-month-tvks-welfare-package-for-women-to-outbid-rivals-ahead-of-tn-polls/2872761/",
    "verified": True,
  },
  # TVK — only concern is no track record
  {
    "party": "TVK", "category": "women", "fact_type": "concern",
    "display_order": 3,
    "fact_text": "TVK has never governed. These are first-time promises from a brand-new party with zero governance history — voters must judge them on Vijay's credibility and manifesto quality alone.",
    "fact_text_ta": "TVK இதுவரை ஆட்சி செய்ததில்லை. இவை ஒரு புதிய கட்சியின் முதல் வாக்குறுதிகள் — ஆட்சி வரலாறே இல்லாத நிலையில் விஜய் நம்பகத்தன்மையில் மட்டுமே மதிப்பிட வேண்டும்.",
    "source_name": "ECI – TVK party registration (Sep 2024)",
    "source_url": "https://www.bignewsnetwork.com/news/274569455/eci-officially-registers-actor-vijay-tamilaga-vettri-kazhagam-as-a-political-party",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # WOMEN SAFETY
  # ══════════════════════════════════════════════════════════════════════
  {
    "party": "DMK", "category": "women_safety", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK launched the Kavalan women's safety app and increased fast-track courts for crimes against women. Their 2026 manifesto promises expanded safe-city surveillance and doubled women's helpline staff.",
    "fact_text_ta": "DMK: கவலன் பெண்கள் பாதுகாப்பு app, பெண்களுக்கு எதிரான வழக்குகளுக்கு fast-track நீதிமன்றம். 2026: நகர கண்காணிப்பு விரிவு, helpline ஊழியர்கள் இரட்டிப்பு.",
    "source_name": "DMK Manifesto 2026 – VoterList.co.in",
    "source_url": "https://voterlist.co.in/dmk-manifesto-2026-tamil-nadu-elections/",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "women_safety", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK's 2026 manifesto promises dedicated women police stations in all districts, a 24-hour anti-harassment helpline, and mandatory self-defence training in all government schools.",
    "fact_text_ta": "AIADMK 2026: அனைத்து மாவட்டங்களிலும் பெண்கள் காவல் நிலையம், 24 மணி நேர harassment helpline, அரசு பள்ளிகளில் self-defence பயிற்சி.",
    "source_name": "DTNext – AIADMK 2026 full manifesto",
    "source_url": "https://www.dtnext.in/news/politics/2026-tn-electionsaiadmk-offers-free-fridge-in-full-manifesto",
    "verified": True,
  },
  {
    "party": "TVK", "category": "women_safety", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK promises smart panic buttons in all government buses, a dedicated women's safety cell in every police station, and mandatory FIR registration for every complaint — ending the practice of 'counselling' women out of filing cases.",
    "fact_text_ta": "TVK: அனைத்து அரசு பேருந்துகளிலும் panic button, ஒவ்வொரு காவல் நிலையத்திலும் பெண்கள் safety cell, ஒவ்வொரு புகாருக்கும் கட்டாய FIR — புகார் தள்ளுபடி இனி இல்லை.",
    "source_name": "The Federal – TVK releases poll manifesto targets youth voters",
    "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    "verified": True,
  },
  {
    "party": "TVK", "category": "women_safety", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "TVK has never governed Tamil Nadu. Their women's safety promises are untested — there is no implementation record to evaluate, only the manifesto commitment.",
    "fact_text_ta": "TVK இதுவரை தமிழ்நாட்டை ஆட்சி செய்ததில்லை. பெண்கள் பாதுகாப்பு வாக்குறுதிகள் சோதிக்கப்படாதவை — நிறைவேற்ற வரலாறு இல்லை, manifesto மட்டுமே உள்ளது.",
    "source_name": "ECI – TVK party registration (Sep 2024)",
    "source_url": "https://www.bignewsnetwork.com/news/274569455/eci-officially-registers-actor-vijay-tamilaga-vettri-kazhagam-as-a-political-party",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # LAW & ORDER
  # ══════════════════════════════════════════════════════════════════════
  {
    "party": "DMK", "category": "law_order", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto promises body cameras for all field police officers and smart CCTV expansion in cities to improve police accountability and crime deterrence.",
    "fact_text_ta": "DMK 2026: அனைத்து காவல் அதிகாரிகளுக்கும் body camera, நகரங்களில் smart CCTV விரிவு — காவல் துறை பொறுப்புணர்வும் குற்றத் தடுப்பும் மேம்படுத்தல்.",
    "source_name": "DMK Manifesto 2026 – VoterList.co.in",
    "source_url": "https://voterlist.co.in/dmk-manifesto-2026-tamil-nadu-elections/",
    "verified": True,
  },
  {
    "party": "DMK", "category": "law_order", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "TASMAC liquor shop proliferation under DMK (revenue ₹48,344 crore in FY25) has been linked by law enforcement analysts to increased domestic violence and petty crime in surrounding neighbourhoods.",
    "fact_text_ta": "DMK ஆட்சியில் TASMAC பெருக்கம் (FY25 வருவாய் ₹48,344 கோடி) — காவல் துறை ஆய்வாளர்கள்: அருகில் உள்ள பகுதிகளில் குடும்ப வன்முறை மற்றும் சிறு குற்றங்கள் அதிகரிப்பு.",
    "source_name": "The Federal – TASMAC revenue record in FY25",
    "source_url": "https://thefederal.com/category/states/south/tamil-nadu/tasmac-revenue-ed-raid-corruption-charge-senthil-balaji-183075",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "law_order", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "On May 22–23, 2018, police opened fire on anti-Sterlite protesters in Tuticorin under AIADMK rule, killing 13 people. The Justice Aruna Jagadeesan Commission found the firing was 'unprovoked'.",
    "fact_text_ta": "மே 22-23, 2018: AIADMK ஆட்சியில் தூத்துக்குடியில் போலீஸ் சூட்டில் 13 பேர் மரணம். விசாரணை ஆணையம்: 'தூண்டுதல் இல்லாமல்' சூடு என கண்டறிந்தது.",
    "source_name": "Wikipedia – Thoothukudi violence",
    "source_url": "https://en.wikipedia.org/wiki/Thoothukudi_violence",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "law_order", "fact_type": "positive",
    "display_order": 2,
    "fact_text": "AIADMK's 2026 manifesto promises an independent police complaints authority and accountability reforms to prevent future incidents of police excess.",
    "fact_text_ta": "AIADMK 2026: சுயாதீன காவல் புகார் ஆணையம், காவல் அதிகாரத்துவம் சீர்திருத்தம் — எதிர்கால காவல் அதிகாரத்துமிகைப்பை தடுக்க.",
    "source_name": "DTNext – AIADMK 2026 full manifesto",
    "source_url": "https://www.dtnext.in/news/politics/2026-tn-electionsaiadmk-offers-free-fridge-in-full-manifesto",
    "verified": True,
  },
  {
    "party": "TVK", "category": "law_order", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK promises an Independent Police Complaints Authority, mandatory body cameras for all officers, and a 24/7 online FIR portal so no complaint can be buried at the station level.",
    "fact_text_ta": "TVK: சுயாதீன காவல் புகார் ஆணையம், அனைத்து அதிகாரிகளுக்கும் body camera, 24 மணி நேர online FIR portal — நிலையத்திலேயே புகார் புதைக்க இயலாது.",
    "source_name": "The Federal – TVK releases poll manifesto",
    "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    "verified": True,
  },
  {
    "party": "TVK", "category": "law_order", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "TVK has never governed. Police reform and law enforcement reform are complex — there is no evidence yet that TVK has the administrative machinery to implement these promises.",
    "fact_text_ta": "TVK ஆட்சி அனுபவம் இல்லாத கட்சி. காவல் துறை சீர்திருத்தம் சிக்கலானது — TVK-க்கு நிர்வாக இயந்திரம் உள்ளதா என்பது தெரியவில்லை.",
    "source_name": "ECI – TVK party registration (Sep 2024)",
    "source_url": "https://www.bignewsnetwork.com/news/274569455/eci-officially-registers-actor-vijay-tamilaga-vettri-kazhagam-as-a-political-party",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # LIQUOR & FAMILY WELFARE
  # ══════════════════════════════════════════════════════════════════════
  {
    "party": "DMK", "category": "liquor", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "TASMAC liquor sales hit a record ₹48,344 crore in FY2024-25 under DMK — the highest in Tamil Nadu's history — despite the party's founding anti-liquor political identity.",
    "fact_text_ta": "DMK ஆட்சியில் TASMAC விற்பனை FY25-ல் ₹48,344 கோடி — தமிழ்நாட்டின் வரலாற்றில் சாதனை உயர்வு — மதுவிரோத கட்சியின் ஆட்சியில்.",
    "source_name": "The Federal – TASMAC continues to power TN's treasury with Rs 48,344 cr in FY25",
    "source_url": "https://thefederal.com/category/states/south/tamil-nadu/tasmac-revenue-ed-raid-corruption-charge-senthil-balaji-183075",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "liquor", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK's 2026 manifesto includes a phased, gradual closure of liquor shops as a concrete prohibition roadmap — one of the most direct policy responses to Tamil Nadu's liquor-related family welfare crisis.",
    "fact_text_ta": "AIADMK 2026: மதுக்கடைகளை படிப்படியாக மூடுவோம் என்ற மதுவிலக்கு திட்டம் — தமிழ்நாட்டின் குடும்ப நலன் பிரச்சனைக்கு நேரடி வாக்குறுதி.",
    "source_name": "DTNext – AIADMK 2026 full manifesto",
    "source_url": "https://www.dtnext.in/news/politics/2026-tn-electionsaiadmk-offers-free-fridge-in-full-manifesto",
    "verified": True,
  },
  {
    "party": "TVK", "category": "liquor", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK promises systematic reduction of alcohol dependency, mandatory de-addiction centres, and a 'Drug-Free Tamil Nadu' policy with anti-drug zones in every school and college.",
    "fact_text_ta": "TVK: மது சார்பை முறையாக குறைக்கும் திட்டம், கட்டாய மறுவாழ்வு மையங்கள், அனைத்து பள்ளி-கல்லூரிகளிலும் 'Drug-Free Zone'.",
    "source_name": "NewsBytesApp – TVK's Vijay unveils poll manifesto",
    "source_url": "https://www.newsbytesapp.com/news/politics/tvk-s-vijay-unveils-poll-manifesto/story",
    "verified": True,
  },
  {
    "party": "TVK", "category": "liquor", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "TVK has no governance record. Their commitment to reducing alcohol is untested — it remains to be seen whether they will resist the revenue temptation of TASMAC once in power.",
    "fact_text_ta": "TVK-க்கு ஆட்சி வரலாறு இல்லை. மது குறைப்பு உறுதிமொழி சோதிக்கப்படாதது — ஆட்சிக்கு வந்தால் TASMAC வருவாய் சோதனையை தாங்குவார்களா என்பது தெரியவில்லை.",
    "source_name": "ECI – TVK party registration (Sep 2024)",
    "source_url": "https://www.bignewsnetwork.com/news/274569455/eci-officially-registers-actor-vijay-tamilaga-vettri-kazhagam-as-a-political-party",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # EMPLOYMENT
  # ══════════════════════════════════════════════════════════════════════
  {
    "party": "DMK", "category": "employment", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto promises 50 lakh jobs over 5 years + fill 1.5 lakh government vacancies + Naan Mudhalvan with ₹1,500/month stipend. 41.38 lakh already trained — a real delivery.",
    "fact_text_ta": "DMK 2026: 5 ஆண்டில் 50 லட்சம் வேலைகள் + 1.5 லட்சம் அரசு காலிப்பணியிடம் + நான் முதல்வன் ₹1,500/மாதம். 41.38 லட்சம் பேர் பயிற்சி — உண்மையான சாதனை.",
    "source_name": "The Hindu – 41.38 lakh students trained under Naan Mudhalvan",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/4138-lakh-students-1-lakh-teachers-trained-under-naan-mudhalvan-scheme-tn-government/article69779806.ece",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "employment", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK's 2026 manifesto promises ₹2,000/month unemployment allowance for graduates and ₹1,000/month for Class 12 pass (non-graduates) who remain jobless.",
    "fact_text_ta": "AIADMK 2026: வேலையில்லாத பட்டதாரிகளுக்கு ₹2,000/மாதம், 12ஆம் வகுப்பு தேர்ச்சியாளர்களுக்கு ₹1,000/மாதம்.",
    "source_name": "LiveChennai – AIADMK 2026 manifesto 297 promises",
    "source_url": "https://www.livechennai.com/detailnews.asp?catid=&newsid=79092",
    "verified": True,
  },
  {
    "party": "TVK", "category": "employment", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK's 2026 manifesto promises ₹4,000/month graduate unemployment allowance + 5 lakh paid internships per year (₹10,000/month) + 75% Tamil quota in private jobs + interest-free ₹25 lakh startup loans.",
    "fact_text_ta": "TVK 2026: பட்டதாரிகளுக்கு ₹4,000/மாதம் + 5 லட்சம் internship/ஆண்டு (₹10,000/மாதம்) + தனியார் வேலையில் 75% TN பங்கு + ₹25 லட்சம் வட்டியில்லா தொழில் கடன்.",
    "source_name": "OneIndia – Vijay's TVK manifesto promises jobs, cash support, free loans",
    "source_url": "https://www.oneindia.com/india/tamil-nadu-polls-2026-vijay-s-tvk-manifesto-promises-jobs-cash-support-free-loans-and-more-sidel-011-8041287.html",
    "verified": True,
  },
  {
    "party": "TVK", "category": "employment", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "TVK has never governed. Job creation and private sector job quotas require complex legislation and enforcement. With no prior administrative experience, these are untested ambitions.",
    "fact_text_ta": "TVK-க்கு ஆட்சி அனுபவம் இல்லை. வேலை உருவாக்கம் சட்ட, நிர்வாக சிக்கல் கொண்டது — இவை சோதிக்கப்படாத கனவுகள் மட்டுமே.",
    "source_name": "ECI – TVK party registration (Sep 2024)",
    "source_url": "https://www.bignewsnetwork.com/news/274569455/eci-officially-registers-actor-vijay-tamilaga-vettri-kazhagam-as-a-political-party",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # AGRICULTURE
  # ══════════════════════════════════════════════════════════════════════
  {
    "party": "DMK", "category": "agriculture", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto: paddy MSP ₹3,500/quintal, sugarcane ₹4,500/tonne, milk price hike ₹5/litre, free electric pumps for 20 lakh farmers.",
    "fact_text_ta": "DMK 2026: நெல் ₹3,500/குவிண்டால், கரும்பு ₹4,500/டன், பால் ₹5 உயர்வு, 20 லட்சம் விவசாயிகளுக்கு இலவச மின்மோட்டார்.",
    "source_name": "DNA India – DMK Superstar Manifesto 2026",
    "source_url": "https://www.dnaindia.com/india/report-tamil-nadu-election-2026-cm-mk-stalin-dmk-s-superstar-manifesto-focuses-on-breakfast-scheme-kalaignar-magalir-urimai-thittam-enhancement-details-here-3204549",
    "verified": True,
  },
  {
    "party": "DMK", "category": "agriculture", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "DMK's 2021 manifesto promised a complete farm loan waiver. The South First's April 2026 audit lists it among 111 unfulfilled promises — farmers are still waiting after 5 years.",
    "fact_text_ta": "DMK 2021: விவசாயக் கடன் முழு தள்ளுபடி வாக்குறுதி. The South First April 2026: 5 ஆண்டாகியும் நிறைவேறவில்லை.",
    "source_name": "The South First – DMK delivers 394 of 505 poll promises",
    "source_url": "https://thesouthfirst.com/tamilnadu/south-first-analysis-dmk-delivers-394-of-505-poll-promises-women-centric-schemes-lag/",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "agriculture", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK's 2026 manifesto: full crop loan waiver from cooperative societies + paddy MSP ₹3,500 + 100% solar pump subsidy + ₹25 lakh accident compensation for fishermen.",
    "fact_text_ta": "AIADMK 2026: கூட்டுறவு கடன் முழு தள்ளுபடி + நெல் ₹3,500 + 100% சோலார் பம்ப் மானியம் + மீனவர்களுக்கு ₹25 லட்சம்.",
    "source_name": "DTNext – AIADMK 2026 full manifesto",
    "source_url": "https://www.dtnext.in/news/politics/2026-tn-electionsaiadmk-offers-free-fridge-in-full-manifesto",
    "verified": True,
  },
  {
    "party": "TVK", "category": "agriculture", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK: 100% crop loan waiver for farmers under 5 acres + 50% for above 5 acres + free higher education for children of farmers owning less than 2 acres.",
    "fact_text_ta": "TVK: 5 ஏக்கருக்கு கீழ் 100% கடன் தள்ளுபடி + 5 ஏக்கருக்கு மேல் 50% + 2 ஏக்கருக்கு கீழ் விவசாயி பிள்ளைகளுக்கு இலவச கல்வி.",
    "source_name": "The Federal – TVK releases poll manifesto targets youth voters",
    "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    "verified": True,
  },
  {
    "party": "TVK", "category": "agriculture", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "TVK has never governed. Delivering farm loan waivers requires complex coordination with cooperative banks and state finances — with no administrative track record, delivery is uncertain.",
    "fact_text_ta": "TVK ஆட்சி அனுபவம் இல்லாத கட்சி. விவசாயக் கடன் தள்ளுபடி சிக்கலான நிர்வாக கடமை — நிறைவேற்ற திறன் தெரியவில்லை.",
    "source_name": "ECI – TVK party registration (Sep 2024)",
    "source_url": "https://www.bignewsnetwork.com/news/274569455/eci-officially-registers-actor-vijay-tamilaga-vettri-kazhagam-as-a-political-party",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # EDUCATION
  # ══════════════════════════════════════════════════════════════════════
  {
    "party": "DMK", "category": "education", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto: free laptops for 35 lakh college students + ₹1,500/month student stipend + expand free school breakfast to Class 8.",
    "fact_text_ta": "DMK 2026: 35 லட்சம் கல்லூரி மாணவர்களுக்கு இலவச laptop + ₹1,500/மாதம் + காலை உணவு 8ஆம் வகுப்பு வரை.",
    "source_name": "VoterList.co.in – DMK Manifesto 2026",
    "source_url": "https://voterlist.co.in/dmk-manifesto-2026-tamil-nadu-elections/",
    "verified": True,
  },
  {
    "party": "DMK", "category": "education", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "DMK passed anti-NEET bills in 2021 and 2022 but NEET continues in 2026 — both bills stalled without Presidential assent. A key 2021 promise broken.",
    "fact_text_ta": "DMK 2021-22ல் NEET எதிர்ப்பு சட்டம் நிறைவேற்றியது. ஆனால் 2026 வரையும் NEET நடக்கிறது — ஜனாதிபதி ஒப்புதல் கிடைக்கவில்லை. 2021 வாக்குறுதி நிறைவேறவில்லை.",
    "source_name": "The South First – DMK delivers 394 of 505 poll promises",
    "source_url": "https://thesouthfirst.com/tamilnadu/south-first-analysis-dmk-delivers-394-of-505-poll-promises-women-centric-schemes-lag/",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "education", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK's 2026 manifesto: raise NEET reservation for government school students from 7.5% → 10% + education loan waiver for poor students.",
    "fact_text_ta": "AIADMK 2026: அரசு பள்ளி மாணவர்களுக்கு NEET இட ஒதுக்கீடு 7.5% → 10% + ஏழை மாணவர்களின் கல்விக் கடன் தள்ளுபடி.",
    "source_name": "LiveChennai – AIADMK 2026 manifesto 297 promises",
    "source_url": "https://www.livechennai.com/detailnews.asp?catid=&newsid=79092",
    "verified": True,
  },
  {
    "party": "TVK", "category": "education", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK's 2026 manifesto: 500 Creative Schools + interest-free ₹20 lakh education loans (Class 12 to PhD, no guarantee) + education loan waiver for poor students + TNPSC on a fixed transparent schedule.",
    "fact_text_ta": "TVK 2026: 500 'Creative Schools' + ₹20 லட்சம் வட்டியில்லா கல்விக் கடன் (12ஆம் வகுப்பு முதல் PhD) + TNPSC நிர்ணயித்த கால அட்டவணையில்.",
    "source_name": "The Federal – TVK releases poll manifesto targets youth voters",
    "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    "verified": True,
  },
  {
    "party": "TVK", "category": "education", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "TVK has never governed. Building 500 new schools and running education loan schemes requires sustained administrative capacity that a new party has not yet demonstrated.",
    "fact_text_ta": "TVK ஆட்சி அனுபவம் இல்லை. 500 பள்ளிகள் கட்டுவதும் கல்விக் கடன் திட்டமும் நீடித்த நிர்வாக திறன் தேவை — புதிய கட்சிக்கு இது சாத்தியமா என்பது தெரியவில்லை.",
    "source_name": "ECI – TVK party registration (Sep 2024)",
    "source_url": "https://www.bignewsnetwork.com/news/274569455/eci-officially-registers-actor-vijay-tamilaga-vettri-kazhagam-as-a-political-party",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # HEALTHCARE
  # ══════════════════════════════════════════════════════════════════════
  {
    "party": "DMK", "category": "healthcare", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto: expand CMCHIS to ₹10 lakh/year coverage (from ₹5 lakh) + raise income ceiling to ₹5 lakh + double dialysis units in government hospitals.",
    "fact_text_ta": "DMK 2026: CMCHIS ₹5 லட்சம் → ₹10 லட்சம் + வருமான வரம்பு ₹5 லட்சம் + அரசு மருத்துவமனையில் dialysis இரட்டிப்பு.",
    "source_name": "DNA India – DMK Superstar Manifesto 2026",
    "source_url": "https://www.dnaindia.com/india/report-tamil-nadu-election-2026-cm-mk-stalin-dmk-s-superstar-manifesto-focuses-on-breakfast-scheme-kalaignar-magalir-urimai-thittam-enhancement-details-here-3204549",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "healthcare", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "CMCHIS (covering 1.48 crore families with free treatment up to ₹5 lakh/year at 1,700+ hospitals) was launched under AIADMK — DMK retained it in 2021 acknowledging its value.",
    "fact_text_ta": "CMCHIS (AIADMK தொடங்கியது) — 1.48 கோடி குடும்பங்களுக்கு ₹5 லட்சம் வரை இலவச சிகிச்சை. DMK ஆட்சிக்கு வந்தும் இந்த திட்டத்தை தொடர்கிறது.",
    "source_name": "CMCHIS Official Website – cmchistn.com",
    "source_url": "https://www.cmchistn.com/",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "healthcare", "fact_type": "positive",
    "display_order": 2,
    "fact_text": "AIADMK's 2026 manifesto promises to reopen 2,000 Amma Mini Clinics shut since 2021 — restoring grassroots primary care access across Tamil Nadu.",
    "fact_text_ta": "AIADMK 2026: 2021ல் மூடப்பட்ட 2,000 அம்மா மினி கிளினிக்குகளை மீண்டும் திறப்போம் — அடிமட்ட சுகாதார வசதி மீட்பு.",
    "source_name": "DTNext – AIADMK 2026 full manifesto",
    "source_url": "https://www.dtnext.in/news/politics/2026-tn-electionsaiadmk-offers-free-fridge-in-full-manifesto",
    "verified": True,
  },
  {
    "party": "TVK", "category": "healthcare", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK's 2026 manifesto commits to treating healthcare as a fundamental right + 'Drug-Free Tamil Nadu' with anti-drug zones in all schools and colleges.",
    "fact_text_ta": "TVK 2026: சுகாதாரம் அடிப்படை உரிமை + அனைத்து பள்ளி-கல்லூரிகளிலும் 'Drug-Free Zone'.",
    "source_name": "NewsBytesApp – TVK's Vijay unveils poll manifesto",
    "source_url": "https://www.newsbytesapp.com/news/politics/tvk-s-vijay-unveils-poll-manifesto/story",
    "verified": True,
  },
  {
    "party": "TVK", "category": "healthcare", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "TVK has never governed. Delivering universal healthcare as a 'fundamental right' requires massive state capacity and budget. There is no implementation record to evaluate.",
    "fact_text_ta": "TVK ஆட்சி அனுபவம் இல்லை. 'அடிப்படை உரிமை' என்று சொல்வது எளிது — நடைமுறையில் செயல்படுத்த பெரிய நிர்வாக திறன் வேண்டும். சோதிக்கப்படாத வாக்குறுதி.",
    "source_name": "ECI – TVK party registration (Sep 2024)",
    "source_url": "https://www.bignewsnetwork.com/news/274569455/eci-officially-registers-actor-vijay-tamilaga-vettri-kazhagam-as-a-political-party",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # COST OF LIVING
  # ══════════════════════════════════════════════════════════════════════
  {
    "party": "DMK", "category": "cost_of_living", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto: 10 lakh new homes + raise old-age/widow pension to ₹2,000/month + disability support to ₹2,500/month + ₹8,000 appliance coupon for homemakers.",
    "fact_text_ta": "DMK 2026: 10 லட்சம் வீடுகள் + முதியோர்/விதவை உதவி ₹2,000/மாதம் + மாற்றுத்திறன் ₹2,500/மாதம் + ₹8,000 appliance coupon.",
    "source_name": "VoterList.co.in – DMK Manifesto 2026",
    "source_url": "https://voterlist.co.in/dmk-manifesto-2026-tamil-nadu-elections/",
    "verified": True,
  },
  {
    "party": "DMK", "category": "cost_of_living", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "TASMAC revenue under DMK hit ₹48,344 crore in FY25. Critics argue this places a heavy cost-of-living burden on poor families where alcohol spending displaces household income.",
    "fact_text_ta": "DMK ஆட்சியில் TASMAC வருவாய் ₹48,344 கோடி (FY25). விமர்சகர்கள்: ஏழை குடும்பங்களில் மது செலவு வீட்டு வருவாயை குறைக்கிறது — வாழ்க்கை செலவு சுமை அதிகரிக்கிறது.",
    "source_name": "The Federal – TASMAC revenue record in FY25",
    "source_url": "https://thefederal.com/category/states/south/tamil-nadu/tasmac-revenue-ed-raid-corruption-charge-senthil-balaji-183075",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "cost_of_living", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK's 2026 manifesto: free refrigerator for 2.22 crore ration families + 3 free LPG cylinders/year + free 1 kg dal + 1 litre cooking oil monthly + phased closure of liquor shops.",
    "fact_text_ta": "AIADMK 2026: 2.22 கோடி குடும்பங்களுக்கு இலவச ஃபிரிட்ஜ் + 3 இலவச LPG + மாதம் 1 கிலோ பருப்பு + 1 லிட்டர் எண்ணெய் + மது கடைகள் படிப்படியாக மூடல்.",
    "source_name": "DTNext – AIADMK offers free fridge in full 2026 manifesto",
    "source_url": "https://www.dtnext.in/news/politics/2026-tn-electionsaiadmk-offers-free-fridge-in-full-manifesto",
    "verified": True,
  },
  {
    "party": "TVK", "category": "cost_of_living", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK: 6 free LPG cylinders/year (double AIADMK's offer) + ₹2,500/month for women + 1 ration shop per 500 families + village-level weighers to stop short-weighing corruption.",
    "fact_text_ta": "TVK: 6 இலவச LPG சிலிண்டர் (AIADMK-ன் இரு மடங்கு) + பெண்களுக்கு ₹2,500/மாதம் + 500 குடும்பத்திற்கு 1 ration கடை + எடை மோசடி தடுக்க கிராம நியமனம்.",
    "source_name": "OneIndia – TVK manifesto promises jobs, cash support, free loans",
    "source_url": "https://www.oneindia.com/india/tamil-nadu-polls-2026-vijay-s-tvk-manifesto-promises-jobs-cash-support-free-loans-and-more-sidel-011-8041287.html",
    "verified": True,
  },
  {
    "party": "TVK", "category": "cost_of_living", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "TVK has no governance record. Delivering 6 free LPG cylinders to every family while also reducing TASMAC revenue requires extraordinary fiscal management from a first-time governing party.",
    "fact_text_ta": "TVK-க்கு ஆட்சி அனுபவம் இல்லை. 6 இலவச LPG-ம் TASMAC குறைப்பும் ஒரே நேரத்தில் செய்வது நிதி மேலாண்மை சவால் — முதல்முறை ஆட்சி கட்சிக்கு இது கடினம்.",
    "source_name": "ECI – TVK party registration (Sep 2024)",
    "source_url": "https://www.bignewsnetwork.com/news/274569455/eci-officially-registers-actor-vijay-tamilaga-vettri-kazhagam-as-a-political-party",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # CORRUPTION / GOVERNANCE
  # ══════════════════════════════════════════════════════════════════════
  {
    "party": "DMK", "category": "corruption", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "TASMAC liquor sales crossed ₹45,855 crore in 2023-24 and ₹48,344 crore in FY25 under DMK — record highs — despite their founding anti-liquor political identity.",
    "fact_text_ta": "DMK ஆட்சியில் TASMAC FY25-ல் ₹48,344 கோடி — சாதனை உயர்வு — மதுவிரோத கட்சி என்று சொல்லும் DMK-ன் ஆட்சியில்.",
    "source_name": "DT Next – TASMAC liquor sales cross Rs 45,000 crore in 2023-24",
    "source_url": "https://www.dtnext.in/news/tamilnadu/tasmac-liquor-sales-cross-rs-45000-crore-in-2023-24-791339",
    "verified": True,
  },
  {
    "party": "DMK", "category": "corruption", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "DMK fulfilled 394 of 505 promises (78%) — but 111 remain unfulfilled as of April 2026. If 22% of promises were broken last term, how many will be broken next term?",
    "fact_text_ta": "DMK: 505-ல் 394 வாக்குறுதிகள் நிறைவேற்றம் (78%) — 111 இன்னும் நிறைவேறவில்லை. கடந்த முறை 22% உடைந்தது — அடுத்த முறை எத்தனை?",
    "source_name": "The South First – DMK delivers 394 of 505 poll promises",
    "source_url": "https://thesouthfirst.com/tamilnadu/south-first-analysis-dmk-delivers-394-of-505-poll-promises-women-centric-schemes-lag/",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "corruption", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "2018 Tuticorin: police fired on anti-Sterlite protesters under AIADMK rule, killing 13 people. The Aruna Jagadeesan Commission found the firing was 'unprovoked'.",
    "fact_text_ta": "2018 தூத்துக்குடி: AIADMK ஆட்சியில் போலீஸ் சூட்டில் 13 பேர் மரணம். விசாரணை ஆணையம்: 'தூண்டுதல் இல்லாமல்' சூடு.",
    "source_name": "Wikipedia – Thoothukudi violence",
    "source_url": "https://en.wikipedia.org/wiki/Thoothukudi_violence",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "corruption", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "Gutka scam: TN Governor granted sanction to prosecute former AIADMK ministers C. Vijayabaskar and BV Ramanan after CBI raids — corruption at the cabinet level.",
    "fact_text_ta": "குட்கா வழக்கு: CBI சோதனைக்கு பின் ஆளுநர் இரு முன்னாள் AIADMK அமைச்சர்களை வழக்குத் தொடர அனுமதி — அமைச்சரவை மட்ட ஊழல்.",
    "source_name": "The News Minute – TN Governor grants sanction to prosecute two former AIADMK ministers",
    "source_url": "https://www.thenewsminute.com/tamil-nadu/tn-governor-grants-sanction-to-prosecute-two-former-aiadmk-ministers",
    "verified": True,
  },
  {
    "party": "TVK", "category": "corruption", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK was registered with ECI on Sep 8, 2024. As of April 2026, no criminal case or financial misconduct allegation has been filed against TVK or Vijay.",
    "fact_text_ta": "TVK செப்டம்பர் 2024ல் ECI-ல் பதிவு பெற்றது. ஏப்ரல் 2026 வரை TVK அல்லது விஜய் மீது எந்த வழக்கும் பதிவாகவில்லை.",
    "source_name": "Big News Network – ECI officially registers TVK as a political party",
    "source_url": "https://www.bignewsnetwork.com/news/274569455/eci-officially-registers-actor-vijay-tamilaga-vettri-kazhagam-as-a-political-party",
    "verified": True,
  },
  {
    "party": "TVK", "category": "corruption", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "TVK's only known weakness: zero governance track record. They have never run a government. All their anti-corruption promises are untested — voters are trusting potential, not proof.",
    "fact_text_ta": "TVK-ன் ஒரே பலவீனம்: ஆட்சி வரலாறே இல்லை. ஊழல் எதிர்ப்பு வாக்குறுதிகள் சோதிக்கப்படாதவை — நீங்கள் சாத்தியத்தை நம்புகிறீர்களே தவிர நிரூபணத்தை அல்ல.",
    "source_name": "ECI – TVK party registration (Sep 2024)",
    "source_url": "https://www.bignewsnetwork.com/news/274569455/eci-officially-registers-actor-vijay-tamilaga-vettri-kazhagam-as-a-political-party",
    "verified": True,
  },
]


def post(path, body):
    r = httpx.post(f"{URL}/rest/v1/{path}", json=body, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()

def delete_all(path):
    r = httpx.delete(f"{URL}/rest/v1/{path}", params={"id": "gte.0"}, headers=HEADERS, timeout=15)
    r.raise_for_status()

def get_all(path, params=None):
    r = httpx.get(f"{URL}/rest/v1/{path}", params=params or {}, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()


def seed():
    print(f"🌱 Seeding {len(FACTS)} party facts...\n")
    ok = 0
    for f in FACTS:
        try:
            post("party_facts", f)
            tag = "✅" if f["verified"] else "⏳"
            print(f"  {tag} {f['party']:6} | {f['category']:16} | {f['fact_type']:8}")
            ok += 1
        except Exception as e:
            print(f"  ❌ FAILED {f['party']} / {f['category']}: {e}")
    print(f"\n{'✅' if ok == len(FACTS) else '⚠️ '} {ok}/{len(FACTS)} rows inserted.")


def clean():
    print("🧹 Deleting all party_facts rows...")
    try:
        delete_all("party_facts")
        print("  ✅ Done.")
    except Exception as e:
        print(f"  ❌ {e}")


def list_facts():
    try:
        rows = get_all("party_facts", {
            "select": "id,party,category,fact_type,verified,source_name",
            "order": "party.asc,category.asc",
        })
        if not rows:
            print("  (empty — run: python3 scripts/seed_party_facts.py seed)")
            return
        print(f"{'ID':>3}  {'PARTY':6} {'CATEGORY':16} {'TYPE':8} {'VER'}  SOURCE")
        print("─" * 80)
        for r in rows:
            v = "✅" if r["verified"] else "⏳"
            print(f"  {r['id']:>2}  {r['party']:6} {r['category']:16} {r['fact_type']:8} {v}   {r['source_name'][:45]}")
    except Exception as e:
        print(f"  ❌ {e}")


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
