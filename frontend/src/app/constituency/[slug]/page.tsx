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
  voters_total_2026: number | null;
  voters_male_2026: number | null;
  voters_female_2026: number | null;
  voters_third_gender_2026: number | null;
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

function fmtCurrency(n: number | null): string {
  if (n == null || n === 0) return "";
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(1) + " Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + " L";
  return "₹" + n.toLocaleString("en-IN");
}

// ── Components ─────────────────────────────────────────

function ElectionResultCard({ result }: { result: ElectionResult }) {
  const { t } = useLang();
  const winnerColor = partyColor(result.winner_party);
  const runnerColor = partyColor(result.runner_up_party);
  const winShare = result.winner_vote_share ?? 0;
  const runnerVotes = result.runner_up_votes ?? (result.winner_votes - result.margin);
  const runShare =
    result.total_votes > 0 ? (runnerVotes / result.total_votes) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Winner hero strip */}
      <div className="px-5 pt-4 pb-3" style={{ borderLeft: `4px solid ${winnerColor}` }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{t("const.result_2021")} · Won</p>
            <p className="text-lg font-extrabold text-gray-900 leading-tight">{result.winner_name}</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: winnerColor }}>{result.winner_party}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-extrabold text-gray-900">{fmt(result.winner_votes)}</p>
            <p className="text-xs text-gray-500">{winShare.toFixed(1)}% vote share</p>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
          <div className="h-1.5 rounded-full" style={{ width: `${winShare}%`, background: winnerColor }} />
        </div>
      </div>

      <div className="border-t border-gray-100 mx-5" />

      {/* Runner-up */}
      <div className="px-5 pt-3 pb-3" style={{ borderLeft: `4px solid ${runnerColor}` }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Runner-up</p>
            <p className="text-sm font-semibold text-gray-700">{result.runner_up_name}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: runnerColor }}>{result.runner_up_party}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-base font-bold text-gray-700">{fmt(runnerVotes)}</p>
            <p className="text-xs text-gray-500">{runShare.toFixed(1)}%</p>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1 mt-3">
          <div className="h-1 rounded-full" style={{ width: `${runShare}%`, background: runnerColor }} />
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex justify-between items-center text-xs px-5 py-3 bg-gray-50 border-t border-gray-100">
        <span className="text-gray-500">
          Margin: <strong className="text-gray-800">{fmt(result.margin)}</strong>
        </span>
        <span className="text-gray-500">
          Turnout: <strong className="text-gray-800">{result.turnout?.toFixed(1)}%</strong>
        </span>
        <span className="text-gray-500">
          Total: <strong className="text-gray-800">{fmt(result.total_votes)}</strong>
        </span>
      </div>
    </div>
  );
}

