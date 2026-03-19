"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// ── Types ─────────────────────────────────────────
interface Constituency {
  id: number;
  name: string;
  district: string;
  current_mla: string | null;
  current_mla_party: string | null;
  alliance_2026: string | null;
}

interface CountdownTarget {
  label: string;
  date: Date;
}

const COUNTDOWN_DATES: CountdownTarget[] = [
  { label: "Nominations Open", date: new Date("2026-04-06") },
  { label: "Polling Day",      date: new Date("2026-04-23") },
  { label: "Results",          date: new Date("2026-05-04") },
];

function getTimeLeft(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return { days, hours };
}

// ── Party colour helper ───────────────────────────
function partyColor(party: string | null): string {
  if (!party) return "#888";
  const p = party.toUpperCase();
  if (p.includes("DMK"))    return "#c0392b";
  if (p.includes("AIADMK")) return "#2d7a4f";
  if (p.includes("TVK"))    return "#1a5276";
  if (p.includes("BJP"))    return "#d35400";
  if (p.includes("NTK"))    return "#6c3483";
  if (p.includes("INC") || p.includes("CONGRESS")) return "#1565c0";
  return "#888";
}

// ── Countdown card ────────────────────────────────
function CountdownCard({ target }: { target: CountdownTarget }) {
  const [time, setTime] = useState(getTimeLeft(target.date));

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(target.date)), 60_000);
    return () => clearInterval(id);
  }, [target.date]);

  if (!time) return null;

  return (
    <div className="card text-center min-w-[140px]">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
        {target.label}
      </p>
      <p className="text-3xl font-bold text-terracotta">{time.days}</p>
      <p className="text-sm text-gray-600">days away</p>
      <p className="text-xs text-gray-400 mt-0.5">{time.hours}h left today</p>
    </div>
  );
}

