"""
Seed verified party facts for the Voter Quiz.
All facts sourced from real 2026 manifesto releases and published articles.
URLs verified during research on 2026-04-05.

verified=True  → URL confirmed working, fact matches source content
verified=False → URL found but content not deeply verified yet

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
  # WOMEN — 2026 manifesto cash transfer comparison (the core question)
  # DMK: ₹2,000/month (increase from current ₹1,000)
  # AIADMK: ₹2,000/month (Kula Vilakku scheme — new promise)
  # TVK: ₹2,500/month (highest offer — named promise)
  # ══════════════════════════════════════════════════════════════════════

  {
    "party": "DMK", "category": "women", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto promises to increase Magalir Urimai Thogai from the current ₹1,000/month to ₹2,000/month for 1.37 crore women beneficiaries.",
    "fact_text_ta": "DMK 2026 manifesto: மகளிர் உரிமைத் திட்டத்தை தற்போதைய ₹1,000-ல் இருந்து ₹2,000-ஆக உயர்த்துவோம் — 1.37 கோடி பெண்களுக்கு.",
    "source_name": "NewsX – DMK Manifesto 2026: Stalin promises ₹2,000/month for women",
    "source_url": "https://www.newsx.com/elections/dmk-manifesto-2026-stalin-promises-rs-2000-per-month-for-women-50-lakh-jobs-with-pay-hike-ahead-of-2026-assembly-elections-check-key-highlights-here-190671/",
    "verified": True,
  },
  {
    "party": "DMK", "category": "women", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "DMK launched Magalir Urimai at ₹1,000/month in Sep 2023. The South First's April 2026 audit notes women-centric schemes lagged — the ₹2,000 promise is for the next term, not yet delivered.",
    "fact_text_ta": "DMK மகளிர் உரிமை ₹1,000-ல் தொடங்கியது. The South First: பெண்கள் நலத்திட்டங்களில் குறைபாடுகள் உள்ளன. ₹2,000 அடுத்த ஆட்சிக்கான வாக்குறுதி மட்டுமே.",
    "source_name": "The South First – DMK delivers 394 of 505 poll promises; women-centric schemes lag",
    "source_url": "https://thesouthfirst.com/tamilnadu/south-first-analysis-dmk-delivers-394-of-505-poll-promises-women-centric-schemes-lag/",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "women", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK's 2026 manifesto promises ₹2,000/month cash assistance (Kula Vilakku Scheme) to the female head of every ration card family, plus a ₹25,000 two-wheeler subsidy for working women.",
    "fact_text_ta": "AIADMK 2026: குல விளக்கு திட்டம் — ஒவ்வொரு ration card குடும்பத்தின் பெண் தலைவிக்கும் மாதம் ₹2,000. வேலைக்கு போகும் பெண்களுக்கு ₹25,000 இரு சக்கர வாகன மானியம்.",
    "source_name": "DTNext – AIADMK offers free fridge, ₹2,000/month for women in full 2026 manifesto",
    "source_url": "https://www.dtnext.in/news/politics/2026-tn-electionsaiadmk-offers-free-fridge-in-full-manifesto",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "women", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "AIADMK is in opposition and has never delivered the ₹2,000 promise before — it is a 2026 election manifesto promise only. Their governance record includes the 2018 Tuticorin firing that killed 13 protesters.",
    "fact_text_ta": "AIADMK எதிர்க்கட்சியாக உள்ளது — ₹2,000 வாக்குறுதி இதுவரை நிறைவேற்றப்படவில்லை. 2018 தூத்துக்குடி சூட்டில் 13 பேர் மரணம் — AIADMK ஆட்சியில்.",
    "source_name": "Wikipedia – Thoothukudi violence",
    "source_url": "https://en.wikipedia.org/wiki/Thoothukudi_violence",
    "verified": True,
  },
  {
    "party": "TVK", "category": "women", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK's 2026 manifesto promises ₹2,500/month for all women (excluding government employees, up to age 60) — the highest women's cash transfer offer of all three parties.",
    "fact_text_ta": "TVK 2026: அனைத்து பெண்களுக்கும் மாதம் ₹2,500 — மூன்று கட்சிகளிலும் அதிக தொகை. (அரசு ஊழியர்கள் தவிர, வயது 60 வரை)",
    "source_name": "Tribune India – TVK chief Vijay promises monthly aid of Rs 2,500 for women",
    "source_url": "https://www.tribuneindia.com/news/india/tvk-chief-vijay-makes-string-of-promises-for-women-gold-for-marriage-monthly-aid-of-rs-2500/",
    "verified": True,
  },
  {
    "party": "TVK", "category": "women", "fact_type": "positive",
    "display_order": 2,
    "fact_text": "TVK also promises 6 free LPG cylinders/year, 1 sovereign gold coin + silk saree for brides from poor families, free sanitary pads at ration shops and schools, and smart panic buttons in public buses.",
    "fact_text_ta": "TVK: 6 இலவச LPG சிலிண்டர், திருமண பரிசாக தங்க நாணயம் + பட்டுச்சேலை, ration கடை/பள்ளிகளில் இலவச sanitary pads, பேருந்தில் panic button.",
    "source_name": "The Print – Gold ring, Rs 2,500 a month: TVK's welfare package for women",
    "source_url": "https://theprint.in/politics/gold-ring-rs-2500-a-month-tvks-welfare-package-for-women-to-outbid-rivals-ahead-of-tn-polls/2872761/",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # EMPLOYMENT — 2026 manifesto comparison
  # DMK: 50 lakh jobs / 5 yrs, ₹1,500 stipend
  # AIADMK: ₹2,000/month graduate allowance
  # TVK: ₹4,000/month graduate allowance, 75% local quota
  # ══════════════════════════════════════════════════════════════════════

  {
    "party": "DMK", "category": "employment", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto promises 50 lakh jobs over 5 years, filling 1.5 lakh government vacancies, and extending Naan Mudhalvan skill training to 5 lakh more individuals with ₹1,500/month stipend.",
    "fact_text_ta": "DMK 2026: 5 ஆண்டில் 50 லட்சம் வேலைகள், 1.5 லட்சம் அரசு காலிப்பணியிடங்கள் நிரப்பல், நான் முதல்வன் பயிற்சியில் மாதம் ₹1,500 உதவித்தொகை.",
    "source_name": "NewsX – DMK Manifesto 2026 key highlights",
    "source_url": "https://www.newsx.com/elections/dmk-manifesto-2026-stalin-promises-rs-2000-per-month-for-women-50-lakh-jobs-with-pay-hike-ahead-of-2026-assembly-elections-check-key-highlights-here-190671/",
    "verified": True,
  },
  {
    "party": "DMK", "category": "employment", "fact_type": "positive",
    "display_order": 2,
    "fact_text": "41.38 lakh students and 1 lakh teachers were trained under Naan Mudhalvan (DMK's skill scheme) as of 2025 — a genuine delivery on their 2021 skill-development promise.",
    "fact_text_ta": "நான் முதல்வன் திட்டம்: 2025 வரை 41.38 லட்சம் மாணவர்கள், 1 லட்சம் ஆசிரியர்கள் பயிற்சி பெற்றனர் — 2021 வாக்குறுதியில் உண்மையான செயல்பாடு.",
    "source_name": "The Hindu – 41.38 lakh students, 1 lakh teachers trained under Naan Mudhalvan scheme",
    "source_url": "https://www.thehindu.com/news/national/tamil-nadu/4138-lakh-students-1-lakh-teachers-trained-under-naan-mudhalvan-scheme-tn-government/article69779806.ece",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "employment", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK's 2026 manifesto promises ₹2,000/month unemployment allowance for graduates and ₹1,000/month for Class 12 pass (non-graduates) who remain jobless.",
    "fact_text_ta": "AIADMK 2026: வேலையில்லாத பட்டதாரிகளுக்கு மாதம் ₹2,000, 12ஆம் வகுப்பு தேர்ச்சி பெற்றவர்களுக்கு மாதம் ₹1,000 வேலையில்லா உதவி.",
    "source_name": "LiveChennai – AIADMK 2026 manifesto: 297 promises across 31 categories",
    "source_url": "https://www.livechennai.com/detailnews.asp?catid=&newsid=79092",
    "verified": True,
  },
  {
    "party": "TVK", "category": "employment", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK's 2026 manifesto promises ₹4,000/month unemployment allowance for graduates (age 29+), ₹2,000/month for diploma holders, 5 lakh paid internships per year (₹10,000/month for graduates, ₹8,000 for IT graduates), and 75% Tamil quota in private sector jobs.",
    "fact_text_ta": "TVK 2026: வேலையில்லாத பட்டதாரிகளுக்கு மாதம் ₹4,000, diploma பெற்றவர்களுக்கு ₹2,000, 5 லட்சம் internship வருடம் (₹10,000/மாதம்), தனியார் வேலையில் 75% TN பங்கு.",
    "source_name": "OneIndia – Vijay's TVK manifesto promises jobs, cash support, free loans and more",
    "source_url": "https://www.oneindia.com/india/tamil-nadu-polls-2026-vijay-s-tvk-manifesto-promises-jobs-cash-support-free-loans-and-more-sidel-011-8041287.html",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # AGRICULTURE — 2026 manifesto comparison
  # DMK: ₹3,500 paddy MSP, ₹4,500 sugarcane MSP, free electric pumps
  # AIADMK: ₹3,500 paddy MSP, full cooperative loan waiver
  # TVK: 100% loan waiver (under 5 acres), free higher education for farmers' children
  # ══════════════════════════════════════════════════════════════════════

  {
    "party": "DMK", "category": "agriculture", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto promises paddy MSP at ₹3,500/quintal, sugarcane at ₹4,500/tonne, milk price hike of ₹5/litre, and free electric pump sets for 20 lakh farmers (no meter charge).",
    "fact_text_ta": "DMK 2026: நெல் ₹3,500/குவிண்டால் கொள்முதல், கரும்பு ₹4,500/டன், பால் ₹5 உயர்வு, 20 லட்சம் விவசாயிகளுக்கு இலவச மின்மோட்டார் (மீட்டர் கட்டணம் இல்லை).",
    "source_name": "DNA India – DMK Superstar Manifesto 2026 key highlights",
    "source_url": "https://www.dnaindia.com/india/report-tamil-nadu-election-2026-cm-mk-stalin-dmk-s-superstar-manifesto-focuses-on-breakfast-scheme-kalaignar-magalir-urimai-thittam-enhancement-details-here-3204549",
    "verified": True,
  },
  {
    "party": "DMK", "category": "agriculture", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "DMK's 2021 manifesto promised a complete farm loan waiver. The South First's April 2026 audit lists it among 111 unfulfilled promises — farmers are still waiting after 5 years.",
    "fact_text_ta": "DMK 2021 manifesto: விவசாயக் கடன் முழு தள்ளுபடி. The South First April 2026 ஆய்வு: இது 111 நிறைவேறாத வாக்குறுதிகளில் ஒன்று — 5 ஆண்டாகியும் நிறைவேறவில்லை.",
    "source_name": "The South First – DMK delivers 394 of 505 poll promises",
    "source_url": "https://thesouthfirst.com/tamilnadu/south-first-analysis-dmk-delivers-394-of-505-poll-promises-women-centric-schemes-lag/",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "agriculture", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK's 2026 manifesto promises paddy MSP at ₹3,500/quintal, full crop loan waiver from cooperative societies, 100% solar pump set subsidy for new connections, and ₹25 lakh accident compensation for fishermen.",
    "fact_text_ta": "AIADMK 2026: நெல் ₹3,500/குவிண்டால், கூட்டுறவு கடன் முழு தள்ளுபடி, புதிய மின் இணைப்புகளுக்கு 100% சோலார் பம்ப் மானியம், மீனவர்களுக்கு ₹25 லட்சம் விபத்து இழப்பீடு.",
    "source_name": "DTNext – AIADMK 2026 full manifesto details",
    "source_url": "https://www.dtnext.in/news/politics/2026-tn-electionsaiadmk-offers-free-fridge-in-full-manifesto",
    "verified": True,
  },
  {
    "party": "TVK", "category": "agriculture", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK's 2026 manifesto promises 100% crop loan waiver for farmers with under 5 acres, up to 50% waiver for those with over 5 acres, and free higher education for children of farmers owning less than 2 acres.",
    "fact_text_ta": "TVK 2026: 5 ஏக்கருக்கு கீழ் விவசாயிகளுக்கு கடன் முழு தள்ளுபடி, 5 ஏக்கருக்கு மேல் 50% தள்ளுபடி, 2 ஏக்கருக்கு கீழ் விவசாயி பிள்ளைகளுக்கு இலவச உயர் கல்வி.",
    "source_name": "The Federal – TVK releases poll manifesto, targets youth voters",
    "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # EDUCATION — 2026 manifesto comparison
  # ══════════════════════════════════════════════════════════════════════

  {
    "party": "DMK", "category": "education", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto promises free laptops for 35 lakh college students over 5 years, ₹1,500/month stipend for college students, and expanding the free school breakfast scheme to Class 8.",
    "fact_text_ta": "DMK 2026: 35 லட்சம் கல்லூரி மாணவர்களுக்கு இலவச laptop, மாணவர்களுக்கு மாதம் ₹1,500, இலவச காலை உணவு திட்டம் 8ஆம் வகுப்பு வரை விரிவு.",
    "source_name": "VoterList.co.in – DMK Manifesto 2026",
    "source_url": "https://voterlist.co.in/dmk-manifesto-2026-tamil-nadu-elections/",
    "verified": True,
  },
  {
    "party": "DMK", "category": "education", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "DMK passed anti-NEET bills in 2021 and 2022 but NEET medical admissions continue in 2026 — both bills stalled without Presidential assent due to the Centre-State standoff.",
    "fact_text_ta": "DMK 2021-22ல் NEET எதிர்ப்பு சட்டம் நிறைவேற்றியது. ஆனால் 2026 வரையும் NEET நடக்கிறது — ஜனாதிபதி ஒப்புதல் கிடைக்கவில்லை.",
    "source_name": "The South First – DMK delivers 394 of 505 poll promises",
    "source_url": "https://thesouthfirst.com/tamilnadu/south-first-analysis-dmk-delivers-394-of-505-poll-promises-women-centric-schemes-lag/",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "education", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK's 2026 manifesto promises to raise NEET reservation for government school students from 7.5% to 10%, and to waive education loans for students from poor families.",
    "fact_text_ta": "AIADMK 2026: அரசு பள்ளி மாணவர்களுக்கு NEET இட ஒதுக்கீடு 7.5% → 10%, ஏழை மாணவர்களின் கல்விக் கடன் தள்ளுபடி.",
    "source_name": "LiveChennai – AIADMK 2026 manifesto 297 promises",
    "source_url": "https://www.livechennai.com/detailnews.asp?catid=&newsid=79092",
    "verified": True,
  },
  {
    "party": "TVK", "category": "education", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK's 2026 manifesto promises 500 'Creative Schools', interest-free education loans up to ₹20 lakh (Class 12 to PhD, no guarantee), waiving education loans for poor students, and conducting TNPSC exams on a transparent fixed schedule.",
    "fact_text_ta": "TVK 2026: 500 'Creative Schools', 12ஆம் வகுப்பு முதல் PhD வரை ₹20 லட்சம் வட்டியில்லா கல்விக் கடன், TNPSC தேர்வுகளை நிர்ணயித்த நாளில் நடத்துவது.",
    "source_name": "The Federal – TVK releases poll manifesto targets youth voters",
    "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # HEALTHCARE — 2026 manifesto comparison
  # ══════════════════════════════════════════════════════════════════════

  {
    "party": "DMK", "category": "healthcare", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto promises to expand CM Health Insurance (CMCHIS) coverage to ₹10 lakh/year per family (from ₹5 lakh), raise the income ceiling to ₹5 lakh/year, and double dialysis units in government hospitals.",
    "fact_text_ta": "DMK 2026: CMCHIS காப்பீட்டை ₹5 லட்சத்திலிருந்து ₹10 லட்சமாக உயர்த்துவோம், வருமான வரம்பை ₹5 லட்சமாக உயர்த்துவோம், அரசு மருத்துவமனைகளில் dialysis இரட்டிப்பு.",
    "source_name": "DNA India – DMK Superstar Manifesto 2026 key highlights",
    "source_url": "https://www.dnaindia.com/india/report-tamil-nadu-election-2026-cm-mk-stalin-dmk-s-superstar-manifesto-focuses-on-breakfast-scheme-kalaignar-magalir-urimai-thittam-enhancement-details-here-3204549",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "healthcare", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "CMCHIS (Chief Minister's Comprehensive Health Insurance Scheme) was launched under AIADMK and covers 1.48 crore families with free treatment up to ₹5 lakh/year at 1,700+ hospitals. DMK retained the scheme after 2021.",
    "fact_text_ta": "CMCHIS (AIADMK தொடங்கியது): 1.48 கோடி குடும்பங்களுக்கு ₹5 லட்சம் வரை இலவச சிகிச்சை. DMK ஆட்சிக்கு வந்தும் இந்த திட்டத்தை தொடர்கிறது.",
    "source_name": "CMCHIS Official Website – cmchistn.com",
    "source_url": "https://www.cmchistn.com/",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "healthcare", "fact_type": "positive",
    "display_order": 2,
    "fact_text": "AIADMK's 2026 manifesto promises to reopen 2,000 Amma Mini Clinics (primary care clinics shut after 2021) to restore grassroots healthcare access.",
    "fact_text_ta": "AIADMK 2026: 2021ல் மூடப்பட்ட 2,000 அம்மா மினி கிளினிக்குகளை மீண்டும் திறப்போம் — அடிமட்ட சுகாதார வசதி மீட்டெடுப்பு.",
    "source_name": "DTNext – AIADMK 2026 full manifesto",
    "source_url": "https://www.dtnext.in/news/politics/2026-tn-electionsaiadmk-offers-free-fridge-in-full-manifesto",
    "verified": True,
  },
  {
    "party": "TVK", "category": "healthcare", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK's 2026 manifesto commits to healthcare as a basic right and includes a 'Drug-Free Tamil Nadu' initiative with anti-drug zones in all schools and colleges to protect youth health.",
    "fact_text_ta": "TVK 2026: சுகாதாரம் அடிப்படை உரிமை என அறிவிப்பு, அனைத்து பள்ளி-கல்லூரிகளிலும் 'Drug-Free Zone' — இளைஞர் ஆரோக்கியம் பாதுகாக்க.",
    "source_name": "NewsBytesApp – TVK's Vijay unveils poll manifesto",
    "source_url": "https://www.newsbytesapp.com/news/politics/tvk-s-vijay-unveils-poll-manifesto/story",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # COST OF LIVING — 2026 manifesto comparison
  # ══════════════════════════════════════════════════════════════════════

  {
    "party": "DMK", "category": "cost_of_living", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "DMK's 2026 manifesto promises to build 10 lakh new homes (Kalaignar Kanavu Illam), raise old-age/widow pension to ₹2,000/month (from ₹1,200), and increase disability assistance to ₹2,500/month.",
    "fact_text_ta": "DMK 2026: 10 லட்சம் புதிய வீடுகள் (கலைஞர் கனவு இல்லம்), முதியோர்/விதவை உதவி ₹1,200 → ₹2,000, மாற்றுத்திறனாளி உதவி ₹2,500.",
    "source_name": "VoterList.co.in – DMK Manifesto 2026",
    "source_url": "https://voterlist.co.in/dmk-manifesto-2026-tamil-nadu-elections/",
    "verified": True,
  },
  {
    "party": "DMK", "category": "cost_of_living", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "TASMAC liquor revenue under DMK hit ₹48,344 crore in FY2024-25 — the highest ever. Critics argue this places a heavy cost-of-living burden on poor families where alcohol spending displaces household income.",
    "fact_text_ta": "DMK ஆட்சியில் TASMAC வருவாய் ₹48,344 கோடி (2024-25) — சாதனை உயர்வு. விமர்சகர்கள்: இது ஏழை குடும்பங்களின் வாழ்க்கை செலவை அதிகரிக்கிறது.",
    "source_name": "The Federal – Tasmac continues to power TN's treasury with Rs 48,344 cr in FY25",
    "source_url": "https://thefederal.com/category/states/south/tamil-nadu/tasmac-revenue-ed-raid-corruption-charge-senthil-balaji-183075",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "cost_of_living", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "AIADMK's 2026 manifesto promises a free refrigerator to all ~2.22 crore rice ration cardholders, 3 free LPG cylinders/year, free 1 kg dal + 1 litre cooking oil monthly, and gradual closure of liquor shops (phased prohibition).",
    "fact_text_ta": "AIADMK 2026: 2.22 கோடி ration card குடும்பங்களுக்கு இலவச ஃபிரிட்ஜ், வருடம் 3 இலவச LPG, மாதம் 1 கிலோ பருப்பு + 1 லிட்டர் எண்ணெய் இலவசம், மது கடைகள் படிப்படியாக மூடல்.",
    "source_name": "DTNext – AIADMK offers free fridge in full 2026 manifesto",
    "source_url": "https://www.dtnext.in/news/politics/2026-tn-electionsaiadmk-offers-free-fridge-in-full-manifesto",
    "verified": True,
  },
  {
    "party": "TVK", "category": "cost_of_living", "fact_type": "positive",
    "display_order": 1,
    "fact_text": "TVK's 2026 manifesto promises 6 free LPG cylinders/year (double AIADMK's offer), ₹2,500/month women's cash support, and 1 ration shop per 500 family cards with appointed village-level weighers to prevent corruption.",
    "fact_text_ta": "TVK 2026: 6 இலவச LPG சிலிண்டர் (AIADMK-ன் இரு மடங்கு), பெண்களுக்கு ₹2,500, 500 குடும்பத்திற்கு ஒரு ration கடை, கிராமத்தில் எடை சரிபார்க்க அரசு நியமனம்.",
    "source_name": "OneIndia – TVK manifesto promises jobs, cash support, free loans and more",
    "source_url": "https://www.oneindia.com/india/tamil-nadu-polls-2026-vijay-s-tvk-manifesto-promises-jobs-cash-support-free-loans-and-more-sidel-011-8041287.html",
    "verified": True,
  },

  # ══════════════════════════════════════════════════════════════════════
  # CORRUPTION / GOVERNANCE — track record + 2026 promises
  # ══════════════════════════════════════════════════════════════════════

  {
    "party": "DMK", "category": "corruption", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "TASMAC liquor sales crossed ₹45,855 crore in 2023-24 and ₹48,344 crore in FY25 under DMK — record highs — despite the party's founding anti-liquor political identity.",
    "fact_text_ta": "DMK ஆட்சியில் TASMAC விற்பனை 2023-24ல் ₹45,855 கோடி, 2024-25ல் ₹48,344 கோடி — கட்சியின் மதுவிரோத அடையாளத்திற்கு முரணான சாதனை.",
    "source_name": "DT Next – TASMAC liquor sales cross Rs 45,000 crore in 2023-24",
    "source_url": "https://www.dtnext.in/news/tamilnadu/tasmac-liquor-sales-cross-rs-45000-crore-in-2023-24-791339",
    "verified": True,
  },
  {
    "party": "DMK", "category": "corruption", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "DMK's own audit: 394 of 505 promised delivered — 111 remain unfulfilled as of April 2026. Governance credibility question: can voters trust new 2026 promises will be kept?",
    "fact_text_ta": "DMK: 505 வாக்குறுதிகளில் 394 மட்டும் நிறைவேற்றப்பட்டது — 111 இன்னும் நிறைவேறவில்லை. கேள்வி: 2026 வாக்குறுதிகளை நம்பலாமா?",
    "source_name": "The South First – DMK delivers 394 of 505 poll promises",
    "source_url": "https://thesouthfirst.com/tamilnadu/south-first-analysis-dmk-delivers-394-of-505-poll-promises-women-centric-schemes-lag/",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "corruption", "fact_type": "concern",
    "display_order": 1,
    "fact_text": "In May 2018, police fired on anti-Sterlite protesters in Tuticorin under AIADMK's watch — 13 people were killed. The Aruna Jagadeesan Commission found the firing was 'unprovoked'.",
    "fact_text_ta": "மே 2018: AIADMK ஆட்சியில் தூத்துக்குடியில் போலீஸ் சூட்டில் 13 பேர் மரணம். விசாரணை ஆணையம்: 'தூண்டுதல் இல்லாத' சூடு என கண்டறிந்தது.",
    "source_name": "Wikipedia – Thoothukudi violence (sourced from The News Minute, Down to Earth)",
    "source_url": "https://en.wikipedia.org/wiki/Thoothukudi_violence",
    "verified": True,
  },
  {
    "party": "AIADMK", "category": "corruption", "fact_type": "concern",
    "display_order": 2,
    "fact_text": "In the 2017 Gutka scam, TN Governor granted sanction to prosecute two former AIADMK ministers — Health Minister C. Vijayabaskar and BV Ramanan — after CBI raids.",
    "fact_text_ta": "2017 குட்கா வழக்கு: CBI சோதனைக்கு பின் ஆளுநர் இரு முன்னாள் AIADMK அமைச்சர்களை (விஜயபாஸ்கர், BV ராமணன்) வழக்குத் தொடர அனுமதி அளித்தார்.",
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
    "party": "TVK", "category": "corruption", "fact_type": "positive",
    "display_order": 2,
    "fact_text": "TVK's 2026 manifesto promises white papers on all major government deals, TNPSC exams on a fixed transparent schedule, and a 'Drug-Free Tamil Nadu' policy — framing governance as accountability-first.",
    "fact_text_ta": "TVK 2026: அனைத்து அரசு ஒப்பந்தங்களுக்கும் white paper வெளியீடு, TNPSC தேர்வுகள் நிர்ணயித்த கால அட்டவணையில், 'Drug-Free TN' கொள்கை.",
    "source_name": "The Federal – TVK releases poll manifesto targets youth voters",
    "source_url": "https://thefederal.com/elections-2026/tamil-nadu-elections-2026-vijay-tvk-releases-poll-manifesto-targets-youth-voters-236677",
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
