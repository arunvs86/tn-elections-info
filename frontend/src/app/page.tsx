"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/components/LanguageProvider";
import Header from "@/components/Header";
import DailyBriefing from "@/components/DailyBriefing";
import OpinionPoll from "@/components/OpinionPoll";
import VisitorTracker from "@/components/VisitorTracker";
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
  daysLabel?: string;
}

// COUNTDOWN_DATES moved into component to use t()

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
    <div className="bg-white/10 border border-white/15 rounded-lg md:rounded-xl text-center px-2.5 py-1.5 md:px-4 md:py-2.5 min-w-[70px] md:min-w-[100px]">
      <p className="text-[8px] md:text-[10px] text-white/60 font-medium uppercase tracking-wider">
        {target.label}
      </p>
      <p className="text-lg md:text-2xl font-extrabold text-white leading-tight">{time.days}</p>
      <p className="text-[8px] md:text-[10px] text-white/50">{target.daysLabel}</p>
    </div>
  );
}

// ── Search result types ───────────────────────────
type SearchResult =
  | { type: "constituency"; data: Constituency }
  | { type: "candidate"; data: { id: number; name: string; party: string; constituency_name: string } };

// ── Search bar ────────────────────────────────────
function SearchBar({
  constituencies,
}: {
  constituencies: Constituency[];
}) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  async function handleInput(val: string) {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const q = val.toLowerCase();

    // Search constituencies locally
    const constMatches: SearchResult[] = constituencies
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q) ||
          (c.current_mla || "").toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((c) => ({ type: "constituency", data: c }));

    // Search candidates from Supabase
    const { data: candidates } = await supabase
      .from("candidates")
      .select("id, name, party, constituencies(name)")
      .ilike("name", `%${val}%`)
      .eq("election_year", 2021)
      .limit(5);

    const candMatches: SearchResult[] = (candidates || []).map((c: Record<string, unknown>) => ({
      type: "candidate",
      data: {
        id: c.id as number,
        name: c.name as string,
        party: c.party as string,
        constituency_name: (c.constituencies as Record<string, string>)?.name || "",
      },
    }));

    const combined = [...constMatches, ...candMatches].slice(0, 8);
    setResults(combined);
    setOpen(combined.length > 0);
  }

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="flex items-center bg-white rounded-2xl overflow-hidden shadow-xl focus-within:ring-2 focus-within:ring-white/50 transition-all">
        <span className="pl-4 text-gray-400 text-xl">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={t("home.search_placeholder")}
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
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto">
          {results.map((r) =>
            r.type === "constituency" ? (
              <Link
                key={`c-${r.data.id}`}
                href={`/constituency/${r.data.name.toLowerCase().replace(/\s+/g, "-")}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-[#faf9f6] transition-colors border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="font-semibold text-gray-900">{r.data.name}</p>
                  <p className="text-xs text-gray-500">{r.data.district} {t("common.district")}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.data.current_mla_party && (
                    <span
                      className="badge text-xs"
                      style={{
                        background: partyColor(r.data.current_mla_party) + "20",
                        color: partyColor(r.data.current_mla_party),
                      }}
                    >
                      {r.data.current_mla_party}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{t("home.constituency_badge")}</span>
                </div>
              </Link>
            ) : (
              <Link
                key={`cand-${r.data.id}`}
                href={`/candidate/${r.data.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-[#faf9f6] transition-colors border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="font-semibold text-gray-900">{r.data.name}</p>
                  <p className="text-xs text-gray-500">{r.data.constituency_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="badge text-xs"
                    style={{
                      background: partyColor(r.data.party) + "20",
                      color: partyColor(r.data.party),
                    }}
                  >
                    {r.data.party}
                  </span>
                  <span className="text-xs text-gray-400">{t("home.candidate_badge")}</span>
                </div>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Quick stats ──────────────────────────────────
function QuickStats() {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
      {[
        { value: "234", labelKey: "home.stat_constituencies", descKey: "home.stat_constituencies_desc", icon: "🗳️", href: "/districts" },
        { value: "3,800+", labelKey: "home.stat_candidates", descKey: "home.stat_candidates_desc", icon: "👤", href: "/districts" },
        { value: "764", labelKey: "home.stat_cases", descKey: "home.stat_cases_desc", icon: "⚖️", href: "/districts" },
        { value: "48", labelKey: "home.stat_promises", descKey: "home.stat_promises_desc", icon: "📋", href: "/manifesto" },
      ].map((s) => (
        <Link key={s.labelKey} href={s.href} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <p className="text-2xl mb-1">{s.icon}</p>
          <p className="text-2xl font-extrabold text-gray-900 group-hover:text-terracotta transition-colors">{s.value}</p>
          <p className="text-xs font-semibold text-gray-700 mt-0.5">{t(s.labelKey)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{t(s.descKey)}</p>
        </Link>
      ))}
    </div>
  );
}

// ── Alliance summary ──────────────────────────────
const ALLIANCES = [
  {
    name: "DMK-SPA (INDIA)",
    color: "#c0392b",
    parties: ["DMK", "Congress", "DMDK", "VCK", "CPI", "CPI(M)", "MDMK", "IUML", "MMK", "KMDK"],
    leader: "M.K. Stalin",
    seats2021: 159,
    status: "Ruling alliance seeking re-election. ~165 DMK + allies. MNM supports from outside.",
  },
  {
    name: "AIADMK-NDA",
    color: "#2d7a4f",
    parties: ["AIADMK", "BJP", "PMK", "AMMK", "TMC(M)", "IJK"],
    leader: "Edappadi K. Palaniswami",
    seats2021: 75,
    status: "AIADMK 178, BJP 27, PMK 18, AMMK 11 seats. Reunited April 2025.",
  },
  {
    name: "TVK",
    color: "#1a5276",
    parties: ["TVK"],
    leader: "Vijay",
    seats2021: 0,
    status: "Going solo, all 234 seats. First election. Vijay contesting from Perambur.",
  },
  {
    name: "NTK",
    color: "#6c3483",
    parties: ["NTK"],
    leader: "Seeman",
    seats2021: 0,
    status: "Going solo, 5th time. 117 men + 117 women candidates. Seeman from Karaikudi.",
  },
];

// ── Thamizhan Pledge Widget ───────────────────────
function ThamizhanPledge() {
  const { lang } = useLang();
  const isTa = lang === "ta";
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("pledges")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => { if (count != null) setCount(count); });
  }, []);

  return (
    <section className="max-w-md mx-auto px-4 pb-10">
      <div
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{ background: "linear-gradient(135deg, #c84b11 0%, #7a2800 100%)" }}
      >
        {/* Top */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3"
            style={{
              background: "rgba(255,255,255,0.15)",
              fontFamily: "'Noto Serif Tamil', serif",
            }}
          >
            த
          </div>
          <p className="text-white font-extrabold text-xl leading-snug">
            உங்கள் தலை எழுத்து..
          </p>
          <p className="text-orange-200 font-extrabold text-xl leading-snug">
            உங்கள் விரலில்.
          </p>
          <p className="text-white/70 text-xs mt-2">
            {isTa
              ? "Thamizhan April 22 & 23 உங்களை vote-க்கு அழைப்பான்"
              : "Thamizhan will call you on Apr 22 & 23 to remind you to vote"}
          </p>
        </div>

        {/* Counter */}
        <div className="bg-white/10 mx-4 rounded-xl px-4 py-3 text-center mb-4">
          <p className="text-white font-extrabold text-3xl">
            {count != null ? count.toLocaleString("en-IN") : "—"}
          </p>
          <p className="text-white/70 text-xs mt-0.5">
            {isTa ? "தமிழர்கள் உறுதி கொடுத்தனர்" : "Thamizhan-s have pledged"}
          </p>
        </div>

        {/* CTA */}
        <div className="px-4 pb-5">
          <Link
            href="/pledge"
            className="block w-full py-3.5 rounded-xl bg-white text-center font-bold text-sm transition-opacity hover:opacity-90"
            style={{ color: "#c84b11" }}
          >
            {isTa ? "நான் Thamizhan — நான் vote போடுவேன் →" : "I am Thamizhan — I will vote →"}
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────
export default function HomePage() {
  const { lang, t } = useLang();
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

  const countdownDates: CountdownTarget[] = [
    { label: t("home.nomination"),  date: new Date("2026-03-30"), daysLabel: t("home.days_away") },
    { label: t("home.polling"),     date: new Date("2026-04-23"), daysLabel: t("home.days_away") },
    { label: t("home.results"),     date: new Date("2026-05-04"), daysLabel: t("home.days_away") },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <Header active="home" />

      {/* ── Hero — clean images + separate text ── */}
      <section>
        {/* 4 leader photos — 2x2 mobile, 4-col desktop, NO text overlay */}
        <div className="grid grid-cols-2 md:grid-cols-4 h-[280px] sm:h-[320px] md:h-[420px]">
          <div className="relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/leaders/stalin.jpg" alt="M.K. Stalin" className="absolute inset-0 w-full h-full object-cover object-[center_20%]" />
          </div>
          <div className="relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/leaders/eps.jpg" alt="Edappadi K. Palaniswami" className="absolute inset-0 w-full h-full object-cover object-[center_15%]" />
          </div>
          <div className="relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/leaders/vijay-tvk.jpg" alt="Vijay — TVK" className="absolute inset-0 w-full h-full object-cover object-[center_20%]" />
          </div>
          <div className="relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/leaders/seeman.jpg" alt="Seeman — NTK" className="absolute inset-0 w-full h-full object-cover object-[center_20%]" />
          </div>
        </div>

        {/* Text strip — completely separate from images */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 md:px-6 py-3 md:py-5">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/10 text-white/90 px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium mb-1.5 border border-white/10">
                <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-green-400"></span>
                </span>
                {t("home.badge")}
              </div>
              <h1 className="text-lg sm:text-xl md:text-3xl font-extrabold text-white leading-snug tracking-tight">
                {t("home.title")}{" "}
                <span className="bg-gradient-to-r from-[#e8a87c] to-[#d35400] bg-clip-text text-transparent">
                  {t("home.subtitle")}
                </span>
              </h1>
              <p className="text-[11px] md:text-sm text-white/50 mt-0.5">
                {t("home.tagline")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {countdownDates.map((d) => (
                <CountdownCard key={d.label} target={d} />
              ))}
            </div>
          </div>
        </div>
        <svg viewBox="0 0 1440 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block -mt-1">
          <path d="M0 50L48 46.7C96 43 192 37 288 33.3C384 30 480 30 576 33.3C672 37 768 43 864 43.3C960 43 1056 37 1152 33.3C1248 30 1344 30 1392 30L1440 30V50H0Z" fill="#faf9f6"/>
        </svg>
      </section>

      {/* ── Search bar — pulled out below hero for clean layout ── */}
      <section className="max-w-3xl mx-auto px-4 -mt-2 mb-6">
        <SearchBar constituencies={constituencies} />
        <p className="mt-2 text-xs text-gray-400 text-center">
          {constituencies.length > 0
            ? `${constituencies.length} ${t("home.search_hint")}`
            : t("common.loading")}
        </p>
      </section>

      {/* ── Quick Stats ── */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <QuickStats />
      </section>

      {/* ── Daily AI Briefing ── */}
      <DailyBriefing />

      {/* ── Explore Section ── */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t("home.explore")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { href: "/districts", icon: "🗺️", labelKey: "home.explore_districts", descKey: "home.explore_districts_desc" },
            { href: "/parties", icon: "🏛️", labelKey: "home.explore_parties", descKey: "home.explore_parties_desc" },
            { href: "/manifesto", icon: "📜", labelKey: "home.explore_manifesto", descKey: "home.explore_manifesto_desc" },
            { href: "/compare", icon: "⚔️", labelKey: "home.explore_compare", descKey: "home.explore_compare_desc" },
            { href: "/news", icon: "📰", labelKey: "home.explore_news", descKey: "home.explore_news_desc" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="card hover:shadow-lg hover:-translate-y-0.5 transition-all group">
              <p className="text-3xl mb-2">{item.icon}</p>
              <p className="font-bold text-sm text-gray-900 group-hover:text-terracotta transition-colors">{t(item.labelKey)}</p>
              <p className="text-xs text-gray-500">{t(item.descKey)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Alliance summary ── */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t("home.alliance_title")}</h2>
        <p className="text-sm text-gray-500 mb-4">{t("home.alliance_subtitle")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {ALLIANCES.map((a) => (
            <div key={a.name} className="card border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: a.color }}>
              <p className="font-bold text-sm mb-1" style={{ color: a.color }}>{a.name}</p>
              <p className="text-xs text-gray-600 font-medium mb-0.5">{a.leader}</p>
              {a.seats2021 > 0 && (
                <p className="text-xs text-gray-400 mb-1">2021: {a.seats2021} {t("home.alliance_seats")}</p>
              )}
              <p className="text-[10px] text-gray-400 italic mb-2">{a.status}</p>
              <div className="flex flex-wrap gap-1">
                {a.parties.map((p) => (
                  <span key={p} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-[9px] font-medium">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Opinion Poll ── */}
      <section className="max-w-md mx-auto px-4 pb-10">
        <OpinionPoll />
      </section>

      {/* ── Thamizhan Pledge Widget ── */}
      <ThamizhanPledge />

      {/* ── Quick Narrative Check ── */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="card border-l-4 border-l-terracotta">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">🔬</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t("fc.title")}</h2>
              <p className="text-sm text-gray-500">
                {t("home.fc_tagline")}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              placeholder={t("home.fc_placeholder")}
              className="flex-1 border border-gray-200 rounded-[9px] px-4 py-3 text-sm outline-none focus:border-terracotta"
            />
            <Link
              href={`/fact-check${claimInput ? `?claim=${encodeURIComponent(claimInput)}` : ""}`}
              className="bg-terracotta text-white px-6 py-3 rounded-[9px] font-semibold text-sm text-center hover:bg-[#a33d0e] transition-colors whitespace-nowrap"
            >
              {t("fc.submit")} &rarr;
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { key: "home.fc_example1" },
              { key: "home.fc_example2" },
              { key: "home.fc_example3" },
            ].map((eg) => (
              <button
                key={eg.key}
                onClick={() => setClaimInput(t(eg.key))}
                className="text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-[9px] transition-colors"
              >
                {t(eg.key)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white py-8 mt-4">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p className="font-medium text-gray-700 mb-1">tnelections.info</p>
          <p>{t("common.footer")}</p>
          <div className="mt-3">
            <VisitorTracker />
          </div>
        </div>
      </footer>
    </div>
  );
}
