"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/components/LanguageProvider";

// ── Thamizhan avatar SVG ──────────────────────────────
function ThamizhanAvatar({ size = 64 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #c84b11 0%, #a33d0e 100%)",
        fontSize: size * 0.45,
        fontFamily: "'Noto Serif Tamil', serif",
        boxShadow: "0 4px 20px rgba(200,75,17,0.35)",
      }}
    >
      த
    </div>
  );
}

// ── Constituency search ───────────────────────────────
interface Constituency {
  id: number;
  name: string;
  district: string;
}

// ── Main Page ─────────────────────────────────────────
type Step = "form" | "success";

export default function PledgePage() {
  const { lang } = useLang();
  const isTa = lang === "ta";

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [constSearch, setConstSearch] = useState("");
  const [constResults, setConstResults] = useState<Constituency[]>([]);
  const [selectedConst, setSelectedConst] = useState<Constituency | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pledgeCount, setPledgeCount] = useState<number | null>(null);
  const [pledgedName, setPledgedName] = useState("");

  // Load total pledge count
  useEffect(() => {
    supabase
      .from("pledges")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => {
        if (count != null) setPledgeCount(count);
      });
  }, []);

  // Constituency search
  useEffect(() => {
    if (constSearch.length < 2) {
      setConstResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("constituencies")
        .select("id, name, district")
        .ilike("name", `%${constSearch}%`)
        .limit(6);
      if (data) setConstResults(data);
    }, 250);
    return () => clearTimeout(timer);
  }, [constSearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(isTa ? "உங்கள் பெயரை உள்ளிடவும்" : "Please enter your name");
      return;
    }
    // Basic phone validation if provided
    if (phone && !/^[6-9]\d{9}$/.test(phone.replace(/\s/g, ""))) {
      setError(isTa ? "சரியான கைபேசி எண் உள்ளிடவும்" : "Please enter a valid 10-digit mobile number");
      return;
    }

    setError("");
    setSubmitting(true);

    const { error: insertError } = await supabase.from("pledges").insert({
      name: name.trim(),
      phone: phone.trim() || null,
      constituency_id: selectedConst?.id || null,
      constituency_name: selectedConst?.name || null,
    });

    if (insertError) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setPledgedName(name.trim());
    setPledgeCount((prev) => (prev ?? 0) + 1);
    setStep("success");
    setSubmitting(false);
  }

  const whatsappText = encodeURIComponent(
    `நான் Thamizhan. நான் April 23 vote போடுவேன்.\n\nUngal thalai ezuthu.. ungal viralil..\n\n pledge பண்ணுங்கள் → https://tnelections.info/pledge`
  );

  return (
    <div className="min-h-screen" style={{ background: "#faf9f6" }}>
      <Header />

      <div className="max-w-lg mx-auto px-4 py-10">

        {step === "form" && (
          <>
            {/* Hero */}
            <div className="text-center mb-8">
              <ThamizhanAvatar size={72} />
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                  {isTa ? "தமிழனின் உறுதிமொழி" : "Thamizhan's Pledge"}
                </p>
                <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
                  உங்கள் தலை எழுத்து..
                </h1>
                <h1 className="text-2xl font-extrabold leading-tight" style={{ color: "#c84b11" }}>
                  உங்கள் விரலில்.
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                  {isTa
                    ? "April 23 vote போட உறுதி கொடுங்கள். Thamizhan April 22 & 23 உங்களுக்கு call செய்வான்."
                    : "Pledge to vote on April 23. Thamizhan will call you on April 22 & 23 to remind you."}
                </p>
              </div>
            </div>

            {/* Live counter */}
            {pledgeCount !== null && (
              <div
                className="flex items-center justify-center gap-2 rounded-2xl p-4 mb-6"
                style={{ background: "#fdf0ea", border: "1px solid #f5d5c5" }}
              >
                <span className="text-2xl font-extrabold" style={{ color: "#c84b11" }}>
                  {pledgeCount.toLocaleString("en-IN")}
                </span>
                <span className="text-sm text-gray-600">
                  {isTa ? "தமிழர்கள் உறுதி கொடுத்தனர்" : "Thamizhan-s have pledged"}
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {isTa ? "உங்கள் பெயர்" : "Your Name"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isTa ? "பெயர் உள்ளிடவும்" : "Enter your name"}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {isTa ? "கைபேசி எண்" : "Mobile Number"}
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    {isTa ? "(விரும்பினால்)" : "(optional)"}
                  </span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                  <span>📞</span>
                  {isTa
                    ? "Thamizhan April 22 இரவு & April 23 காலை உங்களை call செய்வான். தனிப்பட்ட தகவல் பாதுகாப்பாக இருக்கும்."
                    : "Thamizhan will call you the night of April 22 & morning of April 23. Your number is never shared."}
                </p>
              </div>

              {/* Constituency */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {isTa ? "உங்கள் தொகுதி" : "Your Constituency"}
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    {isTa ? "(விரும்பினால்)" : "(optional)"}
                  </span>
                </label>
                {selectedConst ? (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-orange-300 bg-orange-50">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedConst.name}</p>
                      <p className="text-xs text-gray-500">{selectedConst.district} District</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedConst(null); setConstSearch(""); }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={constSearch}
                      onChange={(e) => setConstSearch(e.target.value)}
                      placeholder={isTa ? "தொகுதி பெயர் தேடுக..." : "Search constituency name..."}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    {constResults.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                        {constResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedConst(c);
                              setConstSearch("");
                              setConstResults([]);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.district} District</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl text-white font-bold text-base transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #c84b11 0%, #a33d0e 100%)" }}
              >
                {submitting
                  ? (isTa ? "பதிவு செய்கிறோம்..." : "Pledging...")
                  : (isTa ? "நான் Thamizhan — நான் vote போடுவேன்" : "I am Thamizhan — I will vote")}
              </button>

              <p className="text-center text-xs text-gray-400">
                {isTa
                  ? "உங்கள் தகவல் தேர்தல் நினைவூட்டல் மட்டுமே பயன்படுத்தப்படும்."
                  : "Your information is used only for election reminders. Nothing else."}
              </p>
            </form>
          </>
        )}

        {step === "success" && (
          <div className="text-center">
            {/* Success hero */}
            <div className="mb-6">
              <ThamizhanAvatar size={80} />
              <div className="mt-5">
                <p className="text-3xl font-extrabold text-gray-900 mb-1">
                  நன்றி, {pledgedName}!
                </p>
                <h2 className="text-xl font-bold mt-1" style={{ color: "#c84b11" }}>
                  நீங்கள் இப்போது Thamizhan.
                </h2>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                  {phone
                    ? (isTa
                        ? `April 22 இரவும் April 23 காலையும் Thamizhan உங்களை ${phone} என்ற எண்ணில் call செய்வான்.`
                        : `Thamizhan will call you at ${phone} on the night of April 22 and morning of April 23.`)
                    : (isTa
                        ? "April 23 — உங்கள் ஒரு vote, TN-ஐ மாற்றும்."
                        : "April 23 — your one vote changes TN.")}
                </p>
              </div>
            </div>

            {/* Counter */}
            {pledgeCount !== null && (
              <div
                className="rounded-2xl p-5 mb-6"
                style={{ background: "#fdf0ea", border: "1px solid #f5d5c5" }}
              >
                <p className="text-4xl font-extrabold" style={{ color: "#c84b11" }}>
                  {pledgeCount.toLocaleString("en-IN")}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {isTa ? "தமிழர்கள் உறுதி கொடுத்தனர்" : "Thamizhan-s have pledged"}
                </p>
              </div>
            )}

            {/* Tagline card */}
            <div
              className="rounded-2xl p-5 mb-6 text-center"
              style={{ background: "linear-gradient(135deg, #c84b11 0%, #a33d0e 100%)" }}
            >
              <p className="text-white font-bold text-lg leading-relaxed">
                உங்கள் தலை எழுத்து..
              </p>
              <p className="text-white font-bold text-lg">
                உங்கள் விரலில்.
              </p>
              <p className="text-orange-200 text-xs mt-2">tnelections.info</p>
            </div>

            {/* Share */}
            <div className="space-y-3">
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm"
                style={{ background: "#25D366" }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {isTa ? "WhatsApp-ல் பகிர்" : "Share on WhatsApp"}
              </a>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `நான் Thamizhan. நான் April 23 vote போடுவேன்.\n\nUngal thalai ezuthu.. ungal viralil..\n\n → tnelections.info/pledge`
                  );
                }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {isTa ? "Link நகலெடு" : "Copy Link"}
              </button>

              <Link
                href="/"
                className="block text-center text-sm text-gray-400 hover:text-gray-600 pt-2"
              >
                {isTa ? "← முகப்பு பக்கம்" : "← Back to Home"}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
