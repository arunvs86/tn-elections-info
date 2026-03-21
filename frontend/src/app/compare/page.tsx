"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Header from "@/components/Header";

// ── Types ──────────────────────────────────────────────
interface CandidateRow {
  id: number;
  name: string;
  party: string;
  age: number | null;
  education: string | null;
  net_worth: number | null;
  criminal_cases_declared: number;
  criminal_cases_ecourts: number | null;
  votes_received: number | null;
  vote_share: number | null;
  margin: number | null;
  is_winner: boolean;
  is_incumbent: boolean;
  constituency_id: number;
  election_year: number;
  movable_assets: number | null;
  immovable_assets: number | null;
  liabilities: number | null;
  assets_movable: number | null;
  assets_immovable: number | null;
  assembly_attendance_pct: number | null;
  assembly_sessions_attended: number | null;
  assembly_sessions_total: number | null;
}

interface ConstituencyRow {
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
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

// ── Compare bar: shows two values side by side ─────────
function CompareBar({
  leftVal,
  rightVal,
  leftColor,
  rightColor,
}: {
  leftVal: number;
  rightVal: number;
  leftColor: string;
  rightColor: string;
}) {
  const max = Math.max(leftVal, rightVal, 1);
  const leftPct = (leftVal / max) * 100;
  const rightPct = (rightVal / max) * 100;

  return (
    <div className="flex items-center gap-1">
      {/* Left bar grows from right to left */}
      <div className="flex-1 flex justify-end">
        <div
          className="h-3 rounded-l-full transition-all"
          style={{ width: `${leftPct}%`, background: leftColor, minWidth: leftVal > 0 ? 4 : 0 }}
        />
      </div>
      <div className="w-px h-5 bg-gray-300 flex-shrink-0" />
      {/* Right bar grows from left to right */}
      <div className="flex-1">
        <div
          className="h-3 rounded-r-full transition-all"
          style={{ width: `${rightPct}%`, background: rightColor, minWidth: rightVal > 0 ? 4 : 0 }}
        />
      </div>
    </div>
  );
}

// ── Stat row ───────────────────────────────────────────
function StatRow({
  label,
  leftVal,
  rightVal,
  leftDisplay,
  rightDisplay,
  leftColor,
  rightColor,
  showBar = true,
}: {
  label: string;
  leftVal: number;
  rightVal: number;
  leftDisplay: string;
  rightDisplay: string;
  leftColor: string;
  rightColor: string;
  showBar?: boolean;
}) {
  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <p className="text-xs text-gray-400 text-center mb-1.5">{label}</p>
      <div className="flex items-center">
        <span className="flex-1 text-right text-sm font-semibold text-gray-800 pr-3">
          {leftDisplay}
        </span>
        {showBar ? (
          <div className="w-40 sm:w-56 flex-shrink-0">
            <CompareBar
              leftVal={leftVal}
              rightVal={rightVal}
              leftColor={leftColor}
              rightColor={rightColor}
            />
          </div>
        ) : (
          <div className="w-40 sm:w-56 flex-shrink-0 text-center text-xs text-gray-300">
            vs
          </div>
        )}
        <span className="flex-1 text-left text-sm font-semibold text-gray-800 pl-3">
          {rightDisplay}
        </span>
      </div>
    </div>
  );
}

