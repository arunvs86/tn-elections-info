"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// ── Types ──────────────────────────────────────────
interface DistrictStats {
  name: string;
  constituencyCount: number;
  dominantParty: string | null;
}

interface TooltipData {
  name: string;
  constituencyCount: number;
  dominantParty: string | null;
  x: number;
  y: number;
}

// ── Party colour helper (same as homepage) ─────────
function partyColor(party: string | null): string {
  if (!party) return "#888";
  const p = party.toUpperCase();
  if (p === "ADMK" || p.includes("AIADMK")) return "#2d7a4f";
  if (p.includes("DMK")) return "#c0392b";
  if (p.includes("TVK")) return "#1a5276";
  if (p.includes("BJP")) return "#d35400";
  if (p.includes("NTK")) return "#6c3483";
  if (p.includes("INC") || p.includes("CONGRESS")) return "#1565c0";
  return "#888";
}

// Fill colour: lighter version of party colour for the map
function districtFill(party: string | null, isHovered: boolean): string {
  if (!party) return isHovered ? "#e0ddd8" : "#ece9e3";
  const p = party.toUpperCase();
  if (p === "ADMK" || p.includes("AIADMK"))
    return isHovered ? "#2d7a4f" : "#b8dcc8";
  if (p.includes("DMK"))
    return isHovered ? "#c0392b" : "#f2c4c0";
  if (p.includes("TVK")) return isHovered ? "#1a5276" : "#b3cee0";
  if (p.includes("BJP")) return isHovered ? "#d35400" : "#f5cdb0";
  if (p.includes("NTK")) return isHovered ? "#6c3483" : "#d5c2e0";
  if (p.includes("INC") || p.includes("CONGRESS"))
    return isHovered ? "#1565c0" : "#b8d4f0";
  return isHovered ? "#c0b8a8" : "#ece9e3";
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

// ── TopoJSON URL ───────────────────────────────────
const TOPO_URL = "/maps/tamilnadu.json";

// ── District name mapping ──────────────────────────
// The TopoJSON uses slightly different spellings than our DB.
// This maps TopoJSON names → DB district names.
const TOPO_TO_DB: Record<string, string> = {
  // Spelling differences between TopoJSON and DB
  Thiruvallur: "Tiruvallur",
  Thoothukkudi: "Thoothukudi",
  Thiruvarur: "Tiruvarur",
  Tiruppur: "Tirupur",
  Kanyakumari: "Kanniyakumari",
  Viluppuram: "Villupuram",
  Kancheepuram: "Kanchipuram",
  // New districts (2019-2020) — now exist in DB after fix_districts.sql
  // Ranipet, Tirupathur, Chengalpattu, Kallakurichi, Tenkasi match DB exactly
  // Mayiladuthurai is not in TopoJSON (37 districts, not 38)
};

function topoNameToDbName(topoName: string): string {
  return TOPO_TO_DB[topoName] || topoName;
}

// ── Main Page ──────────────────────────────────────
export default function DistrictsPage() {
  const [districtStats, setDistrictStats] = useState<
    Record<string, DistrictStats>
  >({});
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch district stats from Supabase
  useEffect(() => {
    async function fetchStats() {
      // Get constituencies with their 2021 election results
      const { data: constituencies } = await supabase
        .from("constituencies")
        .select("id, district");

      const { data: results } = await supabase
        .from("election_results")
        .select("constituency_id, winner_party")
        .eq("election_year", 2021);

      if (!constituencies) {
        setLoading(false);
        return;
      }

      // Build a map: constituency_id → winner_party
      const partyByConstituency: Record<number, string> = {};
      if (results) {
        for (const r of results) {
          partyByConstituency[r.constituency_id] = r.winner_party;
        }
      }

      // Group by district
      const grouped: Record<
        string,
        { count: number; parties: Record<string, number> }
      > = {};

      for (const c of constituencies) {
        const d = c.district;
        if (!grouped[d]) grouped[d] = { count: 0, parties: {} };
        grouped[d].count++;
        const party = partyByConstituency[c.id] || "Unknown";
        grouped[d].parties[party] = (grouped[d].parties[party] || 0) + 1;
      }

      // Find dominant party per district
      const stats: Record<string, DistrictStats> = {};
      for (const [name, data] of Object.entries(grouped)) {
        let dominantParty: string | null = null;
        let maxSeats = 0;
        for (const [party, count] of Object.entries(data.parties)) {
          if (party === "Unknown") continue;
          if (count > maxSeats) {
            maxSeats = count;
            dominantParty = party;
          }
        }
        stats[name] = {
          name,
          constituencyCount: data.count,
          dominantParty,
        };
      }

      setDistrictStats(stats);
      setLoading(false);
    }

    fetchStats();
  }, []);

  // Look up stats by TopoJSON district name
  const getStats = useCallback(
    (topoName: string): DistrictStats => {
      // Try exact match first, then mapped name
      const dbName = topoNameToDbName(topoName);
      return (
        districtStats[topoName] ||
        districtStats[dbName] || {
          name: topoName,
          constituencyCount: 0,
          dominantParty: null,
        }
      );
    },
    [districtStats]
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
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link
              href="/districts"
              className="text-terracotta font-semibold"
            >
              Districts
            </Link>
            <Link
              href="/fact-check"
              className="hover:text-terracotta transition-colors"
            >
              Narrative Check
            </Link>
            <Link
              href="/manifestos"
              className="hover:text-terracotta transition-colors"
            >
              Manifestos
            </Link>
            <Link
              href="/polls"
              className="hover:text-terracotta transition-colors"
            >
              Polls
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
          <span className="text-gray-600 font-medium">Districts</span>
        </p>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          Tamil Nadu Districts
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Click any district to see its constituencies and election history
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-400 animate-pulse">
              Loading district data...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Map column ── */}
            <div className="lg:col-span-2 relative">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 relative">
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{
                    scale: 3600,
                    center: [78.4, 10.6],
                  }}
                  width={400}
                  height={560}
                  style={{ width: "100%", height: "auto" }}
                >
                  <ZoomableGroup>
                    <Geographies geography={TOPO_URL}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const districtName =
                            geo.properties.district || "Unknown";
                          const stats = getStats(districtName);
                          const isHovered =
                            tooltip?.name === districtName;

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              fill={districtFill(
                                stats.dominantParty,
                                isHovered
                              )}
                              stroke="#fff"
                              strokeWidth={0.8}
                              style={{
                                default: { outline: "none" },
                                hover: {
                                  outline: "none",
                                  cursor: "pointer",
                                },
                                pressed: { outline: "none" },
                              }}
                              onMouseEnter={(evt) => {
                                setTooltip({
                                  name: districtName,
                                  constituencyCount:
                                    stats.constituencyCount,
                                  dominantParty: stats.dominantParty,
                                  x: evt.clientX,
                                  y: evt.clientY,
                                });
                              }}
                              onMouseMove={(evt) => {
                                setTooltip((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        x: evt.clientX,
                                        y: evt.clientY,
                                      }
                                    : null
                                );
                              }}
                              onMouseLeave={() => setTooltip(null)}
                              onClick={() => {
                                window.location.href = `/districts/${slugify(districtName)}`;
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                  </ZoomableGroup>
                </ComposableMap>

                {/* Tooltip */}
                {tooltip && (
                  <div
                    className="fixed z-50 pointer-events-none bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm"
                    style={{
                      left: tooltip.x + 12,
                      top: tooltip.y - 10,
                    }}
                  >
                    <p className="font-semibold">{tooltip.name}</p>
                    <p className="text-gray-300 text-xs">
                      {tooltip.constituencyCount} constituencies
                    </p>
                    {tooltip.dominantParty && (
                      <p className="text-xs mt-0.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1"
                          style={{
                            background: partyColor(
                              tooltip.dominantParty
                            ),
                          }}
                        />
                        {tooltip.dominantParty} dominant
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Sidebar: district list ── */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h2 className="font-bold text-gray-900 mb-3">
                  All Districts ({Object.keys(districtStats).length})
                </h2>
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {Object.values(districtStats)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((d) => (
                      <Link
                        key={d.name}
                        href={`/districts/${slugify(d.name)}`}
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              background: partyColor(d.dominantParty),
                            }}
                          />
                          <span className="text-sm font-medium text-gray-800 group-hover:text-terracotta transition-colors">
                            {d.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {d.constituencyCount} seats
                        </span>
                      </Link>
                    ))}
                </div>
              </div>

              {/* Swing Seats link */}
              <Link
                href="/swing-seats"
                className="block bg-red-50 rounded-2xl border border-red-200 shadow-sm p-4 mt-4 hover:shadow-md transition-all group"
              >
                <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-terracotta transition-colors">
                  Swing Seat Detector
                </h3>
                <p className="text-xs text-gray-500">
                  39 seats won by &lt;5,000 votes in 2021. See which seats could flip in 2026.
                </p>
                <span className="text-xs text-terracotta font-semibold mt-2 inline-block">
                  View all swing seats →
                </span>
              </Link>

              {/* Legend */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mt-4">
                <h3 className="font-bold text-gray-900 text-sm mb-3">
                  Party Legend (2021 Dominant)
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "DMK", color: "#c0392b" },
                    { name: "AIADMK", color: "#2d7a4f" },
                    { name: "BJP", color: "#d35400" },
                    { name: "INC", color: "#1565c0" },
                    { name: "TVK", color: "#1a5276" },
                    { name: "Others", color: "#888" },
                  ].map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ background: p.color }}
                      />
                      <span className="text-gray-600">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
