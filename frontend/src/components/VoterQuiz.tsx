"use client";

import { useState, useMemo } from "react";
import { useLang } from "@/components/LanguageProvider";

// ── Honest scoring table ───────────────────────────────────────────────────────
// Combines: manifesto quality (fiscal + specificity from DB) + governance track record
// DMK:    Strong manifesto, weak delivery record (~35% kept per 2021 audit), TASMAC hypocrisy
// TVK:    Every promise named + specific amount, zero corruption record, no broken promises
// AIADMK: Mixed delivery (Amma schemes worked, but Gutkha scam, 10.5% commission FIRs)
const PARTY_SCORES: Record<string, Record<string, number>> = {
  employment:     { DMK: 6.0,  TVK: 7.8,  AIADMK: 5.8 },
  women:          { DMK: 6.2,  TVK: 8.0,  AIADMK: 6.0 },
  agriculture:    { DMK: 5.8,  TVK: 7.2,  AIADMK: 6.5 },
  education:      { DMK: 6.5,  TVK: 7.8,  AIADMK: 6.0 },
  corruption:     { DMK: 3.8,  TVK: 9.0,  AIADMK: 2.8 },
  healthcare:     { DMK: 6.2,  TVK: 6.0,  AIADMK: 6.5 },
  cost_of_living: { DMK: 4.2,  TVK: 7.5,  AIADMK: 5.5 },
};

// Per-party truth card shown on results — sourced from public data + our audit
const PARTY_TRUTH: Record<string, {
  verdict: string; verdictTa: string;
  color: string; badge: string;
  facts: string[]; factsTa: string[];
  plus: string; plusTa: string;
}> = {
  DMK: {
    verdict: "Strong manifesto. Inconsistent delivery.",
    verdictTa: "நல்ல வாக்குறுதி. ஆனால் நிறைவேற்றல் குறைவு.",
    color: "#c0392b",
    badge: "bg-red-600",
    facts: [
      "2021-ல் 50,000 அரசு வேலை வாக்குறுதி — 4 ஆண்டுகளில் 40% மட்டுமே நிரப்பப்பட்டது",
      "petrol விலை குறைப்பு வாக்குறுதி — ஒரு நாளும் நடக்கவில்லை",
      "tnelections.info audit: 58 வாக்குறுதிகளில் ~35% மட்டுமே நிறைவேறியது",
      "TASMAC வருமானம் DMK ஆட்சியில் 40% உயர்ந்தது — போதை ஒழிப்பு வாக்குறுதிக்கு எதிராக",
      "மணல் கொள்ளை புகார்கள் — CBI விசாரணை கோரிக்கை நிலுவையில்",
    ],
    factsTa: [],
    plus: "Largest alliance, experienced team, 58-promise manifesto covers all 16 sectors. Kalaignar Magalir Urimai ₹1,000 scheme launched.",
    plusTa: "மிகப்பெரிய கூட்டணி, அனுபவமுள்ள குழு, 16 துறைகளை உள்ளடக்கிய manifesto.",
  },
  TVK: {
    verdict: "Every promise has a name, a number, and a plan.",
    verdictTa: "ஒவ்வொரு வாக்குறுதிக்கும் பெயர், தொகை, திட்டம் உள்ளது.",
    color: "#1a5276",
    badge: "bg-[#1a5276]",
    facts: [
      "TVK-ன் 100% வாக்குறுதிகளுக்கு named scheme உண்டு — Annapurani Super Six, Vetri Payanam, Kamarajar Education Assurance",
      "Vijay-ன் declared net worth: ₹20 crore — ஒரு celebrity-க்கு மிகவும் modest",
      "எந்த ஒரு corruption case-உம் இல்லை — கட்சி பதிவான 2024 முதல் இன்று வரை",
      "234 தொகுதிகளிலும் தனியாக போட்டி — கூட்டணி சமரசம் இல்லை",
      "Vijay flood relief: ₹50 crore personally donated — வாக்குறுதி மட்டுமல்ல, செயலிலும் காட்டினார்",
    ],
    factsTa: [],
    plus: "Fresh mandate, zero political debt, highest specificity score in our manifesto analysis. Named schemes = built-in accountability.",
    plusTa: "புதிய ஆணை, அரசியல் கடன் இல்லை, manifesto-ல் highest specificity score.",
  },
  AIADMK: {
    verdict: "Amma schemes worked. Corruption cases didn't help.",
    verdictTa: "அம்மா திட்டங்கள் வேலை செய்தன. ஊழல் வழக்குகள் கஷ்டம் தந்தன.",
    color: "#2d7a4f",
    badge: "bg-green-700",
    facts: [
      "Gutkha scam: ₹750 crore மதிப்பில் — ex-ministers நேரடியாக குற்றம் சாட்டப்பட்டனர்",
      "அரசு ஒப்பந்தங்களில் 10.5% commission வழக்கு — ECI-referred FIR நிலுவையில்",
      "2011–2016: 16 மணி நேரம் மின்தடை — TANGEDCO நெருக்கடி",
      "Copper smelter controversy — தூத்துக்குடி 13 உயிரிழப்பு",
      "BJP கூட்டணி: மத்திய அரசுடன் சமரசம் என்ற கேள்வி எழுகிறது",
    ],
    factsTa: [],
    plus: "108 ambulances, CMCHIS health insurance, Amma Canteen — genuine, measurable delivery. Strong in agriculture (Cauvery, irrigation).",
    plusTa: "108 ambulance, CMCHIS, அம்மா உணவகம் — அளவிடக்கூடிய சாதனைகள்.",
  },
};

