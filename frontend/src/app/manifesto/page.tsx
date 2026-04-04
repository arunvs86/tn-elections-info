"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { useLang } from "@/components/LanguageProvider";

// ── Types ──────────────────────────────────────────────
interface ManifestoPromise {
  id: number;
  party: string;
  election_year: number;
  promise_text: string;
  promise_text_tamil: string | null;
  category: string | null;
  is_flagship: boolean | null;
  fiscal_score: number | null;
  specificity_score: number | null;
  past_delivery_score: number | null;
  overall_score: number | null;
  believability_label: string | null;
  ai_reasoning: string | null;
  status: "kept" | "partially_kept" | "broken" | "pending" | null;
  evidence: string | null;
  evidence_ta: string | null;
  source_url: string | null;
}

// ── Helpers ─────────────────────────────────────────────
function partyColor(party: string): string {
  const p = (party || "").toUpperCase();
  if (p === "DMK") return "#c0392b";
  if (p === "AIADMK") return "#2d7a4f";
  if (p === "TVK") return "#1a5276";
  return "#888";
}

const PARTY_BG: Record<string, string> = {
  DMK:    "bg-red-50 border-red-200",
  AIADMK: "bg-green-50 border-green-200",
  TVK:    "bg-blue-50 border-blue-200",
};

const PARTY_BADGE: Record<string, string> = {
  DMK:    "bg-red-600 text-white",
  AIADMK: "bg-green-700 text-white",
  TVK:    "bg-[#1a5276] text-white",
};

function statusConfig(status: string | null, t: (k: string) => string) {
  switch (status) {
    case "kept":          return { label: t("status.kept"),    bg: "bg-green-100",  text: "text-green-700",  icon: "✓" };
    case "partially_kept":return { label: t("status.partial"), bg: "bg-yellow-100", text: "text-yellow-700", icon: "~" };
    case "broken":        return { label: t("status.broken"),  bg: "bg-red-100",    text: "text-red-700",    icon: "✗" };
    case "pending":       return { label: t("status.pending"), bg: "bg-gray-100",   text: "text-gray-500",   icon: "·" };
    default:              return { label: t("status.unknown"), bg: "bg-gray-100",   text: "text-gray-400",   icon: "·" };
  }
}

const CATEGORY_KEYS = [
  "cash_benefits", "agriculture", "women", "education", "healthcare",
  "employment", "infrastructure", "housing", "fisheries", "labour",
  "social_welfare", "culture_language", "environment", "sports", "governance", "other",
] as const;

const CATEGORIES_ORDER = [...CATEGORY_KEYS];

