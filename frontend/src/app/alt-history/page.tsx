"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Link from "next/link";

interface ConstituencyResult {
  id: number;
  name: string;
  district: string;
  total_voters_2021: number | null;
  winner_name: string;
  winner_party: string;
  winner_votes: number;
  runner_up_name: string;
  runner_up_party: string;
  runner_up_votes: number;
  margin: number;
  total_votes: number;
  turnout: number;
  non_voters: number;
  could_flip: boolean;
  votes_needed_pct: number; // % of non-voters needed to flip
}

const PARTY_COLORS: Record<string, string> = {
  DMK: "text-red-700",
  ADMK: "text-green-700",
  AIADMK: "text-green-700",
  BJP: "text-orange-600",
  INC: "text-blue-700",
  PMK: "text-yellow-700",
  VCK: "text-blue-900",
  DMDK: "text-purple-700",
  IND: "text-gray-600",
};

const PARTY_BG: Record<string, string> = {
  DMK: "bg-red-50 border-red-200",
  ADMK: "bg-green-50 border-green-200",
  AIADMK: "bg-green-50 border-green-200",
  BJP: "bg-orange-50 border-orange-200",
  INC: "bg-blue-50 border-blue-200",
  PMK: "bg-yellow-50 border-yellow-200",
  VCK: "bg-blue-50 border-blue-200",
  IND: "bg-gray-50 border-gray-200",
};

function partyColor(party: string) {
  return PARTY_COLORS[party] || "text-gray-700";
}

function partyBg(party: string) {
  return PARTY_BG[party] || "bg-gray-50 border-gray-200";
}

function formatVotes(n: number) {
  return n.toLocaleString("en-IN");
}

type Filter = "all" | "flip" | "close";

