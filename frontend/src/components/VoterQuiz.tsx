"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/components/LanguageProvider";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PartyFact {
  id: number;
  party: string;
  category: string;
  fact_text: string;
  fact_text_ta: string | null;
  fact_type: "concern" | "positive";
  source_name: string;
  source_url: string | null;
  verified: boolean;
  display_order: number;
}

// ── Quiz questions ─────────────────────────────────────────────────────────────
// Each question shows real 2026 manifesto policy side by side.
// User picks the one that resonates → 1 point for that party.
// No weights, no hidden scores. Pure count = result.
const QUIZ_QUESTIONS = [
  {
    id: "women",
    icon: "👩",
    accent: "#ec4899",
    category: "women",
    label: "Women & Family Welfare",
    labelTa: "பெண்கள் நலன்",
    question: "Which women's support policy resonates most with you?",
    questionTa: "பெண்களுக்கு எந்த கொள்கை சரியானது என்று நினைக்கிறீர்கள்?",
    choices: [
      {
        party: "DMK",
        text: "Increase Magalir Urimai from ₹1,000 → ₹2,000/month for 1.37 crore women (expanding a scheme already running since 2023)",
        textTa: "மகளிர் உரிமை ₹1,000 → ₹2,000/மாதம் — 1.37 கோடி பெண்களுக்கு (2023 முதல் நடைமுறையில் உள்ளது)",
      },
      {
        party: "AIADMK",
        text: "₹2,000/month (Kula Vilakku Scheme) + ₹25,000 two-wheeler subsidy for working women + free refrigerator for all ration families",
        textTa: "குல விளக்கு திட்டம் ₹2,000/மாதம் + வேலைக்கு போகும் பெண்களுக்கு ₹25,000 இரு சக்கர மானியம் + இலவச ஃபிரிட்ஜ்",
      },
      {
        party: "TVK",
        text: "₹2,500/month (highest of all 3) + 6 free LPG cylinders/year + 8g gold + silk saree for brides from poor families (Manjal Maangalyam Scheme) + free sanitary pads at ration shops & schools",
        textTa: "மாதம் ₹2,500 (மூன்று கட்சிகளிலும் அதிகம்) + 6 இலவச LPG சிலிண்டர் + ஏழை குடும்பப் பெண்களுக்கு 8 கிராம் தங்கம் + பட்டுப்புடவை (மஞ்சள் மாங்கல்யம் திட்டம்) + ration கடை/பள்ளிகளில் sanitary pads",
      },
    ],
  },
  {
    id: "women_safety",
    icon: "🛡️",
    accent: "#db2777",
    category: "women_safety",
    label: "Women's Safety",
    labelTa: "பெண்கள் பாதுகாப்பு",
    question: "Your wife, daughter, or sister travels alone at night. Which party makes you feel safer?",
    questionTa: "உங்கள் மனைவி, மகள் அல்லது தங்கை இரவில் தனியாக பயணிக்கிறார். எந்த கட்சி நம்பிக்கை தருகிறது?",
    choices: [
      {
        party: "DMK",
        text: "Kavalan women safety app (already running) + fast-track courts for crimes against women + 2026 promise to expand safe-city surveillance and double women's helpline staff",
        textTa: "கவலன் பெண்கள் பாதுகாப்பு app (நடைமுறையில்) + பெண்களுக்கு எதிரான வழக்குகளுக்கு fast-track நீதிமன்றம் + 2026: நகர கண்காணிப்பு விரிவு, helpline இரட்டிப்பு",
      },
      {
        party: "AIADMK",
        text: "2026 promises: dedicated women police stations in all districts + 24-hour harassment helpline + self-defence training in all government schools",
        textTa: "AIADMK 2026: அனைத்து மாவட்டங்களிலும் பெண்கள் காவல் நிலையம் + 24 மணி நேர harassment helpline + அரசு பள்ளிகளில் self-defence பயிற்சி",
      },
      {
        party: "TVK",
        text: "'Rani Velu Nachiyar Padai' — 500 plain-clothes all-women police teams with body cameras across the state + 'Anjalai Ammal Fast Track Courts' for crimes against women in every district + panic buttons in all public transport linked to 24×7 command centre",
        textTa: "'ராணி வேலு நாச்சியார் படை' — 500 சாதாரண ஆடை பெண் காவல் குழுக்கள் + 'அஞ்சலை அம்மாள் விரைவு நீதிமன்றம்' ஒவ்வொரு மாவட்டத்திலும் + பொதுப்போக்குவரத்தில் panic button — 24×7 கட்டளை மையம்",
      },
    ],
  },
  {
    id: "law_order",
    icon: "👮",
    accent: "#1d4ed8",
    category: "law_order",
    label: "Law & Order",
    labelTa: "சட்டம் & ஒழுங்கு",
    question: "A crime happens in your area. Which party's approach to law enforcement do you trust?",
    questionTa: "உங்கள் பகுதியில் குற்றம் நடக்கிறது. எந்த கட்சியின் காவல் நடவடிக்கையை நம்புகிறீர்கள்?",
    choices: [
      {
        party: "DMK",
        text: "Police modernisation with tech upgrades + 2026: body cameras for all field officers, smart CCTV in cities (though TASMAC proliferation creates crime pressure on the ground)",
        textTa: "காவல் துறை நவீனமயம் + 2026: body camera, நகர கண்காணிப்பு (ஆனால் TASMAC பெருக்கம் குற்ற அழுத்தம் தருகிறது என்பது உண்மை)",
      },
      {
        party: "AIADMK",
        text: "2026 promises: independent police complaints authority + accountability reforms (note: the 2018 Tuticorin protest firing that killed 13 civilians happened under AIADMK rule)",
        textTa: "AIADMK 2026: சுயாதீன காவல் புகார் ஆணையம், பொறுப்புணர்வு சீர்திருத்தம் (குறிப்பு: 2018 தூத்துக்குடி சூட்டில் 13 பேர் மரணம் — AIADMK ஆட்சியில்)",
      },
      {
        party: "TVK",
        text: "Independent Police Complaints Authority + mandatory body cameras for all officers + 24/7 online FIR portal so no complaint can be buried at the station level",
        textTa: "சுயாதீன காவல் புகார் ஆணையம் + அனைத்து அதிகாரிகளுக்கும் body camera + 24 மணி நேர online FIR portal — நிலையத்திலேயே புகார் புதைக்க இயலாது",
      },
    ],
  },
  {
    id: "liquor",
    icon: "🚫",
    accent: "#7c3aed",
    category: "liquor",
    label: "Liquor & Family Welfare",
    labelTa: "மது & குடும்ப நலன்",
    question: "Liquor destroys thousands of Tamil families every year. What should the government do?",
    questionTa: "மதுவால் ஆண்டுதோறும் ஆயிரக்கணக்கான குடும்பங்கள் சிதறுகின்றன. அரசு என்ன செய்ய வேண்டும்?",
    choices: [
      {
        party: "DMK",
        text: "No prohibition plan — TASMAC revenue hit ₹48,344 crore in FY25 (highest ever). DMK argues the revenue funds welfare schemes, but critics say it is a double standard",
        textTa: "மதுவிலக்கு திட்டம் இல்லை — TASMAC வருவாய் ₹48,344 கோடி (FY25, சாதனை). DMK: இந்த வருவாய் நலத்திட்டங்களுக்கு — விமர்சகர்கள்: இது இரட்டை நிலைப்பாடு",
      },
      {
        party: "AIADMK",
        text: "Phased, gradual closure of liquor shops as part of a prohibition roadmap — a concrete 2026 manifesto promise targeting one of Tamil Nadu's biggest family welfare crises",
        textTa: "AIADMK 2026: மதுக்கடைகளை படிப்படியாக மூடுவோம் — மதுவிலக்கு நோக்கிய திட்டம் — தமிழ்நாட்டின் மிகப்பெரிய குடும்ப நலன் பிரச்சனைக்கு நேரடி வாக்குறுதி",
      },
      {
        party: "TVK",
        text: "Systematic reduction of alcohol dependency + mandatory de-addiction centres + 'Drug-Free Tamil Nadu' with anti-drug zones in all schools and colleges",
        textTa: "TVK: மது சார்பை முறையாக குறைக்கும் திட்டம் + கட்டாய மறுவாழ்வு மையங்கள் + அனைத்து பள்ளி-கல்லூரிகளிலும் 'Drug-Free Zone'",
      },
    ],
  },
  {
    id: "employment",
    icon: "💼",
    accent: "#f59e0b",
    category: "employment",
    label: "Jobs & Livelihoods",
    labelTa: "வேலை வாய்ப்பு",
    question: "Your son/daughter just finished college and can't find a job. Which promise helps them most?",
    questionTa: "உங்கள் மகன்/மகள் கல்லூரி முடித்து வேலை கிடைக்காமல் இருக்கிறார். எந்த வாக்குறுதி உதவும்?",
    choices: [
      {
        party: "DMK",
        text: "50 lakh jobs in 5 years + fill 1.5 lakh government vacancies + Naan Mudhalvan skill training with ₹1,500/month stipend (41 lakh already trained — a real achievement)",
        textTa: "5 ஆண்டில் 50 லட்சம் வேலைகள் + 1.5 லட்சம் அரசு காலிப்பணியிடம் + நான் முதல்வன் ₹1,500/மாதம் (41 லட்சம் பேர் பயிற்சி — உண்மையான சாதனை)",
      },
      {
        party: "AIADMK",
        text: "₹2,000/month unemployment allowance for graduates + ₹1,000/month for Class 12 pass non-graduates — direct cash while they search",
        textTa: "வேலையில்லாத பட்டதாரிகளுக்கு ₹2,000/மாதம் + 12ஆம் வகுப்பு தேர்ச்சியாளர்களுக்கு ₹1,000/மாதம் — தேடும் வரை நேரடி பணம்",
      },
      {
        party: "TVK",
        text: "₹4,000/month graduate unemployment allowance + 5 lakh paid internships per year (₹10,000/month) + 75% Tamil quota in private sector + interest-free ₹25 lakh startup loans",
        textTa: "பட்டதாரிகளுக்கு ₹4,000/மாதம் + வருடம் 5 லட்சம் internship (₹10,000/மாதம்) + தனியார் வேலையில் 75% TN பங்கு + ₹25 லட்சம் வட்டியில்லா தொழில் கடன்",
      },
    ],
  },
  {
    id: "agriculture",
    icon: "🌾",
    accent: "#16a34a",
    category: "agriculture",
    label: "Agriculture & Farmers",
    labelTa: "விவசாயம்",
    question: "A farmer in your family is struggling with loans and low prices. What matters most?",
    questionTa: "உங்கள் குடும்பத்தில் விவசாயி கடன் தொல்லையில் உள்ளார். எது அதிகம் உதவும்?",
    choices: [
      {
        party: "DMK",
        text: "Paddy MSP ₹3,500/quintal + sugarcane ₹4,500/tonne + free electric pumps for 20 lakh farmers (note: 2021 complete loan waiver promise is still unfulfilled after 5 years)",
        textTa: "நெல் ₹3,500/குவிண்டால் + கரும்பு ₹4,500/டன் + 20 லட்சம் விவசாயிகளுக்கு இலவச மோட்டார் (குறிப்பு: 2021 கடன் தள்ளுபடி வாக்குறுதி 5 ஆண்டாகியும் நிறைவேறவில்லை)",
      },
      {
        party: "AIADMK",
        text: "Full crop loan waiver from cooperative societies + paddy MSP ₹3,500 + 100% solar pump subsidy for new connections + ₹25 lakh accident compensation for fishermen",
        textTa: "கூட்டுறவு கடன் முழு தள்ளுபடி + நெல் ₹3,500 + 100% சோலார் பம்ப் மானியம் + மீனவர்களுக்கு ₹25 லட்சம்",
      },
      {
        party: "TVK",
        text: "100% cooperative loan waiver for farmers up to 5 acres + 50% for above 5 acres + MSP ₹3,500/quintal paddy + 5 lakh free solar pumps + free higher education for children of small farmers (up to 5 acres)",
        textTa: "5 ஏக்கர் வரை விவசாயிகளுக்கு 100% கூட்டுறவு கடன் தள்ளுபடி + 5 ஏக்கருக்கு மேல் 50% + நெல் ₹3,500/குவிண்டால் MSP + 5 லட்சம் இலவச சோலார் பம்பு + சிறு விவசாயி பிள்ளைகளுக்கு இலவச கல்வி",
      },
    ],
  },
  {
    id: "education",
    icon: "🎓",
    accent: "#7c3aed",
    category: "education",
    label: "Education & Youth",
    labelTa: "கல்வி & இளைஞர்",
    question: "Which education policy fits your vision for Tamil Nadu's next generation?",
    questionTa: "தமிழ்நாட்டின் அடுத்த தலைமுறைக்கு எந்த கல்விக் கொள்கை சரியானது?",
    choices: [
      {
        party: "DMK",
        text: "Free laptops for 35 lakh college students + ₹1,500/month student stipend + expand free school breakfast to Class 8 (though NEET abolition promise from 2021 remains stuck)",
        textTa: "35 லட்சம் கல்லூரி மாணவர்களுக்கு இலவச laptop + ₹1,500/மாதம் + காலை உணவு 8ஆம் வகுப்பு வரை (ஆனால் 2021 NEET ஒழிப்பு வாக்குறுதி நிறைவேறவில்லை)",
      },
      {
        party: "AIADMK",
        text: "Raise NEET reservation for government school students from 7.5% → 10% + education loan waiver for poor students",
        textTa: "அரசு பள்ளி மாணவர்களுக்கு NEET இட ஒதுக்கீடு 7.5% → 10% + ஏழை மாணவர்களின் கல்விக் கடன் தள்ளுபடி",
      },
      {
        party: "TVK",
        text: "500 Creative Schools + AI University (first in India) + interest-free ₹20 lakh education loans (Class 12 to PhD, no guarantor) + law mandating all government hiring within 365 days — ending TNPSC delays forever",
        textTa: "500 'படைப்பாளி பள்ளிகள்' + AI பல்கலைக்கழகம் (இந்தியாவில் முதல்) + ₹20 லட்சம் வட்டியில்லா கல்விக் கடன் (12ஆம் வகுப்பு முதல் PhD, ஜாமீன் இல்லாமல்) + 365 நாளில் அரசு நியமனம் கட்டாய சட்டம்",
      },
    ],
  },
  {
    id: "healthcare",
    icon: "🏥",
    accent: "#0891b2",
    category: "healthcare",
    label: "Healthcare",
    labelTa: "சுகாதாரம்",
    question: "A family member falls seriously ill. Which healthcare promise gives you real confidence?",
    questionTa: "குடும்பத்தில் யாரோ கடுமையாக நோய்வாய்படுகிறார். எந்த சுகாதார வாக்குறுதி நம்பிக்கை தருகிறது?",
    choices: [
      {
        party: "DMK",
        text: "Expand CMCHIS health insurance to ₹10 lakh/year per family (from ₹5 lakh) + raise income ceiling to ₹5 lakh + double dialysis units in government hospitals",
        textTa: "CMCHIS காப்பீடு ₹5 லட்சம் → ₹10 லட்சம் + வருமான வரம்பு ₹5 லட்சம் + அரசு மருத்துவமனையில் dialysis இரட்டிப்பு",
      },
      {
        party: "AIADMK",
        text: "Reopen 2,000 Amma Mini Clinics (primary care clinics shut since 2021) + CMCHIS was launched under AIADMK and still runs — they built the foundation",
        textTa: "2021ல் மூடப்பட்ட 2,000 அம்மா மினி கிளினிக்குகளை மீண்டும் திறப்போம் + CMCHIS ஆரம்பித்தவர்கள் AIADMK — அடித்தளம் அவர்களே",
      },
      {
        party: "TVK",
        text: "₹25 lakh family health insurance for every household (5× TN's current CMCHIS) + annual free full-body check-up for all citizens + dedicated cancer insurance coverage",
        textTa: "ஒவ்வொரு குடும்பத்திற்கும் ₹25 லட்சம் மருத்துவ காப்பீடு (தற்போதைய CMCHIS-ன் 5 மடங்கு) + ஆண்டுதோறும் இலவச முழு உடல் பரிசோதனை + கான்சர் காப்பீடு",
      },
    ],
  },
  {
    id: "cost_of_living",
    icon: "🛒",
    accent: "#d97706",
    category: "cost_of_living",
    label: "Cost of Living",
    labelTa: "வாழ்க்கை செலவு",
    question: "At the end of the month there's nothing left. Which promise actually reduces your daily burden?",
    questionTa: "மாத கடைசியில் கையில் பணம் இல்லை. எந்த வாக்குறுதி உங்கள் தினசரி சுமையை குறைக்கும்?",
    choices: [
      {
        party: "DMK",
        text: "10 lakh new homes + raise old-age/widow pension to ₹2,000/month + increase disability support to ₹2,500/month + ₹8,000 appliance coupon for homemakers",
        textTa: "10 லட்சம் வீடுகள் + முதியோர்/விதவை உதவி ₹2,000/மாதம் + மாற்றுத்திறன் ₹2,500/மாதம் + இல்லத்தரசிகளுக்கு ₹8,000 appliance coupon",
      },
      {
        party: "AIADMK",
        text: "Free refrigerator for 2.22 crore ration families + 3 free LPG cylinders/year + free 1 kg dal + 1 litre cooking oil monthly + phased closure of liquor shops",
        textTa: "2.22 கோடி குடும்பங்களுக்கு இலவச ஃபிரிட்ஜ் + வருடம் 3 இலவச LPG + மாதம் 1 கிலோ பருப்பு + 1 லிட்டர் எண்ணெய் + மது கடைகள் படிப்படியாக மூடல்",
      },
      {
        party: "TVK",
        text: "200 units free electricity/month (double DMK's 100 units) + 6 free LPG cylinders/year + ₹3,000/month for senior citizens, widows & persons with disabilities + free house pattas for those living on government land",
        textTa: "மாதம் 200 யூனிட் இலவச மின்சாரம் (DMK-ன் 100 யூனிட்டின் இரு மடங்கு) + 6 இலவச LPG சிலிண்டர் + முதியோர்/விதவைகள்/மாற்றுத்திறனாளிகளுக்கு ₹3,000/மாதம் + அரசு நிலத்தில் வாழ்வோருக்கு இலவச வீட்டு பட்டா",
      },
    ],
  },
  {
    id: "corruption",
    icon: "⚖️",
    accent: "#dc2626",
    category: "corruption",
    label: "Corruption & Governance",
    labelTa: "ஊழல் & நேர்மை",
    question: "You've seen governments lie and steal. Which track record or promise makes you believe change is possible?",
    questionTa: "அரசியல்வாதிகள் பொய் சொல்வதும் சுருட்டுவதும் நீங்கள் பார்த்திருக்கிறீர்கள். யார் மீது நம்பிக்கை வைப்பீர்கள்?",
    choices: [
      {
        party: "DMK",
        text: "394 of 505 promises delivered (78%) — a documented track record. But TASMAC revenue under DMK hit a record ₹48,344 crore in FY25 despite their founding anti-liquor identity",
        textTa: "505 வாக்குறுதிகளில் 394 நிறைவேற்றம் (78%) — ஆவணப்பட்ட சாதனை. ஆனால் TASMAC வருவாய் ₹48,344 கோடி (FY25 சாதனை) — மதுவிரோத கட்சி இது?",
      },
      {
        party: "AIADMK",
        text: "Introduced lasting schemes like CMCHIS, Amma Unavagam still running today. But: Gutka scam prosecutions against ministers + 2018 Tuticorin firing killing 13 protesters are on permanent record",
        textTa: "CMCHIS, அம்மா உணவகம் இன்னும் இயங்குகின்றன — நீடித்த பணி. ஆனால்: குட்கா வழக்கு + 2018 தூத்துக்குடி சூட்டில் 13 பேர் மரணம் — இது வரலாற்றில் பதிவு",
      },
      {
        party: "TVK",
        text: "Zero corruption record (brand new party). White papers on all govt deals + Tamil Nadu Recruitment Accountability Act (all hiring within 365 days by law, not discretion) + ₹15,000 Cr MSME safety net. Betting on potential, not track record",
        textTa: "ஊழல் வரலாறே இல்லை (புதிய கட்சி). அனைத்து அரசு ஒப்பந்தங்களுக்கும் வெள்ளை அறிக்கை + 365 நாளில் நியமனம் கட்டாய சட்டம் + ₹15,000 கோடி MSME நிதி. சாத்தியத்தில் நம்பிக்கை வைக்கிறீர்கள்",
      },
    ],
  },
  {
    id: "vision",
    icon: "🔭",
    accent: "#6366f1",
    category: "corruption",
    label: "Your Vote, Your Tamil Nadu",
    labelTa: "உங்கள் வாக்கு, உங்கள் தமிழ்நாடு",
    question: "Think of Tamil Nadu 10 years from now. Which path feels right?",
    questionTa: "10 ஆண்டுகள் கழித்த தமிழ்நாட்டை மனதில் நினைத்துக்கொள்ளுங்கள். எந்த பாதை சரியானது?",
    choices: [
      {
        party: "DMK",
        text: "Continue the Dravidian model — proven governance, expanding running schemes with larger numbers, state autonomy push against Centre",
        textTa: "திராவிட மாடல் தொடர்வு — ஆவணப்பட்ட ஆட்சி, நடைமுறையிலுள்ள திட்டங்கள் விரிவு, மத்திய அரசுக்கு எதிராக மாநில உரிமை",
      },
      {
        party: "AIADMK",
        text: "Return AIADMK — restore Amma-era welfare and grassroots schemes that DMK has let lapse, with a tested party machine behind them",
        textTa: "AIADMK திரும்பட்டும் — DMK கை விட்ட அம்மா காலத் திட்டங்களை மீட்பு, அனுபவமிக்க கட்சி இயந்திரம்",
      },
      {
        party: "TVK",
        text: "Give fresh blood a chance — target $1.5 trillion TN economy by 2036 + India's first AI Ministry for governance + highest welfare promises of any party + a leader staking his entire career on one shot, with zero corrupt history to answer for",
        textTa: "புதுமுகத்திற்கு வாய்ப்பு கொடு — 2036-ல் $1.5 ட்ரில்லியன் TN பொருளாதாரம் + இந்தியாவின் முதல் AI அமைச்சகம் + எல்லா கட்சிகளையும் விட அதிக நலன் வாக்குறுதிகள் + ஊழல் வரலாறே இல்லாத தலைவர், career முழுவதும் பணயம்",
      },
    ],
  },
];

