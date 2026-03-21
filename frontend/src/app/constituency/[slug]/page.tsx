"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Header from "@/components/Header";
import ScopedChat from "@/components/ScopedChat";

// ── Types ──────────────────────────────────────────────
interface Constituency {
  id: number;
  name: string;
  district: string;
  total_voters_2021: number | null;
  turnout_2021: number | null;
  is_swing_seat: boolean;
  current_mla: string | null;
  current_mla_party: string | null;
}

interface Candidate {
  id: number;
  name: string;
  party: string;
  age: number | null;
  education: string | null;
  net_worth: number | null;
  assets_movable: number | null;
  assets_immovable: number | null;
  liabilities: number | null;
  criminal_cases_declared: number;
  criminal_cases_ecourts: number;
  criminal_mismatch: boolean;
  affidavit_url: string | null;
  votes_received: number | null;
  vote_share: number | null;
  is_winner: boolean;
  is_incumbent: boolean;
}

interface ElectionResult {
  election_year: number;
  winner_name: string;
  winner_party: string;
  winner_votes: number;
  winner_vote_share: number;
  runner_up_name: string;
  runner_up_party: string;
  runner_up_votes: number;
  margin: number;
  total_votes: number;
  turnout: number;
  total_candidates: number;
}

interface AgentMessage {
  agent: string;
  text: string;
  type: string;
}

// ── Helpers ────────────────────────────────────────────
function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
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
  if (p.includes("MNM")) return "#0e6655";
  if (p.includes("CPI") || p.includes("CPM")) return "#d32f2f";
  if (p.includes("VCK")) return "#4a148c";
  if (p === "IND") return "#7f8c8d";
  if (p === "NOTA") return "#95a5a6";
  return "#888";
}

// Quick transparency score for candidate cards (same logic as candidate page)
function candidateScore(c: Candidate): number {
  let criminal = 35;
  if (c.criminal_cases_declared >= 6) criminal = 0;
  else if (c.criminal_cases_declared >= 3) criminal = 10;
  else if (c.criminal_cases_declared >= 1) criminal = 20;
  const mismatch = c.criminal_mismatch ? -15 : 0;
  const hasAssets = c.assets_movable != null || c.assets_immovable != null || c.net_worth != null;
  const assets = hasAssets ? 25 : 10;
  const affidavit = c.affidavit_url ? 15 : 0;
  let electoral = 0;
  if (c.is_winner) electoral += 15;
  if (c.vote_share != null && c.vote_share > 30) electoral += 10;
  else if (c.vote_share != null && c.vote_share > 15) electoral += 5;
  return Math.max(0, Math.min(100, criminal + mismatch + assets + affidavit + electoral));
}

function scoreColor(score: number): string {
  if (score >= 75) return "#2d7a4f";
  if (score >= 50) return "#b8860b";
  if (score >= 30) return "#d35400";
  return "#c0392b";
}

function agentIcon(agent: string): string {
  if (agent === "supervisor") return "🧠";
  if (agent === "eci_agent") return "📋";
  if (agent === "criminal_agent") return "⚖️";
  if (agent === "promise_agent") return "📜";
  if (agent === "factcheck_agent") return "🔬";
  return "🤖";
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN");
}

// ── Components ─────────────────────────────────────────

