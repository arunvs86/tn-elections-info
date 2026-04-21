"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Header from "@/components/Header";

// ── Types ──────────────────────────────────────────────
interface Candidate {
  id: number;
  name: string;
  party: string;
  election_year: number;
  age: number | null;
  education: string | null;
  criminal_cases_declared: number | null;
  net_worth: number | null;
  assets_movable: number | null;
  assets_immovable: number | null;
  liabilities: number | null;
  affidavit_url: string | null;
  constituency: { name: string; district: string }[] | null;
}

type SortKey = "net_worth" | "criminal_cases_declared" | "liabilities" | "age" | "name";
type SortDir = "desc" | "asc";

// ── Helpers ────────────────────────────────────────────
function fmt(n: number | null, prefix = "₹"): string {
  if (n == null || n === 0) return "—";
  if (Math.abs(n) >= 1_00_00_000)
    return `${prefix}${(n / 1_00_00_000).toFixed(1)} Cr`;
  if (Math.abs(n) >= 1_00_000)
    return `${prefix}${(n / 1_00_000).toFixed(1)} L`;
  return `${prefix}${n.toLocaleString("en-IN")}`;
}

function partyColor(party: string): string {
  const p = (party || "").toUpperCase();
  if (p.includes("AIADMK") || p === "ADMK") return "#2d7a4f";
  if (p.includes("DMK")) return "#c0392b";
  if (p.includes("TAMILAGA VETTRI") || p.includes("TVK")) return "#1a5276";
  if (p.includes("BJP")) return "#d35400";
  if (p.includes("NAAM TAMILAR") || p.includes("NTK")) return "#6c3483";
  if (p.includes("INC") || p.includes("CONGRESS")) return "#1565c0";
  if (p.includes("PMK")) return "#b8860b";
  if (p.includes("VCK")) return "#4a148c";
  if (p === "IND") return "#7f8c8d";
  return "#555";
}

function partyShort(party: string): string {
  const p = (party || "").toUpperCase();
  if (p.includes("AIADMK")) return "AIADMK";
  if (p.includes("DMK")) return "DMK";
  if (p.includes("TAMILAGA VETTRI") || p.includes("TVK")) return "TVK";
  if (p.includes("BJP")) return "BJP";
  if (p.includes("NAAM TAMILAR") || p.includes("NTK")) return "NTK";
  if (p.includes("CONGRESS")) return "INC";
  if (p.includes("PMK")) return "PMK";
  if (p.includes("VCK")) return "VCK";
  if (p === "IND") return "IND";
  return party?.slice(0, 8) || "—";
}

const SORT_OPTIONS: { key: SortKey; label: string; dir: SortDir; icon: string }[] = [
  { key: "net_worth", label: "Richest", dir: "desc", icon: "💰" },
  { key: "criminal_cases_declared", label: "Most Cases", dir: "desc", icon: "⚖️" },
  { key: "liabilities", label: "Most Debt", dir: "desc", icon: "📉" },
  { key: "net_worth", label: "Poorest", dir: "asc", icon: "📊" },
  { key: "age", label: "Oldest", dir: "desc", icon: "👴" },
  { key: "age", label: "Youngest", dir: "asc", icon: "🧑" },
];

const PARTIES = ["All", "DMK", "AIADMK", "TVK", "BJP", "NTK", "INC", "PMK", "VCK", "IND"];

// Map short label → DB ilike pattern
const PARTY_FILTER: Record<string, string> = {
  DMK: "DMK",
  AIADMK: "AIADMK",
  TVK: "Tamilaga Vettri Kazhagam",
  BJP: "BJP",
  NTK: "Naam Tamilar Katchi",
  INC: "Congress",
  PMK: "PMK",
  VCK: "VCK",
  IND: "IND",
};
const PAGE_SIZE = 50;

