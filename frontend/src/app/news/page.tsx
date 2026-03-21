"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useLang } from "@/components/LanguageProvider";
import Link from "next/link";

// ── Types ──────────────────────────────────────────
interface NewsStory {
  title: string;
  link: string;
  description: string;
  source: string;
  pub_date: string;
  bias?: string;
}

// ── Source display config ───────────────────────────
const SOURCE_CONFIG: Record<string, { bias: string; biasColor: string }> = {
  "The Hindu": { bias: "Centre-Left", biasColor: "#2563eb" },
  "Times of India": { bias: "Centre", biasColor: "#6b7280" },
  "NDTV": { bias: "Centre-Left", biasColor: "#2563eb" },
  "News18 Tamil": { bias: "Centre-Right", biasColor: "#dc2626" },
};

const SOURCE_NAMES = Object.keys(SOURCE_CONFIG);

// Election keywords for filtering
const ELECTION_KEYWORDS = [
  "election", "vote", "voting", "candidate", "dmk", "admk", "aiadmk",
  "bjp", "tvk", "constituency", "mla", "mp", "poll", "ballot",
  "campaign", "manifesto", "alliance", "coalition", "seat", "winner",
  "nomination", "commission", "eci", "assembly",
  "stalin", "palaniswami", "annamalai", "vijay", "kamal",
  "congress", "pmk", "vck", "ntk", "mdmk", "cpim", "cpi",
  "dravidian", "legislature", "minister", "chief minister",
  "political", "party", "opposition", "ruling", "rally",
  "தேர்தல்", "வேட்பாளர்", "கூட்டணி", "சட்டசபை",
];

// Party keywords for tagging stories
const PARTY_TAGS: { keywords: string[]; name: string; color: string }[] = [
  { keywords: ["dmk", "stalin", "udhayanidhi", "dravidar"], name: "DMK", color: "#c0392b" },
  { keywords: ["aiadmk", "admk", "palaniswami", "eps", "edappadi"], name: "AIADMK", color: "#2d7a4f" },
  { keywords: ["bjp", "annamalai", "modi", "nda"], name: "BJP", color: "#d35400" },
  { keywords: ["tvk", "vijay", "tamilaga"], name: "TVK", color: "#1a5276" },
  { keywords: ["ntk", "seeman", "naam tamilar"], name: "NTK", color: "#6c3483" },
  { keywords: ["congress", "inc", "rahul"], name: "INC", color: "#1565c0" },
  { keywords: ["pmk", "ramadoss", "anbumani"], name: "PMK", color: "#b8860b" },
  { keywords: ["mnm", "kamal", "makkal"], name: "MNM", color: "#0e6655" },
];

function detectParties(text: string): { name: string; color: string }[] {
  const lower = text.toLowerCase();
  return PARTY_TAGS.filter((p) =>
    p.keywords.some((kw) => lower.includes(kw))
  ).map((p) => ({ name: p.name, color: p.color }));
}

function isElectionRelated(story: NewsStory): boolean {
  const text = `${story.title} ${story.description}`.toLowerCase();
  return ELECTION_KEYWORDS.some((kw) => text.includes(kw));
}

// ── Time ago helper ────────────────────────────────
function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return "";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

