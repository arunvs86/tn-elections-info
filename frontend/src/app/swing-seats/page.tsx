"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────
interface SwingSeat {
  constituency_id: number;
  constituency_name: string;
  district: string;
  winner_name: string;
  winner_party: string;
  winner_vote_share: number;
  runner_up_name: string;
  runner_up_party: string;
  margin: number;
  total_votes: number;
  turnout: number;
}

type DangerLevel = "red" | "yellow" | "green";

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
  if (p === "IND") return "#7f8c8d";
  return "#888";
}

function dangerLevel(margin: number): DangerLevel {
  if (margin < 5000) return "red";
  if (margin < 15000) return "yellow";
  return "green";
}

function dangerConfig(level: DangerLevel) {
  if (level === "red")
    return { label: "High Risk", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "#c0392b" };
  if (level === "yellow")
    return { label: "Competitive", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", dot: "#b8860b" };
  return { label: "Safe", bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "#2d7a4f" };
}

function fmt(n: number): string {
  return n.toLocaleString("en-IN");
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

// ── Page ───────────────────────────────────────────────
export default function SwingSeatsPage() {
  const [seats, setSeats] = useState<SwingSeat[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [districtFilter, setDistrictFilter] = useState("all");
  const [partyFilter, setPartyFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState<"all" | DangerLevel>("all");

  useEffect(() => {
    async function fetchData() {
      // Fetch election results with constituency info
      const { data: results } = await supabase
        .from("election_results")
        .select(
          "constituency_id, winner_name, winner_party, winner_vote_share, runner_up_name, runner_up_party, margin, total_votes, turnout"
        )
        .eq("election_year", 2021)
        .order("margin", { ascending: true });

      const { data: constituencies } = await supabase
        .from("constituencies")
        .select("id, name, district");

      if (!results || !constituencies) {
        setLoading(false);
        return;
      }

      // Build constituency lookup
      const constMap: Record<number, { name: string; district: string }> = {};
      for (const c of constituencies) {
        constMap[c.id] = { name: c.name, district: c.district };
      }

      // Merge
      const merged: SwingSeat[] = results
        .filter((r) => constMap[r.constituency_id])
        .map((r) => ({
          ...r,
          constituency_name: constMap[r.constituency_id].name,
          district: constMap[r.constituency_id].district,
        }));

      setSeats(merged);
      setLoading(false);
    }

    fetchData();
  }, []);

  // Unique districts and parties for filter dropdowns
  const districts = useMemo(
    () => [...new Set(seats.map((s) => s.district))].sort(),
    [seats]
  );
  const parties = useMemo(
    () => [...new Set(seats.map((s) => s.winner_party))].sort(),
    [seats]
  );

  // Apply filters
  const filtered = useMemo(() => {
    return seats.filter((s) => {
      if (districtFilter !== "all" && s.district !== districtFilter)
        return false;
      if (
        partyFilter !== "all" &&
        s.winner_party !== partyFilter &&
        s.runner_up_party !== partyFilter
      )
        return false;
      if (levelFilter !== "all" && dangerLevel(s.margin) !== levelFilter)
        return false;
      return true;
    });
  }, [seats, districtFilter, partyFilter, levelFilter]);

  // Summary counts
  const redCount = filtered.filter((s) => dangerLevel(s.margin) === "red").length;
  const yellowCount = filtered.filter((s) => dangerLevel(s.margin) === "yellow").length;
  const greenCount = filtered.filter((s) => dangerLevel(s.margin) === "green").length;

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
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link
              href="/districts"
              className="hover:text-terracotta transition-colors"
            >
              Districts
            </Link>
            <Link
              href="/swing-seats"
              className="text-terracotta font-semibold"
            >
              Swing Seats
            </Link>
          </nav>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-terracotta transition-colors"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 mb-2">
          <Link href="/" className="hover:text-terracotta">
            Home
          </Link>
          {" / "}
          <span className="text-gray-600 font-medium">Swing Seats</span>
        </p>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          Swing Seat Detector
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Constituencies ranked by 2021 victory margin. Smaller margin = higher
          chance of flipping in 2026.
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 animate-pulse">
              Loading swing seat data...
            </p>
          </div>
        ) : (
          <>
            {/* ── Summary bar ── */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <button
                onClick={() =>
                  setLevelFilter(levelFilter === "red" ? "all" : "red")
                }
                className={`rounded-2xl border p-4 text-center transition-all ${
                  levelFilter === "red"
                    ? "bg-red-50 border-red-300 ring-2 ring-red-200"
                    : "bg-white border-gray-100 hover:border-red-200"
                }`}
              >
                <p className="text-2xl font-bold text-red-600">{redCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  High Risk (&lt;5k)
                </p>
              </button>
              <button
                onClick={() =>
                  setLevelFilter(levelFilter === "yellow" ? "all" : "yellow")
                }
                className={`rounded-2xl border p-4 text-center transition-all ${
                  levelFilter === "yellow"
                    ? "bg-yellow-50 border-yellow-300 ring-2 ring-yellow-200"
                    : "bg-white border-gray-100 hover:border-yellow-200"
                }`}
              >
                <p className="text-2xl font-bold text-yellow-600">
                  {yellowCount}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Competitive (5-15k)
                </p>
              </button>
              <button
                onClick={() =>
                  setLevelFilter(levelFilter === "green" ? "all" : "green")
                }
                className={`rounded-2xl border p-4 text-center transition-all ${
                  levelFilter === "green"
                    ? "bg-green-50 border-green-300 ring-2 ring-green-200"
                    : "bg-white border-gray-100 hover:border-green-200"
                }`}
              >
                <p className="text-2xl font-bold text-green-600">
                  {greenCount}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Safe (&gt;15k)
                </p>
              </button>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap gap-3 mb-6">
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-terracotta"
              >
                <option value="all">All Districts</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={partyFilter}
                onChange={(e) => setPartyFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-terracotta"
              >
                <option value="all">All Parties</option>
                {parties.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {(districtFilter !== "all" ||
                partyFilter !== "all" ||
                levelFilter !== "all") && (
                <button
                  onClick={() => {
                    setDistrictFilter("all");
                    setPartyFilter("all");
                    setLevelFilter("all");
                  }}
                  className="text-sm text-terracotta hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* ── Results count ── */}
            <p className="text-xs text-gray-400 mb-3">
              Showing {filtered.length} of {seats.length} constituencies
            </p>

            {/* ── Seat list ── */}
            <div className="space-y-2">
              {filtered.map((s, i) => {
                const level = dangerLevel(s.margin);
                const config = dangerConfig(level);
                const winColor = partyColor(s.winner_party);
                const runColor = partyColor(s.runner_up_party);
                // Margin as % of total votes
                const marginPct =
                  s.total_votes > 0
                    ? ((s.margin / s.total_votes) * 100).toFixed(1)
                    : "—";

                return (
                  <Link
                    key={s.constituency_id}
                    href={`/constituency/${slugify(s.constituency_name)}`}
                    className={`block rounded-2xl border p-4 transition-all hover:shadow-md group ${config.bg} ${config.border}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: rank + constituency info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-mono text-gray-400 w-8 text-right flex-shrink-0">
                          #{i + 1}
                        </span>
                        <div
                          className="w-2 h-8 rounded-full flex-shrink-0"
                          style={{ background: config.dot }}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm group-hover:text-terracotta transition-colors truncate">
                            {s.constituency_name}
                          </p>
                          <p className="text-xs text-gray-400">{s.district}</p>
                        </div>
                      </div>

                      {/* Center: party matchup */}
                      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: winColor }}
                        >
                          {s.winner_party}
                        </span>
                        <span className="text-xs text-gray-400">vs</span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: runColor }}
                        >
                          {s.runner_up_party}
                        </span>
                      </div>

                      {/* Right: margin */}
                      <div className="text-right flex-shrink-0">
                        <p
                          className="text-sm font-bold"
                          style={{ color: config.dot }}
                        >
                          {fmt(s.margin)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {marginPct}% margin
                        </p>
                      </div>
                    </div>

                    {/* Mobile: party matchup below */}
                    <div className="flex sm:hidden items-center gap-2 mt-2 ml-14">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: winColor }}
                      >
                        {s.winner_party}
                      </span>
                      <span className="text-xs text-gray-400">beat</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: runColor }}
                      >
                        {s.runner_up_party}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <p className="text-gray-500">
                  No constituencies match the current filters.
                </p>
                <button
                  onClick={() => {
                    setDistrictFilter("all");
                    setPartyFilter("all");
                    setLevelFilter("all");
                  }}
                  className="text-terracotta text-sm mt-2 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>
            Data from Election Commission of India · Tamil Nadu Elections 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
