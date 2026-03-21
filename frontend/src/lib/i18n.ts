/**
 * i18n dictionary — all translatable strings for EN and TA.
 * Usage: const { t } = useLang();  t("home.title")
 *
 * Naming convention: "page.section.element"
 * Candidate names, party abbreviations, and numbers are NOT translated.
 */

export type Lang = "en" | "ta";

type DictEntry = { en: string; ta: string };

const dict: Record<string, DictEntry> = {
  // ── Navigation ──────────────────────────────────
  "nav.home": { en: "Home", ta: "முகப்பு" },
  "nav.districts": { en: "Districts", ta: "மாவட்டங்கள்" },
  "nav.factcheck": { en: "Narrative Check", ta: "கூற்று சரிபார்ப்பு" },
  "nav.swingseats": { en: "Swing Seats", ta: "ஊசலாடும் தொகுதிகள்" },
  "nav.manifesto": { en: "Manifestos", ta: "தேர்தல் அறிக்கை" },
  "nav.chat": { en: "Ask TN Elections", ta: "தேர்தல் உதவி" },
  "nav.back_home": { en: "Home", ta: "முகப்பு" },

  // ── Homepage ────────────────────────────────────
  "home.badge": { en: "AI agents investigating candidates live", ta: "AI செயலிகள் வேட்பாளர்களை நேரடியாக ஆராய்கின்றன" },
  "home.title": { en: "Know your candidates.", ta: "உங்கள் வேட்பாளர்களை அறியுங்கள்." },
  "home.subtitle": { en: "Break the narratives.", ta: "கட்டுக்கதைகளை உடையுங்கள்." },
  "home.tagline": { en: "Your vote, your truth. — Tamil Nadu Elections 2026", ta: "உங்கள் வாக்கு, உங்கள் உண்மை — தமிழ்நாடு தேர்தல் 2026" },
  "home.tagline_ta": { en: "உங்கள் வாக்கு, உங்கள் உண்மை", ta: "உங்கள் வாக்கு, உங்கள் உண்மை" },
  "home.search_placeholder": { en: "Search constituency, district or candidate...", ta: "தொகுதி, மாவட்டம் அல்லது வேட்பாளரை தேடுங்கள்..." },
  "home.search_hint": { en: "constituencies loaded · Click to investigate any candidate with AI", ta: "தொகுதிகள் ஏற்றப்பட்டன · AI மூலம் எந்த வேட்பாளரையும் ஆராய கிளிக் செய்யுங்கள்" },
  "home.nominations": { en: "Nominations Open", ta: "வேட்புமனு தொடக்கம்" },
  "home.polling": { en: "Polling Day", ta: "வாக்குப்பதிவு நாள்" },
  "home.results": { en: "Results", ta: "முடிவுகள்" },
  "home.days_away": { en: "days away", ta: "நாட்கள் உள்ளன" },

  // ── Districts page ──────────────────────────────
  "districts.title": { en: "Districts", ta: "மாவட்டங்கள்" },
  "districts.subtitle": { en: "All 38 districts of Tamil Nadu", ta: "தமிழ்நாட்டின் அனைத்து 38 மாவட்டங்கள்" },
  "districts.constituencies": { en: "constituencies", ta: "தொகுதிகள்" },
  "districts.swing_title": { en: "Swing Seat Detector", ta: "ஊசலாடும் தொகுதி கண்டறிதல்" },
  "districts.swing_desc": { en: "Find the closest battles in Tamil Nadu", ta: "தமிழ்நாட்டின் நெருக்கமான போட்டிகளை கண்டறியுங்கள்" },
  "districts.view_swing": { en: "View all swing seats", ta: "அனைத்து ஊசலாடும் தொகுதிகளையும் காண்க" },

  // ── District detail ─────────────────────────────
  "district.constituencies_in": { en: "Constituencies in", ta: "தொகுதிகள் —" },
  "district.winner": { en: "Winner", ta: "வெற்றியாளர்" },
  "district.party": { en: "Party", ta: "கட்சி" },
  "district.margin": { en: "Margin", ta: "வித்தியாசம்" },

  // ── Constituency page ───────────────────────────
  "const.district": { en: "District", ta: "மாவட்டம்" },
  "const.current_mla": { en: "Current MLA", ta: "தற்போதைய சட்டமன்ற உறுப்பினர்" },
  "const.candidates_2021": { en: "2021 Candidates", ta: "2021 வேட்பாளர்கள்" },
  "const.votes": { en: "Votes", ta: "வாக்குகள்" },
  "const.vote_share": { en: "Vote Share", ta: "வாக்கு சதவீதம்" },
  "const.winner_label": { en: "Winner", ta: "வெற்றியாளர்" },
  "const.investigate": { en: "Investigate all candidates", ta: "அனைத்து வேட்பாளர்களையும் ஆராயுங்கள்" },
  "const.candidate_score": { en: "Candidate Score", ta: "வேட்பாளர் மதிப்பெண்" },
  "const.compare": { en: "Compare", ta: "ஒப்பிடு" },

  // ── Candidate page ──────────────────────────────
  "cand.profile": { en: "Candidate Profile", ta: "வேட்பாளர் விவரம்" },
  "cand.party": { en: "Party", ta: "கட்சி" },
  "cand.age": { en: "Age", ta: "வயது" },
  "cand.education": { en: "Education", ta: "கல்வி" },
  "cand.criminal_cases": { en: "Criminal Cases", ta: "குற்ற வழக்குகள்" },
  "cand.declared": { en: "Declared", ta: "அறிவிக்கப்பட்டது" },
  "cand.ecourts": { en: "eCourts", ta: "eCourts" },
  "cand.clean_record": { en: "Clean Record", ta: "சுத்தமான பதிவு" },
  "cand.minor_cases": { en: "Minor Cases", ta: "சிறிய வழக்குகள்" },
  "cand.serious_cases": { en: "Serious Cases", ta: "தீவிர வழக்குகள்" },
  "cand.assets": { en: "Declared Assets", ta: "அறிவிக்கப்பட்ட சொத்துகள்" },
  "cand.movable": { en: "Movable", ta: "அசையும் சொத்து" },
  "cand.immovable": { en: "Immovable", ta: "அசையா சொத்து" },
  "cand.liabilities": { en: "Liabilities", ta: "கடன்கள்" },
  "cand.net_worth": { en: "Net Worth", ta: "நிகர சொத்து" },
  "cand.not_disclosed": { en: "Not disclosed", ta: "தெரிவிக்கப்படவில்லை" },
  "cand.votes_received": { en: "Votes Received", ta: "பெற்ற வாக்குகள்" },
  "cand.position": { en: "Position", ta: "நிலை" },
  "cand.rivals": { en: "Rivals", ta: "போட்டியாளர்கள்" },
  "cand.score_breakdown": { en: "Candidate Score Breakdown", ta: "வேட்பாளர் மதிப்பெண் விவரம்" },
  "cand.affidavit": { en: "View Affidavit", ta: "பிரமாணப் பத்திரம் காண்க" },
  "cand.view_constituency": { en: "View Constituency", ta: "தொகுதியை காண்க" },
  "cand.compare_with": { en: "Compare with", ta: "ஒப்பிடு —" },

  // ── Fact Check page ─────────────────────────────
  "fc.title": { en: "Narrative Check", ta: "கூற்று சரிபார்ப்பு" },
  "fc.subtitle": { en: "Paste any political claim, WhatsApp forward, or social media post. Our AI fact-checker will verify it against official election data and return a verdict.", ta: "எந்தவொரு அரசியல் கூற்றையும், WhatsApp பகிர்வையும், அல்லது சமூக ஊடக பதிவையும் ஒட்டுங்கள். எங்கள் AI உண்மை சரிபார்ப்பு அதிகாரப்பூர்வ தேர்தல் தரவுகளுடன் சரிபார்த்து தீர்ப்பு வழங்கும்." },
  "fc.input_label": { en: "What claim do you want to check?", ta: "எந்த கூற்றை சரிபார்க்க விரும்புகிறீர்கள்?" },
  "fc.placeholder": { en: "e.g. \"DMK promised 1000 new schools but only built 200\" or paste a WhatsApp forward...", ta: "எ.கா. \"DMK 1000 புதிய பள்ளிகளை உறுதியளித்தது ஆனால் 200 மட்டுமே கட்டியது\" அல்லது WhatsApp பகிர்வை ஒட்டுங்கள்..." },
  "fc.submit": { en: "Check Claim", ta: "கூற்றை சரிபார்" },
  "fc.checking": { en: "Checking...", ta: "சரிபார்க்கிறது..." },
  "fc.pipeline": { en: "Multi-agent pipeline running...", ta: "பல-செயலி குழாய் இயங்குகிறது..." },
  "fc.claim_checked": { en: "Claim checked", ta: "சரிபார்க்கப்பட்ட கூற்று" },
  "fc.explanation": { en: "Explanation", ta: "விளக்கம்" },
  "fc.sources": { en: "Sources", ta: "ஆதாரங்கள்" },
  "fc.reasoning": { en: "AI Reasoning Trace", ta: "AI பகுப்பாய்வு" },
  "fc.recent": { en: "Recent Checks", ta: "சமீபத்திய சரிபார்ப்புகள்" },
  "fc.no_checks": { en: "No fact-checks yet. Be the first to check a claim!", ta: "இதுவரை சரிபார்ப்புகள் இல்லை. முதலில் ஒரு கூற்றை சரிபார்க்கவும்!" },
  "fc.disclaimer": { en: "AI-generated analysis. Always verify with official sources. This is not legal or journalistic advice.", ta: "AI உருவாக்கிய பகுப்பாய்வு. எப்போதும் அதிகாரப்பூர்வ ஆதாரங்களுடன் சரிபார்க்கவும்." },

  // ── Verdicts ────────────────────────────────────
  "verdict.true": { en: "True", ta: "உண்மை" },
  "verdict.misleading": { en: "Misleading", ta: "தவறான தகவல்" },
  "verdict.false": { en: "False", ta: "பொய்" },
  "verdict.unverifiable": { en: "Unverifiable", ta: "சரிபார்க்க இயலாது" },

  // ── Swing Seats ─────────────────────────────────
  "swing.title": { en: "Swing Seat Detector", ta: "ஊசலாடும் தொகுதி கண்டறிதல்" },
  "swing.subtitle": { en: "Constituencies ranked by 2021 victory margin", ta: "2021 வெற்றி வித்தியாசத்தின் அடிப்படையில் தொகுதிகள்" },
  "swing.red": { en: "Red Zone", ta: "சிவப்பு மண்டலம்" },
  "swing.yellow": { en: "Yellow Zone", ta: "மஞ்சள் மண்டலம்" },
  "swing.green": { en: "Safe", ta: "பாதுகாப்பானது" },
  "swing.margin_label": { en: "margin", ta: "வித்தியாசம்" },
  "swing.filter_district": { en: "All districts", ta: "அனைத்து மாவட்டங்கள்" },
  "swing.filter_party": { en: "All parties", ta: "அனைத்து கட்சிகள்" },
  "swing.clear_filters": { en: "Clear filters", ta: "வடிகட்டிகளை நீக்கு" },

  // ── Chatbot ─────────────────────────────────────
  "chat.title": { en: "Ask TN Elections", ta: "தேர்தல் உதவி" },
  "chat.subtitle": { en: "AI-powered election assistant", ta: "AI இயங்கும் தேர்தல் உதவியாளர்" },
  "chat.welcome": { en: "Hi! I'm your TN Elections assistant. Ask me anything about candidates, constituencies, or election data. You can also use voice!", ta: "வணக்கம்! நான் உங்கள் தேர்தல் உதவியாளர். வேட்பாளர்கள், தொகுதிகள், அல்லது தேர்தல் தரவு பற்றி எதையும் கேளுங்கள். குரல் கட்டளையும் பயன்படுத்தலாம்!" },
  "chat.placeholder": { en: "Ask about TN elections...", ta: "தேர்தல் பற்றி கேளுங்கள்..." },
  "chat.listening": { en: "Listening...", ta: "கேட்கிறது..." },
  "chat.suggestion1": { en: "Who is the MLA of Singanallur?", ta: "சிங்காநல்லூர் MLA யார்?" },
  "chat.suggestion2": { en: "Richest candidate in Chennai?", ta: "சென்னையின் பணக்கார வேட்பாளர்?" },
  "chat.suggestion3": { en: "DMK vs ADMK seat count in 2021", ta: "2021 DMK vs ADMK இடங்கள்" },

  // ── Daily Briefing ────────────────────────────────
  "briefing.section_title": { en: "Daily Election Briefing", ta: "தினசரி தேர்தல் சுருக்கம்" },
  "briefing.ai_tag": { en: "AI Generated", ta: "AI உருவாக்கம்" },
  "briefing.read_more": { en: "Read full briefing", ta: "முழு சுருக்கத்தைப் படிக்கவும்" },
  "briefing.show_less": { en: "Show less", ta: "குறைவாகக் காட்டு" },
  "briefing.sources": { en: "Source Stories", ta: "மூல செய்திகள்" },
  "briefing.disclaimer": { en: "AI-generated summary from public news sources. Verify with official sources.", ta: "பொது செய்தி ஆதாரங்களிலிருந்து AI உருவாக்கிய சுருக்கம். அதிகாரப்பூர்வ ஆதாரங்களுடன் சரிபார்க்கவும்." },

  // ── News Feed ─────────────────────────────────
  "nav.news": { en: "News", ta: "செய்திகள்" },
  "nav.results": { en: "Results", ta: "தேர்தல் முடிவுகள்" },
  "news.title": { en: "Party News Feed", ta: "கட்சி செய்திகள்" },
  "news.subtitle": { en: "Live election news from Tamil Nadu — filtered by party, with source bias labels", ta: "தமிழ்நாட்டின் நேரடி தேர்தல் செய்திகள் — கட்சி வாரியாக, ஊடக சார்பு அடையாளங்களுடன்" },

  // ── Common ──────────────────────────────────────
  "common.loading": { en: "Loading...", ta: "ஏற்றுகிறது..." },
  "common.error": { en: "Something went wrong", ta: "ஏதோ தவறாகிவிட்டது" },
  "common.try_again": { en: "Try again", ta: "மீண்டும் முயற்சிக்கவும்" },
  "common.footer": { en: "Data from Election Commission of India · Tamil Nadu Elections 2026", ta: "இந்திய தேர்தல் ஆணையத்தின் தரவு · தமிழ்நாடு தேர்தல் 2026" },
  "common.cr": { en: "Cr", ta: "கோடி" },
  "common.lakh": { en: "L", ta: "லட்சம்" },
};

/**
 * Translate a key to the given language.
 * Falls back to English if key not found.
 */
export function translate(key: string, lang: Lang): string {
  const entry = dict[key];
  if (!entry) return key; // fallback: return the key itself
  return entry[lang] || entry.en;
}