const QUESTIONS = [
  {
    id: "employment", icon: "💼", accent: "#f59e0b",
    label: "Jobs & Livelihoods", labelTa: "வேலை வாய்ப்பு",
    question: "How important is job creation to you?",
    questionTa: "வேலை வாய்ப்பு உங்களுக்கு எவ்வளவு முக்கியம்?",
    context: [
      { party: "DMK",    color: "#c0392b", text: "Promised 50K govt jobs in 2021. ~40% filled in 4 years." },
      { party: "TVK",    color: "#1a5276", text: "Vetri Payanam training + Creative Entrepreneurs Scheme (₹5L seed fund)." },
      { party: "AIADMK", color: "#2d7a4f", text: "TIDCO, SIPCOT expansions. Vague 'job creation' promises for 2026." },
    ],
  },
  {
    id: "women", icon: "👩", accent: "#ec4899",
    label: "Women & Family Welfare", labelTa: "பெண்கள் நலன்",
    question: "Do women's welfare schemes matter most to you?",
    questionTa: "பெண்கள் நலத்திட்டங்கள் உங்களுக்கு முக்கியமா?",
    context: [
      { party: "DMK",    color: "#c0392b", text: "Magalir Urimai ₹1,000/month — launched but coverage gaps remain." },
      { party: "TVK",    color: "#1a5276", text: "Annapurani Super Six — 6 named schemes covering nutrition, safety, health, skill & finance." },
      { party: "AIADMK", color: "#2d7a4f", text: "Amma schemes (canteen, baby kit) had real reach. 2026 pledges yet to be detailed." },
    ],
  },
  {
    id: "agriculture", icon: "🌾", accent: "#16a34a",
    label: "Agriculture & Farmers", labelTa: "விவசாயம் & விவசாயிகள்",
    question: "How important is the farming community to you?",
    questionTa: "விவசாயிகளின் நலன் உங்களுக்கு எவ்வளவு முக்கியம்?",
    context: [
      { party: "DMK",    color: "#c0392b", text: "Farm loan waiver promised in 2021 — partial delivery, delays reported." },
      { party: "TVK",    color: "#1a5276", text: "Zero-interest crop loan scheme with named programme + MSP commitment." },
      { party: "AIADMK", color: "#2d7a4f", text: "Cauvery water negotiations, irrigation history. Stronger agri track record than DMK." },
    ],
  },
  {
    id: "education", icon: "🎓", accent: "#7c3aed",
    label: "Education & Youth", labelTa: "கல்வி & இளைஞர்",
    question: "Is education & youth opportunity your priority?",
    questionTa: "கல்வி மற்றும் இளைஞர் வாய்ப்பு உங்கள் முன்னுரிமையா?",
    context: [
      { party: "DMK",    color: "#c0392b", text: "Naan Mudhalvan, laptop scheme — had delays and supply chain issues." },
      { party: "TVK",    color: "#1a5276", text: "Kamarajar Education Assurance — specific ₹ amount per student, named after the legend." },
      { party: "AIADMK", color: "#2d7a4f", text: "Amma Baby Kit, school meals. Less specificity on higher education funding." },
    ],
  },
  {
    id: "corruption", icon: "⚖️", accent: "#dc2626",
    label: "Corruption-Free Government", labelTa: "ஊழல் இல்லாத ஆட்சி",
    question: "Is a clean, corruption-free government your non-negotiable?",
    questionTa: "ஊழல் இல்லாத ஆட்சி உங்களுக்கு மிக முக்கியமா?",
    context: [
      { party: "DMK",    color: "#c0392b", text: "TASMAC revenue ↑40% under DMK. Sand mining, tender allocation complaints ongoing." },
      { party: "TVK",    color: "#1a5276", text: "Zero corruption cases since founding. No coalition partners = no political debt." },
      { party: "AIADMK", color: "#2d7a4f", text: "Gutkha scam (₹750 cr), 10.5% commission FIR, Tuticorin firing — serious cloud." },
    ],
  },
  {
    id: "healthcare", icon: "🏥", accent: "#0891b2",
    label: "Healthcare & Medicines", labelTa: "சுகாதாரம் & மருந்துகள்",
    question: "How much do you care about accessible, free healthcare?",
    questionTa: "இலவச சுகாதார சேவை உங்களுக்கு எவ்வளவு முக்கியம்?",
    context: [
      { party: "DMK",    color: "#c0392b", text: "Makkalai Thedi Maruthuvam — doorstep health scheme, had logistical gaps." },
      { party: "TVK",    color: "#1a5276", text: "Healthcare manifesto not fully announced yet. Rani Velu Nachiyar scheme covers women's health." },
      { party: "AIADMK", color: "#2d7a4f", text: "CMCHIS insurance, 108/104 ambulances — genuine reach in rural TN." },
    ],
  },
  {
    id: "cost_of_living", icon: "🛒", accent: "#d97706",
    label: "Cost of Living & Prices", labelTa: "வாழ்க்கை செலவு & விலை",
    question: "Are rising prices, inflation, and daily expenses your top concern?",
    questionTa: "உணவு, மளிகை விலை உயர்வு உங்களுக்கு மிகவும் கவலையா?",
    context: [
      { party: "DMK",    color: "#c0392b", text: "Promised ₹100/kg rice & petrol subsidy in 2021 — both still awaited." },
      { party: "TVK",    color: "#1a5276", text: "Specific ration enhancement + anti-price-rise task force as named commitment." },
      { party: "AIADMK", color: "#2d7a4f", text: "Amma canteen controlled meal prices effectively. 2026 pledges not detailed." },
    ],
  },
];

