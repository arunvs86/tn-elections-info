"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────
interface ConstResult {
  id: number;
  name: string;
  district: string;
  total_voters_2021: number | null;
  voters_total_2026: number | null;
  voters_male_2026: number | null;
  voters_female_2026: number | null;
}

interface ElectionResult {
  total_votes: number;
  margin: number;
  winner_name: string;
  winner_party: string;
  turnout: number;
}

interface CalcData {
  constituency: ConstResult;
  result: ElectionResult;
  nonVoters: number;
  multiplier: number;
  newVoters: number | null; // added in SIR 2026 vs 2021
}

// ── Canvas card generator ──────────────────────────────
async function generateCard(data: CalcData): Promise<string> {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  await document.fonts.ready;

  // Background
  ctx.fillStyle = "#faf9f6";
  ctx.fillRect(0, 0, W, H);

  // Top terracotta band
  ctx.fillStyle = "#c84b11";
  ctx.fillRect(0, 0, W, 12);

  // Bottom terracotta band
  ctx.fillStyle = "#c84b11";
  ctx.fillRect(0, H - 12, W, 12);

  // Big question mark background circle
  ctx.beginPath();
  ctx.arc(W / 2, 320, 200, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(200, 75, 17, 0.06)";
  ctx.fill();

  // "உங்கள் vote" Tamil header
  ctx.fillStyle = "#c84b11";
  ctx.font = "bold 52px 'Noto Serif Tamil', serif";
  ctx.textAlign = "center";
  ctx.fillText("உங்கள் vote முக்கியமா?", W / 2, 120);

  // Constituency name
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 64px 'Outfit', sans-serif";
  ctx.fillText(data.constituency.name.toUpperCase(), W / 2, 210);

  ctx.fillStyle = "#888";
  ctx.font = "32px 'Outfit', sans-serif";
  ctx.fillText(data.constituency.district + " District", W / 2, 260);

  // ── Big number: non-voters ──
  ctx.fillStyle = "#c84b11";
  ctx.font = "bold 120px 'Outfit', sans-serif";
  ctx.fillText(fmt(data.nonVoters), W / 2, 390);

  ctx.fillStyle = "#444";
  ctx.font = "34px 'Outfit', sans-serif";
  ctx.fillText("people did NOT vote in 2021", W / 2, 440);

  // Divider line
  ctx.strokeStyle = "#e5e0d8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 480);
  ctx.lineTo(W - 80, 480);
  ctx.stroke();

  // Two stat boxes
  // Left: winning margin
  roundRect(ctx, 80, 510, 430, 180, 20, "#fff3ef");
  ctx.fillStyle = "#c84b11";
  ctx.font = "bold 72px 'Outfit', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(fmt(data.result.margin), 295, 610);
  ctx.fillStyle = "#666";
  ctx.font = "28px 'Outfit', sans-serif";
  ctx.fillText("winning margin", 295, 660);

  // Right: multiplier
  roundRect(ctx, 570, 510, 430, 180, 20, "#faf9f6");
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 72px 'Outfit', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(data.multiplier + "x", 785, 610);
  ctx.fillStyle = "#666";
  ctx.font = "28px 'Outfit', sans-serif";
  ctx.fillText("non-voters vs margin", 785, 660);

  // Main insight text
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 38px 'Outfit', sans-serif";
  ctx.textAlign = "center";
  const insight = `Non-voters outnumbered the winner's margin ${data.multiplier}x.`;
  ctx.fillText(insight, W / 2, 750);

  // 2026 voters if available
  if (data.constituency.voters_total_2026) {
    ctx.fillStyle = "#555";
    ctx.font = "30px 'Outfit', sans-serif";
    ctx.fillText(
      `2026 Roll: ${fmt(data.constituency.voters_total_2026)} registered voters`,
      W / 2, 800
    );
  }

  // Tagline
  ctx.fillStyle = "#c84b11";
  ctx.font = "bold 40px 'Noto Serif Tamil', serif";
  ctx.fillText("உங்கள் தலை எழுத்து.. உங்கள் விரலில்.", W / 2, 880);

  // Branding
  ctx.fillStyle = "#aaa";
  ctx.font = "28px 'Outfit', sans-serif";
  ctx.fillText("tnelections.info  ·  April 23, 2026", W / 2, 940);

  // Bottom terracotta dot
  ctx.beginPath();
  ctx.arc(W / 2, 980, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#c84b11";
  ctx.fill();

  return canvas.toDataURL("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number, fill: string
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

// ── Main component ──────────────────────────────────────
export default function VoteCalculatorPage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ConstResult[]>([]);
  const [calcData, setCalcData] = useState<CalcData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search constituencies
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("constituencies")
        .select("id,name,district,total_voters_2021,voters_total_2026,voters_male_2026,voters_female_2026")
        .ilike("name", `%${query}%`)
        .limit(6);
      setSuggestions(data || []);
    }, 250);
  }, [query]);

  async function selectConstituency(c: ConstResult) {
    setQuery(c.name);
    setSuggestions([]);
    setLoading(true);
    setCalcData(null);
    setCardUrl(null);

    const { data: resultData } = await supabase
      .from("election_results")
      .select("total_votes,margin,winner_name,winner_party,turnout")
      .eq("constituency_id", c.id)
      .eq("election_year", 2021)
      .single();

    setLoading(false);
    if (!resultData || !c.total_voters_2021) return;

    const nonVoters = c.total_voters_2021 - resultData.total_votes;
    const multiplier = Math.floor(nonVoters / resultData.margin);
    const newVoters = c.voters_total_2026
      ? c.voters_total_2026 - c.total_voters_2021
      : null;

    setCalcData({
      constituency: c,
      result: resultData,
      nonVoters,
      multiplier,
      newVoters,
    });
  }

  async function handleGenerateCard() {
    if (!calcData) return;
    setGenerating(true);
    const url = await generateCard(calcData);
    setCardUrl(url);
    setGenerating(false);
  }

  function handleDownload() {
    if (!cardUrl || !calcData) return;
    const a = document.createElement("a");
    a.href = cardUrl;
    a.download = `vote-${calcData.constituency.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  }

  function handleWhatsApp() {
    if (!calcData) return;
    const { constituency: c, nonVoters, multiplier, result } = calcData;
    const text = encodeURIComponent(
      `📊 ${c.name} — உங்கள் vote முக்கியமா?\n\n` +
      `2021-ல் ${fmt(nonVoters)} பேர் vote போடவில்லை.\n` +
      `வெற்றி வித்தியாசம் வெறும் ${fmt(result.margin)}.\n` +
      `Non-voters were ${multiplier}x the winning margin!\n\n` +
      `உங்கள் தலை எழுத்து.. உங்கள் விரலில்.\n` +
      `👉 tnelections.info/vote-calculator`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  const d = calcData;

  return (
    <div className="min-h-screen" style={{ background: "#faf9f6" }}>
      <Header />
      <div className="max-w-xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🗳️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Will Your Vote Matter?
          </h1>
          <p className="text-sm" style={{ color: "#c84b11", fontWeight: 600 }}>
            உங்கள் vote முக்கியமா?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Enter your constituency to see the real numbers
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type your constituency name..."
            className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-terracotta shadow-sm"
            style={{ "--tw-ring-color": "#c84b11" } as React.CSSProperties}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  onClick={() => selectConstituency(s)}
                  className="w-full text-left px-4 py-3 hover:bg-orange-50 text-sm border-b border-gray-50 last:border-0"
                >
                  <span className="font-semibold text-gray-900">{s.name}</span>
                  <span className="text-gray-400 ml-2 text-xs">{s.district}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
        )}

        {/* Results */}
        {d && (
          <div className="space-y-4">

            {/* Big non-voter stat */}
            <div className="rounded-2xl p-6 text-center shadow-sm border border-orange-100"
              style={{ background: "linear-gradient(135deg, #fff8f5 0%, #fff3ef 100%)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {d.constituency.name} · 2021 Election
              </p>
              <p className="text-6xl font-bold mb-1" style={{ color: "#c84b11" }}>
                {fmt(d.nonVoters)}
              </p>
              <p className="text-base font-medium text-gray-600">
                people did <strong>not</strong> vote
              </p>
              <p className="text-xs text-gray-400 mt-1">
                out of {fmt(d.constituency.total_voters_2021!)} registered voters
              </p>
            </div>

            {/* Two stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
                <p className="text-3xl font-bold text-gray-900">{fmt(d.result.margin)}</p>
                <p className="text-xs text-gray-500 mt-1">Winning margin</p>
                <p className="text-xs text-gray-400">{d.result.winner_name} ({d.result.winner_party})</p>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
                <p className="text-3xl font-bold" style={{ color: "#c84b11" }}>{d.multiplier}x</p>
                <p className="text-xs text-gray-500 mt-1">Non-voters vs margin</p>
                <p className="text-xs text-gray-400">Could have changed result</p>
              </div>
            </div>

            {/* Insight box */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 leading-relaxed">
                Non-voters outnumbered the winner&apos;s margin by{" "}
                <span style={{ color: "#c84b11" }} className="font-bold">{d.multiplier}x</span>.
                Just{" "}
                <span className="font-bold">{fmt(Math.ceil(d.result.margin / 2))}</span>{" "}
                people switching their vote (or showing up) would have changed the result.
              </p>

              {d.newVoters !== null && d.newVoters > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-sm text-gray-600">
                    🆕 <span className="font-semibold text-green-700">+{fmt(d.newVoters)}</span> new voters
                    added in the 2026 SIR roll.{" "}
                    {d.newVoters > d.result.margin
                      ? <span className="font-semibold" style={{ color: "#c84b11" }}>That&apos;s more than last year&apos;s winning margin.</span>
                      : "New voters could tip the balance."
                    }
                  </p>
                </div>
              )}

              {d.constituency.voters_male_2026 && d.constituency.voters_female_2026 && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-xs text-gray-500 mb-1">2026 voter split</p>
                  <div className="flex rounded-full overflow-hidden h-3">
                    <div className="bg-blue-400" style={{ width: `${Math.round(d.constituency.voters_male_2026 / d.constituency.voters_total_2026! * 100)}%` }} />
                    <div className="bg-pink-400" style={{ width: `${Math.round(d.constituency.voters_female_2026 / d.constituency.voters_total_2026! * 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>👨 {fmt(d.constituency.voters_male_2026)} men</span>
                    <span>👩 {fmt(d.constituency.voters_female_2026)} women</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tagline */}
            <div className="text-center py-2">
              <p className="text-base font-bold" style={{ color: "#c84b11" }}>
                உங்கள் தலை எழுத்து.. உங்கள் விரலில்.
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {!cardUrl ? (
                <button
                  onClick={handleGenerateCard}
                  disabled={generating}
                  className="w-full py-4 rounded-xl font-bold text-white text-sm shadow-md transition-opacity"
                  style={{ background: "#c84b11", opacity: generating ? 0.7 : 1 }}
                >
                  {generating ? "Generating card..." : "🖼️ Generate Shareable Card"}
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Preview */}
                  <img src={cardUrl} alt="Share card" className="w-full rounded-2xl shadow-md border border-gray-100" />
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleDownload}
                      className="py-3 rounded-xl font-bold text-sm border-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      style={{ borderColor: "#c84b11", color: "#c84b11" }}
                    >
                      ⬇️ Download
                    </button>
                    <button
                      onClick={handleWhatsApp}
                      className="py-3 rounded-xl font-bold text-sm text-white"
                      style={{ background: "#25D366" }}
                    >
                      📲 Share on WhatsApp
                    </button>
                  </div>
                  <button
                    onClick={() => { setCardUrl(null); setCalcData(null); setQuery(""); }}
                    className="w-full py-2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    Try another constituency →
                  </button>
                </div>
              )}

              {/* Pledge CTA */}
              {!cardUrl && (
                <Link
                  href="/pledge"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm border-2 transition-colors"
                  style={{ borderColor: "#c84b11", color: "#c84b11" }}
                >
                  ✊ Take the Thamizhan Pledge — I will vote
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!d && !loading && (
          <div className="mt-8 space-y-3">
            <p className="text-center text-xs text-gray-400 mb-4">Popular constituencies</p>
            {["Saidapet", "Coimbatore South", "Madurai Central", "Sholinghur", "Hosur"].map(name => (
              <button
                key={name}
                onClick={() => { setQuery(name); }}
                className="w-full text-left px-4 py-3 bg-white rounded-xl border border-gray-100 text-sm font-medium text-gray-700 hover:border-terracotta hover:text-terracotta transition-colors shadow-sm"
              >
                {name} →
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
