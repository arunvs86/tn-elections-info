"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/components/LanguageProvider";

interface PollResult {
  alliance: string;
  votes: number;
  percentage: number;
}

const ALLIANCES = [
  { key: "DMK+", label: "DMK+ (INDIA)", color: "#c0392b", emoji: "🔴" },
  { key: "ADMK+", label: "ADMK+ (NDA)", color: "#2d7a4f", emoji: "🟢" },
  { key: "TVK", label: "TVK (Vijay)", color: "#1a5276", emoji: "🔵" },
  { key: "NTK", label: "NTK (Seeman)", color: "#6c3483", emoji: "🟣" },
];

function getFingerprint(): string {
  // Simple browser fingerprint (no PII) — combines screen + timezone + language
  const raw = [
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || 0,
  ].join("|");
  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "fp_" + Math.abs(hash).toString(36);
}

export default function OpinionPoll() {
  const { t } = useLang();
  const [results, setResults] = useState<PollResult[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedAlliance, setSelectedAlliance] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already voted + fetch results
  useEffect(() => {
    const fp = getFingerprint();
    const voted = localStorage.getItem("tn_poll_voted");
    if (voted) {
      setHasVoted(true);
      setSelectedAlliance(voted);
    }

    fetchResults();

    // Also check Supabase
    supabase
      .from("opinion_poll_votes")
      .select("alliance")
      .eq("fingerprint", fp)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHasVoted(true);
          setSelectedAlliance(data.alliance);
          localStorage.setItem("tn_poll_voted", data.alliance);
        }
      });
  }, []);

  async function fetchResults() {
    const { data } = await supabase
      .from("opinion_poll_votes")
      .select("alliance");

    if (data) {
      const counts: Record<string, number> = { "DMK+": 0, "ADMK+": 0, TVK: 0, NTK: 0 };
      data.forEach((v) => { counts[v.alliance] = (counts[v.alliance] || 0) + 1; });
      const total = data.length;
      setTotalVotes(total);
      setResults(
        ALLIANCES.map((a) => ({
          alliance: a.key,
          votes: counts[a.key] || 0,
          percentage: total > 0 ? Math.round(((counts[a.key] || 0) / total) * 1000) / 10 : 0,
        }))
      );
    }
  }

  async function handleVote(alliance: string) {
    if (hasVoted || voting) return;
    setVoting(true);
    setError(null);

    const fp = getFingerprint();

    const { error: insertError } = await supabase
      .from("opinion_poll_votes")
      .insert({ alliance, fingerprint: fp });

    if (insertError) {
      if (insertError.code === "23505") {
        // Duplicate — already voted
        setHasVoted(true);
        setError(null);
        localStorage.setItem("tn_poll_voted", alliance);
      } else {
        setError(`Error: ${insertError.message || insertError.code || "Unknown"}`);
        console.error("Poll vote error:", JSON.stringify(insertError));
      }
      setVoting(false);
      return;
    }

    setHasVoted(true);
    setSelectedAlliance(alliance);
    localStorage.setItem("tn_poll_voted", alliance);
    setVoting(false);
    fetchResults();
  }

  const maxVotes = Math.max(...results.map((r) => r.votes), 1);

  return (
    <div className="card border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🗳️</span>
        <h3 className="font-bold text-base text-gray-900">{t("poll.title")}</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">{t("poll.subtitle")}</p>

      {!hasVoted ? (
        /* Voting buttons */
        <div className="space-y-2">
          {ALLIANCES.map((a) => (
            <button
              key={a.key}
              onClick={() => handleVote(a.key)}
              disabled={voting}
              className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50"
              style={{
                borderColor: a.color + "40",
                background: a.color + "08",
              }}
            >
              <span className="font-semibold text-sm" style={{ color: a.color }}>
                {a.emoji} {a.label}
              </span>
            </button>
          ))}
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      ) : (
        /* Results */
        <div className="space-y-3">
          {ALLIANCES.map((a) => {
            const r = results.find((r) => r.alliance === a.key);
            const votes = r?.votes || 0;
            const pct = r?.percentage || 0;
            const isSelected = selectedAlliance === a.key;
            return (
              <div key={a.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isSelected ? "font-bold" : ""}`} style={{ color: a.color }}>
                    {a.emoji} {a.label} {isSelected && "✓"}
                  </span>
                  <span className="text-sm font-bold" style={{ color: a.color }}>{pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max((votes / maxVotes) * 100, 2)}%`,
                      backgroundColor: a.color,
                      opacity: isSelected ? 1 : 0.7,
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{votes.toLocaleString()} {t("poll.votes_label")}</p>
              </div>
            );
          })}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              {t("poll.total_votes")}: <span className="font-bold text-gray-700">{totalVotes.toLocaleString()}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
