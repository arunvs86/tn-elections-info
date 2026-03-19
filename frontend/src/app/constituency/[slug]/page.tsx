"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────
interface AgentMessage {
  agent: string;
  text: string;
  type: string;
}

interface Constituency {
  id: number;
  name: string;
  district: string;
  total_voters_2021: number | null;
  turnout_2021: number | null;
  is_swing_seat: boolean;
}

interface Candidate {
  id: number;
  name: string;
  party: string;
  age: number | null;
  education: string | null;
  net_worth: number | null;
  criminal_cases_declared: number;
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
  margin: number;
  total_votes: number;
  turnout: number;
}

interface InvestigateResponse {
  session_id: string;
  constituency: Constituency | null;
  candidates: Candidate[];
  election_results: ElectionResult[];
  criminal_records: unknown[];
  agent_messages: AgentMessage[];
}

// ── Helpers ────────────────────────────────────────────
function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function partyColor(party: string): string {
  const p = (party || "").toUpperCase();
  if (p.includes("DMK")) return "#c0392b";
  if (p.includes("ADMK") || p.includes("AIADMK")) return "#2d7a4f";
  if (p.includes("TVK")) return "#1a5276";
  if (p.includes("BJP")) return "#d35400";
  if (p.includes("NTK")) return "#6c3483";
  if (p.includes("INC") || p.includes("CONGRESS")) return "#1565c0";
  if (p.includes("MNM")) return "#0e6655";
  if (p === "IND") return "#7f8c8d";
  if (p === "NOTA") return "#95a5a6";
  return "#888";
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

function AgentFeed({ messages }: { messages: AgentMessage[] }) {
  return (
    <div className="bg-gray-950 rounded-2xl p-4 font-mono text-sm space-y-1 max-h-64 overflow-y-auto">
      {messages.length === 0 ? (
        <p className="text-gray-500 animate-pulse">▌ Agents initialising…</p>
      ) : (
        messages.map((m, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-base leading-5 mt-0.5">{agentIcon(m.agent)}</span>
            <span className="text-green-400 leading-5">{m.text}</span>
          </div>
        ))
      )}
    </div>
  );
}

function ElectionResultCard({ result }: { result: ElectionResult }) {
  const winnerColor = partyColor(result.winner_party);
  const runnerColor = partyColor(result.runner_up_party);
  const winShare = result.winner_vote_share ?? 0;
  const runShare =
    result.total_votes > 0
      ? ((result.winner_votes - result.margin) / result.total_votes) * 100
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
            <p className="font-semibold text-gray-900 text-sm">{result.winner_name}</p>
            <p className="text-xs font-medium" style={{ color: winnerColor }}>
              {result.winner_party}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900">{fmt(result.winner_votes)}</p>
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
            <p className="font-medium text-gray-700 text-sm">{result.runner_up_name}</p>
            <p className="text-xs font-medium" style={{ color: runnerColor }}>
              {result.runner_up_party}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-700">{fmt(result.winner_votes - result.margin)}</p>
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
        <span>Margin: <strong className="text-gray-700">{fmt(result.margin)}</strong></span>
        <span>Total votes: <strong className="text-gray-700">{fmt(result.total_votes)}</strong></span>
      </div>
    </div>
  );
}

function CandidateCard({ c }: { c: Candidate }) {
  const color = partyColor(c.party);
  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-4 relative ${
        c.is_winner ? "border-yellow-400 ring-1 ring-yellow-200" : "border-gray-100"
      }`}
    >
      {c.is_winner && (
        <span className="absolute top-3 right-3 text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">
          🏆 Winner
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
          <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
          <p className="text-xs font-medium" style={{ color }}>{c.party}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
        {c.age && <span>Age: <strong className="text-gray-700">{c.age}</strong></span>}
        {c.education && (
          <span className="truncate">
            Edu: <strong className="text-gray-700">{c.education}</strong>
          </span>
        )}
        {c.votes_received != null && (
          <span>
            Votes: <strong className="text-gray-700">{fmt(c.votes_received)}</strong>
          </span>
        )}
        {c.vote_share != null && (
          <span>
            Share: <strong className="text-gray-700">{c.vote_share.toFixed(1)}%</strong>
          </span>
        )}
      </div>

      {c.criminal_cases_declared > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">
          <span>⚠️</span>
          <span>{c.criminal_cases_declared} criminal case(s) declared</span>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────
export default function ConstituencyPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const constituencyName = slugToName(slug || "");

  const [data, setData] = useState<InvestigateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    if (!constituencyName) return;

    setLoading(true);
    setError(null);

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
      .then((d: InvestigateResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [constituencyName, backendUrl]);

  // Sort candidates: winner first, then by votes desc
  const sortedCandidates = [...(data?.candidates ?? [])].sort((a, b) => {
    if (a.is_winner && !b.is_winner) return -1;
    if (!a.is_winner && b.is_winner) return 1;
    return (b.votes_received ?? 0) - (a.votes_received ?? 0);
  });

  const constituency = data?.constituency;
  const electionResult = data?.election_results?.[0] ?? null;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🗳️</span>
            <div>
              <p className="font-bold text-gray-900 leading-none">tnelections.info</p>
              <p className="text-xs text-gray-500">Tamil Nadu 2026</p>
            </div>
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-terracotta transition-colors"
          >
            ← Back to search
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 mb-4">
          <Link href="/" className="hover:text-terracotta">Home</Link>
          {" / "}
          <span className="text-gray-600 font-medium">{constituencyName}</span>
        </p>

        {/* Page title */}
        <div className="mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold text-gray-900">{constituencyName}</h1>
            {constituency && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {constituency.district} District
              </span>
            )}
            {constituency?.is_swing_seat && (
              <span className="text-sm text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full font-semibold">
                ⚡ Swing Seat
              </span>
            )}
          </div>
          {constituency?.total_voters_2021 && (
            <p className="text-sm text-gray-500 mt-1">
              {fmt(constituency.total_voters_2021)} registered voters (2021) ·{" "}
              {constituency.turnout_2021}% turnout
            </p>
          )}
        </div>

        {/* Agent Feed */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-700">🤖 AI Agent Feed</span>
            {loading && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full animate-pulse">
                Running…
              </span>
            )}
          </div>
          <AgentFeed messages={data?.agent_messages ?? []} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 text-sm">
            ⚠️ {error}. Make sure the backend is running at{" "}
            <code className="bg-red-100 px-1 rounded">{backendUrl}</code>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: election result */}
            <div className="lg:col-span-1 space-y-4">
              {electionResult ? (
                <ElectionResultCard result={electionResult} />
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center text-sm text-gray-400">
                  No election results yet
                </div>
              )}

              {/* Stats */}
              {constituency && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <h3 className="font-bold text-gray-900 text-sm">Constituency Stats</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-terracotta">
                        {sortedCandidates.length}
                      </p>
                      <p className="text-gray-500 mt-0.5">Candidates (2021)</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-terracotta">
                        {sortedCandidates.filter((c) => c.criminal_cases_declared > 0).length}
                      </p>
                      <p className="text-gray-500 mt-0.5">With Cases</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right column: candidates grid */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-900">
                  Candidates ({sortedCandidates.length})
                </h2>
                <span className="text-xs text-gray-400">Sorted by votes</span>
              </div>
              {sortedCandidates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
                  No candidates found
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sortedCandidates.map((c) => (
                    <CandidateCard key={c.id} c={c} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Data from Election Commission of India · Tamil Nadu Elections 2026</p>
        </div>
      </footer>
    </div>
  );
}