// ── Main Page ──────────────────────────────────────
export default function NewsPage() {
  const { t } = useLang();
  const [stories, setStories] = useState<NewsStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterParty, setFilterParty] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [onlyElection, setOnlyElection] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await fetch("/api/news");
        if (!res.ok) throw new Error("Failed to fetch news");
        const data: NewsStory[] = await res.json();
        setStories(data);
      } catch {
        setStories([]);
      }
      setLoading(false);
    }

    fetchAll();
  }, []);

  // Apply filters
  const filtered = stories.filter((s) => {
    if (onlyElection && !isElectionRelated(s)) return false;
    if (filterSource && s.source !== filterSource) return false;
    if (filterParty) {
      const parties = detectParties(`${s.title} ${s.description}`);
      if (!parties.some((p) => p.name === filterParty)) return false;
    }
    return true;
  });

  // feedInfo lookup for rendering
  const feedInfo = SOURCE_CONFIG;

  return (
    <div className="min-h-screen bg-cream">
      <Header active="news" />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 mb-4">
          <Link href="/" className="hover:text-terracotta">Home</Link>
          {" / "}
          <span className="text-gray-600 font-medium">Party News Feed</span>
        </p>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          {t("news.title")}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {t("news.subtitle")}
        </p>

        {/* ── Filters ── */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Election filter toggle */}
            <button
              onClick={() => setOnlyElection(!onlyElection)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                onlyElection
                  ? "bg-terracotta text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {onlyElection ? "Election News Only" : "All TN News"}
            </button>

            <div className="w-px h-5 bg-gray-200" />

            {/* Source filter */}
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_NAMES.map((name) => {
                const cfg = SOURCE_CONFIG[name];
                return (
                  <button
                    key={name}
                    onClick={() =>
                      setFilterSource(filterSource === name ? null : name)
                    }
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 ${
                      filterSource === name
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {name}
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: cfg.biasColor }}
                    />
                  </button>
                );
              })}
            </div>

            <div className="w-px h-5 bg-gray-200" />

            {/* Party filter */}
            <div className="flex flex-wrap gap-1.5">
              {PARTY_TAGS.slice(0, 5).map((party) => (
                <button
                  key={party.name}
                  onClick={() =>
                    setFilterParty(filterParty === party.name ? null : party.name)
                  }
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    filterParty === party.name
                      ? "text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  style={
                    filterParty === party.name
                      ? { background: party.color }
                      : {}
                  }
                >
                  {party.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Source bias legend ── */}
        <div className="flex flex-wrap gap-4 mb-6 text-xs text-gray-500">
          <span className="font-semibold text-gray-600">Source Bias:</span>
          {[
            { label: "Centre-Left", color: "#2563eb" },
            { label: "Centre", color: "#6b7280" },
            { label: "Centre-Right", color: "#dc2626" },
          ].map((b) => (
            <span key={b.label} className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: b.color }}
              />
              {b.label}
            </span>
          ))}
        </div>

        {/* ── Stories ── */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3">📰</p>
            <p className="text-gray-500 text-sm">No stories found with current filters</p>
            <button
              onClick={() => {
                setFilterParty(null);
                setFilterSource(null);
                setOnlyElection(false);
              }}
              className="text-terracotta text-sm font-medium mt-2 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              {filtered.length} stories from {new Set(filtered.map((s) => s.source)).size} sources
            </p>

            {filtered.map((story, i) => {
              const parties = detectParties(`${story.title} ${story.description}`);
              const feed = feedInfo[story.source] || { bias: story.bias || "Unknown", biasColor: "#888" };
              const desc = story.description;

              return (
                <a
                  key={i}
                  href={story.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card block hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start gap-3">
                    {/* Bias indicator */}
                    <div
                      className="w-1 self-stretch rounded-full flex-shrink-0"
                      style={{ background: feed?.biasColor || "#888" }}
                    />

                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-terracotta transition-colors mb-1 leading-snug">
                        {story.title}
                      </h3>

                      {/* Description */}
                      {desc && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                          {desc}
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Source + bias */}
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ background: feed?.biasColor || "#888" }}
                          />
                          {story.source}
                          {feed && (
                            <span className="text-gray-300 ml-0.5">
                              · {feed.bias}
                            </span>
                          )}
                        </span>

                        {/* Time */}
                        {story.pub_date && timeAgo(story.pub_date) && (
                          <span className="text-xs text-gray-300">
                            · {timeAgo(story.pub_date)}
                          </span>
                        )}

                        {/* Party tags */}
                        {parties.map((p) => (
                          <span
                            key={p.name}
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              background: p.color + "15",
                              color: p.color,
                            }}
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>{t("common.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
