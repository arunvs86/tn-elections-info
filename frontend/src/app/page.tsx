"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/components/LanguageProvider";
import Header from "@/components/Header";
import DailyBriefing from "@/components/DailyBriefing";
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
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-center px-6 py-4 min-w-[140px]">
      <p className="text-xs text-white/70 font-medium uppercase tracking-wider mb-1">
        {target.label}
      </p>
      <p className="text-4xl font-extrabold text-white">{time.days}</p>
      <p className="text-sm text-white/60">{target.daysLabel || "days away"}</p>
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
      <div className="flex items-center bg-white rounded-2xl overflow-hidden shadow-xl focus-within:ring-2 focus-within:ring-white/50 transition-all">
        <span className="pl-4 text-gray-400 text-xl">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search constituency, district or candidate..."
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
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden">
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
                <span className="text-gray-400 text-sm">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quick stats ──────────────────────────────────
function QuickStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
      {[
        { value: "234", label: "Constituencies", icon: "🗳️" },
        { value: "3,800+", label: "Candidates Tracked", icon: "👤" },
        { value: "1,344", label: "Criminal Cases", icon: "⚖️" },
        { value: "48", label: "Promises Audited", icon: "📋" },
      ].map((s) => (
        <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl mb-1">{s.icon}</p>
          <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
        </div>
      ))}
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
    seats2021: 159,
  },
  {
    name: "AIADMK Alliance",
    color: "#2d7a4f",
    parties: ["AIADMK", "PMK", "TMC(M)"],
    leader: "Edappadi K. Palaniswami",
    seats2021: 75,
  },
  {
    name: "NDA",
    color: "#d35400",
    parties: ["BJP", "AMMK", "DMDK"],
    leader: "K. Annamalai",
    seats2021: 0,
  },
  {
    name: "TVK",
    color: "#1a5276",
    parties: ["TVK"],
    leader: "Vijay",
    seats2021: 0,
  },
];

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
    { label: t("home.nominations"), date: new Date("2026-04-06"), daysLabel: t("home.days_away") },
    { label: t("home.polling"),     date: new Date("2026-04-23"), daysLabel: t("home.days_away") },
    { label: t("home.results"),     date: new Date("2026-05-04"), daysLabel: t("home.days_away") },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <Header active="home" />

      {/* ── Hero with dramatic background ── */}
      <section className="relative overflow-hidden">
        {/* Background: dark gradient with subtle pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-terracotta/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

        {/* Floating ballot box accent */}
        <div className="absolute top-16 right-[15%] text-6xl opacity-10 hidden md:block">🗳️</div>
        <div className="absolute bottom-20 left-[10%] text-5xl opacity-10 hidden md:block">🏛️</div>

        {/* Content */}
        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-white/10">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
            </span>
            {t("home.badge")}
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight tracking-tight">
            {t("home.title")}<br />
            <span className="bg-gradient-to-r from-[#e8a87c] to-[#d35400] bg-clip-text text-transparent">
              {t("home.subtitle")}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 mb-2 max-w-2xl mx-auto">
            {t("home.tagline")}
          </p>
          {lang === "en" && (
            <p className="text-base text-white/50 mb-10 font-tamil">
              உங்கள் வாக்கு, உங்கள் உண்மை
            </p>
          )}
          {lang === "ta" && <div className="mb-10" />}

          <SearchBar constituencies={constituencies} />

          <p className="mt-4 text-xs text-white/40">
            {constituencies.length > 0
              ? `${constituencies.length} ${t("home.search_hint")}`
              : t("common.loading")}
          </p>

          {/* Countdown inside hero */}
          <div className="flex flex-wrap gap-4 justify-center mt-10">
            {countdownDates.map((d) => (
              <CountdownCard key={d.label} target={d} />
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L48 74.7C96 69 192 59 288 53.3C384 48 480 48 576 53.3C672 59 768 69 864 69.3C960 69 1056 59 1152 53.3C1248 48 1344 48 1392 48L1440 48V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z" fill="#faf9f6"/>
          </svg>
        </div>
      </section>

      {/* ── Quick Stats ── */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <QuickStats />
      </section>

      {/* ── Daily AI Briefing ── */}
      <DailyBriefing />

      {/* ── Explore Section ── */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Explore</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/districts", icon: "🗺️", label: "Districts", desc: "38 districts" },
            { href: "/manifesto", icon: "📜", label: "Manifesto Audit", desc: "DMK 2021 promises" },
            { href: "/compare", icon: "⚔️", label: "Compare", desc: "Side-by-side analysis" },
            { href: "/news", icon: "📰", label: "News", desc: "Latest updates" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="card hover:shadow-lg hover:-translate-y-0.5 transition-all group">
              <p className="text-3xl mb-2">{item.icon}</p>
              <p className="font-bold text-sm text-gray-900 group-hover:text-terracotta transition-colors">{item.label}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Alliance summary ── */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">2026 Alliance Map</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ALLIANCES.map((a) => (
            <div key={a.name} className="card border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: a.color }}>
              <p className="font-bold text-sm mb-1" style={{ color: a.color }}>{a.name}</p>
              <p className="text-xs text-gray-500 mb-1">{a.leader}</p>
              {a.seats2021 > 0 && (
                <p className="text-xs text-gray-400 mb-2">2021: {a.seats2021} seats</p>
              )}
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
              <h2 className="text-lg font-bold text-gray-900">{t("fc.title")}</h2>
              <p className="text-sm text-gray-500">
                {lang === "en"
                  ? "Paste any political claim — our AI finds sources and gives a verdict in seconds"
                  : "எந்தவொரு அரசியல் கூற்றையும் ஒட்டுங்கள் — எங்கள் AI ஆதாரங்களை கண்டறிந்து நொடிகளில் தீர்ப்பு வழங்கும்"}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              placeholder={lang === "en"
                ? `Try: "TVK has no political experience" or "DMK reduced power cuts"`
                : `முயற்சி: "TVK-க்கு அரசியல் அனுபவம் இல்லை" அல்லது "DMK மின்வெட்டை குறைத்தது"`
              }
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
          <p>{t("common.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
