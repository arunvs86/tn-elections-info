"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────
interface Candidate {
  id: number;
  name: string;
  constituency_id: number;
  party: string;
  alliance: string | null;
  election_year: number;
  is_incumbent: boolean;
  is_winner: boolean;
  votes_received: number | null;
  vote_share: number | null;
  margin: number | null;
  assets_movable: number | null;
  assets_immovable: number | null;
  liabilities: number | null;
  net_worth: number | null;
  education: string | null;
  age: number | null;
  criminal_cases_declared: number;
  criminal_cases_ecourts: number;
  criminal_mismatch: boolean;
  affidavit_url: string | null;
  photo_url: string | null;
}

// Rival = other candidate from same constituency (minimal fields)
interface Rival {
  id: number;
  name: string;
  party: string;
  votes_received: number | null;
  vote_share: number | null;
  is_winner: boolean;
}

interface Constituency {
  id: number;
  name: string;
  district: string;
}

// ── Helpers ────────────────────────────────────────────
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
  return "#888";
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN");
}

function fmtCurrency(n: number | null): string {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

// Ordinal suffix: 1st, 2nd, 3rd, 4th…
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Criminal severity: Clean / Minor / Serious
function criminalSeverity(cases: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (cases === 0)
    return { label: "Clean Record", color: "#2d7a4f", bg: "bg-green-50" };
  if (cases <= 2)
    return { label: "Minor Cases", color: "#b8860b", bg: "bg-yellow-50" };
  return { label: "Serious Cases", color: "#c0392b", bg: "bg-red-50" };
}

// ── Transparency Score ─────────────────────────────────
// Measures how transparent and accountable a candidate is (0–100).
// NOT a moral judgment — it scores disclosure & legal record.

interface ScoreBreakdown {
  criminal: number;        // max 35
  mismatchPenalty: number; // 0 or -15
  assetDisclosure: number; // max 25
  affidavit: number;       // max 15
  electoral: number;       // max 25
  total: number;           // 0–100
}

function computeTransparencyScore(c: Candidate): ScoreBreakdown {
  // 1. Criminal record (max 35)
  const cases = c.criminal_cases_declared;
  let criminal = 35;
  if (cases >= 6) criminal = 0;
  else if (cases >= 3) criminal = 10;
  else if (cases >= 1) criminal = 20;

  // 2. Mismatch penalty (-15 if declared ≠ eCourts)
  const mismatchPenalty = c.criminal_mismatch ? -15 : 0;

  // 3. Asset disclosure (max 25)
  const hasAssets =
    c.assets_movable != null ||
    c.assets_immovable != null ||
    c.net_worth != null;
  const assetDisclosure = hasAssets ? 25 : 10;

  // 4. Affidavit filed (max 15)
  const affidavit = c.affidavit_url ? 15 : 0;

  // 5. Electoral record (max 25)
  let electoral = 0;
  if (c.is_winner) electoral += 15;
  if (c.vote_share != null && c.vote_share > 30) electoral += 10;
  else if (c.vote_share != null && c.vote_share > 15) electoral += 5;

  const total = Math.max(
    0,
    Math.min(100, criminal + mismatchPenalty + assetDisclosure + affidavit + electoral)
  );

  return { criminal, mismatchPenalty, assetDisclosure, affidavit, electoral, total };
}

function scoreColor(score: number): string {
  if (score >= 75) return "#2d7a4f"; // green
  if (score >= 50) return "#b8860b"; // yellow/amber
  if (score >= 30) return "#d35400"; // orange
  return "#c0392b";                  // red
}

function scoreLabel(score: number): string {
  if (score >= 75) return "High";
  if (score >= 50) return "Moderate";
  if (score >= 30) return "Low";
  return "Very Low";
}

// SVG ring that shows the score as a circular progress arc
function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const color = scoreColor(score);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={4}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

// Breakdown row for the score detail panel
function ScoreRow({
  label,
  points,
  max,
}: {
  label: string;
  points: number;
  max: number;
}) {
  const isNegative = points < 0;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <span
        className="font-semibold"
        style={{ color: isNegative ? "#c0392b" : points >= max ? "#2d7a4f" : "#b8860b" }}
      >
        {isNegative ? points : `${points}/${max}`}
      </span>
    </div>
  );
}

