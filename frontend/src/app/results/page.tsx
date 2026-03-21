"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/components/LanguageProvider";
import Header from "@/components/Header";
import Link from "next/link";

// ── Types ─────────────────────────────────────────
interface LiveResult {
  id: number;
  constituency_id: number;
  candidate_name: string;
  party: string;
  votes_received: number;
  vote_share: number;
  position: number;
  rounds_counted: number;
  total_rounds: number | null;
  status: string;
  margin: number | null;
  updated_at: string;
}

interface PartyTally {
  party: string;
  alliance: string | null;
  seats_won: number;
  seats_leading: number;
  seats_trailing: number;
  total_votes: number;
  vote_share_pct: number;
}

interface CountingStatus {
  election_date: string;
  counting_date: string;
  total_constituencies: number;
  declared: number;
  counting_in_progress: number;
  not_started: number;
  last_scrape_at: string | null;
  status: string;
}

interface Constituency {
  id: number;
  name: string;
  district: string;
}

// ── Party colors ──────────────────────────────────
const PARTY_COLORS: Record<string, string> = {
  DMK: "#e30613",
  AIADMK: "#00a651",
  BJP: "#ff9933",
  INC: "#19aaed",
  PMK: "#ffcc00",
  DMDK: "#ff6600",
  TVK: "#4b0082",
  NTK: "#dc143c",
  MNM: "#1a1a2e",
  CPI: "#cc0000",
  "CPI(M)": "#cc0000",
  IND: "#888888",
};

function getPartyColor(party: string): string {
  return PARTY_COLORS[party] || "#666666";
}

// ── Alliance grouping ─────────────────────────────
const ALLIANCE_MAP: Record<string, string> = {
  DMK: "DMK+ (INDIA)",
  INC: "DMK+ (INDIA)",
  CPI: "DMK+ (INDIA)",
  "CPI(M)": "DMK+ (INDIA)",
  MDMK: "DMK+ (INDIA)",
  VCK: "DMK+ (INDIA)",
  AIADMK: "ADMK+ (NDA)",
  BJP: "ADMK+ (NDA)",
  PMK: "ADMK+ (NDA)",
  DMDK: "ADMK+ (NDA)",
  NTK: "NTK",
  TVK: "TVK",
  MNM: "MNM",
};