function ElectionResultCard({ result }: { result: ElectionResult }) {
  const winnerColor = partyColor(result.winner_party);
  const runnerColor = partyColor(result.runner_up_party);
  const winShare = result.winner_vote_share ?? 0;
  const runnerVotes = result.runner_up_votes ?? (result.winner_votes - result.margin);
  const runShare =
    result.total_votes > 0
      ? (runnerVotes / result.total_votes) * 100
      : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">2021 Result</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          Turnout {result.turnout?.toFixed(1)}%
        </span>
      </div>

      {/* Winner */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ background: winnerColor }}
          />
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {result.winner_name}
            </p>
            <p className="text-xs font-medium" style={{ color: winnerColor }}>
              {result.winner_party}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900">
            {fmt(result.winner_votes)}
          </p>
          <p className="text-xs text-gray-500">{winShare.toFixed(1)}%</p>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${winShare}%`, background: winnerColor }}
        />
      </div>

      {/* Runner-up */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ background: runnerColor }}
          />
          <div>
            <p className="font-medium text-gray-700 text-sm">
              {result.runner_up_name}
            </p>
            <p className="text-xs font-medium" style={{ color: runnerColor }}>
              {result.runner_up_party}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-700">{fmt(runnerVotes)}</p>
          <p className="text-xs text-gray-500">{runShare.toFixed(1)}%</p>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div
          className="h-2 rounded-full"
          style={{ width: `${runShare}%`, background: runnerColor }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
        <span>
          Margin:{" "}
          <strong className="text-gray-700">{fmt(result.margin)}</strong>
        </span>
        <span>
          Total votes:{" "}
          <strong className="text-gray-700">{fmt(result.total_votes)}</strong>
        </span>
      </div>
    </div>
  );
}

function CandidateCard({ c }: { c: Candidate }) {
  const color = partyColor(c.party);
  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-4 relative hover:shadow-md hover:border-gray-200 transition-all group ${
        c.is_winner
          ? "border-yellow-400 ring-1 ring-yellow-200"
          : "border-gray-100"
      }`}
    >
      {c.is_winner && (
        <span className="absolute top-3 right-3 text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">
          Winner
        </span>
      )}
      {c.is_incumbent && !c.is_winner && (
        <span className="absolute top-3 right-3 text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
          Incumbent
        </span>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: color }}
        >
          {c.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {c.name}
          </p>
          <p className="text-xs font-medium" style={{ color }}>
            {c.party}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
        {c.age && (
          <span>
            Age: <strong className="text-gray-700">{c.age}</strong>
          </span>
        )}
        {c.education && (
          <span className="truncate">
            Edu: <strong className="text-gray-700">{c.education}</strong>
          </span>
        )}
        {c.votes_received != null && (
          <span>
            Votes:{" "}
            <strong className="text-gray-700">
              {fmt(c.votes_received)}
            </strong>
          </span>
        )}
        {c.vote_share != null && (
          <span>
            Share:{" "}
            <strong className="text-gray-700">
              {c.vote_share.toFixed(1)}%
            </strong>
          </span>
        )}
      </div>

      {c.criminal_cases_declared > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">
          <span>{c.criminal_cases_declared} criminal case(s) declared</span>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            color: scoreColor(candidateScore(c)),
            background: `${scoreColor(candidateScore(c))}15`,
          }}
        >
          {candidateScore(c)}/100
        </span>
        <p className="text-xs text-gray-400 group-hover:text-terracotta transition-colors">
          View profile →
        </p>
      </div>
    </div>
  );
}

