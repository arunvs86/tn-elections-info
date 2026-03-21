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
  fiscal_score: number | null;
  specificity_score: number | null;
  past_delivery_score: number | null;
  overall_score: number | null;
  believability_label: string | null;
  ai_reasoning: string | null;
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

function believabilityBadge(label: string | null): { bg: string; text: string } {
  if (!label) return { bg: "bg-gray-100", text: "text-gray-500" };
  const l = label.toLowerCase();
  if (l.includes("high") || l.includes("credible")) return { bg: "bg-green-100", text: "text-green-700" };
  if (l.includes("moderate") || l.includes("possible")) return { bg: "bg-yellow-100", text: "text-yellow-700" };
  if (l.includes("low") || l.includes("doubt")) return { bg: "bg-red-100", text: "text-red-700" };
  return { bg: "bg-gray-100", text: "text-gray-500" };
}

const PARTIES = ["DMK", "AIADMK", "TVK", "BJP"];

// ── Page ───────────────────────────────────────────────
export default function ManifestoPage() {
  const [promises, setPromises] = useState<ManifestoPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParty, setSelectedParty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [compareMode, setCompareMode] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("manifesto_promises")
        .select("*")
        .order("overall_score", { ascending: false });

      if (data) setPromises(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Get unique categories
  const categories = Array.from(new Set(promises.map((p) => p.category).filter(Boolean))) as string[];

  // Filter
  const filtered = promises.filter((p) => {
    if (selectedParty !== "all" && p.party !== selectedParty) return false;
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
    return true;
  });

  // For compare mode: group by category
  const compareCategories = categories.filter((cat) => {
    return PARTIES.some((party) =>
      promises.some((p) => p.category === cat && p.party === party)
    );
  });

  // Party averages
  const partyAverages = PARTIES.map((party) => {
    const partyPromises = promises.filter((p) => p.party === party);
    const avg =
      partyPromises.length > 0
        ? partyPromises.reduce((s, p) => s + (p.overall_score || 0), 0) / partyPromises.length
        : 0;
    return { party, avg: avg.toFixed(1), count: partyPromises.length };
  });

  return (
    <div className="min-h-screen bg-cream">
      <Header active="factcheck" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          Manifesto Analyser
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          AI-scored believability analysis of party manifestos for Tamil Nadu 2026
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 animate-pulse">Loading manifesto data...</p>
          </div>
        ) : promises.length === 0 ? (
          <div className="space-y-6">
            {/* Party score cards even when no data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PARTIES.map((party) => (
                <div
                  key={party}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center"
                >
                  <div
                    className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white font-bold text-sm mb-2"
                    style={{ background: partyColor(party) }}
                  >
                    {party.slice(0, 3)}
                  </div>
                  <p className="font-bold text-gray-900">{party}</p>
                  <p className="text-xs text-gray-400 mt-1">Manifesto analysis coming soon</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-500">
                Manifesto promises will be loaded and scored once party manifestos are released
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Each promise is scored on: Fiscal Feasibility, Specificity, and Past Delivery Track Record
              </p>
            </div>

            {/* 2021 Delivery Audit section (6.3) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">
                2021 Delivery Audit — DMK
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                How well did the ruling DMK government deliver on its 2021 manifesto promises?
              </p>
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-gray-400 text-sm">
                  Delivery audit data will be populated with research on DMK&apos;s 2021 manifesto fulfillment
                </p>
                <div className="flex justify-center gap-4 mt-4 text-xs text-gray-500">
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1 bg-green-500" />Kept</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1 bg-yellow-500" />Partial</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1 bg-gray-300" />Pending</span>
                  <span><span className="inline-block w-2 h-2 rounded-full mr-1 bg-red-500" />Broken</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Party score summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {partyAverages.map(({ party, avg, count }) => (
                <button
                  key={party}
                  onClick={() => setSelectedParty(selectedParty === party ? "all" : party)}
                  className={`bg-white rounded-2xl border shadow-sm p-4 text-center transition-all hover:shadow-md ${
                    selectedParty === party ? "border-terracotta ring-2 ring-terracotta/20" : "border-gray-100"
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white font-bold text-xs mb-2"
                    style={{ background: partyColor(party) }}
                  >
                    {party.slice(0, 3)}
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{party}</p>
                  <p className="text-2xl font-extrabold text-terracotta">{avg}</p>
                  <p className="text-[10px] text-gray-400">{count} promises scored</p>
                </button>
              ))}
            </div>

            {/* Filters + Compare toggle */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-terracotta"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <button
                onClick={() => {
                  setCompareMode(!compareMode);
                  setSelectedParty("all");
                }}
                className={`text-sm px-4 py-2 rounded-lg font-semibold transition-colors ${
                  compareMode
                    ? "bg-terracotta text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-terracotta"
                }`}
              >
                {compareMode ? "Exit Compare" : "Compare Parties"}
              </button>

              <span className="text-xs text-gray-400 ml-auto">
                {filtered.length} promises
              </span>
            </div>

            {/* Compare mode: side-by-side by category (6.4) */}
            {compareMode ? (
              <div className="space-y-4">
                {compareCategories.map((category) => (
                  <div key={category} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {PARTIES.map((party) => {
                        const partyPromises = promises.filter(
                          (p) => p.category === category && p.party === party
                        );
                        if (partyPromises.length === 0) {
                          return (
                            <div key={party} className="bg-gray-50 rounded-xl p-3 text-center">
                              <p className="text-xs font-semibold" style={{ color: partyColor(party) }}>{party}</p>
                              <p className="text-[10px] text-gray-400 mt-1">No promises in this category</p>
                            </div>
                          );
                        }
                        return (
                          <div key={party} className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs font-semibold mb-2" style={{ color: partyColor(party) }}>{party}</p>
                            {partyPromises.map((p) => (
                              <div key={p.id} className="text-xs text-gray-600 mb-2 pb-2 border-b border-gray-200 last:border-0">
                                <p>{p.promise_text}</p>
                                {p.overall_score != null && (
                                  <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${scoreBg(p.overall_score)} ${scoreText(p.overall_score)}`}>
                                    {p.overall_score}/10
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Normal list view */
              <div className="space-y-3">
                {filtered.map((p) => {
                  const badge = believabilityBadge(p.believability_label);
                  const isExpanded = expandedId === p.id;
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 transition-all hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        {/* Party badge */}
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
                                {p.category}
                              </span>
                            )}
                            {p.believability_label && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                                {p.believability_label}
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-700">{p.promise_text}</p>
                          {p.promise_text_tamil && (
                            <p className="text-xs text-gray-400 mt-0.5">{p.promise_text_tamil}</p>
                          )}

                          {/* Score pills */}
                          <div className="flex gap-2 mt-2">
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
                            {p.past_delivery_score != null && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${scoreBg(p.past_delivery_score)} ${scoreText(p.past_delivery_score)}`}>
                                Track Record: {p.past_delivery_score}/10
                              </span>
                            )}
                            {p.overall_score != null && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-800 text-white">
                                Overall: {p.overall_score}/10
                              </span>
                            )}
                          </div>

                          {/* Expandable AI reasoning */}
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

                        {/* Overall score ring */}
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
            )}

            {/* 2021 Delivery Audit (6.3) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-8">
              <h2 className="font-bold text-gray-900 text-lg mb-4">
                2021 Delivery Audit — DMK
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                How well did the ruling DMK government deliver on its 2021 manifesto promises?
              </p>
              {(() => {
                const dmk2021 = promises.filter((p) => p.party === "DMK" && p.election_year === 2021);
                if (dmk2021.length === 0) {
                  return (
                    <div className="bg-gray-50 rounded-xl p-6 text-center">
                      <p className="text-gray-400 text-sm">
                        2021 delivery audit data will be populated soon
                      </p>
                    </div>
                  );
                }
                const avgScore = dmk2021.reduce((s, p) => s + (p.past_delivery_score || 0), 0) / dmk2021.length;
                return (
                  <div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center mb-4">
                      <p className="text-xs text-gray-500">Average Delivery Score</p>
                      <p className="text-3xl font-extrabold text-terracotta">{avgScore.toFixed(1)}/10</p>
                    </div>
                    <div className="space-y-2">
                      {dmk2021.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${scoreBg(p.past_delivery_score)} ${scoreText(p.past_delivery_score)}`}>
                            {p.past_delivery_score ?? "?"}/10
                          </span>
                          <span className="text-gray-700">{p.promise_text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Data from Election Commission of India · Tamil Nadu Elections 2026</p>
        </div>
      </footer>
    </div>
  );
}