export default function AltHistoryPage() {
  const [data, setData] = useState<ConstituencyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("flip");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ConstituencyResult | null>(null);

  useEffect(() => {
    async function load() {
      const { data: results, error } = await supabase
        .from("election_results")
        .select(`
          margin, total_votes, turnout,
          winner_name, winner_party, winner_votes, winner_vote_share,
          runner_up_name, runner_up_party, runner_up_votes,
          constituencies!inner(id, name, district, total_voters_2021)
        `)
        .eq("election_year", 2021)
        .not("margin", "is", null)
        .order("margin", { ascending: true });

      if (error || !results) {
        setLoading(false);
        return;
      }

      const processed: ConstituencyResult[] = results
        .map((r: any) => {
          const c = r.constituencies;
          const total_voters = c.total_voters_2021 || 0;
          const non_voters = Math.max(0, total_voters - r.total_votes);
          const could_flip = non_voters > r.margin && r.margin > 0;
          const votes_needed_pct =
            non_voters > 0 ? ((r.margin + 1) / non_voters) * 100 : 100;
          return {
            id: c.id,
            name: c.name,
            district: c.district,
            total_voters_2021: total_voters,
            winner_name: r.winner_name,
            winner_party: r.winner_party,
            winner_votes: r.winner_votes,
            runner_up_name: r.runner_up_name,
            runner_up_party: r.runner_up_party,
            runner_up_votes: r.runner_up_votes,
            margin: r.margin,
            total_votes: r.total_votes,
            turnout: r.turnout,
            non_voters,
            could_flip,
            votes_needed_pct,
          };
        })
        .filter((r) => r.total_voters_2021 && r.total_voters_2021 > 0);

      setData(processed);
      setLoading(false);
    }
    load();
  }, []);

  const flippable = data.filter((d) => d.could_flip);
  const totalNonVoters = data.reduce((s, d) => s + d.non_voters, 0);

  const filtered = useMemo(() => {
    let base = data;
    if (filter === "flip") base = data.filter((d) => d.could_flip);
    if (filter === "close") base = data.filter((d) => d.margin < 5000);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.district.toLowerCase().includes(q) ||
          d.winner_name.toLowerCase().includes(q) ||
          d.runner_up_name.toLowerCase().includes(q)
      );
    }
    return base;
  }, [data, filter, search]);

  return (
    <div className="min-h-screen bg-white">
      <Header active="alt-history" />

      {/* Hero */}
      <div className="bg-gray-950 text-white">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-20">
          <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-4">
            Tamil Nadu 2021 — Counterfactual Analysis
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-6">
            What if they had voted?
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-2xl leading-relaxed">
            In 2021, over{" "}
            <span className="text-white font-semibold">
              {totalNonVoters > 0
                ? (totalNonVoters / 1e6).toFixed(1) + " million"
                : "millions of"}{" "}
              people
            </span>{" "}
            in Tamil Nadu were registered voters who chose not to vote. In{" "}
            <span className="text-white font-semibold">
              {flippable.length} of 234 constituencies
            </span>
            , the winning margin was smaller than the number of people who
            stayed home.
          </p>
          {!loading && (
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl sm:text-3xl font-bold text-white">
                  {flippable.length}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Constituencies that could have flipped
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl sm:text-3xl font-bold text-white">
                  {data.length > 0
                    ? Math.min(...data.filter((d) => d.margin > 0).map((d) => d.margin)).toLocaleString("en-IN")
                    : "—"}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Smallest margin in TN 2021
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl sm:text-3xl font-bold text-white">
                  {totalNonVoters > 0
                    ? (totalNonVoters / 1e6).toFixed(1) + "M"
                    : "—"}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Total registered non-voters statewide
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-2 text-sm font-medium">
            {(
              [
                { key: "flip", label: `Could flip (${flippable.length})` },
                { key: "close", label: "Margin < 5,000" },
                { key: "all", label: "All 234" },
              ] as { key: Filter; label: string }[]
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                  filter === f.key
                    ? "bg-gray-950 text-white border-gray-950"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search constituency, candidate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-64 focus:outline-none focus:border-gray-400"
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Loading 2021 results...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            No results found.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((c) => (
              <ConstituencyCard
                key={c.id}
                data={c}
                expanded={selected?.id === c.id}
                onToggle={() =>
                  setSelected(selected?.id === c.id ? null : c)
                }
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-12 border-t border-gray-100 pt-6 text-xs text-gray-400 leading-relaxed max-w-2xl">
          <strong className="text-gray-500">Methodology:</strong> Non-voters
          are calculated as registered voters (ECI rolls) minus total valid
          votes polled in 2021. A constituency is marked "could flip" if the
          winning margin is strictly less than the non-voter count — meaning
          had those non-voters voted entirely for the runner-up, the result
          would have changed. This is a theoretical maximum; in practice,
          non-voters would have split across parties.
        </div>
      </div>
    </div>
  );
}

function ConstituencyCard({
  data: c,
  expanded,
  onToggle,
}: {
  data: ConstituencyResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pctNeeded = c.votes_needed_pct;
  const stayedHomePct =
    c.total_voters_2021 && c.total_voters_2021 > 0
      ? ((c.non_voters / c.total_voters_2021) * 100).toFixed(1)
      : null;

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        c.could_flip
          ? "border-gray-300 shadow-sm"
          : "border-gray-100"
      }`}
    >
      {/* Card header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors"
      >
        {/* Flip badge */}
        <div className="flex-shrink-0 mt-0.5">
          {c.could_flip ? (
            <span className="inline-block bg-gray-950 text-white text-xs font-mono px-2 py-0.5 rounded">
              COULD FLIP
            </span>
          ) : (
            <span className="inline-block bg-gray-100 text-gray-400 text-xs font-mono px-2 py-0.5 rounded">
              SAFE SEAT
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-semibold text-gray-900 text-base">
              {c.name}
            </span>
            <span className="text-xs text-gray-400">{c.district}</span>
          </div>

          {/* Winner vs Runner-up */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className={`font-medium ${partyColor(c.winner_party)}`}>
              {c.winner_name}
              <span className="font-normal text-xs ml-1">
                ({c.winner_party})
              </span>
            </span>
            <span className="text-gray-300">vs</span>
            <span className="text-gray-500">
              {c.runner_up_name}
              <span className="text-xs ml-1">({c.runner_up_party})</span>
            </span>
          </div>
        </div>

        {/* Margin + non-voters */}
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-semibold text-gray-900">
            {formatVotes(c.margin)}
          </div>
          <div className="text-xs text-gray-400">margin</div>
          {c.non_voters > 0 && (
            <>
              <div className="text-sm font-semibold text-gray-500 mt-1">
                {formatVotes(c.non_voters)}
              </div>
              <div className="text-xs text-gray-400">stayed home</div>
            </>
          )}
        </div>

        <div className="flex-shrink-0 ml-2 text-gray-300 mt-1">
          {expanded ? "▲" : "▼"}
        </div>
      </button>

      {/* Expanded alt history narrative */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-5 bg-gray-50">
          {/* The alt history story */}
          <div className="mb-5">
            <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">
              The Alternate History
            </h3>
            {c.could_flip ? (
              <p className="text-gray-800 text-sm sm:text-base leading-relaxed">
                In <strong>{c.name}</strong>,{" "}
                <span className={`font-semibold ${partyColor(c.winner_party)}`}>
                  {c.winner_name} ({c.winner_party})
                </span>{" "}
                won by just{" "}
                <strong>{formatVotes(c.margin)} votes</strong>. That same day,{" "}
                <strong>{formatVotes(c.non_voters)}</strong> registered
                voters — {stayedHomePct}% of the electorate — did not show up.
                Had only{" "}
                <strong>
                  {formatVotes(c.margin + 1)} of them
                </strong>{" "}
                (
                {pctNeeded < 1
                  ? "< 1%"
                  : pctNeeded.toFixed(1) + "%"}{" "}
                of non-voters) voted for{" "}
                <span className="font-semibold">
                  {c.runner_up_name} ({c.runner_up_party})
                </span>
                , Tamil Nadu would have had a different MLA for the last five
                years.
              </p>
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed">
                In <strong>{c.name}</strong>,{" "}
                <span className={`font-semibold ${partyColor(c.winner_party)}`}>
                  {c.winner_name}
                </span>{" "}
                won by <strong>{formatVotes(c.margin)} votes</strong>. Even if
                all {formatVotes(c.non_voters)} non-voters had voted for the
                runner-up, the result would not have changed. This was a safe
                seat.
              </p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatBox
              label="Winning margin"
              value={formatVotes(c.margin)}
              sub="votes"
            />
            <StatBox
              label="Stayed home"
              value={formatVotes(c.non_voters)}
              sub={stayedHomePct ? `${stayedHomePct}% of rolls` : "voters"}
            />
            <StatBox
              label="Votes to flip"
              value={
                c.could_flip ? formatVotes(c.margin + 1) : "—"
              }
              sub={
                c.could_flip && pctNeeded < 100
                  ? `${pctNeeded < 1 ? "< 1" : pctNeeded.toFixed(1)}% of non-voters`
                  : "not flippable"
              }
            />
            <StatBox
              label="Turnout 2021"
              value={
                c.turnout ? c.turnout.toFixed(1) + "%" : "—"
              }
              sub="of registered voters"
            />
          </div>

          {/* Vote bar */}
          {c.winner_votes > 0 && c.runner_up_votes > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>
                  {c.winner_name} — {formatVotes(c.winner_votes)}
                </span>
                <span>
                  {c.runner_up_name} — {formatVotes(c.runner_up_votes)}
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
                <div
                  className={`h-full ${
                    c.winner_party === "DMK"
                      ? "bg-red-500"
                      : c.winner_party === "AIADMK" || c.winner_party === "ADMK"
                      ? "bg-green-600"
                      : "bg-gray-700"
                  }`}
                  style={{
                    width: `${(c.winner_votes / (c.winner_votes + c.runner_up_votes)) * 100}%`,
                  }}
                />
                <div
                  className={`h-full flex-1 ${
                    c.runner_up_party === "DMK"
                      ? "bg-red-300"
                      : c.runner_up_party === "AIADMK" ||
                        c.runner_up_party === "ADMK"
                      ? "bg-green-300"
                      : "bg-gray-300"
                  }`}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href={`/constituency/${c.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900 transition-colors"
            >
              View full constituency →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="font-semibold text-gray-900 text-sm">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