function AgentFeed({ messages }: { messages: AgentMessage[] }) {
  return (
    <div className="bg-gray-950 rounded-2xl p-4 font-mono text-sm space-y-1 max-h-64 overflow-y-auto">
      {messages.length === 0 ? (
        <p className="text-gray-500 animate-pulse">
          Agents initialising...
        </p>
      ) : (
        messages.map((m, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-base leading-5 mt-0.5">
              {agentIcon(m.agent)}
            </span>
            <span className="text-green-400 leading-5">{m.text}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────
export default function ConstituencyPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const constituencyName = slugToName(slug || "");

  // Phase 1: instant data from Supabase
  const [constituency, setConstituency] = useState<Constituency | null>(null);
  const [allResults, setAllResults] = useState<ElectionResult[]>([]);
  const [electionResult, setElectionResult] = useState<ElectionResult | null>(
    null
  );
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Compare selection
  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());

  function toggleCompare(id: number) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  }

  // Phase 2: on-demand AI investigation
  const [aiRunning, setAiRunning] = useState(false);
  const [aiMessages, setAiMessages] = useState<AgentMessage[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  // ── Phase 1: Load instant data from Supabase ────────
  useEffect(() => {
    if (!constituencyName) return;

    async function fetchData() {
      // 1. Get constituency
      const { data: constData } = await supabase
        .from("constituencies")
        .select("*")
        .ilike("name", constituencyName)
        .single();

      if (!constData) {
        setLoading(false);
        return;
      }

      setConstituency(constData);

      // 2. Get election result
      const { data: resultData } = await supabase
        .from("election_results")
        .select("*")
        .eq("constituency_id", constData.id)
        .eq("election_year", 2021)
        .single();

      if (resultData) setElectionResult(resultData);

      // 2b. Get ALL election results for trend chart
      const { data: allResultsData } = await supabase
        .from("election_results")
        .select("*")
        .eq("constituency_id", constData.id)
        .order("election_year", { ascending: true });

      if (allResultsData) setAllResults(allResultsData);

      // 3. Get candidates
      const { data: candData } = await supabase
        .from("candidates")
        .select("*")
        .eq("constituency_id", constData.id)
        .eq("election_year", 2021)
        .order("votes_received", { ascending: false });

      if (candData) setCandidates(candData);

      setLoading(false);
    }

    fetchData();
  }, [constituencyName]);

  // ── Phase 2: AI investigation (on demand) ───────────
  function handleInvestigate() {
    setAiRunning(true);
    setAiError(null);
    setAiMessages([]);

    fetch(`${backendUrl}/api/investigate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query_type: "constituency",
        constituency_name: constituencyName,
        candidate_name: "",
        claim_text: "",
        party: "",
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setAiMessages(d.agent_messages || []);
        setAiRunning(false);
      })
      .catch((e) => {
        setAiError(e.message);
        setAiRunning(false);
      });
  }

  // Sort candidates: winner first, then by votes desc
  const sortedCandidates = [...candidates].sort((a, b) => {
    if (a.is_winner && !b.is_winner) return -1;
    if (!a.is_winner && b.is_winner) return 1;
    return (b.votes_received ?? 0) - (a.votes_received ?? 0);
  });

  const casesCount = candidates.filter(
    (c) => c.criminal_cases_declared > 0
  ).length;

  return (
    <div className="min-h-screen bg-cream">
      <Header active="districts" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 mb-4">
          <Link href="/" className="hover:text-terracotta">
            Home
          </Link>
          {" / "}
          <Link href="/districts" className="hover:text-terracotta">
            Districts
          </Link>
          {constituency && (
            <>
              {" / "}
              <Link
                href={`/districts/${slugify(constituency.district)}`}
                className="hover:text-terracotta"
              >
                {constituency.district}
              </Link>
            </>
          )}
          {" / "}
          <span className="text-gray-600 font-medium">
            {constituencyName}
          </span>
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 animate-pulse">Loading...</p>
          </div>
        ) : !constituency ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-500">
              No constituency found for &ldquo;{constituencyName}&rdquo;
            </p>
            <Link
              href="/districts"
              className="text-terracotta text-sm mt-2 inline-block hover:underline"
            >
              ← Browse districts
            </Link>
          </div>
        ) : (
          <>
            {/* ── Page title ── */}
            <div className="mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-extrabold text-gray-900">
                  {constituencyName}
                </h1>
                <Link
                  href={`/districts/${slugify(constituency.district)}`}
                  className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full hover:text-terracotta transition-colors"
                >
                  {constituency.district} District
                </Link>
                {constituency.is_swing_seat && (
                  <span className="text-sm text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full font-semibold">
                    Swing Seat
                  </span>
                )}
              </div>
              {constituency.total_voters_2021 && (
                <p className="text-sm text-gray-500 mt-1">
                  {fmt(constituency.total_voters_2021)} registered voters
                  (2021) · {constituency.turnout_2021}% turnout
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ── Left column: election result + stats ── */}
              <div className="lg:col-span-1 space-y-4">
                {electionResult ? (
                  <ElectionResultCard result={electionResult} />
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center text-sm text-gray-400">
                    No election results yet
                  </div>
                )}

                {/* Stats */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <h3 className="font-bold text-gray-900 text-sm">
                    Constituency Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-terracotta">
                        {candidates.length}
                      </p>
                      <p className="text-gray-500 mt-0.5">
                        Candidates (2021)
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-terracotta">
                        {casesCount}
                      </p>
                      <p className="text-gray-500 mt-0.5">With Cases</p>
                    </div>
                    {electionResult && (
                      <>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-terracotta">
                            {fmt(electionResult.margin)}
                          </p>
                          <p className="text-gray-500 mt-0.5">
                            Win Margin
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-terracotta">
                            {electionResult.total_candidates}
                          </p>
                          <p className="text-gray-500 mt-0.5">
                            Total Contested
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Alliance Breakdown (3.4) */}
                {candidates.length > 0 && (() => {
                  const allianceMap: Record<string, { parties: string[]; votes: number; color: string }> = {};
                  const allianceLookup: Record<string, string> = {
                    "DMK": "DMK+ (INDIA)", "INC": "DMK+ (INDIA)", "CPI": "DMK+ (INDIA)",
                    "CPI(M)": "DMK+ (INDIA)", "CPM": "DMK+ (INDIA)", "VCK": "DMK+ (INDIA)",
                    "MDMK": "DMK+ (INDIA)", "IUML": "DMK+ (INDIA)", "CONGRESS": "DMK+ (INDIA)",
                    "ADMK": "ADMK+ (NDA)", "AIADMK": "ADMK+ (NDA)", "BJP": "ADMK+ (NDA)",
                    "PMK": "ADMK+ (NDA)", "DMDK": "ADMK+ (NDA)",
                    "NTK": "NTK", "TVK": "TVK", "MNM": "MNM",
                  };
                  const allianceColors: Record<string, string> = {
                    "DMK+ (INDIA)": "#c0392b", "ADMK+ (NDA)": "#2d7a4f",
                    "NTK": "#6c3483", "TVK": "#1a5276", "MNM": "#0e6655", "Others": "#7f8c8d",
                  };
                  candidates.forEach((c) => {
                    const p = (c.party || "").toUpperCase();
                    const alliance = allianceLookup[p] || allianceLookup[c.party] || "Others";
                    if (!allianceMap[alliance]) {
                      allianceMap[alliance] = { parties: [], votes: 0, color: allianceColors[alliance] || "#888" };
                    }
                    if (!allianceMap[alliance].parties.includes(c.party)) {
                      allianceMap[alliance].parties.push(c.party);
                    }
                    allianceMap[alliance].votes += c.votes_received || 0;
                  });
                  const totalVotes = candidates.reduce((s, c) => s + (c.votes_received || 0), 0);
                  const sorted = Object.entries(allianceMap).sort((a, b) => b[1].votes - a[1].votes);

                  return (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                      <h3 className="font-bold text-gray-900 text-sm">Alliance Breakdown</h3>
                      {sorted.map(([name, data]) => {
                        const pct = totalVotes > 0 ? (data.votes / totalVotes) * 100 : 0;
                        return (
                          <div key={name}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-gray-700">{name}</span>
                              <span className="font-bold" style={{ color: data.color }}>{pct.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
                              <div
                                className="h-2.5 rounded-full transition-all"
                                style={{ width: `${Math.min(pct, 100)}%`, background: data.color }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400">{data.parties.join(", ")} — {fmt(data.votes)} votes</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Turnout Trend Chart (3.9) */}
                {allResults.length > 1 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Turnout Trend</h3>
                    <div className="space-y-2">
                      {allResults.map((r) => {
                        const turnout = r.turnout ?? 0;
                        return (
                          <div key={r.election_year}>
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="text-gray-600 font-medium">{r.election_year}</span>
                              <span className="font-semibold text-gray-700">{turnout.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(turnout, 100)}%`,
                                  background: turnout >= 75 ? "#2d7a4f" : turnout >= 60 ? "#b8860b" : "#c0392b",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">Voter turnout across elections</p>
                  </div>
                )}

                {/* AI Investigate button */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-900 text-sm mb-2">
                    AI Investigation
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Run our AI agents to investigate candidates, check
                    criminal records, and analyse promises.
                  </p>
                  {!aiRunning && aiMessages.length === 0 && (
                    <button
                      onClick={handleInvestigate}
                      className="w-full bg-terracotta text-white px-4 py-2.5 rounded-[9px] font-semibold text-sm hover:bg-[#a33d0e] transition-colors"
                    >
                      Investigate with AI
                    </button>
                  )}
                  {(aiRunning || aiMessages.length > 0) && (
                    <div className="mt-2">
                      {aiRunning && (
                        <p className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full inline-block mb-2 animate-pulse">
                          Agents running...
                        </p>
                      )}
                      <AgentFeed messages={aiMessages} />
                    </div>
                  )}
                  {aiError && (
                    <p className="text-xs text-red-600 mt-2">
                      Error: {aiError}
                    </p>
                  )}
                </div>

                {/* Scoped Chat (3.12) */}
                <ScopedChat
                  title={`Ask about ${constituencyName}`}
                  placeholder="Ask anything about this constituency..."
                  context={`The user is asking about ${constituencyName} constituency in ${constituency?.district || ""} district, Tamil Nadu. Current MLA: ${constituency?.current_mla || "unknown"} (${constituency?.current_mla_party || "unknown"}). Voters: ${constituency?.total_voters_2021 || "unknown"}. Answer specifically about this constituency.`}
                  suggestions={[
                    `Who won ${constituencyName} in 2021?`,
                    `Is ${constituencyName} a swing seat?`,
                    `How many candidates contested here?`,
                  ]}
                />
              </div>

              {/* ── Right column: candidates grid ── */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-gray-900">
                    Candidates ({sortedCandidates.length})
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {compareIds.size > 0
                        ? `${compareIds.size}/2 selected`
                        : "Tick any 2 to compare"}
                    </span>
                    {sortedCandidates.length >= 2 && (
                      <Link
                        href={`/compare?ids=${sortedCandidates[0].id},${sortedCandidates[1].id}`}
                        className="text-xs text-terracotta font-semibold hover:underline"
                      >
                        Compare top 2
                      </Link>
                    )}
                  </div>
                </div>
                {sortedCandidates.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
                    No candidates found
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sortedCandidates.map((c) => (
                      <div key={c.id} className="relative">
                        {/* Compare checkbox */}
                        <button
                          onClick={() => toggleCompare(c.id)}
                          className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            compareIds.has(c.id)
                              ? "bg-terracotta border-terracotta text-white"
                              : "border-gray-300 bg-white hover:border-terracotta"
                          }`}
                        >
                          {compareIds.has(c.id) && (
                            <span className="text-xs font-bold">✓</span>
                          )}
                        </button>
                        <Link href={`/candidate/${c.id}`} className="block pl-0">
                          <CandidateCard c={c} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Floating compare bar ── */}
      {compareIds.size === 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Link
            href={`/compare?ids=${Array.from(compareIds).join(",")}`}
            className="flex items-center gap-3 bg-terracotta text-white px-6 py-3 rounded-full shadow-lg hover:bg-[#a33d0e] transition-all font-semibold text-sm"
          >
            Compare selected candidates →
          </Link>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>
            Data from Election Commission of India · Tamil Nadu Elections
            2026
          </p>
        </div>
      </footer>
    </div>
  );
}