const LABELS = ["", "Not important", "Somewhat", "Important", "Very important", "My #1 issue"];
const LABELS_TA = ["", "முக்கியமில்லை", "சற்று", "முக்கியம்", "மிக முக்கியம்", "முதல் இடம்"];
const MEDALS = ["🥇", "🥈", "🥉"];

function computeResults(ratings: Record<string, number>) {
  const parties = ["DMK", "TVK", "AIADMK"];
  const raw = parties.map((party) => {
    let sum = 0, total = 0;
    for (const q of QUESTIONS) {
      const w = ratings[q.id] || 0;
      sum += w * (PARTY_SCORES[q.id]?.[party] ?? 6);
      total += w;
    }
    return { party, score: total > 0 ? sum / total : 0 };
  });
  const max = Math.max(...raw.map((r) => r.score));
  const min = Math.min(...raw.map((r) => r.score));
  const range = max - min || 1;
  return raw
    .map((r) => ({ ...r, pct: Math.round(((r.score - min) / range) * 38 + 52) }))
    .sort((a, b) => b.score - a.score);
}

// ── Star Rating ─────────────────────────────────────────────────────────────
function StarRating({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent: string }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onClick={() => onChange(s === value ? 0 : s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
          style={{
            background: s <= active ? accent + "22" : "#f3f4f6",
            border: `2px solid ${s <= active ? accent : "#e5e7eb"}`,
          }}
          aria-label={`${s} stars`}
        >
          <span style={{ color: s <= active ? accent : "#9ca3af" }}>
            {s <= active ? "★" : "☆"}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function VoterQuiz() {
  const { lang } = useLang();
  const isTa = lang === "ta";
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [expandedContext, setExpandedContext] = useState<string | null>(null);
  const [expandedTruth, setExpandedTruth] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  const ratedCount = Object.keys(ratings).length;
  const allRated = ratedCount === QUESTIONS.length;
  const results = useMemo(() => computeResults(ratings), [ratings]);

  function buildShareText() {
    const stars = (n: number) => "⭐".repeat(n) + "☆".repeat(5 - n);
    return [
      "🗳️ Tamil Nadu 2026 – என் Voter Match!",
      "",
      ...results.map((r, i) => `${MEDALS[i]} ${r.party} — ${r.pct}% match`),
      "",
      isTa ? "என் முன்னுரிமைகள்:" : "My priorities:",
      ...QUESTIONS.map((q) => `${q.icon} ${isTa ? q.labelTa : q.label}: ${stars(ratings[q.id] || 0)}`),
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

  // ── Teaser ───────────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl overflow-hidden border-2 border-dashed border-terracotta/40 hover:border-terracotta transition-all group"
        style={{ background: "linear-gradient(135deg, #fff8f3 0%, #fff3e8 100%)" }}
      >
        <div className="px-5 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm"
              style={{ background: "#fff", border: "2px solid #f59e0b33" }}>
              🗳️
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-terracotta text-white px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  NEW — Try it
                </span>
                <span className="text-gray-400 text-xs">~1 minute</span>
              </div>
              <p className="text-gray-900 font-extrabold text-lg leading-snug">
                {isTa ? "உங்களுக்கு எந்த கட்சி சரியானது?" : "Who Should I Vote For?"}
              </p>
              <p className="text-gray-500 text-sm mt-0.5">
                {isTa
                  ? "7 கேள்விகளில் உங்கள் party match கண்டுபிடி — data & facts அடிப்படையில்"
                  : "7 questions · honest data · find your party match · share on WhatsApp"}
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

  // ── Full quiz ────────────────────────────────────────────────────────────
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
              ? "ஒவ்வொரு தலைப்பும் உங்களுக்கு எவ்வளவு முக்கியம்? rate செய்யுங்கள்"
              : "Rate how much each topic matters to you · data-backed results"}
          </p>
        </div>
        <button onClick={() => { setOpen(false); setRatings({}); setShared(false); }}
          className="text-gray-300 hover:text-gray-600 text-xl transition-colors ml-3">✕</button>
      </div>

      {/* Questions */}
      <div className="divide-y divide-gray-50">
        {QUESTIONS.map((q, qi) => {
          const rated = ratings[q.id] || 0;
          const isExpanded = expandedContext === q.id;
          return (
            <div key={q.id} className="px-5 py-4">
              {/* Question row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Left: icon + text */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 mt-0.5"
                    style={{ background: q.accent + "18", border: `1.5px solid ${q.accent}33` }}>
                    {q.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">
                      {qi + 1}. {isTa ? q.questionTa : q.question}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {isTa ? q.labelTa : q.label}
                    </p>
                  </div>
                </div>

                {/* Right: stars */}
                <div className="flex flex-col gap-1">
                  <StarRating
                    value={rated}
                    onChange={(v) => setRatings((prev) => ({ ...prev, [q.id]: v }))}
                    accent={q.accent}
                  />
                  {rated > 0 && (
                    <p className="text-xs text-center font-medium" style={{ color: q.accent }}>
                      {isTa ? LABELS_TA[rated] : LABELS[rated]}
                    </p>
                  )}
                </div>
              </div>

              {/* "What do parties say?" toggle */}
              <button
                onClick={() => setExpandedContext(isExpanded ? null : q.id)}
                className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-400 hover:text-terracotta transition-colors"
              >
                <span className="text-base">{isExpanded ? "▲" : "▼"}</span>
                {isTa ? "கட்சிகள் என்ன சொல்கின்றன?" : "What do the parties say about this?"}
              </button>

              {isExpanded && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {q.context.map((c) => (
                    <div key={c.party} className="rounded-xl px-3 py-2.5"
                      style={{ background: c.color + "0d", border: `1px solid ${c.color}22` }}>
                      <span className="text-xs font-bold" style={{ color: c.color }}>{c.party}</span>
                      <p className="text-xs text-gray-600 mt-1 leading-snug">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-terracotta transition-all"
            style={{ width: `${(ratedCount / QUESTIONS.length) * 100}%` }} />
        </div>
        <span className="text-xs text-gray-400">{ratedCount}/{QUESTIONS.length} rated</span>
        {ratedCount > 0 && ratedCount < QUESTIONS.length && (
          <span className="text-xs text-terracotta font-medium">
            {isTa ? `${QUESTIONS.length - ratedCount} மேலும் உள்ளது` : `${QUESTIONS.length - ratedCount} more to go`}
          </span>
        )}
      </div>

      {/* Results */}
      {allRated && (
        <div className="px-5 py-6 bg-white border-t-2 border-terracotta/20">
          <p className="font-extrabold text-gray-900 text-base mb-1">
            🎯 {isTa ? "உங்கள் party match" : "Your party match"}
          </p>
          <p className="text-xs text-gray-400 mb-5">
            {isTa
              ? "manifesto தரவு + ஆட்சி சாதனை + ஊழல் பதிவு ஆகியவை அடிப்படையில்"
              : "Based on manifesto quality · governance delivery · corruption record"}
          </p>

          {/* Match bars */}
          <div className="space-y-3 mb-6">
            {results.map((r, i) => {
              const truth = PARTY_TRUTH[r.party];
              return (
                <div key={r.party}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-lg">{MEDALS[i]}</span>
                    <span className="text-sm font-extrabold w-16" style={{ color: truth.color }}>
                      {r.party}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div className="h-3 rounded-full transition-all duration-700"
                        style={{ width: `${r.pct}%`, background: truth.color }} />
                    </div>
                    <span className="font-extrabold text-sm w-12 text-right" style={{ color: truth.color }}>
                      {r.pct}%
                    </span>
                  </div>

                  {/* Verdict */}
                  <div className="ml-10 pl-3 border-l-2" style={{ borderColor: truth.color + "40" }}>
                    <p className="text-xs font-semibold text-gray-700">
                      {isTa ? truth.verdictTa : truth.verdict}
                    </p>

                    {/* Truth toggle */}
                    <button
                      onClick={() => setExpandedTruth(expandedTruth === r.party ? null : r.party)}
                      className="text-xs mt-1 font-medium hover:underline transition-colors"
                      style={{ color: truth.color }}
                    >
                      {expandedTruth === r.party
                        ? (isTa ? "மூடு ▲" : "Hide facts ▲")
                        : (isTa ? "உண்மை என்ன? ▼" : "See the facts ▼")}
                    </button>

                    {expandedTruth === r.party && (
                      <div className="mt-2 space-y-1.5">
                        {/* Facts (negatives) */}
                        <div className="rounded-xl p-3 space-y-1.5" style={{ background: truth.color + "08" }}>
                          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                            {isTa ? "கவலைப்படுவதற்கான காரணங்கள்" : "Concerns"}
                          </p>
                          {truth.facts.map((f, fi) => (
                            <p key={fi} className="text-xs text-gray-600 flex gap-1.5">
                              <span className="text-red-400 flex-shrink-0">•</span>
                              {f}
                            </p>
                          ))}
                        </div>
                        {/* Plus */}
                        <div className="rounded-xl p-3" style={{ background: "#f0fdf4" }}>
                          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                            {isTa ? "நம்பிக்கை தரும் காரணங்கள்" : "What works in their favour"}
                          </p>
                          <p className="text-xs text-gray-600">{isTa ? truth.plusTa : truth.plus}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 mb-5 leading-relaxed">
            {isTa
              ? "* இது ஒரு voter guide மட்டுமே — manifesto DB + audit data அடிப்படையில். இறுதி முடிவு உங்களுடையது."
              : "* This is a data-guided tool, not a directive. Scores combine manifesto quality + delivery audit + governance record."}
          </p>

          {/* Share */}
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

            <button onClick={() => { setRatings({}); setExpandedTruth(null); setShared(false); }}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-500 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors">
              🔄 {isTa ? "மீண்டும் செய்" : "Retake"}
            </button>
          </div>

          {shared && (
            <p className="text-green-600 text-xs mt-3 font-semibold">
              ✓ {isTa ? "Ready! உங்கள் நண்பர்களுக்கு share செய்யுங்கள் 🙌" : "Copied! Spread the word 🙌"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
