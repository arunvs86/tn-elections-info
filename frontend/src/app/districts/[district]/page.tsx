"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// ── Types ──────────────────────────────────────────
interface ConstituencyWithResult {
  id: number;
  name: string;
  district: string;
  total_voters_2021: number | null;
  turnout_2021: number | null;
  is_swing_seat: boolean;
  // From election_results join
  winner_name: string | null;
  winner_party: string | null;
  winner_vote_share: number | null;
  margin: number | null;
  runner_up_party: string | null;
}

// ── Helpers ────────────────────────────────────────
function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function partyColor(party: string | null): string {
  if (!party) return "#888";
  const p = party.toUpperCase();
  if (p === "ADMK" || p.includes("AIADMK")) return "#2d7a4f";
  if (p.includes("DMK")) return "#c0392b";
  if (p.includes("TVK")) return "#1a5276";
  if (p.includes("BJP")) return "#d35400";
  if (p.includes("NTK")) return "#6c3483";
  if (p.includes("INC") || p.includes("CONGRESS")) return "#1565c0";
  if (p.includes("MNM")) return "#0e6655";
  if (p === "IND") return "#7f8c8d";
  return "#888";
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN");
}

// ── Page ───────────────────────────────────────────
export default function DistrictDetailPage() {
  const params = useParams();
  const slug = Array.isArray(params.district)
    ? params.district[0]
    : params.district;
  const districtName = slugToName(slug || "");

  const [constituencies, setConstituencies] = useState<
    ConstituencyWithResult[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!districtName) return;

    async function fetchData() {
      // Fetch constituencies for this district
      const { data: constData } = await supabase
        .from("constituencies")
        .select(
          "id, name, district, total_voters_2021, turnout_2021, is_swing_seat"
        )
        .ilike("district", districtName)
        .order("name");

      if (!constData || constData.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch 2021 election results for these constituencies
      const ids = constData.map((c) => c.id);
      const { data: results } = await supabase
        .from("election_results")
        .select(
          "constituency_id, winner_name, winner_party, winner_vote_share, margin, runner_up_party"
        )
        .eq("election_year", 2021)
        .in("constituency_id", ids);

      // Build a map of results by constituency_id
      const resultMap: Record<number, (typeof results)[0]> = {};
      if (results) {
        for (const r of results) {
          resultMap[r.constituency_id] = r;
        }
      }

      // Merge constituency + result data
      const merged: ConstituencyWithResult[] = constData.map((c) => {
        const r = resultMap[c.id];
        return {
          ...c,
          winner_name: r?.winner_name ?? null,
          winner_party: r?.winner_party ?? null,
          winner_vote_share: r?.winner_vote_share ?? null,
          margin: r?.margin ?? null,
          runner_up_party: r?.runner_up_party ?? null,
        };
      });

      setConstituencies(merged);
      setLoading(false);
    }

    fetchData();
  }, [districtName]);

  // Summary stats
  const totalVoters = constituencies.reduce(
    (sum, c) => sum + (c.total_voters_2021 || 0),
    0
  );
  const avgTurnout =
    constituencies.length > 0
      ? constituencies.reduce((sum, c) => sum + (c.turnout_2021 || 0), 0) /
        constituencies.length
      : 0;
  const swingSeats = constituencies.filter((c) => c.is_swing_seat).length;

  // Party seat count
  const partyCounts: Record<string, number> = {};
  for (const c of constituencies) {
    const party = c.winner_party || "Unknown";
    partyCounts[party] = (partyCounts[party] || 0) + 1;
  }
  const sortedParties = Object.entries(partyCounts).sort(
    ([, a], [, b]) => b - a
  );

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
          <Link
            href="/districts"
            className="text-sm text-gray-500 hover:text-terracotta transition-colors"
          >
            ← All Districts
          </Link>
        </div>
      </header>

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
          {" / "}
          <span className="text-gray-600 font-medium">{districtName}</span>
        </p>

        {/* District title */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">
            {districtName} District
          </h1>
          {!loading && constituencies.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {constituencies.length} constituencies · {fmt(totalVoters)}{" "}
              voters (2021) · {avgTurnout.toFixed(1)}% avg turnout
              {swingSeats > 0 && ` · ${swingSeats} swing seat(s)`}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 animate-pulse">Loading...</p>
          </div>
        ) : constituencies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-500">
              No constituencies found for &ldquo;{districtName}&rdquo;
            </p>
            <Link
              href="/districts"
              className="text-terracotta text-sm mt-2 inline-block hover:underline"
            >
              ← Back to districts map
            </Link>
          </div>
        ) : (
          <>
            {/* ── Party breakdown ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
              <h2 className="font-bold text-gray-900 text-sm mb-3">
                2021 Seat Breakdown
              </h2>
              {/* Stacked bar */}
              <div className="flex rounded-full overflow-hidden h-5 mb-3">
                {sortedParties.map(([party, count]) => (
                  <div
                    key={party}
                    className="h-full transition-all"
                    style={{
                      width: `${(count / constituencies.length) * 100}%`,
                      background: partyColor(party),
                    }}
                    title={`${party}: ${count} seat(s)`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {sortedParties.map(([party, count]) => (
                  <div key={party} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ background: partyColor(party) }}
                    />
                    <span className="text-xs text-gray-600">
                      {party}{" "}
                      <strong className="text-gray-900">{count}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Constituency cards ── */}
            <h2 className="font-bold text-gray-900 mb-3">
              Constituencies ({constituencies.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {constituencies.map((c) => {
                const color = partyColor(c.winner_party);
                return (
                  <Link
                    key={c.id}
                    href={`/constituency/${slugify(c.name)}`}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-gray-200 transition-all group relative"
                  >
                    {c.is_swing_seat && (
                      <span className="absolute top-3 right-3 text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">
                        Swing
                      </span>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: color }}
                      >
                        {(c.winner_party || "?").slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm group-hover:text-terracotta transition-colors truncate">
                          {c.name}
                        </p>
                        {c.winner_name && (
                          <p className="text-xs text-gray-500 truncate">
                            {c.winner_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                      {c.winner_party && (
                        <span>
                          Winner:{" "}
                          <strong style={{ color }}>{c.winner_party}</strong>
                        </span>
                      )}
                      {c.winner_vote_share != null && (
                        <span>
                          Vote share:{" "}
                          <strong className="text-gray-700">
                            {c.winner_vote_share.toFixed(1)}%
                          </strong>
                        </span>
                      )}
                      {c.margin != null && (
                        <span>
                          Margin:{" "}
                          <strong className="text-gray-700">
                            {fmt(c.margin)}
                          </strong>
                        </span>
                      )}
                      {c.turnout_2021 != null && (
                        <span>
                          Turnout:{" "}
                          <strong className="text-gray-700">
                            {c.turnout_2021.toFixed(1)}%
                          </strong>
                        </span>
                      )}
                    </div>

                    {c.runner_up_party && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <span>vs</span>
                        <span
                          className="font-medium"
                          style={{ color: partyColor(c.runner_up_party) }}
                        >
                          {c.runner_up_party}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}
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