const PARTY_META: Record<string, { color: string }> = {
  DMK:    { color: "#c0392b" },
  TVK:    { color: "#1a5276" },
  AIADMK: { color: "#2d7a4f" },
};
const MEDALS = ["🥇", "🥈", "🥉"];

// ── Score computation — purely additive, 1 point per question pick ─────────────
function computeResults(picks: Record<string, string>) {
  const tally: Record<string, number> = { DMK: 0, TVK: 0, AIADMK: 0 };
  for (const party of Object.values(picks)) {
    if (party in tally) tally[party]++;
  }
  const total = QUIZ_QUESTIONS.length;
  return Object.entries(tally)
    .map(([party, score]) => ({ party, score, pct: Math.round((score / total) * 100) }))
    .sort((a, b) => b.score - a.score);
}

// ── Fact card component ───────────────────────────────────────────────────────
function FactCard({ fact, isTa }: { fact: PartyFact; isTa: boolean }) {
  const isConcern = fact.fact_type === "concern";
  return (
    <div className={`rounded-xl p-3 border ${isConcern ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm flex-shrink-0 mt-0.5">{isConcern ? "⚠️" : "✅"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-700 leading-relaxed">
            {(isTa && fact.fact_text_ta) ? fact.fact_text_ta : fact.fact_text}
          </p>
          {fact.source_url ? (
            <a
              href={fact.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-terracotta mt-1.5 transition-colors"
            >
              <span>📎</span>
              <span className="underline underline-offset-2 truncate max-w-[240px]">{fact.source_name}</span>
              {!fact.verified && <span className="text-amber-500 font-semibold ml-1">(being verified)</span>}
            </a>
          ) : (
            <p className="text-[11px] text-gray-400 mt-1">📎 {fact.source_name}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VoterQuiz() {
  const { lang } = useLang();
  const isTa = lang === "ta";

  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [expandedFacts, setExpandedFacts] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [facts, setFacts] = useState<PartyFact[]>([]);
  const [factsLoading, setFactsLoading] = useState(false);

  useEffect(() => {
    if (!open || facts.length > 0) return;
    setFactsLoading(true);
    supabase
      .from("party_facts")
      .select("*")
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        if (data) setFacts(data);
        setFactsLoading(false);
      });
  }, [open, facts.length]);

  const pickedCount = Object.keys(picks).length;
  const allPicked = pickedCount === QUIZ_QUESTIONS.length;
  const results = useMemo(() => computeResults(picks), [picks]);

  const factsByPartyCategory = useMemo(() => {
    const out: Record<string, Record<string, PartyFact[]>> = {};
    for (const f of facts) {
      if (!out[f.party]) out[f.party] = {};
      if (!out[f.party][f.category]) out[f.party][f.category] = [];
      out[f.party][f.category].push(f);
    }
    return out;
  }, [facts]);

  function buildShareText() {
    const winner = results[0];
    return [
      "🗳️ Tamil Nadu 2026 — என் Voter Match!",
      "",
      `🏆 என் match: ${winner?.party} (${winner?.score}/${QUIZ_QUESTIONS.length} questions)`,
      "",
      ...results.map((r, i) => `${MEDALS[i]} ${r.party} — ${r.score}/${QUIZ_QUESTIONS.length} priorities matched`),
      "",
      "My picks:",
      ...QUIZ_QUESTIONS.map((q) => `${q.icon} ${isTa ? q.labelTa : q.label}: ${picks[q.id] || "—"}`),
      "",
      "🔍 Data-backed voter guide 👉 tnelections.info",
    ].join("\n");
  }

  function handleShare() {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText())}`, "_blank");
    setShared(true);
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildShareText());
    setShared(true);
  }

  // ── Closed teaser ─────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl overflow-hidden border-2 border-dashed border-terracotta/40 hover:border-terracotta transition-all group"
        style={{ background: "linear-gradient(135deg, #fff8f3 0%, #fff3e8 100%)" }}
      >
        <div className="px-5 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm bg-white"
              style={{ border: "2px solid #f59e0b33" }}>
              🗳️
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-terracotta text-white px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  NEW — Try it
                </span>
                <span className="text-gray-400 text-xs">~3 min · real 2026 manifestos</span>
              </div>
              <p className="text-gray-900 font-extrabold text-lg leading-snug">
                {isTa ? "உங்களுக்கு எந்த கட்சி சரியானது?" : "Who Should I Vote For?"}
              </p>
              <p className="text-gray-500 text-sm mt-0.5">
                {isTa
                  ? "11 கேள்விகள் · உண்மையான manifesto கொள்கைகள் ஒப்பிடு · verified sources"
                  : "11 questions · pick real policies · your honest party match + WhatsApp share"}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 bg-terracotta text-white font-bold text-sm px-5 py-2.5 rounded-xl group-hover:bg-[#a33d0e] transition-colors shadow">
            {isTa ? "தொடங்கு →" : "Start quiz →"}
          </div>
        </div>
      </button>
    );
  }

  // ── Open quiz ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-xl bg-white">

      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #fff8f3 0%, #fff 100%)" }}>
        <div>
          <p className="font-extrabold text-gray-900 text-base">
            {isTa ? "உங்களுக்கு எந்த கட்சி சரியானது?" : "Who Should I Vote For?"}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {isTa
              ? "ஒவ்வொரு கேள்விக்கும் உங்களுக்கு பிடித்த கொள்கையை தேர்வு செய்யுங்கள்"
              : "Pick the policy that resonates · results from real 2026 manifestos · no hidden bias"}
          </p>
        </div>
        <button
          onClick={() => { setOpen(false); setPicks({}); setShared(false); setExpandedFacts(null); }}
          className="text-gray-300 hover:text-gray-600 text-xl transition-colors ml-3"
        >✕</button>
      </div>

      {/* Questions */}
      <div className="divide-y divide-gray-50">
        {QUIZ_QUESTIONS.map((q, qi) => {
          const picked = picks[q.id];
          return (
            <div key={q.id} className="px-5 py-5">
              {/* Question header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: q.accent + "18", border: `1.5px solid ${q.accent}33` }}>
                  {q.icon}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm leading-snug">
                    {qi + 1}. {isTa ? q.questionTa : q.question}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">{isTa ? q.labelTa : q.label}</p>
                </div>
              </div>

              {/* Choice buttons */}
              <div className="space-y-2">
                {q.choices.map((choice) => {
                  const meta = PARTY_META[choice.party];
                  const isSelected = picked === choice.party;
                  return (
                    <button
                      key={choice.party}
                      onClick={() => setPicks((prev) => ({ ...prev, [q.id]: choice.party }))}
                      className="w-full text-left rounded-xl px-4 py-3 transition-all border-2 focus:outline-none"
                      style={{
                        borderColor: isSelected ? meta.color : "#e5e7eb",
                        background: isSelected ? meta.color + "12" : "#fafafa",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="text-xs font-extrabold flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-md"
                          style={{
                            color: isSelected ? "#fff" : meta.color,
                            background: isSelected ? meta.color : meta.color + "18",
                          }}
                        >
                          {/* {choice.party} */}
                        </span>
                        <p className="text-xs text-gray-700 leading-relaxed flex-1">
                          {isTa ? choice.textTa : choice.text}
                        </p>
                        {isSelected && (
                          <span className="flex-shrink-0 text-base ml-1">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-terracotta transition-all"
            style={{ width: `${(pickedCount / QUIZ_QUESTIONS.length) * 100}%` }} />
        </div>
        <span className="text-xs text-gray-400">{pickedCount}/{QUIZ_QUESTIONS.length}</span>
        {pickedCount > 0 && !allPicked && (
          <span className="text-xs text-terracotta font-medium">
            {isTa ? `${QUIZ_QUESTIONS.length - pickedCount} மேலும்` : `${QUIZ_QUESTIONS.length - pickedCount} left`}
          </span>
        )}
      </div>

      {/* Results */}
      {allPicked && (
        <div className="px-5 py-6 border-t-2 border-terracotta/20">
          <p className="font-extrabold text-gray-900 text-base mb-1">
            🎯 {isTa ? "உங்கள் party match" : "Your party match"}
          </p>
          <p className="text-xs text-gray-400 mb-5">
            {isTa
              ? "உங்கள் தேர்வுகளின் அடிப்படையில் மட்டுமே — எந்த மறைமுக scoring-உம் இல்லை"
              : "Based purely on your picks — no hidden weights, no bias"}
          </p>

          <div className="space-y-4 mb-6">
            {results.map((r, i) => {
              const meta = PARTY_META[r.party];
              const partyFacts = factsByPartyCategory[r.party] || {};
              const allPartyFacts = Object.values(partyFacts).flat();
              const concerns = allPartyFacts.filter((f) => f.fact_type === "concern");
              const positives = allPartyFacts.filter((f) => f.fact_type === "positive");
              const isExpanded = expandedFacts === r.party;

              return (
                <div key={r.party}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">{MEDALS[i]}</span>
                    <span className="text-sm font-extrabold w-16 flex-shrink-0" style={{ color: meta.color }}>{r.party}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div className="h-3 rounded-full transition-all duration-700"
                        style={{ width: `${r.pct}%`, background: meta.color }} />
                    </div>
                    <span className="text-xs text-gray-500 w-20 text-right flex-shrink-0">
                      {r.score}/{QUIZ_QUESTIONS.length} picks
                    </span>
                  </div>

                  <div className="ml-10 pl-3 border-l-2" style={{ borderColor: meta.color + "40" }}>
                    <button
                      onClick={() => setExpandedFacts(isExpanded ? null : r.party)}
                      className="text-xs font-semibold hover:underline transition-colors"
                      style={{ color: meta.color }}
                    >
                      {isExpanded
                        ? (isTa ? "மூடு ▲" : "Hide ▲")
                        : (isTa ? "உண்மை என்ன? ▼" : "See verified facts ▼")}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        {factsLoading ? (
                          <p className="text-xs text-gray-400 animate-pulse">Loading facts...</p>
                        ) : allPartyFacts.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Facts loading — check back soon.</p>
                        ) : (
                          <>
                            {positives.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                  {isTa ? "நம்பிக்கை தரும் காரணங்கள்" : "In their favour"}
                                </p>
                                {positives.slice(0, 3).map((f) => <FactCard key={f.id} fact={f} isTa={isTa} />)}
                              </div>
                            )}
                            {concerns.length > 0 && (
                              <div className="space-y-1.5 mt-2">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                  {isTa ? "கவலைப்படுவதற்கான காரணங்கள்" : "Concerns"}
                                </p>
                                {concerns.slice(0, 3).map((f) => <FactCard key={f.id} fact={f} isTa={isTa} />)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 mb-5 leading-relaxed">
            {isTa
              ? "* இது data-guided voter tool மட்டுமே. அனைத்து facts-க்கும் source links உள்ளன. இறுதி முடிவு உங்களுடையது."
              : "* Data-guided tool only. Every fact links to a verified source. Final judgment is always yours."}
          </p>

          <div className="flex flex-wrap gap-3">
            <button onClick={handleShare}
              className="flex items-center gap-2 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors shadow"
              style={{ background: "#25D366" }}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {isTa ? "WhatsApp-ல் share செய்" : "Share on WhatsApp"}
            </button>
            <button onClick={handleCopy}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors">
              📋 {isTa ? "Copy" : "Copy text"}
            </button>
            <button onClick={() => { setPicks({}); setExpandedFacts(null); setShared(false); }}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-500 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors">
              🔄 {isTa ? "மீண்டும்" : "Retake"}
            </button>
          </div>

          {shared && (
            <p className="text-green-600 text-xs mt-3 font-semibold">
              ✓ {isTa ? "Ready! நண்பர்களுக்கு share செய்யுங்கள் 🙌" : "Copied! Spread the word 🙌"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