// ── Search bar ────────────────────────────────────
function SearchBar({
  constituencies,
}: {
  constituencies: Constituency[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Constituency[]>([]);
  const [open, setOpen] = useState(false);

  function handleInput(val: string) {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const q = val.toLowerCase();
    const matched = constituencies
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q) ||
          (c.current_mla || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
    setResults(matched);
    setOpen(matched.length > 0);
  }

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="flex items-center bg-white border-2 border-gray-200 rounded-[14px] overflow-hidden focus-within:border-terracotta transition-colors shadow-sm">
        <span className="pl-4 text-gray-400 text-xl">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search constituency, district or candidate…"
          className="w-full px-3 py-4 text-base bg-transparent outline-none placeholder:text-gray-400"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="pr-4 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-[14px] border border-gray-100 shadow-xl overflow-hidden">
          {results.map((c) => (
            <Link
              key={c.id}
              href={`/constituency/${c.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-[#faf9f6] transition-colors border-b border-gray-50 last:border-0"
            >
              <div>
                <p className="font-semibold text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500">{c.district} District</p>
              </div>
              <div className="flex items-center gap-2">
                {c.current_mla_party && (
                  <span
                    className="badge text-xs"
                    style={{
                      background: partyColor(c.current_mla_party) + "20",
                      color: partyColor(c.current_mla_party),
                    }}
                  >
                    {c.current_mla_party}
                  </span>
                )}
                <span className="text-gray-400 text-sm">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Alliance summary ──────────────────────────────
const ALLIANCES = [
  {
    name: "DMK Alliance",
    color: "#c0392b",
    parties: ["DMK", "Congress", "VCK", "CPI", "CPM", "MDMK"],
    leader: "M.K. Stalin",
  },
  {
    name: "AIADMK Alliance",
    color: "#2d7a4f",
    parties: ["AIADMK", "PMK", "TMC(M)"],
    leader: "Edappadi K. Palaniswami",
  },
  {
    name: "NDA",
    color: "#d35400",
    parties: ["BJP", "AMMK", "DMDK"],
    leader: "K. Annamalai",
  },
  {
    name: "TVK (Independent)",
    color: "#1a5276",
    parties: ["TVK"],
    leader: "Vijay",
  },
];

// ── Main Page ─────────────────────────────────────
export default function HomePage() {
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [claimInput, setClaimInput] = useState("");

  useEffect(() => {
    supabase
      .from("constituencies")
      .select("id, name, district, current_mla, current_mla_party, alliance_2026")
      .order("name")
      .then(({ data }) => {
        if (data) setConstituencies(data);
      });
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Header ── */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🗳️</span>
            <div>
              <p className="font-bold text-gray-900 leading-none">tnelections.info</p>
              <p className="text-xs text-gray-500">Tamil Nadu 2026</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/districts" className="hover:text-terracotta transition-colors">Districts</Link>
            <Link href="/fact-check" className="hover:text-terracotta transition-colors">Narrative Check</Link>
            <Link href="/manifestos" className="hover:text-terracotta transition-colors">Manifestos</Link>
            <Link href="/polls" className="hover:text-terracotta transition-colors">Polls</Link>
            <Link href="/swing-seats" className="hover:text-terracotta transition-colors">Swing Seats</Link>
          </nav>
          <button className="text-sm font-semibold text-terracotta border border-terracotta px-3 py-1.5 rounded-[9px] hover:bg-terracotta hover:text-white transition-colors">
            தமிழ்
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-terracotta/10 text-terracotta px-3 py-1 rounded-full text-sm font-medium mb-4">
          <span className="pulse-dot inline-block w-2 h-2 bg-terracotta rounded-full"></span>
          AI agents investigating candidates live
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-3 leading-tight">
          Know your candidates.<br />
          <span className="text-terracotta">Break the narratives.</span>
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          Your vote, your truth. — Tamil Nadu Elections 2026
        </p>
        <p className="text-sm text-gray-500 mb-8 font-tamil">
          உங்கள் வாக்கு, உங்கள் உண்மை
        </p>

        <SearchBar constituencies={constituencies} />

        <p className="mt-3 text-xs text-gray-400">
          {constituencies.length > 0
            ? `${constituencies.length} constituencies loaded · Click to investigate any candidate with AI`
            : "Loading constituencies…"}
        </p>
      </section>

      {/* ── Countdown ── */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <div className="flex flex-wrap gap-4 justify-center">
          {COUNTDOWN_DATES.map((d) => (
            <CountdownCard key={d.label} target={d} />
          ))}
        </div>
      </section>

      {/* ── Alliance summary ── */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">2026 Alliance Map</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ALLIANCES.map((a) => (
            <div key={a.name} className="card border-l-4" style={{ borderLeftColor: a.color }}>
              <p className="font-bold text-sm mb-1" style={{ color: a.color }}>{a.name}</p>
              <p className="text-xs text-gray-500 mb-2">{a.leader}</p>
              <div className="flex flex-wrap gap-1">
                {a.parties.map((p) => (
                  <span key={p} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-[9px] font-medium">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick Narrative Check ── */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="card border-l-4 border-l-terracotta">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">🔬</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Narrative Check</h2>
              <p className="text-sm text-gray-500">
                Paste any political claim — our AI finds sources and gives a verdict in seconds
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              placeholder={`Try: "TVK has no political experience" or "DMK reduced power cuts"`}
              className="flex-1 border border-gray-200 rounded-[9px] px-4 py-3 text-sm outline-none focus:border-terracotta"
            />
            <Link
              href={`/fact-check${claimInput ? `?claim=${encodeURIComponent(claimInput)}` : ""}`}
              className="bg-terracotta text-white px-6 py-3 rounded-[9px] font-semibold text-sm text-center hover:bg-[#a33d0e] transition-colors whitespace-nowrap"
            >
              Check Claim →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              "TVK has no political experience",
              "AIADMK built more roads than DMK",
              "BJP has no influence in Tamil Nadu",
            ].map((eg) => (
              <button
                key={eg}
                onClick={() => setClaimInput(eg)}
                className="text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-[9px] transition-colors"
              >
                {eg}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white py-8 mt-4">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p className="font-medium text-gray-700 mb-1">tnelections.info</p>
          <p>Data sourced from Election Commission of India, MyNeta, and eCourts.</p>
          <p className="mt-1">Built for informed voting · Tamil Nadu Elections 2026</p>
        </div>
      </footer>
    </div>
  );
}