export default function ManifestoPage() {
  const { t, lang } = useLang();
  const [promises, setPromises] = useState<ManifestoPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [tab, setTab] = useState<"audit" | "upcoming">("upcoming");
  const [compareMode, setCompareMode] = useState<"side-by-side" | "list">("side-by-side");
  const [selectedParty, setSelectedParty] = useState<string>("all");
  const [selectedBelievability, setSelectedBelievability] = useState<string>("all");
  const [flagshipOnly, setFlagshipOnly] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("manifesto_promises")
        .select("*")
        .order("category", { ascending: true });
      if (data) setPromises(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Split
  const pastPromises = promises.filter((p) => p.election_year <= 2021);
  const upcomingPromises = promises.filter((p) => p.election_year >= 2026);
  const verifiedPromises = pastPromises.filter((p) => p.evidence && p.evidence !== "Verification pending");
  const unverifiedPromises = pastPromises.filter((p) => !p.evidence || p.evidence === "Verification pending");

  const dmkPromises    = upcomingPromises.filter((p) => p.party === "DMK");
  const aiadmkPromises = upcomingPromises.filter((p) => p.party === "AIADMK");
  const tvkPromises    = upcomingPromises.filter((p) => p.party === "TVK");

  // Categories present in 2026 data
  const categories2026 = CATEGORIES_ORDER.filter((cat) =>
    upcomingPromises.some((p) => p.category === cat)
  );
  const categoriesAudit = CATEGORIES_ORDER.filter((cat) =>
    verifiedPromises.some((p) => p.category === cat)
  );

  // Filtered for 2026
  function applyFilters(arr: ManifestoPromise[]) {
    return arr.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (selectedBelievability !== "all" && (p.believability_label || "").toLowerCase().replace(" ", "_") !== selectedBelievability) return false;
      if (flagshipOnly && !p.is_flagship) return false;
      return true;
    });
  }
  const filteredDMK    = (selectedParty === "all" || selectedParty === "DMK")    ? applyFilters(dmkPromises)    : [];
  const filteredAIADMK = (selectedParty === "all" || selectedParty === "AIADMK") ? applyFilters(aiadmkPromises) : [];
  const filteredTVK    = (selectedParty === "all" || selectedParty === "TVK")    ? applyFilters(tvkPromises)    : [];

  // ── Ranking: fiscal + specificity only (no track-record bias) ──
  function partyAvg(arr: ManifestoPromise[], key: "fiscal_score" | "specificity_score") {
    const vals = arr.map((p) => p[key]).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  const ranking = [
    {
      party: "DMK", color: "#c0392b",
      score: +((partyAvg(dmkPromises, "fiscal_score") + partyAvg(dmkPromises, "specificity_score")) / 2).toFixed(1),
      total: dmkPromises.length, flagship: dmkPromises.filter((p) => p.is_flagship).length,
      badge: "Most Comprehensive", partial: false,
      note: "58 promises across all 16 categories",
    },
    {
      party: "TVK", color: "#1a5276",
      score: +((partyAvg(tvkPromises, "fiscal_score") + partyAvg(tvkPromises, "specificity_score")) / 2).toFixed(1),
      total: tvkPromises.length, flagship: tvkPromises.filter((p) => p.is_flagship).length,
      badge: "★ Highest Specificity", partial: true,
      note: "Partial manifesto — Agri, Women & Youth only. Every promise has a named scheme.",
    },
    {
      party: "AIADMK", color: "#2d7a4f",
      score: +((partyAvg(aiadmkPromises, "fiscal_score") + partyAvg(aiadmkPromises, "specificity_score")) / 2).toFixed(1),
      total: aiadmkPromises.length, flagship: aiadmkPromises.filter((p) => p.is_flagship).length,
      badge: "Proven Track Record", partial: false,
      note: "49 promises. Led TN govt 2011–2021",
    },
  ].sort((a, b) => b.score - a.score);
  const medals = ["🥇", "🥈", "🥉"];

  // Audit filter
  const currentPromises = verifiedPromises;
  const filteredAudit = currentPromises.filter((p) => {
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
    if (selectedStatus !== "all" && p.status !== selectedStatus) return false;
    return true;
  });

  // Audit stats
  const auditStats = {
    total: verifiedPromises.length,
    kept: verifiedPromises.filter((p) => p.status === "kept").length,
    partial: verifiedPromises.filter((p) => p.status === "partially_kept").length,
    broken: verifiedPromises.filter((p) => p.status === "broken").length,
    pending: verifiedPromises.filter((p) => p.status === "pending" || !p.status).length,
  };
  const keptPct    = auditStats.total > 0 ? ((auditStats.kept    / auditStats.total) * 100).toFixed(0) : "0";
  const partialPct = auditStats.total > 0 ? ((auditStats.partial / auditStats.total) * 100).toFixed(0) : "0";
  const brokenPct  = auditStats.total > 0 ? ((auditStats.broken  / auditStats.total) * 100).toFixed(0) : "0";
  const pendingPct = auditStats.total > 0 ? ((auditStats.pending / auditStats.total) * 100).toFixed(0) : "0";

  return (
    <div className="min-h-screen bg-cream">
      <Header active="manifesto" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Title */}
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">{t("manifesto.title")}</h1>
        <p className="text-sm text-gray-500 mb-6">{t("manifesto.subtitle")}</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setTab("upcoming"); setSelectedCategory("all"); setSelectedParty("all"); setSelectedBelievability("all"); setFlagshipOnly(false); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === "upcoming"
                ? "bg-terracotta text-white shadow-md"
                : "bg-white border border-gray-200 text-gray-600 hover:border-terracotta"
            }`}
          >
            {t("manifesto.tab_2026")}
          </button>
          <button
            onClick={() => { setTab("audit"); setSelectedCategory("all"); setSelectedStatus("all"); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === "audit"
                ? "bg-terracotta text-white shadow-md"
                : "bg-white border border-gray-200 text-gray-600 hover:border-terracotta"
            }`}
          >
            {t("manifesto.tab_audit")}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 animate-pulse">{t("manifesto.loading")}</p>
          </div>
        ) : tab === "upcoming" ? (
          /* ══════════════════════════════════════════════════
             2026 MANIFESTOS — Side-by-side comparison
             ══════════════════════════════════════════════════ */
          <div className="space-y-5">

            {/* ── Manifesto Ranking Card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-extrabold text-gray-900 text-base">Manifesto Rankings 2026</h2>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  Fiscal Soundness + Promise Specificity · No track-record bias
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ranking.map((r, i) => (
                  <div key={r.party} className="rounded-xl border p-4" style={{ borderColor: r.color + "40", background: r.color + "08" }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{medals[i]}</span>
                        <span className="text-sm font-extrabold" style={{ color: r.color }}>{r.party}</span>
                        {r.partial && (
                          <span className="text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Partial</span>
                        )}
                      </div>
                      <span className="text-2xl font-extrabold" style={{ color: r.color }}>{r.score}</span>
                    </div>
                    {/* Score bar */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${(r.score / 10) * 100}%`, background: r.color }} />
                    </div>
                    <p className="text-xs font-bold mb-0.5" style={{ color: r.color }}>{r.badge}</p>
                    <p className="text-xs text-gray-500 leading-snug">{r.note}</p>
                    <p className="text-xs text-gray-400 mt-1">{r.total} promises · {r.flagship} flagship</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Score = (Fiscal Feasibility + Promise Specificity) ÷ 2 · out of 10
              </p>
            </div>

            {/* Party header cards — 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["DMK", "TVK", "AIADMK"] as const).map((party) => {
                const arr = party === "DMK" ? dmkPromises : party === "TVK" ? tvkPromises : aiadmkPromises;
                const flagships = arr.filter((p) => p.is_flagship);
                return (
                  <div key={party} className={`rounded-2xl border p-4 ${PARTY_BG[party]}`}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PARTY_BADGE[party]}`}>{party}</span>
                      <span className="text-xs text-gray-500">{arr.length} {t("manifesto.promises_reviewed")}</span>
                      {party === "TVK" && (
                        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Partial</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {flagships.slice(0, 3).map((p) => {
                        const txt = (lang === "ta" && p.promise_text_tamil) ? p.promise_text_tamil : p.promise_text;
                        return (
                          <p key={p.id} className="text-sm text-gray-700 leading-snug">
                            {txt.length > 80 ? txt.slice(0, 80) + "…" : txt}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              {/* Row 1: Party pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Party</span>
                {(["all", "DMK", "TVK", "AIADMK"] as const).map((p) => {
                  const colors: Record<string, string> = {
                    all: "#6b7280", DMK: "#c0392b", TVK: "#1a5276", AIADMK: "#2d7a4f",
                  };
                  const isActive = selectedParty === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setSelectedParty(p)}
                      className="text-xs font-bold px-3 py-1.5 rounded-full border transition-all"
                      style={{
                        borderColor: colors[p],
                        background: isActive ? colors[p] : "transparent",
                        color: isActive ? "#fff" : colors[p],
                      }}
                    >
                      {p === "all" ? "All Parties" : p}
                    </button>
                  );
                })}
              </div>

              {/* Row 2: Category + Believability + Flagship + View toggle */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Category */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-terracotta"
                >
                  <option value="all">{t("manifesto.all_categories")}</option>
                  {categories2026.map((cat) => (
                    <option key={cat} value={cat}>{t(`cat.${cat}`)}</option>
                  ))}
                </select>

                {/* Believability */}
                <select
                  value={selectedBelievability}
                  onChange={(e) => setSelectedBelievability(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-terracotta"
                >
                  <option value="all">All Believability</option>
                  <option value="likely">✅ Likely</option>
                  <option value="uncertain">⚠️ Uncertain</option>
                  <option value="unlikely">❌ Unlikely</option>
                </select>

                {/* Flagship toggle */}
                <button
                  onClick={() => setFlagshipOnly(!flagshipOnly)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    flagshipOnly
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "border-amber-400 text-amber-600 bg-transparent"
                  }`}
                >
                  ⭐ Flagship only
                </button>

                {/* Active filter count badge */}
                {(selectedParty !== "all" || selectedCategory !== "all" || selectedBelievability !== "all" || flagshipOnly) && (
                  <button
                    onClick={() => { setSelectedParty("all"); setSelectedCategory("all"); setSelectedBelievability("all"); setFlagshipOnly(false); }}
                    className="text-xs text-terracotta font-semibold hover:underline ml-1"
                  >
                    Clear filters ×
                  </button>
                )}

                {/* View toggle */}
                <div className="flex gap-1 ml-auto bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setCompareMode("side-by-side")}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                      compareMode === "side-by-side" ? "bg-white shadow text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {t("manifesto.side_by_side")}
                  </button>
                  <button
                    onClick={() => setCompareMode("list")}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                      compareMode === "list" ? "bg-white shadow text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {t("manifesto.all_promises")}
                  </button>
                </div>
              </div>
            </div>

            {compareMode === "side-by-side" ? (
              /* ── Side-by-side view ── */
              <div className="space-y-6">
                {(selectedCategory === "all" ? categories2026 : [selectedCategory]).map((cat) => {
                  const dmkCat = filteredDMK.filter((p) => p.category === cat);
                  const aiCat  = filteredAIADMK.filter((p) => p.category === cat);
                  const tvkCat = filteredTVK.filter((p) => p.category === cat);
                  if (dmkCat.length === 0 && aiCat.length === 0 && tvkCat.length === 0) return null;

                  // Columns to show based on selectedParty
                  type ColDef = { key: string; label: string; badge: string; items: ManifestoPromise[]; noData?: string };
                  const allCols: ColDef[] = [
                    { key: "DMK",    label: "DMK",    badge: "bg-red-600",     items: dmkCat },
                    { key: "TVK",    label: "TVK",    badge: "bg-[#1a5276]",   items: tvkCat, noData: "TVK has not announced promises in this category yet" },
                    { key: "AIADMK", label: "AIADMK", badge: "bg-green-700",   items: aiCat },
                  ];
                  const cols = selectedParty === "all" ? allCols : allCols.filter((c) => c.key === selectedParty);
                  const gridClass = cols.length === 1
                    ? "grid grid-cols-1"
                    : cols.length === 2
                    ? "grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100"
                    : "grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100";

                  return (
                    <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                        <h3 className="font-bold text-gray-800 text-sm">{t(`cat.${cat}`)}</h3>
                        <span className="text-xs text-gray-400">
                          {[dmkCat, tvkCat, aiCat].reduce((a, b) => a + b.length, 0)} promises
                        </span>
                      </div>

                      <div className={gridClass}>
                        {cols.map((col) => (
                          <div key={col.key} className="p-4 space-y-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${col.badge}`}>{col.label}</span>
                              <span className="text-sm text-gray-400">{col.items.length} promises</span>
                              {col.key === "TVK" && col.items.length === 0 && (
                                <span className="text-xs text-amber-600 bg-amber-50 px-1 rounded">Not announced</span>
                              )}
                            </div>
                            {col.items.length === 0 ? (
                              <p className="text-xs text-gray-300 italic">{col.noData || t("manifesto.no_promises")}</p>
                            ) : col.items.map((p) => (
                              <PromiseCard key={p.id} p={p} expandedId={expandedId} setExpandedId={setExpandedId} t={t} lang={lang} />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Empty state when all are filtered out */}
                {(selectedCategory === "all" ? categories2026 : [selectedCategory]).every((cat) => {
                  const dmkCat = filteredDMK.filter((p) => p.category === cat);
                  const aiCat  = filteredAIADMK.filter((p) => p.category === cat);
                  const tvkCat = filteredTVK.filter((p) => p.category === cat);
                  return dmkCat.length === 0 && aiCat.length === 0 && tvkCat.length === 0;
                }) && (
                  <div className="text-center py-16 text-gray-400">
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="font-semibold text-gray-600">No promises match your filters</p>
                    <button
                      onClick={() => { setSelectedParty("all"); setSelectedCategory("all"); setSelectedBelievability("all"); setFlagshipOnly(false); }}
                      className="mt-3 text-sm text-terracotta hover:underline font-semibold"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── List view (all promises) ── */
              <div className="space-y-3">
                {[...filteredDMK, ...filteredTVK, ...filteredAIADMK]
                  .sort((a, b) => (a.category || "").localeCompare(b.category || ""))
                  .map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                          style={{ background: partyColor(p.party) }}
                        >
                          {p.party.slice(0, 3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-bold" style={{ color: partyColor(p.party) }}>
                              {p.party}
                            </span>
                            {p.category && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                {t(`cat.${p.category}`)}
                              </span>
                            )}
                            {p.is_flagship && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
                                {t("manifesto.flagship")}
                              </span>
                            )}
                            {p.believability_label && (() => {
                              const bc = believabilityConfig(p.believability_label);
                              return (
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${bc.bg} ${bc.text}`}>
                                  {t(`bel.${p.believability_label.toLowerCase().replace(" ", "_")}`)}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-sm text-gray-800">{(lang === "ta" && p.promise_text_tamil) ? p.promise_text_tamil : p.promise_text}</p>
                          {p.promise_text_tamil && lang !== "ta" && (
                            <p className="text-xs text-gray-400 mt-0.5">{p.promise_text_tamil}</p>
                          )}
                          {p.ai_reasoning && (
                            <button
                              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                              className="text-xs text-terracotta hover:underline mt-2"
                            >
                              {expandedId === p.id ? t("manifesto.hide") : t("manifesto.our_take")}
                            </button>
                          )}
                          {expandedId === p.id && p.ai_reasoning && (
                            <div className="mt-2 bg-gray-50 rounded-xl p-3 text-xs text-gray-600 leading-relaxed">
                              {p.ai_reasoning}
                            </div>
                          )}
                        </div>
                        {p.overall_score != null && (
                          <ScoreCircle score={p.overall_score} />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Full manifesto note */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 flex flex-col sm:flex-row gap-3">
              <span className="font-medium text-gray-700">{t("manifesto.pdf_note")}</span>
              <div className="flex gap-4">
                <span>
                  {t("manifesto.dmk_chapters")} —{" "}
                  <a href="https://www.dmk.in" target="_blank" rel="noopener noreferrer" className="text-red-600 underline font-medium">
                    {t("manifesto.dmk_pdf_link")}
                  </a>
                </span>
                <span>
                  {t("manifesto.ai_chapters")} —{" "}
                  <a href="https://www.aiadmk.com" target="_blank" rel="noopener noreferrer" className="text-green-700 underline font-medium">
                    {t("manifesto.ai_pdf_link")}
                  </a>
                </span>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
              <strong>{t("manifesto.score_note")}</strong> {t("manifesto.score_desc")}
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════
             2021 DELIVERY AUDIT
             ══════════════════════════════════════════════════ */
          <div className="space-y-6">
            {/* Scorecard */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs bg-red-600">
                  DMK
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{t("manifesto.audit_title")}</h2>
                  <p className="text-xs text-gray-500">{auditStats.total} {t("manifesto.audit_checked")}</p>
                </div>
              </div>
              <div className="w-full h-8 rounded-full overflow-hidden flex bg-gray-100 mb-3">
                {auditStats.kept    > 0 && <div className="h-full bg-green-500  flex items-center justify-center text-white text-xs font-bold" style={{ width: `${keptPct}%`    }}>{Number(keptPct)    > 5 ? `${keptPct}%`    : ""}</div>}
                {auditStats.partial > 0 && <div className="h-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${partialPct}%` }}>{Number(partialPct) > 5 ? `${partialPct}%` : ""}</div>}
                {auditStats.broken  > 0 && <div className="h-full bg-red-500    flex items-center justify-center text-white text-xs font-bold" style={{ width: `${brokenPct}%`  }}>{Number(brokenPct)  > 5 ? `${brokenPct}%`  : ""}</div>}
                {auditStats.pending > 0 && <div className="h-full bg-gray-300   flex items-center justify-center text-gray-600 text-xs font-bold" style={{ width: `${pendingPct}%` }}>{Number(pendingPct)  > 5 ? `${pendingPct}%` : ""}</div>}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {(["kept", "partially_kept", "broken", "pending"] as const).map((s) => {
                  const sc = statusConfig(s, t);
                  const count = s === "kept" ? auditStats.kept : s === "partially_kept" ? auditStats.partial : s === "broken" ? auditStats.broken : auditStats.pending;
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedStatus(selectedStatus === s ? "all" : s)}
                      className={`text-center p-3 rounded-xl transition-all ${selectedStatus === s ? `ring-2 ring-offset-1 ${sc.bg}` : "bg-gray-50 hover:bg-gray-100"}`}
                    >
                      <p className={`text-2xl font-extrabold ${sc.text}`}>{count}</p>
                      <p className="text-xs text-gray-500">{sc.icon} {sc.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-terracotta"
              >
                <option value="all">{t("manifesto.all_categories")} ({filteredAudit.length})</option>
                {categoriesAudit.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`cat.${cat}`)} ({currentPromises.filter((p) => p.category === cat).length})
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400 ml-auto">{t("manifesto.showing")} {filteredAudit.length} {t("manifesto.of")} {verifiedPromises.length} {t("manifesto.verified")}</span>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
              {t("manifesto.method")}
              {unverifiedPromises.length > 0 && <span className="ml-1"> {unverifiedPromises.length} {t("manifesto.still_verifying")}</span>}
            </div>

            {/* Promises grouped by category */}
            {categoriesAudit
              .filter((cat) => selectedCategory === "all" || cat === selectedCategory)
              .map((cat) => {
                const catItems = filteredAudit.filter((p) => p.category === cat);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800 text-sm">{t(`cat.${cat}`)}</h3>
                      <span className="text-xs text-gray-400 ml-1">{catItems.length} {t("manifesto.promises")}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {catItems.map((p) => {
                        const sc = statusConfig(p.status, t);
                        const isExp = expandedId === p.id;
                        return (
                          <div key={p.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-start gap-3">
                              <span className="text-lg flex-shrink-0 mt-0.5">{sc.icon}</span>
                              <div className="flex-1 min-w-0">
                                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5 ${sc.bg} ${sc.text}`}>{sc.label}</span>
                                <p className="text-sm text-gray-800">{(lang === "ta" && p.promise_text_tamil) ? p.promise_text_tamil : p.promise_text}</p>
                                {p.promise_text_tamil && lang !== "ta" && <p className="text-xs text-gray-400 mt-0.5">{p.promise_text_tamil}</p>}
                                {p.evidence && (
                                  <button onClick={() => setExpandedId(isExp ? null : p.id)} className="text-xs text-terracotta hover:underline mt-2">
                                    {isExp ? t("manifesto.hide_evidence") : t("manifesto.show_evidence")}
                                  </button>
                                )}
                                {isExp && p.evidence && (
                                  <div className="mt-2 bg-gray-50 rounded-xl p-3 text-xs text-gray-600 leading-relaxed">
                                    <p>{p.evidence}</p>
                                    {p.evidence_ta && <p className="mt-1 text-gray-400">{p.evidence_ta}</p>}
                                    {p.source_url && (
                                      <a href={p.source_url} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 mt-2 text-terracotta hover:underline font-semibold">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        {(() => { try { return new URL(p.source_url).hostname.replace("www.", ""); } catch { return "Source"; } })()}
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            {/* Unverified */}
            {unverifiedPromises.length > 0 && (
              <details className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <summary className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <span className="text-sm font-semibold text-gray-600 inline-flex items-center gap-2">
                    {t("manifesto.other_promises")}
                    <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-semibold">{unverifiedPromises.length} {t("manifesto.unverified")}</span>
                  </span>
                </summary>
                <div className="divide-y divide-gray-50 border-t border-gray-100">
                  {unverifiedPromises.map((p) => (
                    <div key={p.id} className="px-5 py-3 flex items-start gap-3">
                      <span className="text-gray-300 text-sm mt-0.5">○</span>
                      <div>
                        <p className="text-sm text-gray-500">{(lang === "ta" && p.promise_text_tamil) ? p.promise_text_tamil : p.promise_text}</p>
                        {p.promise_text_tamil && lang !== "ta" && <p className="text-xs text-gray-300 mt-0.5">{p.promise_text_tamil}</p>}
                        {p.category && (
                          <span className="inline-block text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded mt-1">
                            {t(`cat.${p.category}`)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>{t("manifesto.footer")}</p>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────

function believabilityConfig(label: string | null) {
  switch (label) {
    case "Very Likely":  return { text: "text-green-700",  bg: "bg-green-50"  };
    case "Likely":       return { text: "text-blue-700",   bg: "bg-blue-50"   };
    case "Uncertain":    return { text: "text-yellow-700", bg: "bg-yellow-50" };
    case "Unlikely":     return { text: "text-red-700",    bg: "bg-red-50"    };
    default:             return { text: "text-gray-500",   bg: "bg-gray-50"   };
  }
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 7 ? "#2d7a4f" : score >= 5 ? "#b8860b" : "#c0392b";
  return (
    <div className="flex-shrink-0 w-11 h-11 rounded-full border-4 flex items-center justify-center" style={{ borderColor: color }}>
      <span className="text-sm font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function PromiseCard({
  p,
  expandedId,
  setExpandedId,
  t,
  lang,
}: {
  p: ManifestoPromise;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  t: (key: string) => string;
  lang: string;
}) {
  const isExp = expandedId === p.id;
  const bc = believabilityConfig(p.believability_label);

  return (
    <div className={`rounded-xl border p-3 ${p.is_flagship ? "border-amber-200 bg-amber-50/50" : "border-gray-100 bg-gray-50/50"}`}>
      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        {p.is_flagship && (
          <span className="text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{t("manifesto.flagship")}</span>
        )}
        {p.believability_label && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${bc.bg} ${bc.text}`}>
            {t(`bel.${p.believability_label.toLowerCase().replace(" ", "_")}`)}
          </span>
        )}
        {p.overall_score != null && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ml-auto ${
            p.overall_score >= 7 ? "bg-green-100 text-green-700" :
            p.overall_score >= 5 ? "bg-yellow-100 text-yellow-700" :
            "bg-red-100 text-red-700"
          }`}>
            {p.overall_score}/10
          </span>
        )}
      </div>

      {/* Promise text */}
      <p className="text-sm text-gray-800 leading-relaxed">{(lang === "ta" && p.promise_text_tamil) ? p.promise_text_tamil : p.promise_text}</p>
      {p.promise_text_tamil && lang !== "ta" && (
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{p.promise_text_tamil}</p>
      )}

      {/* Analysis toggle */}
      {p.ai_reasoning && (
        <button
          onClick={() => setExpandedId(isExp ? null : p.id)}
          className="text-xs text-terracotta hover:underline mt-1.5 block"
        >
          {isExp ? t("manifesto.hide") : t("manifesto.our_take")}
        </button>
      )}
      {isExp && p.ai_reasoning && (
        <div className="mt-2 bg-white rounded-lg p-3 text-sm text-gray-600 leading-relaxed border border-gray-100">
          {p.ai_reasoning}
        </div>
      )}
    </div>
  );
}