// ── Candidate selector (search from same constituency) ─
function CandidateSelector({
  label,
  selected,
  onSelect,
  exclude,
  constituencyId,
}: {
  label: string;
  selected: CandidateRow | null;
  onSelect: (c: CandidateRow) => void;
  exclude: number | null;
  constituencyId: number | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CandidateRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      let q = supabase
        .from("candidates")
        .select("*")
        .ilike("name", `%${query}%`)
        .eq("election_year", 2021)
        .order("votes_received", { ascending: false })
        .limit(10);

      const { data } = await q;
      setResults(
        (data || []).filter((c: CandidateRow) => c.id !== exclude)
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [query, exclude, constituencyId]);

  if (selected) {
    const color = partyColor(selected.party);
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: color }}
        >
          {selected.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {selected.name}
          </p>
          <p className="text-xs" style={{ color }}>
            {selected.party}
          </p>
        </div>
        <button
          onClick={() => {
            onSelect(null as unknown as CandidateRow);
            setQuery("");
          }}
          className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={label}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map((c) => {
            const color = partyColor(c.party);
            return (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: color }}
                >
                  {c.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {c.name}
                  </p>
                  <p className="text-xs" style={{ color }}>
                    {c.party}
                    {c.votes_received != null && (
                      <span className="text-gray-400">
                        {" "}
                        · {fmt(c.votes_received)} votes
                      </span>
                    )}
                  </p>
                </div>
                {c.is_winner && (
                  <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                    Won
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm text-gray-400 text-center">
          No candidates found
        </div>
      )}
    </div>
  );
}

// ── Quick verdict: auto-generated comparison highlights ──
function QuickVerdict({
  left,
  right,
  leftColor,
  rightColor,
}: {
  left: CandidateRow;
  right: CandidateRow;
  leftColor: string;
  rightColor: string;
}) {
  const verdicts: { label: string; winner: "left" | "right" | "tie"; detail: string }[] = [];

  // More votes
  if ((left.votes_received ?? 0) > (right.votes_received ?? 0)) {
    verdicts.push({
      label: "More Votes",
      winner: "left",
      detail: `${fmt(left.votes_received)} vs ${fmt(right.votes_received)}`,
    });
  } else if ((right.votes_received ?? 0) > (left.votes_received ?? 0)) {
    verdicts.push({
      label: "More Votes",
      winner: "right",
      detail: `${fmt(right.votes_received)} vs ${fmt(left.votes_received)}`,
    });
  }

  // Higher vote share
  if ((left.vote_share ?? 0) > (right.vote_share ?? 0)) {
    verdicts.push({
      label: "Higher Vote Share",
      winner: "left",
      detail: `${(left.vote_share ?? 0).toFixed(1)}% vs ${(right.vote_share ?? 0).toFixed(1)}%`,
    });
  } else if ((right.vote_share ?? 0) > (left.vote_share ?? 0)) {
    verdicts.push({
      label: "Higher Vote Share",
      winner: "right",
      detail: `${(right.vote_share ?? 0).toFixed(1)}% vs ${(left.vote_share ?? 0).toFixed(1)}%`,
    });
  }

  // Richer
  if ((left.net_worth ?? 0) > (right.net_worth ?? 0)) {
    verdicts.push({
      label: "Wealthier",
      winner: "left",
      detail: `${fmtCurrency(left.net_worth)} vs ${fmtCurrency(right.net_worth)}`,
    });
  } else if ((right.net_worth ?? 0) > (left.net_worth ?? 0)) {
    verdicts.push({
      label: "Wealthier",
      winner: "right",
      detail: `${fmtCurrency(right.net_worth)} vs ${fmtCurrency(left.net_worth)}`,
    });
  }

  // Fewer criminal cases (lower is better)
  const lCases = left.criminal_cases_declared;
  const rCases = right.criminal_cases_declared;
  if (lCases < rCases) {
    verdicts.push({
      label: "Fewer Criminal Cases",
      winner: "left",
      detail: `${lCases} vs ${rCases}`,
    });
  } else if (rCases < lCases) {
    verdicts.push({
      label: "Fewer Criminal Cases",
      winner: "right",
      detail: `${rCases} vs ${lCases}`,
    });
  } else {
    verdicts.push({ label: "Criminal Cases", winner: "tie", detail: `Both: ${lCases}` });
  }

  // Better attendance
  if (
    left.assembly_attendance_pct != null &&
    right.assembly_attendance_pct != null
  ) {
    if (left.assembly_attendance_pct > right.assembly_attendance_pct) {
      verdicts.push({
        label: "Better Attendance",
        winner: "left",
        detail: `${left.assembly_attendance_pct}% vs ${right.assembly_attendance_pct}%`,
      });
    } else if (right.assembly_attendance_pct > left.assembly_attendance_pct) {
      verdicts.push({
        label: "Better Attendance",
        winner: "right",
        detail: `${right.assembly_attendance_pct}% vs ${left.assembly_attendance_pct}%`,
      });
    }
  }

  if (verdicts.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="font-bold text-gray-900 text-sm mb-3">
        Quick Verdict
      </h2>
      <div className="space-y-2">
        {verdicts.map((v, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <span className="text-xs text-gray-400 w-36 flex-shrink-0">{v.label}</span>
            {v.winner === "tie" ? (
              <span className="text-xs text-gray-500 font-medium">{v.detail}</span>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: v.winner === "left" ? leftColor : rightColor }}
                >
                  {v.winner === "left" ? left.name.split(" ")[0] : right.name.split(" ")[0]}
                </span>
                <span className="text-xs text-gray-500">{v.detail}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main compare content (uses useSearchParams) ────────
function CompareContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids");

  const [left, setLeft] = useState<CandidateRow | null>(null);
  const [right, setRight] = useState<CandidateRow | null>(null);
  const [constituency, setConstituency] = useState<ConstituencyRow | null>(null);
  const [leftConst, setLeftConst] = useState<ConstituencyRow | null>(null);
  const [rightConst, setRightConst] = useState<ConstituencyRow | null>(null);
  const [loading, setLoading] = useState(false);

  // Load candidates from URL params on mount
  useEffect(() => {
    if (!idsParam) return;

    const ids = idsParam.split(",").map(Number).filter(Boolean);
    if (ids.length < 2) return;

    setLoading(true);

    async function load() {
      const { data } = await supabase
        .from("candidates")
        .select("*")
        .in("id", ids);

      if (data && data.length >= 2) {
        setLeft(data[0]);
        setRight(data[1]);

        // Fetch constituency
        const { data: constData } = await supabase
          .from("constituencies")
          .select("id, name, district")
          .eq("id", data[0].constituency_id)
          .single();

        if (constData) setConstituency(constData);
      }

      setLoading(false);
    }

    load();
  }, [idsParam]);

  // When left candidate changes, load constituency
  useEffect(() => {
    if (!left) {
      setConstituency(null);
      setLeftConst(null);
      return;
    }

    async function loadConst() {
      const { data } = await supabase
        .from("constituencies")
        .select("id, name, district")
        .eq("id", left!.constituency_id)
        .single();

      if (data) {
        setConstituency(data);
        setLeftConst(data);
      }
    }

    loadConst();
  }, [left?.id]);

  // When right candidate changes, load their constituency
  useEffect(() => {
    if (!right) {
      setRightConst(null);
      return;
    }

    async function loadConst() {
      const { data } = await supabase
        .from("constituencies")
        .select("id, name, district")
        .eq("id", right!.constituency_id)
        .single();

      if (data) setRightConst(data);
    }

    loadConst();
  }, [right?.id]);

  const leftColor = left ? partyColor(left.party) : "#888";
  const rightColor = right ? partyColor(right.party) : "#888";

  const bothSelected = left && right;

  return (
    <div className="min-h-screen bg-cream">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 mb-4">
          <Link href="/" className="hover:text-terracotta">
            Home
          </Link>
          {" / "}
          {constituency && (
            <>
              <Link href="/districts" className="hover:text-terracotta">
                Districts
              </Link>
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
              {" / "}
            </>
          )}
          <span className="text-gray-600 font-medium">Compare</span>
        </p>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          Compare Candidates
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Select two candidates to compare side-by-side
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 animate-pulse">Loading...</p>
          </div>
        ) : (
          <>
            {/* ── Selector row ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1.5 font-medium">
                    Candidate 1
                  </p>
                  <CandidateSelector
                    label="Search candidate..."
                    selected={left}
                    onSelect={setLeft}
                    exclude={right?.id ?? null}
                    constituencyId={constituency?.id ?? null}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5 font-medium">
                    Candidate 2
                  </p>
                  <CandidateSelector
                    label="Search candidate..."
                    selected={right}
                    onSelect={setRight}
                    exclude={left?.id ?? null}
                    constituencyId={constituency?.id ?? null}
                  />
                </div>
              </div>
              {constituency && (
                <p className="text-xs text-gray-400 mt-3 text-center">
                  Showing candidates from{" "}
                  <strong className="text-gray-600">
                    {constituency.name}
                  </strong>{" "}
                  constituency
                </p>
              )}
            </div>

            {/* ── Comparison ── */}
            {bothSelected ? (
              <div className="space-y-4">
                {/* VS Header */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between">
                    {/* Left candidate */}
                    <Link
                      href={`/candidate/${left.id}`}
                      className="flex items-center gap-3 group flex-1"
                    >
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                        style={{ background: leftColor }}
                      >
                        {left.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 group-hover:text-terracotta transition-colors truncate">
                          {left.name}
                        </p>
                        <p className="text-sm font-medium" style={{ color: leftColor }}>
                          {left.party}
                        </p>
                        <div className="flex gap-2 mt-0.5">
                          {left.is_winner && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                              Winner
                            </span>
                          )}
                          {left.is_incumbent && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                              Incumbent
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>

                    {/* VS badge */}
                    <div className="flex-shrink-0 mx-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-400">
                          VS
                        </span>
                      </div>
                    </div>

                    {/* Right candidate */}
                    <Link
                      href={`/candidate/${right.id}`}
                      className="flex items-center gap-3 group flex-1 justify-end text-right"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 group-hover:text-terracotta transition-colors truncate">
                          {right.name}
                        </p>
                        <p className="text-sm font-medium" style={{ color: rightColor }}>
                          {right.party}
                        </p>
                        <div className="flex gap-2 justify-end mt-0.5">
                          {right.is_winner && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                              Winner
                            </span>
                          )}
                          {right.is_incumbent && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                              Incumbent
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                        style={{ background: rightColor }}
                      >
                        {right.name.charAt(0)}
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Election Performance */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-bold text-gray-900 text-sm mb-3">
                    Election Performance (2021)
                  </h2>

                  <StatRow
                    label="Votes Received"
                    leftVal={left.votes_received ?? 0}
                    rightVal={right.votes_received ?? 0}
                    leftDisplay={fmt(left.votes_received)}
                    rightDisplay={fmt(right.votes_received)}
                    leftColor={leftColor}
                    rightColor={rightColor}
                  />

                  <StatRow
                    label="Vote Share"
                    leftVal={left.vote_share ?? 0}
                    rightVal={right.vote_share ?? 0}
                    leftDisplay={
                      left.vote_share != null
                        ? `${left.vote_share.toFixed(1)}%`
                        : "—"
                    }
                    rightDisplay={
                      right.vote_share != null
                        ? `${right.vote_share.toFixed(1)}%`
                        : "—"
                    }
                    leftColor={leftColor}
                    rightColor={rightColor}
                  />
                </div>

                {/* Profile */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-bold text-gray-900 text-sm mb-3">
                    Profile
                  </h2>

                  <StatRow
                    label="Age"
                    leftVal={left.age ?? 0}
                    rightVal={right.age ?? 0}
                    leftDisplay={left.age ? String(left.age) : "—"}
                    rightDisplay={right.age ? String(right.age) : "—"}
                    leftColor={leftColor}
                    rightColor={rightColor}
                    showBar={false}
                  />

                  <StatRow
                    label="Education"
                    leftVal={0}
                    rightVal={0}
                    leftDisplay={left.education ?? "—"}
                    rightDisplay={right.education ?? "—"}
                    leftColor={leftColor}
                    rightColor={rightColor}
                    showBar={false}
                  />
                </div>

                {/* Assets */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-bold text-gray-900 text-sm mb-3">
                    Declared Assets
                  </h2>

                  <StatRow
                    label="Net Worth"
                    leftVal={left.net_worth ?? 0}
                    rightVal={right.net_worth ?? 0}
                    leftDisplay={fmtCurrency(left.net_worth)}
                    rightDisplay={fmtCurrency(right.net_worth)}
                    leftColor={leftColor}
                    rightColor={rightColor}
                  />

                  <StatRow
                    label="Movable Assets"
                    leftVal={left.movable_assets ?? 0}
                    rightVal={right.movable_assets ?? 0}
                    leftDisplay={fmtCurrency(left.movable_assets)}
                    rightDisplay={fmtCurrency(right.movable_assets)}
                    leftColor={leftColor}
                    rightColor={rightColor}
                  />

                  <StatRow
                    label="Immovable Assets"
                    leftVal={left.immovable_assets ?? 0}
                    rightVal={right.immovable_assets ?? 0}
                    leftDisplay={fmtCurrency(left.immovable_assets)}
                    rightDisplay={fmtCurrency(right.immovable_assets)}
                    leftColor={leftColor}
                    rightColor={rightColor}
                  />

                  <StatRow
                    label="Liabilities"
                    leftVal={left.liabilities ?? 0}
                    rightVal={right.liabilities ?? 0}
                    leftDisplay={fmtCurrency(left.liabilities)}
                    rightDisplay={fmtCurrency(right.liabilities)}
                    leftColor={leftColor}
                    rightColor={rightColor}
                  />
                </div>

                {/* Criminal Record */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-bold text-gray-900 text-sm mb-3">
                    Criminal Record
                  </h2>

                  <StatRow
                    label="Cases Declared"
                    leftVal={left.criminal_cases_declared}
                    rightVal={right.criminal_cases_declared}
                    leftDisplay={String(left.criminal_cases_declared)}
                    rightDisplay={String(right.criminal_cases_declared)}
                    leftColor={
                      left.criminal_cases_declared > 0 ? "#dc2626" : "#22c55e"
                    }
                    rightColor={
                      right.criminal_cases_declared > 0
                        ? "#dc2626"
                        : "#22c55e"
                    }
                  />

                  {(left.criminal_cases_ecourts != null ||
                    right.criminal_cases_ecourts != null) && (
                    <StatRow
                      label="Cases (eCourts)"
                      leftVal={left.criminal_cases_ecourts ?? 0}
                      rightVal={right.criminal_cases_ecourts ?? 0}
                      leftDisplay={
                        left.criminal_cases_ecourts != null
                          ? String(left.criminal_cases_ecourts)
                          : "—"
                      }
                      rightDisplay={
                        right.criminal_cases_ecourts != null
                          ? String(right.criminal_cases_ecourts)
                          : "—"
                      }
                      leftColor={
                        (left.criminal_cases_ecourts ?? 0) > 0
                          ? "#dc2626"
                          : "#22c55e"
                      }
                      rightColor={
                        (right.criminal_cases_ecourts ?? 0) > 0
                          ? "#dc2626"
                          : "#22c55e"
                      }
                    />
                  )}
                </div>

                {/* Constituency Context (cross-constituency compare) */}
                {leftConst && rightConst && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="font-bold text-gray-900 text-sm mb-3">
                      Constituency Context
                    </h2>

                    <StatRow
                      label="Constituency"
                      leftVal={0}
                      rightVal={0}
                      leftDisplay={leftConst.name}
                      rightDisplay={rightConst.name}
                      leftColor={leftColor}
                      rightColor={rightColor}
                      showBar={false}
                    />

                    <StatRow
                      label="District"
                      leftVal={0}
                      rightVal={0}
                      leftDisplay={leftConst.district}
                      rightDisplay={rightConst.district}
                      leftColor={leftColor}
                      rightColor={rightColor}
                      showBar={false}
                    />

                    <StatRow
                      label="Victory Margin"
                      leftVal={left.margin ?? 0}
                      rightVal={right.margin ?? 0}
                      leftDisplay={left.margin != null ? fmt(left.margin) : "—"}
                      rightDisplay={right.margin != null ? fmt(right.margin) : "—"}
                      leftColor={leftColor}
                      rightColor={rightColor}
                    />
                  </div>
                )}

                {/* Assembly Attendance (for winners) */}
                {(left.is_winner || right.is_winner) &&
                  (left.assembly_attendance_pct != null ||
                    right.assembly_attendance_pct != null) && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h2 className="font-bold text-gray-900 text-sm mb-3">
                        Assembly Attendance
                      </h2>

                      <StatRow
                        label="Attendance %"
                        leftVal={left.assembly_attendance_pct ?? 0}
                        rightVal={right.assembly_attendance_pct ?? 0}
                        leftDisplay={
                          left.assembly_attendance_pct != null
                            ? `${left.assembly_attendance_pct}%`
                            : "—"
                        }
                        rightDisplay={
                          right.assembly_attendance_pct != null
                            ? `${right.assembly_attendance_pct}%`
                            : "—"
                        }
                        leftColor={leftColor}
                        rightColor={rightColor}
                      />

                      <StatRow
                        label="Sessions Attended"
                        leftVal={left.assembly_sessions_attended ?? 0}
                        rightVal={right.assembly_sessions_attended ?? 0}
                        leftDisplay={
                          left.assembly_sessions_attended != null && left.assembly_sessions_total != null
                            ? `${left.assembly_sessions_attended}/${left.assembly_sessions_total}`
                            : "—"
                        }
                        rightDisplay={
                          right.assembly_sessions_attended != null && right.assembly_sessions_total != null
                            ? `${right.assembly_sessions_attended}/${right.assembly_sessions_total}`
                            : "—"
                        }
                        leftColor={leftColor}
                        rightColor={rightColor}
                      />
                    </div>
                  )}

                {/* Quick Verdict */}
                <QuickVerdict left={left} right={right} leftColor={leftColor} rightColor={rightColor} />

                {/* Share comparison */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const text = `Compare: ${left.name} (${left.party}) vs ${right.name} (${right.party})\n\nVotes: ${fmt(left.votes_received)} vs ${fmt(right.votes_received)}\nAssets: ${fmtCurrency(left.net_worth)} vs ${fmtCurrency(right.net_worth)}\nCriminal Cases: ${left.criminal_cases_declared} vs ${right.criminal_cases_declared}\n\nSee full comparison at tnelections.info/compare?ids=${left.id},${right.id}`;
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(text)}`,
                        "_blank"
                      );
                    }}
                    className="flex-1 text-center bg-[#25d366] text-white rounded-2xl py-3 text-sm font-semibold hover:bg-[#1da851] transition-colors flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Share Comparison
                  </button>
                </div>

                {/* View full profiles */}
                <div className="flex gap-3">
                  <Link
                    href={`/candidate/${left.id}`}
                    className="flex-1 text-center bg-white rounded-2xl border border-gray-100 shadow-sm py-3 text-sm font-semibold hover:border-gray-200 hover:shadow-md transition-all"
                    style={{ color: leftColor }}
                  >
                    View {left.name.split(" ")[0]}&apos;s full profile →
                  </Link>
                  <Link
                    href={`/candidate/${right.id}`}
                    className="flex-1 text-center bg-white rounded-2xl border border-gray-100 shadow-sm py-3 text-sm font-semibold hover:border-gray-200 hover:shadow-md transition-all"
                    style={{ color: rightColor }}
                  >
                    View {right.name.split(" ")[0]}&apos;s full profile →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <p className="text-4xl mb-3">⚖️</p>
                <p className="text-gray-500 text-sm">
                  Select two candidates above to see a side-by-side comparison
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  Tip: You can also compare from any constituency page
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
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

// ── Page (wrapped in Suspense for useSearchParams) ─────
export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <p className="text-gray-400 animate-pulse">Loading...</p>
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
