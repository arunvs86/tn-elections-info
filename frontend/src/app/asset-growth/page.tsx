"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Link from "next/link";

interface GrowthRecord {
  id_2021: number;
  name: string;
  constituency: string;
  district: string;
  party_2016: string;
  party_2021: string;
  party_changed: boolean;
  nw_2016: number;
  nw_2021: number;
  growth_pct: number;
  growth_abs: number;
  suspicious: boolean;
  criminal_2021: number;
}

interface DistrictStat {
  district: string;
  count: number;
  avg_growth: number;
  suspicious_count: number;
  max_growth: number;
}

const PARTY_COLOR: Record<string, string> = {
  DMK: "bg-red-100 text-red-700",
  ADMK: "bg-green-100 text-green-700",
  AIADMK: "bg-green-100 text-green-700",
  BJP: "bg-orange-100 text-orange-700",
  INC: "bg-blue-100 text-blue-700",
  PMK: "bg-yellow-100 text-yellow-700",
  IND: "bg-gray-100 text-gray-600",
};

function partyBadge(party: string) {
  return PARTY_COLOR[party] || "bg-gray-100 text-gray-600";
}

function fmtCr(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function growthColor(pct: number) {
  if (pct >= 500) return "text-red-600 font-bold";
  if (pct >= 200) return "text-orange-600 font-semibold";
  if (pct >= 100) return "text-yellow-700 font-semibold";
  if (pct >= 50) return "text-blue-600";
  return "text-gray-600";
}

function heatColor(pct: number) {
  if (pct >= 500) return "bg-red-600";
  if (pct >= 300) return "bg-red-400";
  if (pct >= 200) return "bg-orange-400";
  if (pct >= 100) return "bg-yellow-400";
  if (pct >= 50) return "bg-yellow-200";
  return "bg-green-200";
}

type Tab = "heatmap" | "leaderboard" | "hoppers";
type SortKey = "growth_pct" | "growth_abs" | "nw_2021";

export default function AssetGrowthPage() {
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [sort, setSort] = useState<SortKey>("growth_pct");
  const [search, setSearch] = useState("");
  const [partyFilter, setPartyFilter] = useState("all");

  useEffect(() => {
    async function load() {
      // Fetch 2016 candidates
      const { data: c16 } = await supabase
        .from("candidates")
        .select("name, constituency_id, party, net_worth, criminal_cases_declared")
        .eq("election_year", 2016)
        .not("net_worth", "is", null)
        .gt("net_worth", 0);

      // Fetch 2021 candidates
      const { data: c21 } = await supabase
        .from("candidates")
        .select("id, name, constituency_id, party, net_worth, criminal_cases_declared, constituencies(name, district)")
        .eq("election_year", 2021)
        .not("net_worth", "is", null)
        .gt("net_worth", 0);

      if (!c16 || !c21) { setLoading(false); return; }

      // Build 2016 lookup: name + constituency_id → record
      const map16 = new Map<string, typeof c16[0]>();
      for (const r of c16) {
        const key = `${r.name.trim().toLowerCase()}|${r.constituency_id}`;
        map16.set(key, r);
      }

      const results: GrowthRecord[] = [];
      for (const r of c21) {
        const key = `${r.name.trim().toLowerCase()}|${r.constituency_id}`;
        const old = map16.get(key);
        if (!old) continue;

        const nw16 = old.net_worth as number;
        const nw21 = r.net_worth as number;
        if (nw16 <= 0 || nw21 <= 0) continue;

        const growth_pct = ((nw21 - nw16) / nw16) * 100;
        const growth_abs = nw21 - nw16;
        const c = r.constituencies as any;

        results.push({
          id_2021: r.id,
          name: r.name,
          constituency: c?.name || "",
          district: c?.district || "",
          party_2016: old.party,
          party_2021: r.party,
          party_changed: old.party !== r.party,
          nw_2016: nw16,
          nw_2021: nw21,
          growth_pct: Math.round(growth_pct * 10) / 10,
          growth_abs,
          suspicious: growth_pct > 500,
          criminal_2021: r.criminal_cases_declared || 0,
        });
      }

      setRecords(results);
      setLoading(false);
    }
    load();
  }, []);

  const districtStats = useMemo<DistrictStat[]>(() => {
    const map = new Map<string, GrowthRecord[]>();
    for (const r of records) {
      if (!map.has(r.district)) map.set(r.district, []);
      map.get(r.district)!.push(r);
    }
    return Array.from(map.entries())
      .map(([district, recs]) => ({
        district,
        count: recs.length,
        avg_growth: Math.round(recs.reduce((s, r) => s + r.growth_pct, 0) / recs.length),
        suspicious_count: recs.filter((r) => r.suspicious).length,
        max_growth: Math.round(Math.max(...recs.map((r) => r.growth_pct))),
      }))
      .sort((a, b) => b.avg_growth - a.avg_growth);
  }, [records]);

  const hoppers = useMemo(
    () => records.filter((r) => r.party_changed),
    [records]
  );

  const filtered = useMemo(() => {
    let base = [...records];
    if (partyFilter !== "all")
      base = base.filter((r) => r.party_2021 === partyFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.constituency.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q)
      );
    }
    base.sort((a, b) => b[sort] - a[sort]);
    return base;
  }, [records, sort, partyFilter, search]);

  const suspiciousCount = records.filter((r) => r.suspicious).length;
  const avgGrowth =
    records.length > 0
      ? Math.round(records.reduce((s, r) => s + r.growth_pct, 0) / records.length)
      : 0;

  const parties = useMemo(
    () => ["all", ...Array.from(new Set(records.map((r) => r.party_2021))).sort()],
    [records]
  );

  return (
    <div className="min-h-screen bg-white">
      <Header active="asset-growth" />

      {/* Hero */}
      <div className="bg-gray-950 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
          <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">
            2016 → 2021 · Declared Affidavit Data
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
            Who got richer in office?
          </h1>
          <p className="text-gray-300 text-sm sm:text-base max-w-2xl leading-relaxed">
            Comparing declared net worth of candidates who contested in both
            2016 and 2021. All figures from Election Commission affidavits.
          </p>

          {!loading && records.length > 0 && (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold">{records.length}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Candidates matched across both elections
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-red-400">
                  {suspiciousCount}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  With &gt;500% wealth growth
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-yellow-400">
                  {avgGrowth}%
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Average wealth growth
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-orange-400">
                  {hoppers.length}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Party hoppers
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 flex gap-6 text-sm font-medium">
          {(
            [
              { key: "leaderboard", label: "Wealth Growth Leaderboard" },
              { key: "heatmap", label: "District Heatmap" },
              { key: "hoppers", label: `Party Hoppers (${hoppers.length})` },
            ] as { key: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 border-b-2 transition-colors ${
                tab === t.key
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Loading affidavit data...
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-sm mb-2">No cross-year data found.</p>
            <p className="text-gray-400 text-xs">
              Run <code className="bg-gray-100 px-1 rounded">migration_012</code> in
              Supabase SQL Editor to enable this feature.
            </p>
          </div>
        ) : (
          <>
            {/* LEADERBOARD TAB */}
            {tab === "leaderboard" && (
              <div>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="flex gap-2 text-xs font-medium flex-wrap">
                    {(
                      [
                        { key: "growth_pct", label: "% Growth" },
                        { key: "growth_abs", label: "Absolute ₹ gain" },
                        { key: "nw_2021", label: "Total wealth 2021" },
                      ] as { key: SortKey; label: string }[]
                    ).map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setSort(s.key)}
                        className={`px-3 py-1.5 rounded-lg border transition-all ${
                          sort === s.key
                            ? "bg-gray-950 text-white border-gray-950"
                            : "border-gray-200 text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 sm:ml-auto flex-wrap">
                    <select
                      value={partyFilter}
                      onChange={(e) => setPartyFilter(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                    >
                      {parties.map((p) => (
                        <option key={p} value={p}>
                          {p === "all" ? "All parties" : p}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-40 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {filtered.slice(0, 100).map((r, i) => (
                    <LeaderboardRow key={r.id_2021} rank={i + 1} data={r} />
                  ))}
                  {filtered.length > 100 && (
                    <p className="text-xs text-gray-400 text-center pt-3">
                      Showing top 100 of {filtered.length} matched candidates
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* HEATMAP TAB */}
            {tab === "heatmap" && (
              <div>
                <p className="text-sm text-gray-500 mb-6">
                  Average wealth growth of candidates who ran in both 2016 and
                  2021, grouped by district.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {districtStats.map((d) => (
                    <DistrictCard key={d.district} data={d} />
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">Growth scale:</span>
                  {[
                    { color: "bg-green-200", label: "< 50%" },
                    { color: "bg-yellow-200", label: "50–100%" },
                    { color: "bg-yellow-400", label: "100–200%" },
                    { color: "bg-orange-400", label: "200–300%" },
                    { color: "bg-red-400", label: "300–500%" },
                    { color: "bg-red-600", label: "> 500%" },
                  ].map((l) => (
                    <span key={l.label} className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded-sm ${l.color}`} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* PARTY HOPPERS TAB */}
            {tab === "hoppers" && (
              <div>
                <p className="text-sm text-gray-500 mb-6">
                  Candidates who contested under a different party in 2016 vs
                  2021. Based on affidavit data.
                </p>
                {hoppers.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-10">
                    No party hoppers found in matched data.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {hoppers
                      .sort((a, b) => b.growth_pct - a.growth_pct)
                      .map((r) => (
                        <HopperRow key={r.id_2021} data={r} />
                      ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Disclaimer */}
        <div className="mt-12 border-t border-gray-100 pt-6 text-xs text-gray-400 leading-relaxed max-w-2xl">
          <strong className="text-gray-500">Source & methodology:</strong>{" "}
          Declared net worth from Election Commission affidavits (MyNeta.info).
          Candidates are matched by name and constituency across 2016 and 2021
          elections. Growth percentages are based on self-declared figures and
          do not imply wrongdoing. Discrepancies may exist due to name spelling
          variations.
        </div>
      </div>
    </div>
  );
}

function LeaderboardRow({ rank, data: r }: { rank: number; data: GrowthRecord }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-gray-100 rounded-xl hover:border-gray-300 transition-colors">
      <span className="text-xs text-gray-400 w-7 text-right font-mono flex-shrink-0">
        {rank}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            href={`/candidate/${r.id_2021}`}
            className="font-medium text-gray-900 text-sm hover:underline"
          >
            {r.name}
          </Link>
          {r.suspicious && (
            <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-medium">
              ⚠ &gt;500%
            </span>
          )}
          {r.party_changed && (
            <span className="text-xs bg-purple-50 text-purple-600 border border-purple-200 px-1.5 py-0.5 rounded">
              Party hopper
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {r.constituency}, {r.district} ·{" "}
          <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${partyBadge(r.party_2021)}`}>
            {r.party_2021}
          </span>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <div className={`text-sm ${growthColor(r.growth_pct)}`}>
          +{r.growth_pct.toFixed(0)}%
        </div>
        <div className="text-xs text-gray-400">
          {fmtCr(r.nw_2016)} → {fmtCr(r.nw_2021)}
        </div>
      </div>
    </div>
  );
}

function DistrictCard({ data: d }: { data: DistrictStat }) {
  const barWidth = Math.min(100, (d.avg_growth / 600) * 100);
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-gray-900 text-sm">{d.district}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {d.count} candidates matched · {d.suspicious_count} suspicious
          </div>
        </div>
        <div className={`text-sm font-bold ${growthColor(d.avg_growth)}`}>
          +{d.avg_growth}%
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${heatColor(d.avg_growth)}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <div className="text-xs text-gray-400 mt-1">
        Max growth: +{d.max_growth}%
      </div>
    </div>
  );
}

function HopperRow({ data: r }: { data: GrowthRecord }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-gray-100 rounded-xl hover:border-gray-300 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            href={`/candidate/${r.id_2021}`}
            className="font-medium text-gray-900 text-sm hover:underline"
          >
            {r.name}
          </Link>
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {r.constituency}, {r.district}
        </div>
      </div>

      {/* Party switch */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${partyBadge(r.party_2016)}`}>
          {r.party_2016}
        </span>
        <span className="text-gray-300 text-xs">→</span>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${partyBadge(r.party_2021)}`}>
          {r.party_2021}
        </span>
      </div>

      <div className="flex-shrink-0 text-right">
        <div className={`text-sm ${growthColor(r.growth_pct)}`}>
          +{r.growth_pct.toFixed(0)}%
        </div>
        <div className="text-xs text-gray-400">wealth change</div>
      </div>
    </div>
  );
}
