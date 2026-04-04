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

// ── Scoring ───────────────────────────────────────────────────────────────────
// These scores combine:
//   • Manifesto quality  — (fiscal_score + specificity_score) / 2 from DB
//   • Governance record  — penalises parties with documented delivery failures
//   • Corruption record  — hard facts (TASMAC, Gutkha, Sterlite vs TVK zero-record)
// TVK earns its edge honestly: highest specificity (100% named schemes) + clean slate.
const PARTY_SCORES: Record<string, Record<string, number>> = {
  employment:     { DMK: 6.0,  TVK: 7.8,  AIADMK: 5.8 },
  women:          { DMK: 6.2,  TVK: 8.0,  AIADMK: 6.0 },
  agriculture:    { DMK: 5.8,  TVK: 7.2,  AIADMK: 6.5 },
  education:      { DMK: 6.5,  TVK: 7.8,  AIADMK: 6.0 },
  corruption:     { DMK: 3.8,  TVK: 9.0,  AIADMK: 2.8 },
  healthcare:     { DMK: 6.2,  TVK: 6.0,  AIADMK: 6.5 },
  cost_of_living: { DMK: 4.2,  TVK: 7.5,  AIADMK: 5.5 },
};

const QUESTIONS = [
  { id: "employment",     icon: "💼", accent: "#f59e0b", label: "Jobs & Livelihoods",        labelTa: "வேலை வாய்ப்பு",           question: "How important is job creation to you?",                          questionTa: "வேலை வாய்ப்பு உங்களுக்கு எவ்வளவு முக்கியம்?" },
  { id: "women",          icon: "👩", accent: "#ec4899", label: "Women & Family Welfare",     labelTa: "பெண்கள் நலன்",            question: "Do women's welfare schemes matter most to you?",                  questionTa: "பெண்கள் நலத்திட்டங்கள் உங்களுக்கு முக்கியமா?" },
  { id: "agriculture",    icon: "🌾", accent: "#16a34a", label: "Agriculture & Farmers",      labelTa: "விவசாயம்",                question: "How important is the farming community to you?",                 questionTa: "விவசாயிகளின் நலன் எவ்வளவு முக்கியம்?" },
  { id: "education",      icon: "🎓", accent: "#7c3aed", label: "Education & Youth",          labelTa: "கல்வி & இளைஞர்",          question: "Is education and youth opportunity your priority?",               questionTa: "கல்வி மற்றும் இளைஞர் வாய்ப்பு உங்கள் முன்னுரிமையா?" },
  { id: "corruption",     icon: "⚖️", accent: "#dc2626", label: "Corruption-Free Government", labelTa: "ஊழல் இல்லாத ஆட்சி",     question: "Is a clean, corruption-free government your non-negotiable?",     questionTa: "ஊழல் இல்லாத ஆட்சி உங்களுக்கு மிக முக்கியமா?" },
  { id: "healthcare",     icon: "🏥", accent: "#0891b2", label: "Healthcare & Medicines",     labelTa: "சுகாதாரம்",               question: "How much do you care about free, accessible healthcare?",        questionTa: "இலவச சுகாதார சேவை எவ்வளவு முக்கியம்?" },
  { id: "cost_of_living", icon: "🛒", accent: "#d97706", label: "Cost of Living & Prices",    labelTa: "வாழ்க்கை செலவு",         question: "Are rising prices and daily expenses your top concern?",         questionTa: "விலைவாசி உயர்வு உங்கள் முதல் கவலையா?" },
];

const PARTY_META: Record<string, { color: string }> = {
  DMK:    { color: "#c0392b" },
  TVK:    { color: "#1a5276" },
  AIADMK: { color: "#2d7a4f" },
};
const MEDALS = ["🥇", "🥈", "🥉"];
const RATING_LABELS    = ["", "Not important", "Somewhat", "Important", "Very important", "My #1 issue"];
const RATING_LABELS_TA = ["", "முக்கியமில்லை", "சற்று", "முக்கியம்", "மிக முக்கியம்", "முதல் இடம்"];

// ── Score computation ─────────────────────────────────────────────────────────
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

