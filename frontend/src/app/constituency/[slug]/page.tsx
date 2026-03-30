"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Header from "@/components/Header";
import ScopedChat from "@/components/ScopedChat";
import { useLang } from "@/components/LanguageProvider";

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
  const { t } = useLang();
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
        <h3 className="font-bold text-gray-900">{t("const.result_2021")}</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {t("const.turnout")} {result.turnout?.toFixed(1)}%
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
          {t("const.margin")}{" "}
          <strong className="text-gray-700">{fmt(result.margin)}</strong>
        </span>
        <span>
          {t("const.total_votes")}{" "}
          <strong className="text-gray-700">{fmt(result.total_votes)}</strong>
        </span>
      </div>
    </div>
  );
}

function CandidateCard({ c }: { c: Candidate }) {
  const { t } = useLang();
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
          {t("const.winner")}
        </span>
      )}
      {c.is_incumbent && !c.is_winner && (
        <span className="absolute top-3 right-3 text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
          {t("const.incumbent")}
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
            {t("const.age")} <strong className="text-gray-700">{c.age}</strong>
          </span>
        )}
        {c.education && (
          <span className="truncate">
            {t("const.edu")} <strong className="text-gray-700">{c.education}</strong>
          </span>
        )}
        {c.votes_received != null && (
          <span>
            {t("const.votes_label")}{" "}
            <strong className="text-gray-700">
              {fmt(c.votes_received)}
            </strong>
          </span>
        )}
        {c.vote_share != null && (
          <span>
            {t("const.share")}{" "}
            <strong className="text-gray-700">
              {c.vote_share.toFixed(1)}%
            </strong>
          </span>
        )}
      </div>

      {c.criminal_cases_declared > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">
          <span>{c.criminal_cases_declared} {t("const.criminal_cases_declared")}</span>
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
          {t("const.view_profile")} →
        </p>
      </div>
    </div>
  );
}

