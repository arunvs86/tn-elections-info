"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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
  is_winner: boolean;
  is_incumbent: boolean;
  constituency_id: number;
  election_year: number;
  movable_assets: number | null;
  immovable_assets: number | null;
  liabilities: number | null;
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
        .limit(10);

      if (constituencyId) {
        q = q.eq("constituency_id", constituencyId);
      }

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

// ── Main compare content (uses useSearchParams) ────────
function CompareContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids");

  const [left, setLeft] = useState<CandidateRow | null>(null);
  const [right, setRight] = useState<CandidateRow | null>(null);
  const [constituency, setConstituency] = useState<ConstituencyRow | null>(null);
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
      return;
    }

    async function loadConst() {
      const { data } = await supabase
        .from("constituencies")
        .select("id, name, district")
        .eq("id", left!.constituency_id)
        .single();

      if (data) setConstituency(data);
    }

    loadConst();
  }, [left?.id]);

  const leftColor = left ? partyColor(left.party) : "#888";
  const rightColor = right ? partyColor(right.party) : "#888";

  const bothSelected = left && right;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
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
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link
              href="/districts"
              className="hover:text-terracotta transition-colors"
            >
              Districts
            </Link>
            <Link
              href="/compare"
              className="text-terracotta font-semibold"
            >
              Compare
            </Link>
          </nav>
          {constituency ? (
            <Link
              href={`/constituency/${slugify(constituency.name)}`}
              className="text-sm text-gray-500 hover:text-terracotta transition-colors"
            >
              ← {constituency.name}
            </Link>
          ) : (
            <Link
              href="/districts"
              className="text-sm text-gray-500 hover:text-terracotta transition-colors"
            >
              ← Districts
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