// ── Component ──────────────────────────────────────────
export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [sortIdx, setSortIdx] = useState(0); // index into SORT_OPTIONS
  const [party, setParty] = useState("All");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [onlyCriminal, setOnlyCriminal] = useState(false);
  const [year, setYear] = useState(2026);

  const sort = SORT_OPTIONS[sortIdx];

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase
      .from("candidates")
      .select(
        `id, name, party, election_year, age, education,
         criminal_cases_declared, net_worth, assets_movable,
         assets_immovable, liabilities, affidavit_url,
         constituency:constituencies(name, district)`,
        { count: "exact" }
      )
      .eq("election_year", year)
      .order(sort.key, { ascending: sort.dir === "asc", nullsFirst: false })
      .range(from, to);

    if (party !== "All") {
      const pattern = PARTY_FILTER[party] ?? party;
      q = q.ilike("party", `%${pattern}%`);
    }
    if (onlyCriminal) {
      q = q.gt("criminal_cases_declared", 0);
    }
    if (search) {
      q = q.ilike("name", `%${search}%`);
    }

    const { data, count } = await q;
    setCandidates((data as unknown as Candidate[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [sort.key, sort.dir, party, onlyCriminal, search, page, year]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [sortIdx, party, onlyCriminal, search, year]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            🗳️ Candidate Explorer
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Browse all {year} candidates — assets, criminal cases & more from MyNeta affidavits
          </p>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 rounded-xl p-4 mb-6 space-y-4">
          {/* Year toggle */}
          <div className="flex gap-2">
            {[2026, 2021, 2016].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  year === y
                    ? "bg-red-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Sort tabs */}
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setSortIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sortIdx === idx
                    ? "bg-yellow-500 text-gray-900"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>

          {/* Party filter */}
          <div className="flex flex-wrap gap-2">
            {PARTIES.map((p) => (
              <button
                key={p}
                onClick={() => setParty(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  party === p
                    ? "text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
                style={
                  party === p
                    ? { backgroundColor: partyColor(p === "All" ? "" : p) }
                    : {}
                }
              >
                {p}
              </button>
            ))}
          </div>

          {/* Search + criminal toggle */}
          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Search candidate name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearch(searchInput);
              }}
              className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-red-500"
            />
            <button
              onClick={() => setSearch(searchInput)}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg"
            >
              Search
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={onlyCriminal}
                onChange={(e) => setOnlyCriminal(e.target.checked)}
                className="accent-red-500"
              />
              ⚖️ With cases only
            </label>
          </div>
        </div>

        {/* Stats bar */}
        <div className="text-sm text-gray-400 mb-4">
          {loading ? "Loading..." : `${total.toLocaleString()} candidates found`}
          {party !== "All" && ` · Filtered: ${party}`}
          {onlyCriminal && " · With criminal cases"}
        </div>

        {/* Table */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Candidate</div>
            <div className="col-span-2">Constituency</div>
            <div className="col-span-2">Party</div>
            <div className="col-span-2 text-right">Net Worth</div>
            <div className="col-span-1 text-center">Cases</div>
            <div className="col-span-1 text-center">Affidavit</div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-500">
              <div className="animate-spin text-3xl mb-3">⏳</div>
              Loading candidates...
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              No candidates found. Try adjusting filters.
            </div>
          ) : (
            candidates.map((c, i) => (
              <div
                key={c.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors items-center"
              >
                {/* Rank */}
                <div className="col-span-1 text-gray-500 text-sm font-mono">
                  {page * PAGE_SIZE + i + 1}
                </div>

                {/* Name */}
                <div className="col-span-3">
                  <Link
                    href={`/candidate/${c.id}`}
                    className="text-white hover:text-yellow-400 font-medium text-sm transition-colors"
                  >
                    {c.name}
                  </Link>
                  {c.age && (
                    <div className="text-xs text-gray-500">{c.age} yrs · {c.education?.split(" ")[0] || "—"}</div>
                  )}
                </div>

                {/* Constituency */}
                <div className="col-span-2 text-sm text-gray-300">
                  {c.constituency?.[0] ? (
                    <>
                      <div className="truncate">{c.constituency[0].name}</div>
                      <div className="text-xs text-gray-500">{c.constituency[0].district}</div>
                    </>
                  ) : "—"}
                </div>

                {/* Party */}
                <div className="col-span-2">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: partyColor(c.party) }}
                  >
                    {partyShort(c.party)}
                  </span>
                </div>

                {/* Net worth */}
                <div className="col-span-2 text-right">
                  <div className="text-sm font-medium text-green-400">
                    {fmt(c.net_worth)}
                  </div>
                  {c.liabilities && c.liabilities > 0 && (
                    <div className="text-xs text-red-400">
                      -{fmt(c.liabilities)} debt
                    </div>
                  )}
                </div>

                {/* Criminal cases */}
                <div className="col-span-1 text-center">
                  {c.criminal_cases_declared && c.criminal_cases_declared > 0 ? (
                    <span className="inline-block bg-red-900/60 text-red-300 text-xs font-bold px-2 py-0.5 rounded-full">
                      {c.criminal_cases_declared}
                    </span>
                  ) : (
                    <span className="text-gray-600 text-xs">0</span>
                  )}
                </div>

                {/* Affidavit */}
                <div className="col-span-1 text-center">
                  {c.affidavit_url ? (
                    <a
                      href={c.affidavit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs"
                      title="View affidavit"
                    >
                      📄
                    </a>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {page + 1} of {totalPages} · {total.toLocaleString()} total
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
