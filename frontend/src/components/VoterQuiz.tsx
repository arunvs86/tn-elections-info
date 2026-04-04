"use client";

import { useState, useMemo } from "react";
import { useLang } from "@/components/LanguageProvider";

// ── Per-category manifesto scores per party ───────────────────────────────────
// Source: manifesto_promises DB averages (fiscal_score + specificity_score) / 2
// TVK scores reflect named-scheme specificity; "Not announced" categories use 4.5
const SCORES: Record<string, Record<string, number>> = {
  employment:  { DMK: 6.8, TVK: 6.9, AIADMK: 6.0 },
  women:       { DMK: 6.5, TVK: 7.2, AIADMK: 6.3 },
  agriculture: { DMK: 6.0, TVK: 6.7, AIADMK: 6.8 },
  education:   { DMK: 7.0, TVK: 7.3, AIADMK: 6.3 },
  governance:  { DMK: 7.3, TVK: 5.5, AIADMK: 6.3 },
};

const QUESTIONS = [
  {
    id: "employment", icon: "💼",
    label: "Jobs & Employment",   labelTa: "வேலை வாய்ப்பு",
    desc: "Tech parks, startup support, skill training",
    descTa: "தொழில்நுட்ப வேலைகள், திறன் பயிற்சி",
  },
  {
    id: "women", icon: "👩",
    label: "Women & Family",      labelTa: "பெண்கள் நலன்",
    desc: "Monthly welfare, safety, free bus, health",
    descTa: "மாதாந்திர உதவி, பாதுகாப்பு, இலவச பேருந்து",
  },
  {
    id: "agriculture", icon: "🌾",
    label: "Agriculture & Farmers", labelTa: "விவசாயம்",
    desc: "Loan waivers, MSP, irrigation, flood relief",
    descTa: "கடன் தள்ளுபடி, நீர்ப்பாசனம்",
  },
  {
    id: "education", icon: "🎓",
    label: "Education & Youth",   labelTa: "கல்வி & இளைஞர்",
    desc: "Free college, scholarships, laptops, coaching",
    descTa: "இலவச கல்வி, உதவித்தொகை, laptop",
  },
  {
    id: "governance", icon: "🏛️",
    label: "Clean Governance",    labelTa: "சுத்தமான ஆட்சி",
    desc: "Corruption-free, transparent, accountable admin",
    descTa: "ஊழல் இல்லாத, வெளிப்படையான நிர்வாகம்",
  },
];

const PARTY_META: Record<string, { color: string; bg: string; light: string }> = {
  DMK:    { color: "#c0392b", bg: "bg-red-600",     light: "bg-red-50 border-red-200" },
  TVK:    { color: "#1a5276", bg: "bg-[#1a5276]",   light: "bg-blue-50 border-blue-200" },
  AIADMK: { color: "#2d7a4f", bg: "bg-green-700",   light: "bg-green-50 border-green-200" },
};

const MEDALS = ["🥇", "🥈", "🥉"];

function computeResults(ratings: Record<string, number>) {
  const parties = ["DMK", "TVK", "AIADMK"];
  const raw = parties.map((party) => {
    let weightedSum = 0, totalWeight = 0;
    for (const q of QUESTIONS) {
      const w = ratings[q.id] || 0;
      weightedSum += w * (SCORES[q.id][party] || 0);
      totalWeight += w;
    }
    return { party, score: totalWeight > 0 ? weightedSum / totalWeight : 0 };
  });
  // Normalise to a 50–95% match range so it feels like a % match
  const max = Math.max(...raw.map((r) => r.score));
  const min = Math.min(...raw.map((r) => r.score));
  const range = max - min || 1;
  return raw
    .map((r) => ({ ...r, pct: Math.round(((r.score - min) / range) * 40 + 55) }))
    .sort((a, b) => b.score - a.score);
}

