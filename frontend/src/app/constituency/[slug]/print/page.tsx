"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Constituency {
  id: number;
  name: string;
  district: string;
  total_voters_2021: number | null;
  turnout_2021: number | null;
  current_mla: string | null;
  current_mla_party: string | null;
}

interface Candidate {
  id: number;
  name: string;
  party: string;
  age: number | null;
  education: string | null;
  net_worth: number | null;
  liabilities: number | null;
  criminal_cases_declared: number;
  criminal_cases_ecourts: number;
  criminal_mismatch: boolean;
  votes_received: number | null;
  vote_share: number | null;
  is_winner: boolean;
  is_incumbent: boolean;
  affidavit_url: string | null;
}

interface ElectionResult {
  winner_name: string;
  winner_party: string;
  winner_votes: number;
  winner_vote_share: number;
  runner_up_name: string;
  runner_up_party: string;
  runner_up_votes: number;
  margin: number;
  total_votes: number;
  turnout: number;
  total_candidates: number;
}

function slugToName(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function fmtCr(n: number | null): string {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN");
}

function partyColor(party: string): string {
  const p = (party || "").toUpperCase();
  if (p === "ADMK" || p.includes("AIADMK")) return "#2d7a4f";
  if (p.includes("DMK")) return "#c0392b";
  if (p.includes("TVK")) return "#1a5276";
  if (p.includes("BJP")) return "#d35400";
  if (p.includes("NTK")) return "#6c3483";
  if (p.includes("INC") || p.includes("CONGRESS")) return "#1565c0";
  if (p.includes("PMK")) return "#b8860b";
  return "#555";
}

export default function PrintCardPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const [constituency, setConstituency] = useState<Constituency | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [result, setResult] = useState<ElectionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const name = slugToName(slug as string);

    async function fetchData() {
      const { data: constData } = await supabase
        .from("constituencies")
        .select("id, name, district, total_voters_2021, turnout_2021, current_mla, current_mla_party")
        .ilike("name", name)
        .single();

      if (!constData) { setLoading(false); return; }
      setConstituency(constData);

      const [candRes, resultRes] = await Promise.all([
        supabase
          .from("candidates")
          .select("id, name, party, age, education, net_worth, liabilities, criminal_cases_declared, criminal_cases_ecourts, criminal_mismatch, votes_received, vote_share, is_winner, is_incumbent, affidavit_url")
          .eq("constituency_id", constData.id)
          .eq("election_year", 2021)
          .order("votes_received", { ascending: false }),
        supabase
          .from("election_results")
          .select("*")
          .eq("constituency_id", constData.id)
          .eq("election_year", 2021)
          .single(),
      ]);

      if (candRes.data) setCandidates(candRes.data);
      if (resultRes.data) setResult(resultRes.data);
      setLoading(false);
    }

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf9f6" }}>
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!constituency) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf9f6" }}>
        <p className="text-gray-500">Constituency not found.</p>
      </div>
    );
  }

  const hasCriminal = candidates.some((c) => c.criminal_cases_declared > 0);
  const topCandidates = candidates.slice(0, 20); // max 20 for print layout
  const generatedDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      {/* Print styles injected into head via style tag */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { padding: 0 !important; max-width: 100% !important; }
          @page { margin: 15mm; size: A4 portrait; }
        }
        @media screen {
          body { background: #faf9f6; }
        }
      `}</style>

      {/* Screen toolbar */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link
          href={`/constituency/${slug}`}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to {constituency.name}
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: "#c84b11" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save as PDF
        </button>
      </div>

      {/* ── Print card content ── */}
      <div className="print-page max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="border-b-2 pb-4 mb-6" style={{ borderColor: "#c84b11" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-0.5">
                Know Before You Vote
              </p>
              <h1 className="text-3xl font-bold text-gray-900">
                {constituency.name}
              </h1>
              <p className="text-base text-gray-500 mt-0.5">
                {constituency.district} District · Tamil Nadu Assembly 2026
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">tnelections.info</div>
              <div className="text-xs text-gray-400 mt-0.5">{generatedDate}</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            {
              label: "Total Voters (2021)",
              value: constituency.total_voters_2021 ? fmt(constituency.total_voters_2021) : "—",
            },
            {
              label: "Turnout (2021)",
              value: constituency.turnout_2021 ? `${constituency.turnout_2021.toFixed(1)}%` : "—",
            },
            {
              label: "Current MLA",
              value: constituency.current_mla || "—",
              sub: constituency.current_mla_party,
            },
          ].map((s, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5 leading-snug">{s.value}</p>
              {s.sub && <p className="text-[11px] text-gray-500">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* 2021 Result */}
        {result && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">2021 Election Result</p>
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-[10px] text-gray-400">Winner</p>
                <p className="font-bold text-gray-900">{result.winner_name}</p>
                <p className="text-xs font-medium" style={{ color: partyColor(result.winner_party) }}>
                  {result.winner_party} · {result.winner_vote_share?.toFixed(1)}%
                </p>
              </div>
              <div className="text-gray-300 text-lg font-thin">|</div>
              <div>
                <p className="text-[10px] text-gray-400">Runner-up</p>
                <p className="font-semibold text-gray-700">{result.runner_up_name}</p>
                <p className="text-xs font-medium" style={{ color: partyColor(result.runner_up_party) }}>
                  {result.runner_up_party}
                </p>
              </div>
              <div className="text-gray-300 text-lg font-thin">|</div>
              <div>
                <p className="text-[10px] text-gray-400">Margin</p>
                <p className="font-bold text-gray-900">{fmt(result.margin)}</p>
                <p className="text-xs text-gray-500">votes</p>
              </div>
              <div className="text-gray-300 text-lg font-thin">|</div>
              <div>
                <p className="text-[10px] text-gray-400">Total Votes</p>
                <p className="font-bold text-gray-900">{fmt(result.total_votes)}</p>
                <p className="text-xs text-gray-500">{result.total_candidates} candidates</p>
              </div>
            </div>
          </div>
        )}

        {/* Candidates table */}
        <div>
          <h2 className="font-bold text-gray-900 text-sm mb-3">
            2021 Candidates ({candidates.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left border-b-2" style={{ borderColor: "#c84b11" }}>
                  <th className="pb-2 pr-3 font-semibold text-gray-600">Candidate</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-600">Party</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-600 text-right">Votes</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-600 text-right">Share</th>
                  <th className="pb-2 pr-3 font-semibold text-gray-600 text-right">Net Worth</th>
                  {hasCriminal && (
                    <th className="pb-2 font-semibold text-gray-600 text-center">Cases</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {topCandidates.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b ${c.is_winner ? "bg-yellow-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                    style={{ borderColor: "#f0ede8" }}
                  >
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: partyColor(c.party) }}
                        >
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{c.name}</span>
                          {c.is_winner && (
                            <span className="ml-1 text-[9px] font-bold text-yellow-700 bg-yellow-100 px-1 py-0.5 rounded">WIN</span>
                          )}
                          {c.is_incumbent && !c.is_winner && (
                            <span className="ml-1 text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded">INC</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="font-medium" style={{ color: partyColor(c.party) }}>{c.party}</span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-gray-700">
                      {c.votes_received != null ? fmt(c.votes_received) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-600">
                      {c.vote_share != null ? `${c.vote_share.toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-700">
                      {fmtCr(c.net_worth)}
                    </td>
                    {hasCriminal && (
                      <td className="py-2 text-center">
                        {c.criminal_cases_declared > 0 ? (
                          <span className="inline-block font-bold text-red-600 bg-red-50 rounded px-1.5 py-0.5">
                            {c.criminal_cases_declared}
                          </span>
                        ) : (
                          <span className="text-green-600 font-medium">0</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-400">
          <span>Source: ECI Affidavit Data (2021) · tnelections.info</span>
          <span>Polling Day: April 23, 2026 · Results: May 4, 2026</span>
        </div>
        <p className="text-[10px] text-gray-300 mt-1">
          Data based on 2021 affidavits. 2026 candidate data will be updated after April 9 withdrawal deadline.
        </p>

      </div>
    </>
  );
}
