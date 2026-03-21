"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

// ── Types ──────────────────────────────────────────────
interface ManifestoPromise {
  id: number;
  party: string;
  election_year: number;
  promise_text: string;
  promise_text_tamil: string | null;
  category: string | null;
  // Scores (used for upcoming elections only)
  fiscal_score: number | null;
  specificity_score: number | null;
  past_delivery_score: number | null;
  overall_score: number | null;
  believability_label: string | null;
  ai_reasoning: string | null;
  // Delivery status (used for past elections only)
  status: "kept" | "partially_kept" | "broken" | "pending" | null;
  evidence: string | null;
  evidence_ta: string | null;
  source_url: string | null;
}

// ── Helpers ────────────────────────────────────────────
function partyColor(party: string): string {
  const p = (party || "").toUpperCase();
  if (p.includes("DMK") && !p.includes("AIADMK") && !p.includes("ADMK")) return "#c0392b";
  if (p.includes("AIADMK") || p === "ADMK") return "#2d7a4f";
  if (p.includes("TVK")) return "#1a5276";
  if (p.includes("BJP")) return "#d35400";
  return "#888";
}

function statusConfig(status: string | null) {
  switch (status) {
    case "kept":
      return { label: "Kept", labelTa: "நிறைவேற்றப்பட்டது", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", icon: "✅" };
    case "partially_kept":
      return { label: "Partially Kept", labelTa: "ஓரளவு நிறைவேற்றம்", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500", icon: "⚠️" };
    case "broken":
      return { label: "Broken", labelTa: "நிறைவேற்றப்படவில்லை", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", icon: "❌" };
    case "pending":
      return { label: "Pending", labelTa: "நிலுவையில்", bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400", icon: "⏳" };
    default:
      return { label: "Unknown", labelTa: "தெரியவில்லை", bg: "bg-gray-100", text: "text-gray-400", dot: "bg-gray-300", icon: "❓" };
  }
}

function scoreBg(score: number | null): string {
  if (score == null) return "bg-gray-100";
  if (score >= 7) return "bg-green-100";
  if (score >= 4) return "bg-yellow-100";
  return "bg-red-100";
}

function scoreText(score: number | null): string {
  if (score == null) return "text-gray-400";
  if (score >= 7) return "text-green-700";
  if (score >= 4) return "text-yellow-700";
  return "text-red-700";
}

const CATEGORIES_ORDER = [
  "welfare", "education", "healthcare", "women", "agriculture",
  "infrastructure", "economy", "governance", "law_and_order",
  "transport", "housing", "environment", "labour", "culture",
  "minorities", "fisheries", "youth", "sports", "tourism", "other",
];

// ── Page ───────────────────────────────────────────────
export default function ManifestoPage() {
  const [promises, setPromises] = useState<ManifestoPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [tab, setTab] = useState<"audit" | "upcoming">("audit");

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

  // Split data
  const pastPromises = promises.filter((p) => p.election_year <= 2021);
  const upcomingPromises = promises.filter((p) => p.election_year >= 2026);

  // Separate verified (has evidence) from unverified
  const verifiedPromises = pastPromises.filter((p) => p.evidence && p.evidence !== "Verification pending");
  const unverifiedPromises = pastPromises.filter((p) => !p.evidence || p.evidence === "Verification pending");

  // Currently showing
  const currentPromises = tab === "audit" ? verifiedPromises : upcomingPromises;

  // Categories for current view
  const categories = CATEGORIES_ORDER.filter((cat) =>
    currentPromises.some((p) => p.category === cat)
  );

  // Filter
  const filtered = currentPromises.filter((p) => {
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
    if (tab === "audit" && selectedStatus !== "all" && p.status !== selectedStatus) return false;
    return true;
  });

  // Group by category for display
  const groupedByCategory = categories.reduce((acc, cat) => {
    acc[cat] = filtered.filter((p) => p.category === cat);
    return acc;
  }, {} as Record<string, ManifestoPromise[]>);

  // Stats for audit (verified promises only)
  const auditStats = {
    total: verifiedPromises.length,
    kept: verifiedPromises.filter((p) => p.status === "kept").length,
    partial: verifiedPromises.filter((p) => p.status === "partially_kept").length,
    broken: verifiedPromises.filter((p) => p.status === "broken").length,
    pending: verifiedPromises.filter((p) => p.status === "pending" || !p.status).length,
  };

  const keptPct = auditStats.total > 0 ? ((auditStats.kept / auditStats.total) * 100).toFixed(0) : "0";
  const partialPct = auditStats.total > 0 ? ((auditStats.partial / auditStats.total) * 100).toFixed(0) : "0";
  const brokenPct = auditStats.total > 0 ? ((auditStats.broken / auditStats.total) * 100).toFixed(0) : "0";
  const pendingPct = auditStats.total > 0 ? ((auditStats.pending / auditStats.total) * 100).toFixed(0) : "0";

  return (
    <div className="min-h-screen bg-cream">
      <Header active="manifesto" />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Page Title */}
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          Manifesto Tracker
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Did they keep their promises? Track delivery of election manifestos.
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setTab("audit"); setSelectedCategory("all"); setSelectedStatus("all"); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === "audit"
                ? "bg-terracotta text-white shadow-md"
                : "bg-white border border-gray-200 text-gray-600 hover:border-terracotta"
            }`}
          >
            2021 Delivery Audit
          </button>
          <button
            onClick={() => { setTab("upcoming"); setSelectedCategory("all"); setSelectedStatus("all"); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === "upcoming"
                ? "bg-terracotta text-white shadow-md"
                : "bg-white border border-gray-200 text-gray-600 hover:border-terracotta"
            }`}
          >
            2026 Manifestos
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 animate-pulse">Loading manifesto data...</p>
          </div>
        ) : tab === "audit" ? (
          /* ═══════════════════════════════════════════════════
             2021 DELIVERY AUDIT — Did DMK keep their promises?
             ═══════════════════════════════════════════════════ */
          <div className="space-y-6">
            {/* Summary scorecard */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ background: partyColor("DMK") }}
                >
                  DMK
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">DMK 2021 Manifesto — Delivery Report Card</h2>
                  <p className="text-xs text-gray-500">{auditStats.total} major promises verified with news sources</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-8 rounded-full overflow-hidden flex bg-gray-100 mb-3">
                {auditStats.kept > 0 && (
                  <div
                    className="h-full bg-green-500 flex items-center justify-center text-white text-xs font-bold"
                    style={{ width: `${keptPct}%` }}
                  >
                    {Number(keptPct) > 5 ? `${keptPct}%` : ""}
                  </div>
                )}
                {auditStats.partial > 0 && (
                  <div
                    className="h-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold"
                    style={{ width: `${partialPct}%` }}
                  >
                    {Number(partialPct) > 5 ? `${partialPct}%` : ""}
                  </div>
                )}
                {auditStats.broken > 0 && (
                  <div
                    className="h-full bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                    style={{ width: `${brokenPct}%` }}
                  >
                    {Number(brokenPct) > 5 ? `${brokenPct}%` : ""}
                  </div>
                )}
                {auditStats.pending > 0 && (
                  <div
                    className="h-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-bold"
                    style={{ width: `${pendingPct}%` }}
                  >
                    {Number(pendingPct) > 5 ? `${pendingPct}%` : ""}
                  </div>
                )}
              </div>

              {/* Legend + counts */}
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => setSelectedStatus(selectedStatus === "kept" ? "all" : "kept")}
                  className={`text-center p-3 rounded-xl transition-all ${selectedStatus === "kept" ? "ring-2 ring-green-400 bg-green-50" : "bg-gray-50 hover:bg-green-50"}`}
                >
                  <p className="text-2xl font-extrabold text-green-600">{auditStats.kept}</p>
                  <p className="text-xs text-gray-500">✅ Kept</p>
                </button>
                <button
                  onClick={() => setSelectedStatus(selectedStatus === "partially_kept" ? "all" : "partially_kept")}
                  className={`text-center p-3 rounded-xl transition-all ${selectedStatus === "partially_kept" ? "ring-2 ring-yellow-400 bg-yellow-50" : "bg-gray-50 hover:bg-yellow-50"}`}
                >
                  <p className="text-2xl font-extrabold text-yellow-600">{auditStats.partial}</p>
                  <p className="text-xs text-gray-500">⚠️ Partial</p>
                </button>
                <button
                  onClick={() => setSelectedStatus(selectedStatus === "broken" ? "all" : "broken")}
                  className={`text-center p-3 rounded-xl transition-all ${selectedStatus === "broken" ? "ring-2 ring-red-400 bg-red-50" : "bg-gray-50 hover:bg-red-50"}`}
                >
                  <p className="text-2xl font-extrabold text-red-600">{auditStats.broken}</p>
                  <p className="text-xs text-gray-500">❌ Broken</p>
                </button>
                <button
                  onClick={() => setSelectedStatus(selectedStatus === "pending" ? "all" : "pending")}
                  className={`text-center p-3 rounded-xl transition-all ${selectedStatus === "pending" ? "ring-2 ring-gray-400 bg-gray-100" : "bg-gray-50 hover:bg-gray-100"}`}
                >
                  <p className="text-2xl font-extrabold text-gray-500">{auditStats.pending}</p>
                  <p className="text-xs text-gray-500">⏳ Pending</p>
                </button>
              </div>
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-terracotta"
              >
                <option value="all">All Categories ({filtered.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} ({currentPromises.filter((p) => p.category === cat).length})
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400 ml-auto">
                Showing {filtered.length} of {verifiedPromises.length} verified
              </span>
            </div>

            {/* Promise list grouped by category */}
            {/* Methodology note */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
              <strong>Methodology:</strong> Each promise was verified using news reports from The Hindu, The New Indian Express, The News Minute, India Today, PRS Legislative Research, and official government sources.
              {unverifiedPromises.length > 0 && (
                <span className="ml-1">
                  {unverifiedPromises.length} additional manifesto promises are listed below but have not yet been independently verified.
                </span>
              )}
            </div>

            {Object.entries(groupedByCategory).map(([category, catPromises]) => {
              if (catPromises.length === 0) return null;
              return (
                <div key={category} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800 text-sm">
                      {category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </h3>
                    <p className="text-xs text-gray-400">{catPromises.length} promises</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {catPromises.map((p) => {
                      const sc = statusConfig(p.status);
                      const isExpanded = expandedId === p.id;
                      return (
                        <div key={p.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-start gap-3">
                            {/* Status icon */}
                            <span className="text-lg flex-shrink-0 mt-0.5">{sc.icon}</span>

                            <div className="flex-1 min-w-0">
                              {/* Status badge */}
                              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5 ${sc.bg} ${sc.text}`}>
                                {sc.label}
                              </span>

                              {/* Promise text */}
                              <p className="text-sm text-gray-800">{p.promise_text}</p>
                              {p.promise_text_tamil && (
                                <p className="text-xs text-gray-400 mt-0.5">{p.promise_text_tamil}</p>
                              )}

                              {/* Evidence */}
                              {p.evidence && (
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                                  className="text-xs text-terracotta hover:underline mt-2"
                                >
                                  {isExpanded ? "Hide evidence" : "Show evidence"}
                                </button>
                              )}
                              {isExpanded && p.evidence && (
                                <div className="mt-2 bg-gray-50 rounded-xl p-3 text-xs text-gray-600 leading-relaxed">
                                  <p>{p.evidence}</p>
                                  {p.evidence_ta && (
                                    <p className="mt-1 text-gray-400">{p.evidence_ta}</p>
                                  )}
                                  {p.source_url && (
                                    <a
                                      href={p.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 mt-2 text-terracotta hover:underline font-semibold"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                      {(() => {
                                        try { return new URL(p.source_url).hostname.replace("www.", ""); } catch { return "Source"; }
                                      })()}
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

            {/* ── Unverified promises (collapsible) ── */}
            {unverifiedPromises.length > 0 && (
              <details className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <summary className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600">
                      Other Manifesto Promises
                    </span>
                    <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
                      {unverifiedPromises.length} unverified
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 ml-0">
                    These promises from the DMK 2021 manifesto have not yet been independently verified with news sources.
                  </p>
                </summary>
                <div className="divide-y divide-gray-50 border-t border-gray-100">
                  {unverifiedPromises.map((p) => (
                    <div key={p.id} className="px-5 py-3 flex items-start gap-3">
                      <span className="text-gray-300 text-sm mt-0.5">&#x25CB;</span>
                      <div>
                        <p className="text-sm text-gray-500">{p.promise_text}</p>
                        {p.promise_text_tamil && (
                          <p className="text-xs text-gray-300 mt-0.5">{p.promise_text_tamil}</p>
                        )}
                        {p.category && (
                          <span className="inline-block text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded mt-1">
                            {p.category.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════
             2026 UPCOMING MANIFESTOS — Score & Analyse
             ═══════════════════════════════════════════════════ */
          <div className="space-y-6">
            {upcomingPromises.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <p className="text-4xl mb-3">📋</p>
                <h3 className="font-bold text-gray-900 text-lg mb-2">
                  2026 Manifestos — Coming Soon
                </h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Party manifestos will be analysed and scored once they are officially released.
                  Each promise will be rated on fiscal feasibility, specificity, and believability.
                </p>
                <div className="flex justify-center gap-6 mt-6 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    High feasibility
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Moderate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Low feasibility
                  </span>
                </div>
              </div>
            ) : (
              /* When 2026 manifestos are available, show scored view */
              <>
                <div className="flex items-center gap-3 mb-4">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-terracotta"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400 ml-auto">
                    {filtered.length} promises
                  </span>
                </div>

                <div className="space-y-3">
                  {filtered.map((p) => {
                    const isExpanded = expandedId === p.id;
                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 transition-all hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                            style={{ background: partyColor(p.party) }}
                          >
                            {p.party.slice(0, 3)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-semibold" style={{ color: partyColor(p.party) }}>
                                {p.party}
                              </span>
                              {p.category && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                  {p.category.replace(/_/g, " ")}
                                </span>
                              )}
                              {p.believability_label && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  p.believability_label === "Very Likely" ? "bg-green-100 text-green-700" :
                                  p.believability_label === "Likely" ? "bg-green-50 text-green-600" :
                                  p.believability_label === "Unlikely" ? "bg-red-100 text-red-700" :
                                  "bg-yellow-100 text-yellow-700"
                                }`}>
                                  {p.believability_label}
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-gray-700">{p.promise_text}</p>
                            {p.promise_text_tamil && (
                              <p className="text-xs text-gray-400 mt-0.5">{p.promise_text_tamil}</p>
                            )}

                            <div className="flex gap-2 mt-2 flex-wrap">
                              {p.fiscal_score != null && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${scoreBg(p.fiscal_score)} ${scoreText(p.fiscal_score)}`}>
                                  Fiscal: {p.fiscal_score}/10
                                </span>
                              )}
                              {p.specificity_score != null && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${scoreBg(p.specificity_score)} ${scoreText(p.specificity_score)}`}>
                                  Specificity: {p.specificity_score}/10
                                </span>
                              )}
                            </div>

                            {p.ai_reasoning && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                                className="text-xs text-terracotta hover:underline mt-2"
                              >
                                {isExpanded ? "Hide reasoning" : "Show AI reasoning"}
                              </button>
                            )}
                            {isExpanded && p.ai_reasoning && (
                              <div className="mt-2 bg-gray-50 rounded-xl p-3 text-xs text-gray-600 leading-relaxed">
                                {p.ai_reasoning}
                              </div>
                            )}
                          </div>

                          {p.overall_score != null && (
                            <div className="flex-shrink-0 w-12 h-12 rounded-full border-4 flex items-center justify-center"
                              style={{
                                borderColor: p.overall_score >= 7 ? "#2d7a4f" : p.overall_score >= 4 ? "#b8860b" : "#c0392b",
                              }}
                            >
                              <span className="text-sm font-bold" style={{
                                color: p.overall_score >= 7 ? "#2d7a4f" : p.overall_score >= 4 ? "#b8860b" : "#c0392b",
                              }}>
                                {p.overall_score}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 mt-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Data from Election Commission of India · Tamil Nadu Elections 2026</p>
        </div>
      </footer>
    </div>
  );
}