function StarRating({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-xl md:text-2xl transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${star} stars`}
        >
          {star <= (hover || value) ? "⭐" : "☆"}
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
  const [shared, setShared] = useState(false);

  const ratedCount = Object.keys(ratings).length;
  const allRated = ratedCount === QUESTIONS.length;
  const results = useMemo(() => computeResults(ratings), [ratings]);

  function handleRate(id: string, val: number) {
    setRatings((prev) => ({ ...prev, [id]: val }));
  }

  function handleReset() {
    setRatings({});
    setShared(false);
  }

  function buildShareText() {
    const stars = (n: number) => "⭐".repeat(n) + "☆".repeat(5 - n);
    const lines = [
      "🗳️ Tamil Nadu 2026 – என் Voter Match!",
      "",
      ...results.map(
        (r, i) => `${MEDALS[i]} ${r.party} — ${r.pct}% match`
      ),
      "",
      isTa ? "என் முன்னுரிமைகள்:" : "My priorities:",
      ...QUESTIONS.map(
        (q) => `${q.icon} ${isTa ? q.labelTa : q.label}: ${stars(ratings[q.id] || 0)}`
      ),
      "",
      "உங்கள் match கண்டுபிடி 👉 tnelections.info",
    ];
    return lines.join("\n");
  }

  function handleShare() {
    const text = buildShareText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    setShared(true);
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildShareText());
    setShared(true);
  }

  // ── Closed teaser ──────────────────────────────────────────────────────────
  if (!open) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer group"
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        }}
        onClick={() => setOpen(true)}
      >
        {/* Decorative stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {["top-3 left-8", "top-6 right-16", "top-10 left-1/3", "bottom-4 right-1/4", "bottom-6 left-12"].map(
            (pos, i) => (
              <span
                key={i}
                className={`absolute text-white/20 text-xs animate-pulse`}
                style={{ animationDelay: `${i * 0.4}s`, top: undefined }}
              >
                ✦
              </span>
            )
          )}
        </div>

        <div className="relative z-10 px-5 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
              🗳️
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold bg-amber-400 text-gray-900 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  NEW
                </span>
                <span className="text-white/60 text-xs">30 seconds</span>
              </div>
              <p className="text-white font-extrabold text-lg leading-snug">
                {isTa ? "உங்களுக்கு எந்த கட்சி சரியானது?" : "Who Should I Vote For?"}
              </p>
              <p className="text-white/60 text-xs mt-0.5">
                {isTa
                  ? "உங்கள் முன்னுரிமைகள் அடிப்படையில் party match கண்டுபிடி"
                  : "Rate 5 priorities → get your party match + share on WhatsApp"}
              </p>
            </div>
          </div>

          <button className="flex-shrink-0 bg-white text-gray-900 font-bold text-sm px-5 py-2.5 rounded-xl group-hover:scale-105 transition-transform shadow-lg">
            {isTa ? "தொடங்கு →" : "Take the quiz →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Open quiz ──────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/10 shadow-xl"
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-white/10">
        <div>
          <p className="text-white font-extrabold text-base">
            {isTa ? "உங்களுக்கு எந்த கட்சி சரியானது?" : "Who Should I Vote For?"}
          </p>
          <p className="text-white/50 text-xs mt-0.5">
            {isTa
              ? "ஒவ்வொரு தலைப்பும் உங்களுக்கு எவ்வளவு முக்கியம்? stars தாருங்கள்"
              : "Rate how important each topic is to you (1–5 stars)"}
          </p>
        </div>
        <button
          onClick={() => { setOpen(false); handleReset(); }}
          className="text-white/40 hover:text-white/80 text-xl transition-colors ml-4"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Questions */}
      <div className="divide-y divide-white/10">
        {QUESTIONS.map((q) => (
          <div key={q.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{q.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">
                  {isTa ? q.labelTa : q.label}
                </p>
                <p className="text-white/45 text-xs">
                  {isTa ? q.descTa : q.desc}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:ml-4">
              <StarRating value={ratings[q.id] || 0} onChange={(v) => handleRate(q.id, v)} />
              {ratings[q.id] && (
                <span className="text-white/50 text-xs w-16 text-right">
                  {["", "Not important", "Somewhat", "Important", "Very important", "Top priority"][ratings[q.id]]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      {ratedCount > 0 && !allRated && (
        <div className="px-5 py-3 bg-white/5 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/10 rounded-full h-1">
              <div
                className="h-1 rounded-full bg-amber-400 transition-all"
                style={{ width: `${(ratedCount / QUESTIONS.length) * 100}%` }}
              />
            </div>
            <span className="text-white/40 text-xs">{ratedCount}/{QUESTIONS.length}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {allRated && (
        <div className="px-5 py-5 bg-white/5 border-t border-white/10">
          <p className="text-white font-bold text-sm mb-4">
            {isTa ? "🎯 உங்கள் party match:" : "🎯 Your party match:"}
          </p>

          <div className="space-y-3 mb-5">
            {results.map((r, i) => {
              const meta = PARTY_META[r.party];
              return (
                <div key={r.party} className="flex items-center gap-3">
                  <span className="text-base">{MEDALS[i]}</span>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full text-white w-16 text-center flex-shrink-0"
                    style={{ background: meta.color }}
                  >
                    {r.party}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/10 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{
                            width: `${r.pct}%`,
                            background: meta.color,
                          }}
                        />
                      </div>
                      <span className="text-white font-extrabold text-sm w-12 text-right">
                        {r.pct}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-white/30 text-xs mb-4">
            {isTa
              ? "* manifesto-ல் உள்ள கொள்கைகள் அடிப்படையில் கணக்கிடப்பட்டது. இது ஒரு உதவி மட்டுமே."
              : "* Scored against 2026 manifesto promises. This is a guide, not a verdict."}
          </p>

          {/* WhatsApp share */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-md"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {isTa ? "WhatsApp-ல் share செய்" : "Share on WhatsApp"}
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              📋 {isTa ? "Copy செய்" : "Copy text"}
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white/60 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              🔄 {isTa ? "மீண்டும்" : "Retake"}
            </button>
          </div>

          {shared && (
            <p className="text-green-400 text-xs mt-3 font-medium">
              ✓ {isTa ? "Copied! WhatsApp-ல் உங்கள் நண்பர்களுடன் share செய்யுங்கள்" : "Ready to share! Spread the word 🙌"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
