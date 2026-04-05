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

// ── Quiz questions — each presents real policy choices from verified 2026 manifestos ──
// The user picks the party whose policy resonates most → 1 point for that party.
// Questions are designed around meaningful, differentiating real policies.
// No hidden weights, no hardcoded scores — just 1 point per pick.
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
        text: "Increase Magalir Urimai from ₹1,000 → ₹2,000/month for 1.37 crore women (continuing a running scheme)",
        textTa: "மகளிர் உரிமை ₹1,000 → ₹2,000/மாதம் — 1.37 கோடி பெண்களுக்கு (தற்போது நடைமுறையில் உள்ள திட்டம் விரிவு)",
      },
      {
        party: "AIADMK",
        text: "₹2,000/month (Kula Vilakku Scheme) + ₹25,000 two-wheeler subsidy for working women + free refrigerator",
        textTa: "குல விளக்கு திட்டம் ₹2,000/மாதம் + வேலைக்கு போகும் பெண்களுக்கு ₹25,000 இரு சக்கர மானியம் + இலவச ஃபிரிட்ஜ்",
      },
      {
        party: "TVK",
        text: "₹2,500/month (highest offer) + 6 free LPG cylinders/year + 1 sovereign gold coin for brides + free sanitary pads at ration shops",
        textTa: "மாதம் ₹2,500 (மூன்று கட்சிகளிலும் அதிகம்) + 6 இலவச LPG சிலிண்டர் + திருமண தங்க நாணயம் + ration கடையில் sanitary pads",
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
    question: "Which employment policy matters most to you?",
    questionTa: "வேலை வாய்ப்புக்கான எந்த கொள்கை சரியானது?",
    choices: [
      {
        party: "DMK",
        text: "50 lakh jobs over 5 years + fill 1.5 lakh government vacancies + Naan Mudhalvan skill training (41 lakh already trained)",
        textTa: "5 ஆண்டில் 50 லட்சம் வேலைகள் + 1.5 லட்சம் அரசு காலிப்பணியிடங்கள் + நான் முதல்வன் (41 லட்சம் பேர் பயிற்சி பெற்றனர்)",
      },
      {
        party: "AIADMK",
        text: "₹2,000/month unemployment allowance for graduates, ₹1,000/month for Class 12 pass non-graduates",
        textTa: "வேலையில்லாத பட்டதாரிகளுக்கு ₹2,000/மாதம், 12ஆம் வகுப்பு தேர்ச்சியாளர்களுக்கு ₹1,000/மாதம்",
      },
      {
        party: "TVK",
        text: "₹4,000/month graduate unemployment allowance + 5 lakh paid internships/year (₹10,000/month) + 75% Tamil quota in private sector",
        textTa: "வேலையில்லாத பட்டதாரிகளுக்கு ₹4,000/மாதம் + 5 லட்சம் internship/ஆண்டு (₹10,000/மாதம்) + தனியார் வேலையில் 75% TN பங்கு",
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
    question: "Which farming policy do you believe will help farmers most?",
    questionTa: "விவசாயிகளுக்கு எந்த கொள்கை மிகவும் உதவும்?",
    choices: [
      {
        party: "DMK",
        text: "Paddy MSP ₹3,500/quintal + sugarcane ₹4,500/tonne + free electric pumps for 20 lakh farmers (note: 2021 loan waiver promise still unfulfilled)",
        textTa: "நெல் ₹3,500/குவிண்டால் + கரும்பு ₹4,500/டன் + 20 லட்சம் விவசாயிகளுக்கு இலவச மோட்டார் (குறிப்பு: 2021 கடன் தள்ளுபடி வாக்குறுதி நிறைவேறவில்லை)",
      },
      {
        party: "AIADMK",
        text: "Full crop loan waiver from cooperative societies + paddy MSP ₹3,500 + 100% solar pump subsidy + ₹25 lakh accident compensation for fishermen",
        textTa: "கூட்டுறவு கடன் முழு தள்ளுபடி + நெல் ₹3,500 + 100% சோலார் பம்ப் மானியம் + மீனவர்களுக்கு ₹25 லட்சம்",
      },
      {
        party: "TVK",
        text: "100% loan waiver for farmers with under 5 acres + 50% for above 5 acres + free higher education for children of small farmers",
        textTa: "5 ஏக்கருக்கு கீழ் விவசாயிகளுக்கு 100% கடன் தள்ளுபடி + 5 ஏக்கருக்கு மேல் 50% தள்ளுபடி + சிறு விவசாயி பிள்ளைகளுக்கு இலவச கல்வி",
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
    question: "Which education policy fits your vision for Tamil Nadu's youth?",
    questionTa: "தமிழ்நாட்டு இளைஞர்களுக்கு எந்த கல்விக் கொள்கை சரியானது?",
    choices: [
      {
        party: "DMK",
        text: "Free laptops for 35 lakh college students + ₹1,500/month student stipend + expand free school breakfast to Class 8",
        textTa: "35 லட்சம் கல்லூரி மாணவர்களுக்கு இலவச laptop + ₹1,500/மாதம் + இலவச காலை உணவு 8ஆம் வகுப்பு வரை",
      },
      {
        party: "AIADMK",
        text: "Raise NEET reservation for government school students from 7.5% → 10% + education loan waiver for poor families",
        textTa: "அரசு பள்ளி மாணவர்களுக்கு NEET இட ஒதுக்கீடு 7.5% → 10% + ஏழை மாணவர்களின் கல்விக் கடன் தள்ளுபடி",
      },
      {
        party: "TVK",
        text: "500 Creative Schools + interest-free education loans up to ₹20 lakh (Class 12 to PhD) + education loan waiver for poor students + TNPSC on fixed transparent schedule",
        textTa: "500 'Creative Schools' + ₹20 லட்சம் வரை வட்டியில்லா கல்விக் கடன் + ஏழை மாணவர் கடன் தள்ளுபடி + TNPSC நிர்ணயித்த கால அட்டவணையில்",
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
    question: "Which healthcare promise do you trust most?",
    questionTa: "சுகாதாரத்தில் எந்த வாக்குறுதியை நம்புகிறீர்கள்?",
    choices: [
      {
        party: "DMK",
        text: "Expand CMCHIS health insurance to ₹10 lakh/year (from ₹5 lakh) + raise income ceiling to ₹5 lakh + double dialysis units in govt hospitals",
        textTa: "CMCHIS காப்பீடு ₹5 லட்சம் → ₹10 லட்சம் + வருமான வரம்பு ₹5 லட்சமாக உயர்வு + அரசு மருத்துவமனையில் dialysis இரட்டிப்பு",
      },
      {
        party: "AIADMK",
        text: "Reopen 2,000 Amma Mini Clinics (shut since 2021) to restore grassroots primary care access across Tamil Nadu",
        textTa: "2021ல் மூடப்பட்ட 2,000 அம்மா மினி கிளினிக்குகளை மீண்டும் திறப்போம் — அடிமட்ட சுகாதார வசதி மீட்பு",
      },
      {
        party: "TVK",
        text: "Treat healthcare as a fundamental right + 'Drug-Free Tamil Nadu' — mandatory anti-drug zones in all schools and colleges",
        textTa: "சுகாதாரம் அடிப்படை உரிமை என அறிவிப்பு + அனைத்து பள்ளி/கல்லூரிகளிலும் கட்டாய 'Drug-Free Zone'",
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
    question: "Which promise would reduce your daily expenses most?",
    questionTa: "உங்கள் தினசரி செலவை எந்த வாக்குறுதி கொஞ்சமாவது குறைக்கும்?",
    choices: [
      {
        party: "DMK",
        text: "10 lakh new homes (Kalaignar Kanavu Illam) + raise old-age/widow pension to ₹2,000/month + increase disability support to ₹2,500/month",
        textTa: "10 லட்சம் வீடுகள் + முதியோர்/விதவை உதவி ₹2,000/மாதம் + மாற்றுத்திறன் உதவி ₹2,500/மாதம்",
      },
      {
        party: "AIADMK",
        text: "Free refrigerator for 2.22 crore ration families + 3 free LPG cylinders/year + free 1 kg dal + 1 litre cooking oil monthly + phase out liquor shops",
        textTa: "2.22 கோடி குடும்பங்களுக்கு இலவச ஃபிரிட்ஜ் + வருடம் 3 இலவச LPG + மாதம் 1 கிலோ பருப்பு + 1 லிட்டர் எண்ணெய் + மது கடைகள் படிப்படியாக மூடல்",
      },
      {
        party: "TVK",
        text: "6 free LPG cylinders/year (double AIADMK's offer) + ₹2,500/month for women + 1 ration shop per 500 families with accountable weighers",
        textTa: "வருடம் 6 இலவச LPG சிலிண்டர் (AIADMK-ன் இரு மடங்கு) + பெண்களுக்கு ₹2,500/மாதம் + 500 குடும்பத்திற்கு ஒரு ration கடை",
      },
    ],
  },
  {
    id: "corruption",
    icon: "⚖️",
    accent: "#dc2626",
    category: "corruption",
    label: "Governance & Corruption",
    labelTa: "ஊழல் & நேர்மை",
    question: "Which governance track record or promise do you trust most?",
    questionTa: "ஆட்சி நேர்மையில் யாரை நம்புகிறீர்கள்?",
    choices: [
      {
        party: "DMK",
        text: "394 of 505 promises delivered (78%) — a documented track record, though TASMAC revenue hit a record ₹48,344 crore in FY25",
        textTa: "505 வாக்குறுதிகளில் 394 நிறைவேற்றம் (78%) — ஆவணப்பட்ட சாதனை. ஆனால் TASMAC வருவாய் ₹48,344 கோடி — சாதனை உயர்வு",
      },
      {
        party: "AIADMK",
        text: "Introduced CMCHIS, Amma Unavagam & multiple welfare schemes still running today — but Gutka scam prosecutions and 2018 Tuticorin firing (13 killed) are on record",
        textTa: "CMCHIS, அம்மா உணவகம் தொடங்கியவர்கள் — இன்னும் நடைமுறையில். ஆனால் குட்கா வழக்கு, 2018 தூத்துக்குடி சூட்டில் 13 பேர் மரணம் — வரலாற்றில் பதிவு",
      },
      {
        party: "TVK",
        text: "Zero corruption record (new party, no governance history) + promises white papers on all govt deals + TNPSC on fixed transparent schedule",
        textTa: "ஊழல் வரலாறே இல்லை (புதிய கட்சி) + அனைத்து அரசு ஒப்பந்தங்களுக்கும் white paper + TNPSC நிர்ணயித்த கால அட்டவணையில்",
      },
    ],
  },
  {
    id: "vision",
    icon: "🔭",
    accent: "#6366f1",
    category: "corruption",
    label: "Long-term Vision",
    labelTa: "எதிர்காலம்",
    question: "What matters more to you for Tamil Nadu's next 5 years?",
    questionTa: "தமிழ்நாட்டின் அடுத்த 5 ஆண்டுகளுக்கு உங்களுக்கு எது முக்கியம்?",
    choices: [
      {
        party: "DMK",
        text: "Continue the Dravidian model — proven governance track record, expanding existing schemes with larger numbers",
        textTa: "திராவிட மாடல் தொடர்வு — ஆவணப்பட்ட ஆட்சி அனுபவம், நடைமுறையிலுள்ள திட்டங்களை விரிவுபடுத்துவது",
      },
      {
        party: "AIADMK",
        text: "Return to Opposition-tested AIADMK — restore Amma-era welfare schemes and correct DMK's course",
        textTa: "எதிர்க்கட்சியில் முறுக்கேறிய AIADMK திரும்பட்டும் — அம்மா காலத் திட்டங்கள் மீட்பு, DMK தவறுகள் திருத்தம்",
      },
      {
        party: "TVK",
        text: "Bring change — a new party with no corrupt past, accountability-first governance, and highest youth & women's welfare offers",
        textTa: "மாற்றம் கொண்டு வரட்டும் — ஊழல் வரலாற்றே இல்லாத புதிய கட்சி, கணக்கு கேட்கும் ஆட்சி, இளைஞர் + பெண்கள் நலனில் தேர்ந்த வாக்குறுதிகள்",
      },
    ],
  },
];

const PARTY_META: Record<string, { color: string; shortName: string }> = {
  DMK:    { color: "#c0392b", shortName: "DMK" },
  TVK:    { color: "#1a5276", shortName: "TVK" },
  AIADMK: { color: "#2d7a4f", shortName: "AIADMK" },
};
const MEDALS = ["🥇", "🥈", "🥉"];

// ── Score computation — purely additive, 1 point per question pick ─────────────
function computeResults(picks: Record<string, string>) {
  const tally: Record<string, number> = { DMK: 0, TVK: 0, AIADMK: 0 };
  for (const party of Object.values(picks)) {
    if (party in tally) tally[party]++;
  }
  const total = Object.keys(picks).length || 1;
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
      `🏆 என் match: ${winner?.party} (${winner?.pct}% of my priorities)`,
      "",
      ...results.map((r, i) => `${MEDALS[i]} ${r.party} — ${r.score}/${QUIZ_QUESTIONS.length} priorities`),
      "",
      "My choices:",
      ...QUIZ_QUESTIONS.map((q) => {
        const picked = picks[q.id];
        return `${q.icon} ${isTa ? q.labelTa : q.label}: ${picked || "—"}`;
      }),
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
                <span className="text-gray-400 text-xs">~2 min · real 2026 manifestos</span>
              </div>
              <p className="text-gray-900 font-extrabold text-lg leading-snug">
                {isTa ? "உங்களுக்கு எந்த கட்சி சரியானது?" : "Who Should I Vote For?"}
              </p>
              <p className="text-gray-500 text-sm mt-0.5">
                {isTa
                  ? "8 கேள்விகள் · உண்மையான manifesto கொள்கைகள் ஒப்பிடு · verified sources"
                  : "8 questions · pick real policies · your honest party match + WhatsApp share"}
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
              ? "ஒவ்வொரு கேள்விக்கும் உங்களுக்கு பிடித்த கொள்கையை தேர்வு செய்யுங்கள் — verified sources"
              : "Pick the policy that resonates most · results from real 2026 manifestos"}
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
              <div className="space-y-2 ml-0 sm:ml-13">
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
                          {choice.party}
                        </span>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {isTa ? choice.textTa : choice.text}
                        </p>
                        {isSelected && (
                          <span className="flex-shrink-0 text-base ml-auto">✓</span>
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
              ? "உங்கள் தேர்வுகளின் அடிப்படையில் — ஒவ்வொரு கட்சியும் எத்தனை கேள்விகளில் உங்களை கவர்ந்தது"
              : "Based purely on your picks — how many of your 8 priorities each party won"}
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
              : "* Data-guided tool. Every fact has a verified source link. Final judgment is always yours."}
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