function AgentFeed({ messages }: { messages: AgentMessage[] }) {
  const { t } = useLang();
  return (
    <div className="bg-gray-950 rounded-2xl p-4 font-mono text-sm space-y-1 max-h-64 overflow-y-auto">
      {messages.length === 0 ? (
        <p className="text-gray-500 animate-pulse">
          {t("const.agents_init")}
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

// ── Constituency Poll ─────────────────────────────────
function getFingerprint(): string {
  const raw = [
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || 0,
  ].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "fp_" + Math.abs(hash).toString(36);
}

interface PollCandidate {
  name: string;
  party: string;
  votes: number;
}

function ConstituencyPoll({
  constituencyId,
  constituencyName,
  candidates,
}: {
  constituencyId: number;
  constituencyName: string;
  candidates: Candidate[];
}) {
  const [results, setResults] = useState<PollCandidate[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Top candidates (by votes or first N) to show as poll options
  const topCandidates = candidates.slice(0, 6);

  const storageKey = `tn_cpoll_${constituencyId}`;

  useEffect(() => {
    const fp = getFingerprint();
    const voted = localStorage.getItem(storageKey);
    if (voted) {
      setHasVoted(true);
      setSelectedCandidate(voted);
    }

    fetchResults();

    // Also check Supabase
    supabase
      .from("constituency_polls")
      .select("candidate_name")
      .eq("constituency_id", constituencyId)
      .eq("fingerprint", fp)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHasVoted(true);
          setSelectedCandidate(data.candidate_name);
          localStorage.setItem(storageKey, data.candidate_name);
        }
      });
  }, [constituencyId, storageKey]);

  async function fetchResults() {
    const { data } = await supabase
      .from("constituency_polls")
      .select("candidate_name, party")
      .eq("constituency_id", constituencyId);

    if (data) {
      const counts: Record<string, { party: string; votes: number }> = {};
      data.forEach((v) => {
        if (!counts[v.candidate_name]) {
          counts[v.candidate_name] = { party: v.party, votes: 0 };
        }
        counts[v.candidate_name].votes += 1;
      });
      const total = data.length;
      setTotalVotes(total);
      setResults(
        Object.entries(counts)
          .map(([name, info]) => ({ name, party: info.party, votes: info.votes }))
          .sort((a, b) => b.votes - a.votes)
      );
    }
  }

  async function handleVote(candidateName: string, party: string) {
    if (hasVoted || voting) return;
    setVoting(true);
    setError(null);

    const fp = getFingerprint();

    const { error: insertError } = await supabase
      .from("constituency_polls")
      .insert({
        constituency_id: constituencyId,
        candidate_name: candidateName,
        party,
        fingerprint: fp,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        setHasVoted(true);
        localStorage.setItem(storageKey, candidateName);
      } else {
        setError(insertError.message || "Unknown error");
      }
      setVoting(false);
      return;
    }

    setHasVoted(true);
    setSelectedCandidate(candidateName);
    localStorage.setItem(storageKey, candidateName);
    setVoting(false);
    fetchResults();
  }

  if (topCandidates.length === 0) return null;

  const maxVotes = Math.max(...results.map((r) => r.votes), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🗳️</span>
        <h3 className="font-bold text-sm text-gray-900">
          Who will win in {constituencyName}?
        </h3>
      </div>
      <p className="text-[10px] text-gray-400 mb-3">One vote per device. Anonymous &amp; instant.</p>

      {!hasVoted ? (
        <div className="space-y-1.5">
          {topCandidates.map((c) => {
            const color = partyColor(c.party);
            return (
              <button
                key={c.name}
                onClick={() => handleVote(c.name, c.party)}
                disabled={voting}
                className="w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50"
                style={{
                  borderColor: color + "40",
                  background: color + "08",
                }}
              >
                <span className="font-semibold text-sm" style={{ color }}>
                  {c.name}
                </span>
                <span className="text-xs text-gray-400 ml-2">{c.party}</span>
              </button>
            );
          })}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      ) : (
        <div className="space-y-2.5">
          {results.map((r) => {
            const color = partyColor(r.party);
            const pct = totalVotes > 0 ? Math.round((r.votes / totalVotes) * 1000) / 10 : 0;
            const isSelected = selectedCandidate === r.name;
            return (
              <div key={r.name}>
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`text-xs font-medium truncate ${isSelected ? "font-bold" : ""}`}
                    style={{ color }}
                  >
                    {r.name} ({r.party}) {isSelected && " \u2713"}
                  </span>
                  <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color }}>
                    {pct}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max((r.votes / maxVotes) * 100, 3)}%`,
                      backgroundColor: color,
                      opacity: isSelected ? 1 : 0.7,
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {r.votes.toLocaleString()} vote{r.votes !== 1 ? "s" : ""}
                </p>
              </div>
            );
          })}
          {/* Also show top candidates that have 0 poll votes */}
          {topCandidates
            .filter((c) => !results.find((r) => r.name === c.name))
            .map((c) => {
              const color = partyColor(c.party);
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-400 truncate">
                      {c.name} ({c.party})
                    </span>
                    <span className="text-xs font-bold text-gray-300 ml-2">0%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full"
                      style={{ width: "3%", backgroundColor: color, opacity: 0.3 }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">0 votes</p>
                </div>
              );
            })}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-500 text-center">
              Total votes: <span className="font-bold text-gray-700">{totalVotes.toLocaleString()}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────
export default function ConstituencyPage() {
  const { t } = useLang();
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
  const [selectedYear, setSelectedYear] = useState<number>(2021);
  const availableYears = [2021]; // Add 2026 here when data is available

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

      // 2. Get election result for selected year
      const { data: resultData } = await supabase
        .from("election_results")
        .select("*")
        .eq("constituency_id", constData.id)
        .eq("election_year", selectedYear)
        .single();

      if (resultData) setElectionResult(resultData);
      else setElectionResult(null);

      // 2b. Get ALL election results for trend chart
      const { data: allResultsData } = await supabase
        .from("election_results")
        .select("*")
        .eq("constituency_id", constData.id)
        .order("election_year", { ascending: true });

      if (allResultsData) setAllResults(allResultsData);

      // 3. Get candidates for selected year
      const { data: candData } = await supabase
        .from("candidates")
        .select("*")
        .eq("constituency_id", constData.id)
        .eq("election_year", selectedYear)
        .order("votes_received", { ascending: false });

      if (candData) setCandidates(candData);
      else setCandidates([]);

      setLoading(false);
    }

    fetchData();
  }, [constituencyName, selectedYear]);

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
            {t("nav.home")}
          </Link>
          {" / "}
          <Link href="/districts" className="hover:text-terracotta">
            {t("nav.districts")}
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
            <p className="text-gray-400 animate-pulse">{t("common.loading")}</p>
          </div>
        ) : !constituency ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-500">
              {t("const.no_constituency")} &ldquo;{constituencyName}&rdquo;
            </p>
            <Link
              href="/districts"
              className="text-terracotta text-sm mt-2 inline-block hover:underline"
            >
              ← {t("const.browse_districts")}
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
                  {constituency.district} {t("const.district")}
                </Link>
                {constituency.is_swing_seat && (
                  <span className="text-sm text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full font-semibold">
                    {t("const.swing_seat")}
                  </span>
                )}
              </div>
              {constituency.total_voters_2021 && (
                <p className="text-sm text-gray-500 mt-1">
                  {fmt(constituency.total_voters_2021)} {t("const.registered_voters")}
                  (2021) · {constituency.turnout_2021}% {t("const.turnout_label")}
                </p>
              )}
            </div>

            {/* ── 2026 Election Banner ── */}
            <div className="bg-gradient-to-r from-terracotta/10 to-orange-50 border border-terracotta/20 rounded-xl px-5 py-3 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">🗳️</span>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800">{t("const.election_2026_title")}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">{t("const.election_2026_desc")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {availableYears.map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedYear === yr
                        ? "bg-terracotta text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-terracotta"
                    }`}
                  >
                    {yr}
                  </button>
                ))}
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
                  2026
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* ── Left column: election result + stats ── */}
              <div className="lg:col-span-1 space-y-4">
                {electionResult ? (
                  <ElectionResultCard result={electionResult} />
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center text-sm text-gray-400">
                    {t("const.no_results")}
                  </div>
                )}

                {/* Non-Voters Impact */}
                {constituency &&
                  electionResult &&
                  constituency.total_voters_2021 != null &&
                  electionResult.total_votes > 0 &&
                  electionResult.margin > 0 &&
                  constituency.total_voters_2021 - electionResult.total_votes > 0 && (() => {
                    const nonVoters = constituency.total_voters_2021! - electionResult.total_votes;
                    const marginMultiple = Math.floor(nonVoters / electionResult.margin);
                    return (
                      <div
                        style={{
                          background: "#FDF6EE",
                          borderRadius: 14,
                          border: "1px solid #E8D5C4",
                          padding: "20px",
                        }}
                      >
                        <h3
                          className="font-bold text-sm mb-3"
                          style={{ color: "#5A3E2B" }}
                        >
                          Non-Voters Impact
                        </h3>
                        <p
                          className="text-3xl font-extrabold leading-tight"
                          style={{ color: "#B8510D" }}
                        >
                          {fmt(nonVoters)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          people didn&apos;t vote
                        </p>
                        <div
                          className="my-3"
                          style={{
                            height: 1,
                            background: "#E8D5C4",
                          }}
                        />
                        <p className="text-xs text-gray-500">
                          Winning margin was only{" "}
                          <strong style={{ color: "#B8510D" }}>
                            {fmt(electionResult.margin)}
                          </strong>{" "}
                          votes
                        </p>
                        {marginMultiple > 0 && (
                          <p className="text-sm font-semibold mt-2" style={{ color: "#5A3E2B" }}>
                            Non-voters could have changed the result{" "}
                            <span
                              className="text-lg font-extrabold"
                              style={{ color: "#B8510D" }}
                            >
                              {marginMultiple}x
                            </span>{" "}
                            over
                          </p>
                        )}
                      </div>
                    );
                  })()}

                {/* Constituency Poll */}
                {constituency && candidates.length > 0 && (
                  <ConstituencyPoll
                    constituencyId={constituency.id}
                    constituencyName={constituencyName}
                    candidates={sortedCandidates}
                  />
                )}

                {/* Stats */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <h3 className="font-bold text-gray-900 text-sm">
                    {t("const.constituency_stats")}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-terracotta">
                        {candidates.length}
                      </p>
                      <p className="text-gray-500 mt-0.5">
                        {t("const.candidates_label")} ({selectedYear})
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-terracotta">
                        {casesCount}
                      </p>
                      <p className="text-gray-500 mt-0.5">{t("const.with_cases")}</p>
                    </div>
                    {electionResult && (
                      <>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-terracotta">
                            {fmt(electionResult.margin)}
                          </p>
                          <p className="text-gray-500 mt-0.5">
                            {t("const.win_margin")}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-terracotta">
                            {electionResult.total_candidates}
                          </p>
                          <p className="text-gray-500 mt-0.5">
                            {t("const.total_contested")}
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
                      <h3 className="font-bold text-gray-900 text-sm">{t("const.alliance_breakdown")}</h3>
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
                    <h3 className="font-bold text-gray-900 text-sm mb-3">{t("const.turnout_trend")}</h3>
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
                    {t("const.ai_investigation")}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {t("const.ai_desc")}
                  </p>
                  {!aiRunning && aiMessages.length === 0 && (
                    <button
                      onClick={handleInvestigate}
                      className="w-full bg-terracotta text-white px-4 py-2.5 rounded-[9px] font-semibold text-sm hover:bg-[#a33d0e] transition-colors"
                    >
                      {t("const.investigate_ai")}
                    </button>
                  )}
                  {(aiRunning || aiMessages.length > 0) && (
                    <div className="mt-2">
                      {aiRunning && (
                        <p className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full inline-block mb-2 animate-pulse">
                          {t("const.agents_running")}
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
                    {t("const.candidates_label")} ({sortedCandidates.length})
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs sm:text-sm text-gray-400">
                      {compareIds.size > 0
                        ? `${compareIds.size}/2 ${t("const.selected_count")}`
                        : t("const.tick_to_compare")}
                    </span>
                    {sortedCandidates.length >= 2 && (
                      <Link
                        href={`/compare?ids=${sortedCandidates[0].id},${sortedCandidates[1].id}`}
                        className="text-xs text-terracotta font-semibold hover:underline"
                      >
                        {t("const.compare_top2")}
                      </Link>
                    )}
                  </div>
                </div>
                {sortedCandidates.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
                    {t("const.no_candidates")}
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
            {t("const.compare_selected")} →
          </Link>
        </div>
      )}

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
