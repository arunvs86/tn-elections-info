"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://zealous-spontaneity-production-71e6.up.railway.app";

interface Review {
  rating: number;
  comment: string | null;
  created_at: string;
}

interface Summary {
  average: number;
  total: number;
  recent: Review[];
}

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={`text-2xl transition-transform ${onChange ? "cursor-pointer hover:scale-110" : "cursor-default"} ${n <= active ? "text-amber-400" : "text-gray-200"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ReviewWidget() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/reviews/summary`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => null);
  }, [submitted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setLoading(true);
    try {
      await fetch(`${API}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100 py-10 px-4">
      <div className="max-w-xl mx-auto text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">Share your experience</p>
        <h3 className="text-xl font-extrabold text-gray-900 mb-1">How useful was tnelections.info?</h3>
        <p className="text-sm text-gray-500 mb-6">Anonymous · takes 10 seconds · helps me improve</p>

        {submitted ? (
          <div className="py-6">
            <div className="text-4xl mb-3">🙏</div>
            <p className="text-lg font-bold text-gray-800">Thank you for your feedback!</p>
            <p className="text-sm text-gray-500 mt-1">Your review helps me build a better platform for voters.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center">
              <Stars value={rating} onChange={setRating} />
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-500">
                {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
              </p>
            )}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment (optional)…"
              rows={3}
              maxLength={1000}
              className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
            <button
              type="submit"
              disabled={!rating || loading}
              className="px-8 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Submitting…" : "Submit Review"}
            </button>
          </form>
        )}

        {/* Summary */}
        {summary && summary.total > 0 && (
          <div className="mt-8 pt-6 border-t border-indigo-100">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Stars value={Math.round(summary.average)} />
              <span className="text-lg font-bold text-gray-800">{summary.average}</span>
              <span className="text-sm text-gray-400">({summary.total} {summary.total === 1 ? "review" : "reviews"})</span>
            </div>
            {summary.recent.length > 0 && (
              <div className="space-y-2">
                {summary.recent.map((r, i) => (
                  <div key={i} className="bg-white rounded-xl px-4 py-3 text-left border border-indigo-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Stars value={r.rating} />
                    </div>
                    <p className="text-sm text-gray-600">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