// ── Components ─────────────────────────────────────────

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p
        className="text-xl font-bold"
        style={{ color: color || "#c84b11" }}
      >
        {value}
      </p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}

function AssetBar({
  label,
  amount,
  maxAmount,
  color,
}: {
  label: string;
  amount: number;
  maxAmount: number;
  color: string;
}) {
  const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">
          {fmtCurrency(amount)}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────
export default function CandidatePage() {
  const params = useParams();
  const candidateId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [constituency, setConstituency] = useState<Constituency | null>(
    null
  );
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (!candidateId) return;

    async function fetchData() {
      // Get candidate
      const { data: candData } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", parseInt(candidateId as string))
        .single();

      if (!candData) {
        setLoading(false);
        return;
      }

      setCandidate(candData);

      // Fetch constituency + rivals in parallel
      const [constResult, rivalsResult] = await Promise.all([
        supabase
          .from("constituencies")
          .select("id, name, district")
          .eq("id", candData.constituency_id)
          .single(),
        supabase
          .from("candidates")
          .select("id, name, party, votes_received, vote_share, is_winner")
          .eq("constituency_id", candData.constituency_id)
          .eq("election_year", candData.election_year)
          .neq("id", candData.id)
          .order("votes_received", { ascending: false }),
      ]);

      if (constResult.data) setConstituency(constResult.data);
      if (rivalsResult.data) setRivals(rivalsResult.data);

      setLoading(false);
    }

    fetchData();
  }, [candidateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Candidate not found</p>
          <Link
            href="/districts"
            className="text-terracotta text-sm hover:underline"
          >
            ← Browse districts
          </Link>
        </div>
      </div>
    );
  }

  const color = partyColor(candidate.party);

  // Compute asset max for bar widths
  const assetValues = [
    candidate.assets_movable ?? 0,
    candidate.assets_immovable ?? 0,
    candidate.liabilities ?? 0,
  ];
  const maxAsset = Math.max(...assetValues, 1);

  const hasAssets =
    candidate.assets_movable != null ||
    candidate.assets_immovable != null ||
    candidate.net_worth != null;

  const hasCriminal =
    candidate.criminal_cases_declared > 0 ||
    candidate.criminal_cases_ecourts > 0;

  // Calculate finishing position among all candidates in this constituency
  // Rivals are already sorted by votes desc; insert current candidate to find position
  const allByVotes = [
    { id: candidate.id, votes_received: candidate.votes_received },
    ...rivals,
  ].sort((a, b) => (b.votes_received ?? 0) - (a.votes_received ?? 0));
  const position =
    allByVotes.findIndex((c) => c.id === candidate.id) + 1;
  const totalCandidates = allByVotes.length;

  // Criminal severity
  const severity = criminalSeverity(candidate.criminal_cases_declared);

  // Transparency score
  const score = computeTransparencyScore(candidate);
  // Note: showBreakdown state is declared above with other useState hooks

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Header ── */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🗳️</span>
            <div>
              <p className="font-bold text-gray-900 leading-none">
                tnelections.info
              </p>
              <p className="text-xs text-gray-500">Tamil Nadu 2026</p>
            </div>
          </Link>
          {constituency && (
            <Link
              href={`/constituency/${slugify(constituency.name)}`}
              className="text-sm text-gray-500 hover:text-terracotta transition-colors"
            >
              ← {constituency.name}
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
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
              {" / "}
              <Link
                href={`/constituency/${slugify(constituency.name)}`}
                className="hover:text-terracotta"
              >
                {constituency.name}
              </Link>
            </>
          )}
          {" / "}
          <span className="text-gray-600 font-medium">
            {candidate.name}
          </span>
        </p>

        {/* ── Candidate header ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
              style={{ background: color }}
            >
              {candidate.name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-extrabold text-gray-900">
                  {candidate.name}
                </h1>
                {candidate.is_winner && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2.5 py-1 rounded-full">
                    Winner {candidate.election_year}
                  </span>
                )}
                {candidate.is_incumbent && (
                  <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2.5 py-1 rounded-full">
                    Incumbent
                  </span>
                )}
                {totalCandidates > 1 && (
                  <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full">
                    {ordinal(position)} of {totalCandidates}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-sm font-semibold"
                  style={{ color }}
                >
                  {candidate.party}
                </span>
                {candidate.alliance && (
                  <span className="text-xs text-gray-400">
                    ({candidate.alliance})
                  </span>
                )}
              </div>

              {constituency && (
                <p className="text-sm text-gray-500 mt-1">
                  Contesting from{" "}
                  <Link
                    href={`/constituency/${slugify(constituency.name)}`}
                    className="text-terracotta hover:underline"
                  >
                    {constituency.name}
                  </Link>
                  , {constituency.district} District
                </p>
              )}

              {/* Quick stats row */}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                {candidate.age && (
                  <span>
                    Age: <strong className="text-gray-900">{candidate.age}</strong>
                  </span>
                )}
                {candidate.education && (
                  <span>
                    Education:{" "}
                    <strong className="text-gray-900">
                      {candidate.education}
                    </strong>
                  </span>
                )}
                <span>
                  Year:{" "}
                  <strong className="text-gray-900">
                    {candidate.election_year}
                  </strong>
                </span>
              </div>
            </div>

            {/* Transparency score ring — right side of header */}
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex flex-col items-center gap-1 flex-shrink-0 hover:opacity-80 transition-opacity"
              title="Click to see score breakdown"
            >
              <ScoreRing score={score.total} size={64} />
              <span className="text-[10px] font-semibold text-gray-500">
                Candidate Score
              </span>
            </button>
          </div>

          {/* Score breakdown — expandable */}
          {showBreakdown && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-700 mb-2">
              Candidate Score Breakdown
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
                <ScoreRow label="Criminal Record" points={score.criminal} max={35} />
                <ScoreRow label="Asset Disclosure" points={score.assetDisclosure} max={25} />
                <ScoreRow label="Affidavit Filed" points={score.affidavit} max={15} />
                <ScoreRow label="Electoral Record" points={score.electoral} max={25} />
                {score.mismatchPenalty < 0 && (
                  <ScoreRow label="Mismatch Penalty" points={score.mismatchPenalty} max={0} />
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Score measures transparency &amp; accountability based on public filings. Not a moral judgment.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Election performance ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-4">
              Election Performance ({candidate.election_year})
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatBox
                label="Votes Received"
                value={fmt(candidate.votes_received)}
              />
              <StatBox
                label="Vote Share"
                value={
                  candidate.vote_share != null
                    ? `${candidate.vote_share.toFixed(1)}%`
                    : "—"
                }
              />
              <StatBox
                label="Margin"
                value={fmt(candidate.margin)}
                color={
                  candidate.is_winner ? "#2d7a4f" : "#c0392b"
                }
              />
              <StatBox
                label="Result"
                value={candidate.is_winner ? "Won" : "Lost"}
                color={
                  candidate.is_winner ? "#2d7a4f" : "#c0392b"
                }
              />
            </div>
          </div>

          {/* ── Assets & Net Worth ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-4">
              Declared Assets
            </h2>
            {hasAssets ? (
              <div className="space-y-4">
                {/* Net worth highlight */}
                {candidate.net_worth != null && (
                  <div className="bg-gray-50 rounded-xl p-4 text-center mb-2">
                    <p className="text-xs text-gray-500 mb-1">
                      Net Worth
                    </p>
                    <p className="text-2xl font-bold text-terracotta">
                      {fmtCurrency(candidate.net_worth)}
                    </p>
                  </div>
                )}

                {candidate.assets_movable != null && (
                  <AssetBar
                    label="Movable Assets"
                    amount={candidate.assets_movable}
                    maxAmount={maxAsset}
                    color="#1a5276"
                  />
                )}
                {candidate.assets_immovable != null && (
                  <AssetBar
                    label="Immovable Assets"
                    amount={candidate.assets_immovable}
                    maxAmount={maxAsset}
                    color="#2d7a4f"
                  />
                )}
                {candidate.liabilities != null && (
                  <AssetBar
                    label="Liabilities"
                    amount={candidate.liabilities}
                    maxAmount={maxAsset}
                    color="#c0392b"
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Asset data not yet available
              </p>
            )}
          </div>

          {/* ── Criminal record ── */}
          <div
            className={`bg-white rounded-2xl border shadow-sm p-5 ${
              candidate.criminal_mismatch
                ? "border-red-300"
                : "border-gray-100"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-sm">
                Criminal Record
              </h2>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${severity.bg}`}
                style={{ color: severity.color }}
              >
                {severity.label}
              </span>
            </div>
            {hasCriminal ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <StatBox
                    label="Self-Declared Cases"
                    value={String(candidate.criminal_cases_declared)}
                    color={
                      candidate.criminal_cases_declared > 0
                        ? "#c0392b"
                        : "#2d7a4f"
                    }
                  />
                  <StatBox
                    label="eCourts Records"
                    value={String(candidate.criminal_cases_ecourts)}
                    color={
                      candidate.criminal_cases_ecourts > 0
                        ? "#c0392b"
                        : "#2d7a4f"
                    }
                  />
                </div>
                {candidate.criminal_mismatch && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    <p className="font-semibold">Mismatch Detected</p>
                    <p className="text-xs mt-0.5">
                      The number of cases declared in the affidavit does
                      not match eCourts records. This may indicate
                      undisclosed cases.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-green-700 font-semibold text-sm">
                  No Criminal Cases
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  No cases declared or found in eCourts
                </p>
              </div>
            )}
          </div>

          {/* ── Source & affidavit ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-4">
              Data Source
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">
                Election data from the{" "}
                <strong className="text-gray-900">
                  Election Commission of India
                </strong>
              </p>
              <p className="text-gray-600">
                Asset &amp; criminal data from{" "}
                <strong className="text-gray-900">
                  MyNeta.info (ADR)
                </strong>
              </p>
              {candidate.affidavit_url && (
                <a
                  href={candidate.affidavit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-terracotta text-sm font-semibold hover:underline"
                >
                  View Original Affidavit →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Rivals from same constituency ── */}
        {rivals.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-6">
            <h2 className="font-bold text-gray-900 text-sm mb-3">
              Other Candidates in {constituency?.name || "this constituency"} ({rivals.length})
            </h2>
            <div className="space-y-1">
              {rivals.map((r, i) => {
                const rColor = partyColor(r.party);
                // rival's position: they are sorted by votes desc,
                // but we need to account for the current candidate's position
                const rivalPos = allByVotes.findIndex((c) => c.id === r.id) + 1;
                return (
                  <Link
                    key={r.id}
                    href={`/candidate/${r.id}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5 text-right font-mono">
                        {ordinal(rivalPos)}
                      </span>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ background: rColor }}
                      >
                        {r.party.slice(0, 3)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 group-hover:text-terracotta transition-colors">
                          {r.name}
                        </p>
                        <p className="text-xs text-gray-400">{r.party}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {r.vote_share != null && (
                        <p className="text-sm font-semibold text-gray-700">
                          {r.vote_share.toFixed(1)}%
                        </p>
                      )}
                      {r.votes_received != null && (
                        <p className="text-xs text-gray-400">
                          {fmt(r.votes_received)} votes
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap gap-3 mt-6">
          {rivals.length > 0 && (
            <Link
              href={`/compare?ids=${candidate.id},${rivals[0].id}`}
              className="inline-flex items-center gap-2 bg-terracotta text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#a33d0e] transition-colors"
            >
              Compare with {rivals[0].name.split(" ")[0]} →
            </Link>
          )}
          {constituency && (
            <Link
              href={`/constituency/${slugify(constituency.name)}`}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full text-sm font-semibold hover:border-terracotta hover:text-terracotta transition-colors"
            >
              View {constituency.name} constituency
            </Link>
          )}
          {candidate.affidavit_url && (
            <a
              href={candidate.affidavit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full text-sm font-semibold hover:border-terracotta hover:text-terracotta transition-colors"
            >
              View Affidavit ↗
            </a>
          )}
        </div>
      </main>

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