function CandidateCard({ c }: { c: Candidate }) {
  const { t } = useLang();
  const color = partyColor(c.party);
  const netWorth = c.net_worth ?? ((c.assets_movable ?? 0) + (c.assets_immovable ?? 0));

  return (
    <Link href={`/candidate/${c.id}`}>
      <div
        className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all group cursor-pointer ${
          c.is_winner ? "border-gray-200" : "border-gray-100"
        }`}
        style={{ borderTop: `3px solid ${color}` }}
      >
        {/* Header row */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-gray-900 text-sm leading-tight">{c.name}</p>
                {c.is_winner && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
                    WINNER
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold mt-0.5" style={{ color }}>{c.party}</p>
            </div>
            {c.votes_received != null && (
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">{fmt(c.votes_received)}</p>
                {c.vote_share != null && (
                  <p className="text-[10px] text-gray-400">{c.vote_share.toFixed(1)}%</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Vote share bar */}
        {c.vote_share != null && (
          <div className="px-4 pb-3">
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div className="h-1 rounded-full" style={{ width: `${Math.min(c.vote_share, 100)}%`, background: color }} />
            </div>
          </div>
        )}

        {/* Footer: wealth + criminal + score */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          {netWorth > 0 && (
            <span className="text-[11px] text-gray-600 font-medium">{fmtCurrency(netWorth)}</span>
          )}
          {c.criminal_cases_declared > 0 ? (
            <span className="text-[11px] font-semibold text-red-600 bg-red-50 rounded px-1.5 py-0.5">
              {c.criminal_cases_declared} case{c.criminal_cases_declared > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-green-700">Clean record</span>
          )}
          <span className="text-[11px] text-gray-400 group-hover:text-terracotta transition-colors ml-auto">
            View →
          </span>
        </div>
      </div>
    </Link>
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
  const availableYears = [2021, 2026];

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
        .maybeSingle();

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

  // ── Generate Voter Card (print-friendly) ──────────
  function generateVoterCard() {
    if (!constituency || sortedCandidates.length === 0) return;

    const fmtCurrency = (n: number | null) => {
      if (n == null) return "N/A";
      if (n >= 10000000) return "\u20B9" + (n / 10000000).toFixed(2) + " Cr";
      if (n >= 100000) return "\u20B9" + (n / 100000).toFixed(2) + " L";
      return "\u20B9" + n.toLocaleString("en-IN");
    };

    const candidateRows = sortedCandidates
      .map((c) => {
        const totalAssets =
          (c.assets_movable ?? 0) + (c.assets_immovable ?? 0);
        const displayAssets =
          totalAssets > 0 ? totalAssets : c.net_worth;
        const criminalBadge =
          c.criminal_cases_declared > 0
            ? `<span style="color:#c0392b;font-weight:700;">${c.criminal_cases_declared} case${c.criminal_cases_declared > 1 ? "s" : ""}</span>`
            : '<span style="color:#2d7a4f;">None</span>';
        const winnerTag = c.is_winner
          ? ' <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700;">WINNER 2021</span>'
          : "";
        return `
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 8px;vertical-align:top;">
              <strong style="font-size:14px;">${c.name}</strong>${winnerTag}<br/>
              <span style="color:${partyColor(c.party)};font-weight:600;font-size:13px;">${c.party}</span>
            </td>
            <td style="padding:10px 8px;text-align:center;font-size:13px;">${c.age ?? "N/A"}</td>
            <td style="padding:10px 8px;font-size:12px;">${c.education ?? "N/A"}</td>
            <td style="padding:10px 8px;text-align:right;font-size:13px;">${fmtCurrency(displayAssets)}</td>
            <td style="padding:10px 8px;text-align:center;font-size:13px;">${criminalBadge}</td>
            <td style="padding:10px 8px;text-align:right;font-size:13px;">${c.votes_received != null ? c.votes_received.toLocaleString("en-IN") : "—"}${c.vote_share != null ? ` (${c.vote_share.toFixed(1)}%)` : ""}</td>
          </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Voter Card - ${constituencyName}</title>
<style>
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; background: #fff; padding: 24px; }
  .header { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #b8510d; }
  .header h1 { font-size: 28px; color: #b8510d; margin-bottom: 4px; }
  .header h2 { font-size: 16px; color: #6b7280; font-weight: 500; }
  .meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 12px 16px; background: #fef7f0; border-radius: 8px; border: 1px solid #fed7aa; }
  .meta-item { text-align: center; }
  .meta-item .label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-item .value { font-size: 16px; font-weight: 700; color: #1f2937; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #f9fafb; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
  thead th.right { text-align: right; }
  thead th.center { text-align: center; }
  .footer { text-align: center; padding-top: 16px; border-top: 2px solid #e5e7eb; }
  .footer p { font-size: 11px; color: #9ca3af; }
  .footer .brand { font-size: 13px; font-weight: 700; color: #b8510d; }
  .print-btn { display: block; margin: 0 auto 20px; padding: 10px 32px; background: #b8510d; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .print-btn:hover { background: #a33d0e; }
</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

  <div class="header">
    <p style="font-size:12px;color:#9ca3af;margin-bottom:4px;">KNOW BEFORE YOU VOTE</p>
    <h1>${constituencyName}</h1>
    <h2>${constituency.district} District, Tamil Nadu</h2>
  </div>

  <div class="meta">
    <div class="meta-item">
      <div class="label">Election Date</div>
      <div class="value">April 23, 2026</div>
    </div>
    <div class="meta-item">
      <div class="label">Registered Voters (2021)</div>
      <div class="value">${constituency.total_voters_2021 ? constituency.total_voters_2021.toLocaleString("en-IN") : "N/A"}</div>
    </div>
    <div class="meta-item">
      <div class="label">Turnout (2021)</div>
      <div class="value">${constituency.turnout_2021 ? constituency.turnout_2021 + "%" : "N/A"}</div>
    </div>
    <div class="meta-item">
      <div class="label">Candidates (2021)</div>
      <div class="value">${sortedCandidates.length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Candidate / Party</th>
        <th class="center">Age</th>
        <th>Education</th>
        <th class="right">Total Assets</th>
        <th class="center">Criminal Cases</th>
        <th class="right">Votes (2021)</th>
      </tr>
    </thead>
    <tbody>
      ${candidateRows}
    </tbody>
  </table>

  <div class="footer">
    <p class="brand">tnelections.info</p>
    <p>Data sourced from Election Commission of India affidavits &amp; eCourts. Verify at eci.gov.in</p>
    <p style="margin-top:4px;">Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
  </div>

  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 600); };
  </script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

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
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1 className="text-3xl font-extrabold text-gray-900">
                  {constituencyName}
                </h1>
                <Link
                  href={`/districts/${slugify(constituency.district)}`}
                  className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full hover:text-terracotta transition-colors"
                >
                  {constituency.district}
                </Link>
                {constituency.is_swing_seat && (
                  <span className="text-sm text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full font-semibold">
                    Swing Seat
                  </span>
                )}
              </div>
              {/* Stat chips */}
              <div className="flex flex-wrap gap-2 mt-2">
                {constituency.total_voters_2021 && (
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-gray-400">Voters (2021) </span>
                    <span className="font-bold text-gray-800">{fmt(constituency.total_voters_2021)}</span>
                  </div>
                )}
                {constituency.turnout_2021 && (
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-gray-400">Turnout </span>
                    <span className="font-bold text-gray-800">{constituency.turnout_2021}%</span>
                  </div>
                )}
                {electionResult && (
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-gray-400">Margin </span>
                    <span className="font-bold text-gray-800">{fmt(electionResult.margin)}</span>
                  </div>
                )}
                {candidates.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-gray-400">Candidates </span>
                    <span className="font-bold text-gray-800">{candidates.length}</span>
                  </div>
                )}
                {casesCount > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-red-400">With cases </span>
                    <span className="font-bold text-red-700">{casesCount}</span>
                  </div>
                )}
              </div>
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
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border-2 ${
                      selectedYear === yr
                        ? "bg-terracotta text-white border-terracotta shadow-md"
                        : "bg-white text-gray-700 border-gray-400 hover:border-terracotta hover:text-terracotta"
                    }`}
                  >
                    {yr}
                  </button>
                ))}
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

                {/* 2026 Voter Roll — SIR data */}
                {constituency?.voters_total_2026 && (() => {
                  const total = constituency.voters_total_2026!;
                  const male = constituency.voters_male_2026 ?? 0;
                  const female = constituency.voters_female_2026 ?? 0;
                  const third = constituency.voters_third_gender_2026 ?? 0;
                  const malePct = Math.round((male / total) * 100);
                  const femalePct = Math.round((female / total) * 100);
                  const prev = constituency.total_voters_2021;
                  const diff = prev ? total - prev : null;
                  return (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-900 text-sm">
                          🗳️ 2026 Voter Roll <span className="text-xs font-normal text-gray-400 ml-1">(Final, 23 Feb 2026)</span>
                        </h3>
                        {diff !== null && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diff >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                            {diff >= 0 ? "+" : ""}{fmt(diff)} vs 2021
                          </span>
                        )}
                      </div>

                      {/* Total */}
                      <p className="text-3xl font-bold text-terracotta mb-1">{fmt(total)}</p>
                      <p className="text-xs text-gray-500 mb-4">Total registered voters</p>

                      {/* Gender bar */}
                      <div className="space-y-2">
                        <div className="flex rounded-full overflow-hidden h-4">
                          <div
                            className="bg-blue-400 transition-all"
                            style={{ width: `${malePct}%` }}
                            title={`Male: ${fmt(male)}`}
                          />
                          <div
                            className="bg-pink-400 transition-all"
                            style={{ width: `${femalePct}%` }}
                            title={`Female: ${fmt(female)}`}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                            Male — {fmt(male)} ({malePct}%)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block" />
                            Female — {fmt(female)} ({femalePct}%)
                          </span>
                        </div>
                        {third > 0 && (
                          <p className="text-xs text-gray-400">+ {third} third gender voters</p>
                        )}
                      </div>

                      {/* Female majority flag */}
                      {female > male && (
                        <p className="mt-3 text-xs font-semibold text-pink-600 bg-pink-50 rounded-lg px-3 py-1.5">
                          Women outnumber men by {fmt(female - male)} — female voter turnout will be decisive
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Constituency Poll — only for 2026 elections */}
                {constituency && candidates.length > 0 && selectedYear === 2026 && (
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
                    <button
                      onClick={generateVoterCard}
                      title="Print / Save as PDF voter card"
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-terracotta hover:text-terracotta transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      PDF Card
                    </button>
                  </div>
                </div>
                {sortedCandidates.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
                    {t("const.no_candidates")}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sortedCandidates.map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        {/* Compare checkbox — sits outside the card so it never overlaps content */}
                        <button
                          onClick={() => toggleCompare(c.id)}
                          className={`mt-3 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            compareIds.has(c.id)
                              ? "bg-terracotta border-terracotta text-white"
                              : "border-gray-300 bg-white hover:border-terracotta"
                          }`}
                        >
                          {compareIds.has(c.id) && (
                            <span className="text-xs font-bold">✓</span>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <CandidateCard c={c} />
                        </div>
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
