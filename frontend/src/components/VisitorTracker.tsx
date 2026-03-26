"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function getFingerprint(): string {
  const raw = [
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || 0,
  ].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "fp_" + Math.abs(hash).toString(36);
}

export default function VisitorTracker() {
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  useEffect(() => {
    const fp = getFingerprint();
    const page = window.location.pathname;

    // Log this visit
    supabase
      .from("site_visits")
      .insert({ page, fingerprint: fp })
      .then(() => {});

    // Get unique visitor count
    supabase
      .from("site_visits")
      .select("fingerprint")
      .then(({ data }) => {
        if (data) {
          const unique = new Set(data.map((d) => d.fingerprint)).size;
          setVisitorCount(unique);
        }
      });
  }, []);

  if (visitorCount === null) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
      </span>
      {visitorCount.toLocaleString()} visitors
    </span>
  );
}