export default function ResultsPage() {
  const { t } = useLang();
  const [tally, setTally] = useState<PartyTally[]>([]);
  const [countingStatus, setCountingStatus] = useState<CountingStatus | null>(null);
  const [results, setResults] = useState<LiveResult[]>([]);
  const [constituencies, setConstituencies] = useState<Record<number, Constituency>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterParty, setFilterParty] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);

  // ── Fetch data ──────────────────────────────────
  const fetchData = useCallback(async () => {
    // Fetch counting status
    const { data: statusData } = await supabase
      .from("counting_status")
      .select("*")
      .order("id", { ascending: false })
      .limit(1);

    if (statusData && statusData.length > 0) {
      setCountingStatus(statusData[0]);
      setIsLive(statusData[0].status === "in_progress");
    }

    // Fetch party tally
    const { data: tallyData } = await supabase
      .from("live_tally")
      .select("*")
      .order("seats_won", { ascending: false });

    if (tallyData) setTally(tallyData);

    // Fetch live results (position 1 = leading candidate per constituency)
    const { data: resultsData } = await supabase
      .from("live_results")
      .select("*")
      .eq("position", 1)
      .order("constituency_id");

    if (resultsData) setResults(resultsData);

    // Fetch constituencies for name lookup
    const { data: constData } = await supabase
      .from("constituencies")
      .select("id, name, district");

    if (constData) {
      const map: Record<number, Constituency> = {};
      constData.forEach((c) => (map[c.id] = c));
      setConstituencies(map);
    }

    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds if counting is live
    const interval = setInterval(() => {
      if (isLive) fetchData();
    }, 30000);

    // Subscribe to Supabase Realtime for instant updates
    const channel = supabase
      .channel("live-results")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_results" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_tally" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "counting_status" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchData, isLive]);

  // ── Filter results ──────────────────────────────
  const filteredResults = results.filter((r) => {
    const constName = constituencies[r.constituency_id]?.name || "";
    const matchesSearch =
      !searchQuery ||
      constName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.candidate_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesParty = filterParty === "all" || r.party === filterParty;
    return matchesSearch && matchesParty;
  });

  // ── Unique parties for filter ───────────────────
  const uniqueParties = Array.from(new Set(results.map((r) => r.party))).sort();

  // ── Alliance tally (group parties) ──────────────
  const allianceTally = tally.reduce(
    (acc, t) => {
      const alliance = ALLIANCE_MAP[t.party] || "Others";
      if (!acc[alliance]) acc[alliance] = { won: 0, leading: 0, total: 0 };
      acc[alliance].won += t.seats_won;
      acc[alliance].leading += t.seats_leading;
      acc[alliance].total += t.seats_won + t.seats_leading;
      return acc;
    },
    {} as Record<string, { won: number; leading: number; total: number }>
  );

  const majorityMark = 118; // 234/2 + 1

  return (
    <div className="min-h-screen bg-cream">
      <Header active="home" />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* ── Live Banner ────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              {isLive && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
              Tamil Nadu Election Results 2026
            </h1>
            <p className="text-gray-500 mt-1">
              {countingStatus
                ? countingStatus.status === "completed"
                  ? "Final Results"
                  : countingStatus.status === "in_progress"
                    ? `Live — ${countingStatus.declared} declared, ${countingStatus.counting_in_progress} counting`
                    : "Counting not yet started"
                : "Awaiting results..."}
            </p>
          </div>
          {lastUpdated && (
            <div className="text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
              {isLive && " (auto-refreshing)"}
            </div>
          )}
        </div>

        {/* ── Majority Indicator Bar ─────────────── */}
        {tally.length > 0 && (
          <div className="card p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Majority: {majorityMark} seats</span>
              <span className="text-sm text-gray-400">Total: 234 seats</span>
            </div>

            {/* Stacked bar */}
            <div className="h-10 rounded-lg overflow-hidden flex bg-gray-100 mb-4">
              {Object.entries(allianceTally)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([alliance, data]) => {
                  const pct = (data.total / 234) * 100;
                  if (pct < 0.5) return null;
                  const color =
                    alliance.includes("DMK") ? "#e30613" :
                    alliance.includes("ADMK") ? "#00a651" :
                    alliance === "NTK" ? "#dc143c" :
                    alliance === "TVK" ? "#4b0082" :
                    alliance === "MNM" ? "#1a1a2e" :
                    "#888";
                  return (
                    <div
                      key={alliance}
                      className="h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                      title={`${alliance}: ${data.total}`}
                    >
                      {pct > 5 && data.total}
                    </div>
                  );
                })}
            </div>

            {/* Majority line */}
            <div className="relative h-0">
              <div
                className="absolute -top-14 border-l-2 border-dashed border-gray-800 h-10"
                style={{ left: `${(majorityMark / 234) * 100}%` }}
              />
              <div
                className="absolute -top-16 text-[10px] font-bold text-gray-700 -translate-x-1/2"
                style={{ left: `${(majorityMark / 234) * 100}%` }}
              >
                {majorityMark}
              </div>
            </div>

            {/* Alliance legend */}
            <div className="flex flex-wrap gap-4 mt-2">
              {Object.entries(allianceTally)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([alliance, data]) => (
                  <div key={alliance} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          alliance.includes("DMK") ? "#e30613" :
                          alliance.includes("ADMK") ? "#00a651" :
                          alliance === "NTK" ? "#dc143c" :
                          alliance === "TVK" ? "#4b0082" :
                          "#888",
                      }}
                    />
                    <span className="text-sm font-medium">{alliance}</span>
                    <span className="text-sm text-gray-500">
                      {data.won > 0 && `${data.won} won`}
                      {data.won > 0 && data.leading > 0 && ", "}
                      {data.leading > 0 && `${data.leading} leading`}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Party-wise Tally Table ─────────────── */}
        {tally.length > 0 && (
          <div className="card p-5 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Party-wise Tally</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Party</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Won</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Leading</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Trailing</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">Total</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium">Vote %</th>
                  </tr>
                </thead>
                <tbody>
                  {tally.map((t) => (
                    <tr key={t.party} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getPartyColor(t.party) }}
                        />
                        <span className="font-medium">{t.party}</span>
                        {t.alliance && (
                          <span className="text-xs text-gray-400">({t.alliance})</span>
                        )}
                      </td>
                      <td className="text-center py-2 px-3 font-bold text-green-700">
                        {t.seats_won || "-"}
                      </td>
                      <td className="text-center py-2 px-3 text-blue-600">
                        {t.seats_leading || "-"}
                      </td>
                      <td className="text-center py-2 px-3 text-red-500">
                        {t.seats_trailing || "-"}
                      </td>
                      <td className="text-center py-2 px-3 font-bold">
                        {t.seats_won + t.seats_leading}
                      </td>
                      <td className="text-right py-2 px-3 text-gray-600">
                        {t.vote_share_pct ? `${t.vote_share_pct.toFixed(1)}%` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Constituency-wise Results ───────────── */}
        <div className="card p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-gray-800">Constituency-wise Results</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search constituency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 sm:w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta/30"
              />
              <select
                value={filterParty}
                onChange={(e) => setFilterParty(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta/30"
              >
                <option value="all">All Parties</option>
                {uniqueParties.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results grid */}
          {filteredResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredResults.map((r) => {
                const constInfo = constituencies[r.constituency_id];
                return (
                  <Link
                    href={`/constituency/${r.constituency_id}`}
                    key={r.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-sm text-gray-800">
                          {constInfo?.name || `Constituency ${r.constituency_id}`}
                        </h3>
                        <p className="text-xs text-gray-400">{constInfo?.district}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.status === "declared"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {r.status === "declared" ? "Declared" : `Round ${r.rounds_counted}/${r.total_rounds || "?"}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: getPartyColor(r.party) }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{r.candidate_name}</span>
                          <span className="font-bold text-sm">
                            {r.votes_received.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{r.party}</span>
                          {r.margin && r.margin > 0 && (
                            <span className="text-green-600 font-medium">
                              +{r.margin.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">🗳️</div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Results will appear here on counting day
              </h3>
              <p className="text-sm max-w-md mx-auto">
                Live results will auto-update every 30 seconds with data from the Election Commission.
                Constituency-wise leads, margins, and round-by-round counting — all in real time.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
