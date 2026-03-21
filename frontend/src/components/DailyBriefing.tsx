"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/components/LanguageProvider";

interface BriefingStory {
  title: string;
  link: string;
  source: string;
}

interface Briefing {
  id?: number;
  briefing_date: string;
  title_en: string;
  title_ta: string;
  body_en: string;
  body_ta: string;
  stories: BriefingStory[] | string;
  created_at?: string;
}

export default function DailyBriefing() {
  const { lang, t } = useLang();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    fetch(`${backendUrl}/api/briefing/latest`)
      .then((res) => {
        if (!res.ok) throw new Error("No briefing");
        return res.json();
      })
      .then((data) => {
        // Parse stories if it comes as a string
        if (typeof data.stories === "string") {
          try {
            data.stories = JSON.parse(data.stories);
          } catch {
            data.stories = [];
          }
        }
        setBriefing(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <div className="card border-l-4 border-l-terracotta animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
          <div className="h-4 bg-gray-100 rounded w-full mb-2" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </div>
      </section>
    );
  }

  if (error || !briefing) {
    return null; // Silently hide if no briefing available
  }

  const title = lang === "ta" ? briefing.title_ta : briefing.title_en;
  const body = lang === "ta" ? briefing.body_ta : briefing.body_en;
  const stories: BriefingStory[] = Array.isArray(briefing.stories)
    ? briefing.stories
    : [];

  // Format the date
  const dateStr = briefing.briefing_date;
  let formattedDate = dateStr;
  try {
    const d = new Date(dateStr + "T00:00:00");
    formattedDate = d.toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    // keep raw date string
  }

  // Show first 2 paragraphs when collapsed
  const paragraphs = body.split("\n").filter((p) => p.trim());
  const previewText = paragraphs.slice(0, 2).join("\n\n");
  const hasMore = paragraphs.length > 2 || stories.length > 0;

  return (
    <section className="max-w-6xl mx-auto px-4 pb-10">
      <div className="card border-l-4 border-l-terracotta">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-[10px] bg-terracotta/10 flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-terracotta"
            >
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              <path d="M18 14h-8" />
              <path d="M15 18h-5" />
              <path d="M10 6h8v4h-8V6Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {t("briefing.section_title")}
              </h2>
              <span className="inline-flex items-center gap-1 bg-terracotta/10 text-terracotta px-2 py-0.5 rounded-full text-xs font-medium">
                <span className="pulse-dot inline-block w-1.5 h-1.5 bg-terracotta rounded-full" />
                {t("briefing.ai_tag")}
              </span>
            </div>
            <p className="text-xs text-gray-500">{formattedDate}</p>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          {title}
        </h3>

        {/* Body */}
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line mb-3">
          {expanded ? body : previewText}
        </div>

        {/* Expand/Collapse + Stories */}
        {hasMore && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-terracotta font-medium hover:underline mb-3 inline-block"
            >
              {expanded ? t("briefing.show_less") : t("briefing.read_more")}
            </button>

            {expanded && stories.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t("briefing.sources")}
                </p>
                <div className="flex flex-col gap-1.5">
                  {stories.map((s, i) => (
                    <a
                      key={i}
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-terracotta transition-colors flex items-start gap-2 group"
                    >
                      <span className="text-gray-400 group-hover:text-terracotta text-xs mt-0.5 flex-shrink-0">
                        {s.source}
                      </span>
                      <span className="underline decoration-gray-300 group-hover:decoration-terracotta">
                        {s.title}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-50">
          {t("briefing.disclaimer")}
        </p>
      </div>
    </section>
  );
}