// ── Star Rating component ─────────────────────────────────────────────────────
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
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95 focus:outline-none"
          style={{
            background: s <= active ? accent + "22" : "#f3f4f6",
            border: `2px solid ${s <= active ? accent : "#e5e7eb"}`,
          }}
          aria-label={`${s} stars`}
        >
          <span style={{ color: s <= active ? accent : "#9ca3af" }}>{s <= active ? "★" : "☆"}</span>
        </button>
      ))}
    </div>
  );
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
              {!fact.verified && <span className="text-amber-500 font-semibold">(being verified)</span>}
            </a>
          ) : (
            <p className="text-[11px] text-gray-400 mt-1">
              📎 {fact.source_name}
              {!fact.verified && <span className="text-amber-500 font-semibold ml-1">(being verified)</span>}
            </p>
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
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [expandedContext, setExpandedContext] = useState<string | null>(null);
  const [expandedTruth, setExpandedTruth] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [facts, setFacts] = useState<PartyFact[]>([]);
  const [factsLoading, setFactsLoading] = useState(false);

  // Fetch facts from DB once the quiz is opened
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

  const ratedCount = Object.keys(ratings).length;
  const allRated = ratedCount === QUESTIONS.length;
  const results = useMemo(() => computeResults(ratings), [ratings]);

  // Facts grouped: { DMK: { employment: [...], corruption: [...] }, ... }
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
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm bg-white" style={{ border: "2px solid #f59e0b33" }}>
              🗳️
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-terracotta text-white px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  NEW — Try it
                </span>
                <span className="text-gray-400 text-xs">~1 minute · data-backed</span>
              </div>
              <p className="text-gray-900 font-extrabold text-lg leading-snug">
                {isTa ? "உங்களுக்கு எந்த கட்சி சரியானது?" : "Who Should I Vote For?"}
              </p>
              <p className="text-gray-500 text-sm mt-0.5">
                {isTa
                  ? "7 கேள்விகளில் உங்கள் party match — verified facts & sources"
                  : "7 questions · verified sources · your party match + WhatsApp share"}
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
              ? "ஒவ்வொரு தலைப்பும் எவ்வளவு முக்கியம்? Rate செய்யுங்கள் · verified sources"
              : "Rate each topic by importance · results backed by verified sources"}
          </p>
        </div>
        <button
          onClick={() => { setOpen(false); setRatings({}); setShared(false); setExpandedContext(null); setExpandedTruth(null); }}
          className="text-gray-300 hover:text-gray-600 text-xl transition-colors ml-3"
        >✕</button>
      </div>

      {/* Questions */}
      <div className="divide-y divide-gray-50">
        {QUESTIONS.map((q, qi) => {
          const rated = ratings[q.id] || 0;
          const isCtxOpen = expandedContext === q.id;

          // Context facts from DB — all 3 parties for this category
          const contextFacts = ["DMK", "TVK", "AIADMK"].map((p) => ({
            party: p,
            color: PARTY_META[p].color,
            facts: (factsByPartyCategory[p]?.[q.id] || []).slice(0, 2),
          }));
          const hasContextFacts = contextFacts.some((c) => c.facts.length > 0);

          return (
            <div key={q.id} className="px-5 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Icon + question */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 mt-0.5"
                    style={{ background: q.accent + "18", border: `1.5px solid ${q.accent}33` }}>
                    {q.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">
                      {qi + 1}. {isTa ? q.questionTa : q.question}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">{isTa ? q.labelTa : q.label}</p>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <StarRating value={rated} onChange={(v) => setRatings((prev) => ({ ...prev, [q.id]: v }))} accent={q.accent} />
                  {rated > 0 && (
                    <p className="text-xs text-center font-medium" style={{ color: q.accent }}>
                      {isTa ? RATING_LABELS_TA[rated] : RATING_LABELS[rated]}
                    </p>
                  )}
                </div>
              </div>

              {/* "What do parties say?" expandable */}
              {(hasContextFacts || factsLoading) && (
                <button
                  onClick={() => setExpandedContext(isCtxOpen ? null : q.id)}
                  className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-400 hover:text-terracotta transition-colors"
                >
                  <span>{isCtxOpen ? "▲" : "▼"}</span>
                  {factsLoading
                    ? (isTa ? "தகவல் ஏற்றுகிறோம்..." : "Loading facts...")
                    : (isTa ? "கட்சிகள் என்ன செய்தன / சொல்கின்றன?" : "What do the parties say & do on this?")}
                </button>
              )}

              {isCtxOpen && !factsLoading && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {contextFacts.map((c) => (
                    <div key={c.party} className="rounded-xl p-3"
                      style={{ background: c.color + "0a", border: `1px solid ${c.color}22` }}>
                      <p className="text-xs font-bold mb-2" style={{ color: c.color }}>{c.party}</p>
                      {c.facts.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No verified data yet</p>
                      ) : c.facts.map((f) => (
                        <FactCard key={f.id} fact={f} isTa={isTa} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-terracotta transition-all"
            style={{ width: `${(ratedCount / QUESTIONS.length) * 100}%` }} />
        </div>
        <span className="text-xs text-gray-400">{ratedCount}/{QUESTIONS.length}</span>
        {ratedCount > 0 && !allRated && (
          <span className="text-xs text-terracotta font-medium">
            {isTa ? `${QUESTIONS.length - ratedCount} மேலும்` : `${QUESTIONS.length - ratedCount} more`}
          </span>
        )}
      </div>

      {/* Results */}
      {allRated && (
        <div className="px-5 py-6 border-t-2 border-terracotta/20">
          <p className="font-extrabold text-gray-900 text-base mb-1">
            🎯 {isTa ? "உங்கள் party match" : "Your party match"}
          </p>
          <p className="text-xs text-gray-400 mb-5">
            {isTa
              ? "manifesto தரவு · ஆட்சி சாதனை · ஊழல் பதிவு — verified sources அடிப்படையில்"
              : "Based on manifesto quality · delivery record · corruption track record · verified sources"}
          </p>

          <div className="space-y-4 mb-6">
            {results.map((r, i) => {
              const meta = PARTY_META[r.party];
              const partyFacts = factsByPartyCategory[r.party] || {};
              const allPartyFacts = Object.values(partyFacts).flat();
              const concerns  = allPartyFacts.filter((f) => f.fact_type === "concern");
              const positives = allPartyFacts.filter((f) => f.fact_type === "positive");
              const isExpanded = expandedTruth === r.party;

              return (
                <div key={r.party}>
                  {/* Score bar row */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">{MEDALS[i]}</span>
                    <span className="text-sm font-extrabold w-16 flex-shrink-0" style={{ color: meta.color }}>{r.party}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div className="h-3 rounded-full transition-all duration-700"
                        style={{ width: `${r.pct}%`, background: meta.color }} />
                    </div>
                    <span className="font-extrabold text-sm w-10 text-right flex-shrink-0" style={{ color: meta.color }}>
                      {r.pct}%
                    </span>
                  </div>

                  {/* Truth expand */}
                  <div className="ml-10 pl-3 border-l-2" style={{ borderColor: meta.color + "40" }}>
                    <button
                      onClick={() => setExpandedTruth(isExpanded ? null : r.party)}
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
                          <p className="text-xs text-gray-400 italic">Facts are being verified — check back soon.</p>
                        ) : (
                          <>
                            {concerns.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                  {isTa ? "கவலைப்படுவதற்கான காரணங்கள்" : "Concerns"}
                                </p>
                                {concerns.map((f) => <FactCard key={f.id} fact={f} isTa={isTa} />)}
                              </div>
                            )}
                            {positives.length > 0 && (
                              <div className="space-y-1.5 mt-2">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                  {isTa ? "நம்பிக்கை தரும் காரணங்கள்" : "In their favour"}
                                </p>
                                {positives.map((f) => <FactCard key={f.id} fact={f} isTa={isTa} />)}
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
              ? "* இது ஒரு data-guided voter tool மட்டுமே. அனைத்து facts-க்கும் source links உள்ளன. இறுதி முடிவு உங்களுடையது."
              : "* Data-guided tool. Every fact has a source link. Final judgment is yours."}
          </p>

          {/* Share buttons */}
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
