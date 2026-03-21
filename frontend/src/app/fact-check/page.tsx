"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";
import Header from "@/components/Header";

// ── Types ──────────────────────────────────────────────
type Verdict = "true" | "misleading" | "false" | "unverifiable";

interface Source {
  title: string;
  url: string;
}

interface FactCheckResult {
  verdict: Verdict;
  confidence_pct: number;
  explanation: string;
  party_about: string | null;
  sources_used: (Source | string)[];
}

interface AgentMessage {
  agent_name: string;   // from DB (save_messages maps "agent" → "agent_name")
  agent: string;        // raw from API response
  message_text: string; // from DB
  text: string;         // raw from API response
  message_type: string;
  type: string;
}

interface RecentCheck {
  id: number;
  claim_text: string;
  verdict: Verdict;
  confidence_pct: number;
  explanation: string;
  party_about: string | null;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────
function verdictConfig(v: Verdict) {
  switch (v) {
    case "true":
      return {
        label: "True",
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        dot: "#2d7a4f",
        icon: "✓",
      };
    case "misleading":
      return {
        label: "Misleading",
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
        dot: "#b8860b",
        icon: "⚠",
      };
    case "false":
      return {
        label: "False",
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        dot: "#c0392b",
        icon: "✗",
      };
    case "unverifiable":
      return {
        label: "Unverifiable",
        bg: "bg-gray-50",
        border: "border-gray-200",
        text: "text-gray-600",
        dot: "#555",
        icon: "?",
      };
  }
}

function partyColor(party: string): string {
  const p = (party || "").toUpperCase();
  if (p === "ADMK" || p.includes("AIADMK")) return "#2d7a4f";
  if (p.includes("DMK")) return "#c0392b";
  if (p.includes("TVK")) return "#1a5276";
  if (p.includes("BJP")) return "#d35400";
  if (p.includes("NTK")) return "#6c3483";
  if (p.includes("INC") || p.includes("CONGRESS")) return "#1565c0";
  if (p.includes("PMK")) return "#b8860b";
  return "#888";
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = now.getTime() - then.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Thinking animation — matches the 5-agent pipeline ──
const THINKING_STEPS = [
  { agent: "Entity Extractor", text: "Extracting parties, people, and topics from claim..." },
  { agent: "Wikipedia Search", text: "Searching Wikipedia for background knowledge..." },
  { agent: "Database Search", text: "Querying our election database (ECI/MyNeta)..." },
  { agent: "Web Search", text: "Searching news articles, fact-checks, and press releases..." },
  { agent: "Verdict Agent", text: "Reviewing all evidence and forming verdict..." },
];

// Agent name → display label for the reasoning trace
function agentLabel(name: string): { label: string; icon: string } {
  switch (name) {
    case "supervisor":
      return { label: "Supervisor", icon: "🧠" };
    case "entity_extractor":
      return { label: "Entity Extractor", icon: "🔍" };
    case "wikipedia_searcher":
      return { label: "Wikipedia Search", icon: "📚" };
    case "db_searcher":
      return { label: "Database Search", icon: "🗄️" };
    case "web_searcher":
      return { label: "Web Search", icon: "🌐" };
    case "verdict_agent":
      return { label: "Verdict Agent", icon: "⚖️" };
    default:
      return { label: name, icon: "🤖" };
  }
}

// ── Page ───────────────────────────────────────────────
export default function FactCheckPage() {
  const [claim, setClaim] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recentChecks, setRecentChecks] = useState<RecentCheck[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);
  const { lang, setLang, t } = useLang();

  // Fetch recent checks on mount
  useEffect(() => {
    async function fetchRecent() {
      const { data } = await supabase
        .from("fact_checks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) setRecentChecks(data as RecentCheck[]);
      setLoadingRecent(false);
    }
    fetchRecent();
  }, []);

  // Animate thinking steps while loading
  useEffect(() => {
    if (!loading) return;
    setThinkingStep(0);
    const interval = setInterval(() => {
      setThinkingStep((prev) => {
        if (prev < THINKING_STEPS.length - 1) return prev + 1;
        return prev; // stay on last step
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleSubmit() {
    if (!claim.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setAgentMessages([]);
    setError(null);

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${backendUrl}/api/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query_type: "factcheck",
          claim_text: claim.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }

      const data = await res.json();

      // Extract fact-check result
      if (data.factcheck_result) {
        const fc = data.factcheck_result;
        setResult({
          verdict: (fc.verdict || "unverifiable").toLowerCase() as Verdict,
          confidence_pct: fc.confidence_pct || 0,
          explanation: fc.explanation || "No explanation provided.",
          party_about: fc.party_about || null,
          sources_used: fc.sources_used || [],
        });
      } else {
        setError("The AI could not determine a verdict for this claim.");
      }

      // Extract agent messages for reasoning trace
      if (data.agent_messages && Array.isArray(data.agent_messages)) {
        setAgentMessages(data.agent_messages);
      }

      // Refresh recent checks
      const { data: fresh } = await supabase
        .from("fact_checks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (fresh) setRecentChecks(fresh as RecentCheck[]);

      // Scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to the fact-check service."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header active="factcheck" />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 mb-2">
          <Link href="/" className="hover:text-terracotta">
            {t("nav.home")}
          </Link>
          {" / "}
          <span className="text-gray-600 font-medium">{t("nav.factcheck")}</span>
        </p>

        {/* ── Hero section ── */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            {t("fc.title")}
          </h1>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            {t("fc.subtitle")}
          </p>
        </div>

        {/* ── Claim Input ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <label
            htmlFor="claim-input"
            className="block text-sm font-semibold text-gray-800 mb-2"
          >
            {t("fc.input_label")}
          </label>
          <textarea
            id="claim-input"
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="e.g. &quot;DMK promised 1000 new schools but only built 200&quot; or paste a WhatsApp forward..."
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta/30 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-400">
              {claim.length > 0 ? `${claim.length} characters` : "Cmd+Enter to submit"}
            </p>
            <button
              onClick={handleSubmit}
              disabled={!claim.trim() || loading}
              className="px-5 py-2.5 bg-terracotta text-white text-sm font-semibold rounded-xl hover:bg-terracotta/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? t("fc.checking") : t("fc.submit")}
            </button>
          </div>
        </div>

        {/* ── Loading / Reasoning Trace ── */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-gray-800">
                {t("fc.pipeline")}
              </p>
            </div>
            <div className="space-y-3 ml-8">
              {THINKING_STEPS.slice(0, thinkingStep + 1).map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-xs transition-opacity ${
                    i === thinkingStep
                      ? "text-terracotta font-medium opacity-100"
                      : "text-gray-400 opacity-60"
                  }`}
                >
                  {i < thinkingStep ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse" />
                  )}
                  <span className="font-semibold">{step.agent}</span>
                  <span className="text-gray-400">—</span>
                  <span>{step.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="bg-red-50 rounded-2xl border border-red-200 p-6 mb-6">
            <p className="text-sm text-red-700 font-medium">
              {t("common.error")}
            </p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
            <button
              onClick={handleSubmit}
              className="text-xs text-terracotta hover:underline mt-2"
            >
              {t("common.try_again")}
            </button>
          </div>
        )}

        {/* ── Verdict Result ── */}
        {result && !loading && (
          <div ref={resultRef} className="space-y-4 mb-8">
            {/* Verdict card */}
            {(() => {
              const config = verdictConfig(result.verdict);
              return (
                <div
                  className={`rounded-2xl border p-6 ${config.bg} ${config.border}`}
                >
                  {/* Verdict badge + confidence */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold"
                        style={{ background: config.dot }}
                      >
                        {config.icon}
                      </span>
                      <div>
                        <p
                          className={`text-2xl font-extrabold ${config.text}`}
                        >
                          {config.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {result.confidence_pct}% confidence
                        </p>
                      </div>
                    </div>

                    {/* Party tag */}
                    {result.party_about && (
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full text-white"
                        style={{ background: partyColor(result.party_about) }}
                      >
                        {result.party_about}
                      </span>
                    )}
                  </div>

                  {/* Claim being checked */}
                  <div className="bg-white/60 rounded-xl p-3 mb-4">
                    <p className="text-xs text-gray-400 mb-1">{t("fc.claim_checked")}</p>
                    <p className="text-sm text-gray-700 italic">
                      &ldquo;{claim}&rdquo;
                    </p>
                  </div>

                  {/* Explanation */}
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">
                      {t("fc.explanation")}
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {result.explanation}
                    </p>
                  </div>

                  {/* Sources */}
                  {result.sources_used && result.sources_used.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200/50">
                      <p className="text-xs font-semibold text-gray-600 mb-2">
                        {t("fc.sources")} ({result.sources_used.length})
                      </p>
                      <div className="space-y-1.5">
                        {result.sources_used.map((source, i) => {
                          const title = typeof source === "string" ? source : source.title;
                          const url = typeof source === "string" ? null : source.url;
                          return (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-xs text-gray-400 mt-0.5">{i + 1}.</span>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline leading-snug"
                                >
                                  {title}
                                  <span className="text-gray-400 ml-1">↗</span>
                                </a>
                              ) : (
                                <span className="text-xs text-gray-600">{title}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* WhatsApp Share (5.6) */}
                  <div className="mt-4 pt-4 border-t border-gray-200/50">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Fact Check: "${claim}"\n\n` +
                        `Verdict: ${config.label.toUpperCase()} (${result.confidence_pct}% confidence)\n\n` +
                        `${result.explanation?.slice(0, 200) || ""}...\n\n` +
                        `Check facts at: https://tnelections.info/fact-check`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-green-700 transition-colors"
                    >
                      Share on WhatsApp
                    </a>
                  </div>
                </div>
              );
            })()}

            {/* Reasoning trace — grouped by agent */}
            {agentMessages.length > 0 && (
              <details className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" open>
                <summary className="px-6 py-4 cursor-pointer text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors">
                  {t("fc.reasoning")} ({agentMessages.length} steps across 5 agents)
                </summary>
                <div className="px-6 pb-4 border-t border-gray-100 pt-3">
                  {/* Group messages by agent */}
                  {(() => {
                    const groups: { agent: string; messages: AgentMessage[] }[] = [];
                    let current: { agent: string; messages: AgentMessage[] } | null = null;
                    for (const msg of agentMessages) {
                      const name = msg.agent_name || msg.agent || "unknown";
                      if (!current || current.agent !== name) {
                        current = { agent: name, messages: [] };
                        groups.push(current);
                      }
                      current.messages.push(msg);
                    }
                    return groups.map((group, gi) => {
                      const info = agentLabel(group.agent);
                      return (
                        <div key={gi} className="mb-3 last:mb-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{info.icon}</span>
                            <span className="text-xs font-bold text-gray-700">
                              {info.label}
                            </span>
                            <span className="flex-1 border-t border-gray-100" />
                          </div>
                          <div className="ml-6 space-y-0.5">
                            {group.messages.map((msg, mi) => (
                              <p key={mi} className="text-xs text-gray-500">
                                {msg.message_text || msg.text}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </details>
            )}

            {/* Disclaimer */}
            <p className="text-[10px] text-gray-400 text-center">
              {t("fc.disclaimer")}
            </p>
          </div>
        )}

        {/* ── Recent Checks Feed ── */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {t("fc.recent")}
          </h2>

          {loadingRecent ? (
            <p className="text-sm text-gray-400 animate-pulse">
              Loading recent checks...
            </p>
          ) : recentChecks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-gray-500 text-sm">
                {t("fc.no_checks")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentChecks.map((check) => {
                const config = verdictConfig(check.verdict);
                return (
                  <div
                    key={check.id}
                    className={`rounded-2xl border p-4 ${config.bg} ${config.border}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800 line-clamp-2">
                          &ldquo;{check.claim_text}&rdquo;
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {check.explanation}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.text}`}
                          style={{
                            background: `${config.dot}18`,
                          }}
                        >
                          {config.icon} {config.label}
                        </span>
                        {check.party_about && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{
                              background: partyColor(check.party_about),
                            }}
                          >
                            {check.party_about}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {timeAgo(check.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>
            {t("common.footer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
