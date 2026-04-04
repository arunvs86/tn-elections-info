"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Header from "@/components/Header";
import ScopedChat from "@/components/ScopedChat";
import ConnectionGraph, { type GraphData } from "@/components/ConnectionGraph";

// ── IPC Sections Lookup (English + Tamil + severity) ──
const IPC: Record<string, { en: string; ta: string; severity: string; category: string }> = {
  "34": { en: "Acts done by several persons in furtherance of common intention", ta: "பொது நோக்கத்துடன் கூட்டு செயல்", severity: "minor", category: "abetment" },
  "107": { en: "Abetment of a thing", ta: "குற்றத்திற்கு உடந்தை", severity: "moderate", category: "abetment" },
  "109": { en: "Punishment of abetment if act abetted is committed", ta: "உடந்தை குற்றத்திற்கு தண்டனை", severity: "moderate", category: "abetment" },
  "120B": { en: "Criminal conspiracy", ta: "குற்றவியல் சதி", severity: "serious", category: "conspiracy" },
  "124A": { en: "Sedition", ta: "தேசத்துரோகம்", severity: "grave", category: "sedition" },
  "138": { en: "Dishonour of cheque (NI Act)", ta: "காசோலை மோசடி", severity: "moderate", category: "fraud" },
  "143": { en: "Unlawful assembly", ta: "சட்டவிரோத கூட்டம்", severity: "minor", category: "public order" },
  "144": { en: "Joining unlawful assembly armed with weapon", ta: "ஆயுதத்துடன் சட்டவிரோத கூட்டத்தில் சேர்தல்", severity: "moderate", category: "public order" },
  "145": { en: "Joining or continuing in unlawful assembly", ta: "சட்டவிரோத கூட்டத்தில் தொடர்தல்", severity: "minor", category: "public order" },
  "146": { en: "Rioting", ta: "கலவரம்", severity: "moderate", category: "violence" },
  "147": { en: "Rioting", ta: "கலவரம்", severity: "moderate", category: "violence" },
  "148": { en: "Rioting armed with deadly weapon", ta: "ஆயுதத்துடன் கலவரம்", severity: "serious", category: "violence" },
  "149": { en: "Every member of unlawful assembly guilty of offence committed", ta: "சட்டவிரோத கூட்டத்தின் உறுப்பினர் குற்றத்திற்கு பொறுப்பு", severity: "moderate", category: "public order" },
  "151": { en: "Continuing in assembly after dispersal order", ta: "கலைக்க உத்தரவிட்ட பின்னும் தொடர்தல்", severity: "minor", category: "public order" },
  "152": { en: "Assaulting public servant suppressing riot", ta: "கலவரத்தை அடக்கும் அரசு ஊழியரைத் தாக்குதல்", severity: "serious", category: "violence" },
  "153": { en: "Wantonly provoking to cause riot", ta: "கலவரம் தூண்டும் ஆத்திரமூட்டுதல்", severity: "moderate", category: "public order" },
  "153A": { en: "Promoting enmity between groups (religion, race, etc.)", ta: "மதம், இனம் அடிப்படையில் பகைமை தூண்டுதல்", severity: "serious", category: "hate speech" },
  "166": { en: "Public servant disobeying law", ta: "அரசு ஊழியர் சட்ட மீறல்", severity: "moderate", category: "government" },
  "171C": { en: "Bribery at elections", ta: "தேர்தலில் லஞ்சம்", severity: "serious", category: "election" },
  "186": { en: "Obstructing public servant", ta: "அரசு ஊழியரின் பணியைத் தடுத்தல்", severity: "moderate", category: "government" },
  "188": { en: "Disobedience to order by public servant", ta: "அரசு உத்தரவை மீறுதல்", severity: "minor", category: "government" },
  "201": { en: "Causing disappearance of evidence", ta: "ஆதாரம் அழிப்பு/பொய் தகவல்", severity: "serious", category: "government" },
  "269": { en: "Negligent act likely to spread disease", ta: "நோய் பரவ காரணமான அலட்சியம்", severity: "minor", category: "public nuisance" },
  "270": { en: "Malignant act likely to spread disease", ta: "நோய் பரவ காரணமான தீங்கான செயல்", severity: "moderate", category: "public nuisance" },
  "278": { en: "Making atmosphere noxious to health", ta: "சுகாதாரத்திற்கு தீங்கான சூழல்", severity: "minor", category: "public nuisance" },
  "279": { en: "Rash driving on a public way", ta: "பொறுப்பற்ற ஓட்டம்", severity: "moderate", category: "public nuisance" },
  "283": { en: "Obstruction in public way", ta: "பொது பாதையில் தடை", severity: "minor", category: "public nuisance" },
  "290": { en: "Public nuisance", ta: "பொது தொல்லை", severity: "minor", category: "public nuisance" },
  "294": { en: "Obscene acts and songs", ta: "ஆபாச செயல்கள்", severity: "minor", category: "obscenity" },
  "294B": { en: "Obscene language in public", ta: "பொது இடத்தில் கெட்ட வார்த்தை", severity: "minor", category: "obscenity" },
  "294b": { en: "Obscene language in public", ta: "பொது இடத்தில் கெட்ட வார்த்தை", severity: "minor", category: "obscenity" },
  "295A": { en: "Deliberate acts to outrage religious feelings", ta: "மத உணர்வுகளை புண்படுத்தும் செயல்", severity: "serious", category: "hate speech" },
  "302": { en: "Murder", ta: "கொலை", severity: "grave", category: "violence" },
  "304": { en: "Culpable homicide not amounting to murder", ta: "கொலை அளவிற்கு இல்லாத மரணம்", severity: "grave", category: "violence" },
  "304A": { en: "Causing death by negligence", ta: "அலட்சியத்தால் மரணம்", severity: "serious", category: "violence" },
  "306": { en: "Abetment of suicide", ta: "தற்கொலைக்கு உடந்தை", severity: "grave", category: "violence" },
  "307": { en: "Attempt to murder", ta: "கொலை முயற்சி", severity: "grave", category: "violence" },
  "323": { en: "Voluntarily causing hurt", ta: "தன்னிச்சையாக காயம்", severity: "minor", category: "violence" },
  "324": { en: "Causing hurt by dangerous weapon", ta: "ஆபத்தான ஆயுதத்தால் காயம்", severity: "serious", category: "violence" },
  "325": { en: "Voluntarily causing grievous hurt", ta: "கடுமையான காயம்", severity: "serious", category: "violence" },
  "326": { en: "Causing grievous hurt by dangerous weapon", ta: "ஆபத்தான ஆயுதத்தால் கடுமையான காயம்", severity: "grave", category: "violence" },
  "332": { en: "Causing hurt to deter public servant", ta: "அரசு ஊழியரைத் தடுக்க காயம்", severity: "serious", category: "violence" },
  "336": { en: "Act endangering life or safety of others", ta: "பிறர் பாதுகாப்பை ஆபத்தில் ஆழ்த்தும் செயல்", severity: "moderate", category: "violence" },
  "337": { en: "Causing hurt by endangering act", ta: "ஆபத்தான செயலால் காயம்", severity: "moderate", category: "violence" },
  "341": { en: "Wrongful restraint", ta: "தவறான தடுப்பு", severity: "minor", category: "restraint" },
  "342": { en: "Wrongful confinement", ta: "தவறான சிறைவைப்பு", severity: "moderate", category: "restraint" },
  "351": { en: "Assault to deter public servant from duty", ta: "அரசு ஊழியரை கடமையிலிருந்து தடுக்க தாக்குதல்", severity: "moderate", category: "violence" },
  "352": { en: "Assault without grave provocation", ta: "தூண்டுதல் இல்லாமல் தாக்குதல்", severity: "minor", category: "violence" },
  "353": { en: "Assault on public servant", ta: "அரசு ஊழியரைத் தாக்குதல்", severity: "serious", category: "violence" },
  "354": { en: "Assault on woman to outrage modesty", ta: "பெண்ணை தாக்குதல்", severity: "serious", category: "sexual offence" },
  "363": { en: "Kidnapping", ta: "கடத்தல்", severity: "serious", category: "kidnapping" },
  "376": { en: "Rape", ta: "பாலியல் வன்கொடுமை", severity: "grave", category: "sexual offence" },
  "379": { en: "Theft", ta: "திருட்டு", severity: "moderate", category: "property" },
  "384": { en: "Extortion", ta: "மிரட்டி பணம் பறித்தல்", severity: "serious", category: "property" },
  "392": { en: "Robbery", ta: "கொள்ளை", severity: "serious", category: "property" },
  "395": { en: "Dacoity", ta: "கொள்ளைக்குழு", severity: "grave", category: "property" },
  "406": { en: "Criminal breach of trust", ta: "நம்பிக்கை மோசடி", severity: "serious", category: "fraud" },
  "409": { en: "Criminal breach of trust by public servant", ta: "அரசு ஊழியர் நம்பிக்கை மோசடி", severity: "grave", category: "fraud" },
  "415": { en: "Cheating", ta: "ஏமாற்றுதல்", severity: "moderate", category: "fraud" },
  "420": { en: "Cheating and dishonestly inducing delivery of property", ta: "மோசடி", severity: "serious", category: "fraud" },
  "427": { en: "Mischief causing damage", ta: "சொத்து சேதம்", severity: "minor", category: "property" },
  "435": { en: "Mischief by fire or explosive", ta: "தீ/வெடிமருந்து மூலம் சேதம்", severity: "serious", category: "property" },
  "447": { en: "Criminal trespass", ta: "குற்றவியல் அத்துமீறல்", severity: "minor", category: "trespass" },
  "448": { en: "House-trespass", ta: "வீட்டு அத்துமீறல்", severity: "moderate", category: "trespass" },
  "452": { en: "House-trespass with preparation for hurt", ta: "தாக்குதலுக்கு தயாராகி வீட்டு அத்துமீறல்", severity: "serious", category: "trespass" },
  "465": { en: "Forgery", ta: "ஆவண போலி", severity: "serious", category: "fraud" },
  "467": { en: "Forgery of valuable security", ta: "மதிப்புள்ள ஆவண போலி", severity: "grave", category: "fraud" },
  "468": { en: "Forgery for purpose of cheating", ta: "ஏமாற்ற ஆவண போலி", severity: "grave", category: "fraud" },
  "471": { en: "Using forged document as genuine", ta: "போலி ஆவணம் பயன்படுத்துதல்", severity: "serious", category: "fraud" },
  "498A": { en: "Husband subjecting woman to cruelty", ta: "கணவன் கொடுமை", severity: "serious", category: "domestic violence" },
  "499": { en: "Defamation", ta: "அவதூறு", severity: "minor", category: "defamation" },
  "500": { en: "Punishment for defamation", ta: "அவதூறு தண்டனை", severity: "minor", category: "defamation" },
  "504": { en: "Intentional insult to provoke breach of peace", ta: "அமைதி குலைக்க வேண்டுமென்றே அவமானம்", severity: "minor", category: "intimidation" },
  "505": { en: "Statements conducing to public mischief", ta: "பொது குழப்பம் தூண்டும் அறிக்கைகள்", severity: "serious", category: "public order" },
  "506": { en: "Criminal intimidation", ta: "குற்றவியல் மிரட்டல்", severity: "moderate", category: "intimidation" },
  "506(i)": { en: "Criminal intimidation", ta: "குற்றவியல் மிரட்டல்", severity: "moderate", category: "intimidation" },
  "506(ii)": { en: "Criminal intimidation (death/grievous hurt/fire)", ta: "கொலை/தீவைப்பு மிரட்டல்", severity: "serious", category: "intimidation" },
  "506(I)": { en: "Criminal intimidation", ta: "குற்றவியல் மிரட்டல்", severity: "moderate", category: "intimidation" },
  "506(II)": { en: "Criminal intimidation (death/grievous hurt/fire)", ta: "கொலை/தீவைப்பு மிரட்டல்", severity: "serious", category: "intimidation" },
  "506(1)": { en: "Criminal intimidation", ta: "குற்றவியல் மிரட்டல்", severity: "moderate", category: "intimidation" },
  "506(2)": { en: "Criminal intimidation (death/grievous hurt/fire)", ta: "கொலை/தீவைப்பு மிரட்டல்", severity: "serious", category: "intimidation" },
  "507": { en: "Criminal intimidation by anonymous communication", ta: "அநாமதேய மிரட்டல்", severity: "moderate", category: "intimidation" },
  "509": { en: "Word/gesture to insult modesty of a woman", ta: "பெண்ணை அவமானப்படுத்தும் சொல்/செயல்", severity: "moderate", category: "sexual offence" },
  "511": { en: "Attempting to commit offences", ta: "குற்ற முயற்சி", severity: "minor", category: "abetment" },
  "505(2)": { en: "Statements creating enmity between classes", ta: "வகுப்புகளிடையே பகைமை தூண்டும் அறிக்கை", severity: "serious", category: "public order" },
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  grave: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  serious: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  moderate: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  minor: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

function parseSections(sectionsStr: string): { code: string; info: typeof IPC[string] | null }[] {
  return sectionsStr.split(",").map(s => {
    const code = s.trim();
    return { code, info: IPC[code] || IPC[code.toUpperCase()] || IPC[code.toLowerCase()] || null };
  }).filter(s => s.code);
}

function worstSeverity(sections: { code: string; info: typeof IPC[string] | null }[]): string {
  const order = ["grave", "serious", "moderate", "minor"];
  for (const level of order) {
    if (sections.some(s => s.info?.severity === level)) return level;
  }
  return "minor";
}

// ── Types ──────────────────────────────────────────────
interface Candidate {
  id: number;
  name: string;
  constituency_id: number;
  party: string;
  alliance: string | null;
  election_year: number;
  is_incumbent: boolean;
  is_winner: boolean;
  votes_received: number | null;
  vote_share: number | null;
  margin: number | null;
  assets_movable: number | null;
  assets_immovable: number | null;
  liabilities: number | null;
  net_worth: number | null;
  education: string | null;
  age: number | null;
  criminal_cases_declared: number;
  criminal_cases_ecourts: number;
  criminal_mismatch: boolean;
  affidavit_url: string | null;
  photo_url: string | null;
}

// Rival = other candidate from same constituency (minimal fields)
interface CandidateExtended extends Candidate {
  assembly_attendance_pct?: number | null;
  assembly_sessions_attended?: number | null;
  assembly_sessions_total?: number | null;
  ai_summary_ta?: string | null;
  questions_asked?: number | null;
  debates_count?: number | null;
  questions_state_avg?: number | null;
}

interface Rival {
  id: number;
  name: string;
  party: string;
  votes_received: number | null;
  vote_share: number | null;
  is_winner: boolean;
}

interface Promise {
  id: number;
  promise_text: string;
  promise_text_tamil: string | null;
  category: string | null;
  status: "kept" | "broken" | "partial" | "pending";
  evidence_url: string | null;
}


interface Allegation {
  title: string;
  summary: string;
  source_url: string | null;
  source_name: string | null;
  severity: "serious" | "moderate" | "minor";
}

interface CriminalCase {
  id: number;
  candidate_id: number;
  case_number: string | null;
  court_name: string | null;
  case_type: string | null;
  sections: string | null;
  status: string | null;
  next_hearing: string | null;
  is_disclosed: boolean;
}

interface Constituency {
  id: number;
  name: string;
  district: string;
}

// ── Helpers ────────────────────────────────────────────
function partyColor(party: string): string {
  const p = (party || "").toUpperCase();
  if (p === "ADMK" || p.includes("AIADMK")) return "#2d7a4f";
  if (p.includes("DMK")) return "#c0392b";
  if (p.includes("TVK")) return "#1a5276";
  if (p.includes("BJP")) return "#d35400";
  if (p.includes("NTK")) return "#6c3483";
  if (p.includes("INC") || p.includes("CONGRESS")) return "#1565c0";
  if (p.includes("PMK")) return "#b8860b";
  if (p.includes("MNM")) return "#0e6655";
  if (p.includes("CPI") || p.includes("CPM")) return "#d32f2f";
  if (p.includes("VCK")) return "#4a148c";
  if (p === "IND") return "#7f8c8d";
  return "#888";
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN");
}

function fmtCurrency(n: number | null): string {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// ── Crorepati Calculator Component ──
function CrorepatiCalculator({ netWorth }: { netWorth: number }) {
  const [monthlyIncome, setMonthlyIncome] = useState(25000);
  const annualIncome = monthlyIncome * 12;
  const yearsToEarn = annualIncome > 0 ? Math.round(netWorth / annualIncome) : 0;

  return (
    <div
      className="rounded-2xl border border-orange-100 shadow-sm p-5"
      style={{ background: "#faf9f6", borderRadius: 14 }}
    >
      <h2 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
        <span>💰</span> Crorepati Calculator
      </h2>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="text-xs text-gray-600 whitespace-nowrap">
          Enter your monthly income ₹
        </label>
        <input
          type="number"
          min={1000}
          step={1000}
          value={monthlyIncome}
          onChange={(e) => setMonthlyIncome(Math.max(1, Number(e.target.value)))}
          className="w-28 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 text-right"
        />
      </div>
      {annualIncome > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            At {fmtCurrency(monthlyIncome)}/month, it would take you{" "}
            <span className="font-bold" style={{ color: "#c0392b" }}>
              {yearsToEarn.toLocaleString("en-IN")} years
            </span>{" "}
            to earn what this candidate declared.
          </p>
          <p className="text-sm text-gray-700">
            This candidate has{" "}
            <span className="font-bold" style={{ color: "#c0392b" }}>
              {yearsToEarn.toLocaleString("en-IN")} years
            </span>{" "}
            of your salary in declared assets alone.
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Based on declared net worth of {fmtCurrency(netWorth)}
          </p>
        </div>
      )}
    </div>
  );
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

// Ordinal suffix: 1st, 2nd, 3rd, 4th…
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Criminal severity levels
const SEVERITY_LEVELS = [
  {
    label: "Clean",       labelTa: "வழக்கில்லை",
    desc: "No criminal cases declared or found in eCourts.",
    descTa: "இவர் மீது எந்த கிரிமினல் வழக்கும் பதியப்படவில்லை.",
    color: "#2d7a4f", light: "#d1fae5",
  },
  {
    label: "Minor",       labelTa: "சிறிய வழக்கு",
    desc: "1–2 cases on record. Mostly minor offences.",
    descTa: "1–2 வழக்குகள் பதிவாகியுள்ளன. பெரும்பாலும் சிறிய குற்றங்கள்.",
    color: "#b8860b", light: "#fef3c7",
  },
  {
    label: "Serious",     labelTa: "தீவிர வழக்கு",
    desc: "3–5 cases including serious charges — exercise caution.",
    descTa: "3–5 வழக்குகள். தீவிர குற்றச்சாட்டுகள் உள்ளன — கவனமாக இருங்கள்.",
    color: "#d35400", light: "#ffedd5",
  },
  {
    label: "Grave",       labelTa: "கடுமையான வழக்கு",
    desc: "6+ cases. Grave charges including violence or fraud.",
    descTa: "6+ வழக்குகள். வன்முறை, மோசடி போன்ற கடுமையான குற்றங்கள்.",
    color: "#c0392b", light: "#fee2e2",
  },
];

function severityIndex(cases: number): number {
  if (cases === 0) return 0;
  if (cases <= 2) return 1;
  if (cases <= 5) return 2;
  return 3;
}

function criminalSeverity(cases: number): { label: string; color: string; bg: string } {
  const idx = severityIndex(cases);
  const lvl = SEVERITY_LEVELS[idx];
  const bgMap = ["bg-green-50", "bg-yellow-50", "bg-orange-50", "bg-red-50"];
  return { label: lvl.label, color: lvl.color, bg: bgMap[idx] };
}

// ── Criminal Severity Meter ─────────────────────────────
function CriminalSeverityMeter({ cases }: { cases: number }) {
  const idx = severityIndex(cases);
  const active = SEVERITY_LEVELS[idx];

  return (
    <div>
      {/* 4-segment bar */}
      <div className="flex gap-1 my-3">
        {SEVERITY_LEVELS.map((lvl, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full h-2.5 rounded-full transition-all"
              style={{
                background: i <= idx ? lvl.color : "#e5e7eb",
                opacity: i === idx ? 1 : i < idx ? 0.5 : 0.3,
              }}
            />
            <span
              className="text-[9px] font-medium leading-none"
              style={{ color: i === idx ? lvl.color : "#9ca3af" }}
            >
              {lvl.label}
            </span>
          </div>
        ))}
      </div>
      {/* Tamil description */}
      <p className="text-xs leading-snug" style={{ color: active.color }}>
        {active.descTa}
      </p>
      <p className="text-[11px] text-gray-400 mt-0.5">{active.desc}</p>
    </div>
  );
}

// ── Transparency Score ─────────────────────────────────
// Measures how transparent and accountable a candidate is (0–100).
// NOT a moral judgment — it scores disclosure & legal record.

interface ScoreBreakdown {
  criminal: number;        // max 35
  mismatchPenalty: number; // 0 or -15
  assetDisclosure: number; // max 25
  affidavit: number;       // max 15
  allegations: number;     // max 25
  total: number;           // 0–100
}

function computeTransparencyScore(c: Candidate, allegationsCount = 0): ScoreBreakdown {
  // 1. Criminal record (max 35)
  const cases = c.criminal_cases_declared;
  let criminal = 35;
  if (cases >= 6) criminal = 0;
  else if (cases >= 3) criminal = 10;
  else if (cases >= 1) criminal = 20;

  // 2. Mismatch penalty (-15 if declared ≠ eCourts)
  const mismatchPenalty = c.criminal_mismatch ? -15 : 0;

  // 3. Asset disclosure (max 25)
  const hasAssets =
    c.assets_movable != null ||
    c.assets_immovable != null ||
    c.net_worth != null;
  const assetDisclosure = hasAssets ? 25 : 10;

  // 4. Affidavit filed (max 15)
  const affidavit = c.affidavit_url ? 15 : 0;

  // 5. Allegations (max 25) — fewer news allegations = higher score
  let allegations = 25;
  if (allegationsCount >= 5) allegations = 0;
  else if (allegationsCount >= 3) allegations = 10;
  else if (allegationsCount >= 1) allegations = 18;

  const total = Math.max(
    0,
    Math.min(100, criminal + mismatchPenalty + assetDisclosure + affidavit + allegations)
  );

  return { criminal, mismatchPenalty, assetDisclosure, affidavit, allegations, total };
}

function scoreColor(score: number): string {
  if (score >= 75) return "#2d7a4f"; // green
  if (score >= 50) return "#b8860b"; // yellow/amber
  if (score >= 30) return "#d35400"; // orange
  return "#c0392b";                  // red
}

function scoreLabel(score: number): string {
  if (score >= 75) return "High";
  if (score >= 50) return "Moderate";
  if (score >= 30) return "Low";
  return "Very Low";
}

// SVG ring that shows the score as a circular progress arc
function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const color = scoreColor(score);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={4}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

// Animated evaluation + score reveal component
function ScoreEvaluation({
  score,
  loading,
  showBreakdown,
  onToggle,
}: {
  score: ScoreBreakdown;
  loading: boolean;
  showBreakdown: boolean;
  onToggle: () => void;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (loading) {
      setIsRevealed(false);
      setAnimatedScore(0);
      return;
    }
    const timeout = setTimeout(() => {
      setIsRevealed(true);
      const target = score.total;
      const duration = 1200;
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setAnimatedScore(Math.round(eased * target));
        if (t < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, 200);
    return () => clearTimeout(timeout);
  }, [loading, score.total]);

  if (!isRevealed) {
    // Spinning evaluation animation
    return (
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="relative" style={{ width: 64, height: 64 }}>
          <svg width={64} height={64} className="animate-spin" style={{ animationDuration: "1.4s" }}>
            <circle cx={32} cy={32} r={28} fill="none" stroke="#e5e7eb" strokeWidth={4} />
            <circle
              cx={32} cy={32} r={28} fill="none"
              stroke="#6366f1" strokeWidth={4} strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 28 * 0.25} ${2 * Math.PI * 28 * 0.75}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg">⚖</span>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-indigo-500 animate-pulse">Evaluating…</span>
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      className="flex flex-col items-center gap-1 flex-shrink-0 hover:opacity-80 transition-opacity"
      title="Click to see score breakdown"
    >
      <ScoreRing score={animatedScore} size={64} />
      <span className="text-[10px] font-semibold text-gray-500">Candidate Score</span>
    </button>
  );
}

// Breakdown row for the score detail panel
function ScoreRow({
  label,
  points,
  max,
}: {
  label: string;
  points: number;
  max: number;
}) {
  const isNegative = points < 0;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <span
        className="font-semibold"
        style={{ color: isNegative ? "#c0392b" : points >= max ? "#2d7a4f" : "#b8860b" }}
      >
        {isNegative ? points : `${points}/${max}`}
      </span>
    </div>
  );
}

// ── Components ─────────────────────────────────────────

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-2 sm:p-3 text-center">
      <p
        className="text-xl font-bold"
        style={{ color: color || "#c84b11" }}
      >
        {value}
      </p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}

function AssetBar({
  label,
  amount,
  maxAmount,
  color,
}: {
  label: string;
  amount: number;
  maxAmount: number;
  color: string;
}) {
  const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">
          {fmtCurrency(amount)}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────
export default function CandidatePage() {
  const params = useParams();
  const candidateId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [constituency, setConstituency] = useState<Constituency | null>(
    null
  );
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [criminalCases, setCriminalCases] = useState<CriminalCase[]>([]);
  const [promises, setPromises] = useState<Promise[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [allegations, setAllegations] = useState<Allegation[]>([]);
  const [allegationsLoading, setAllegationsLoading] = useState(false);
  const [connections, setConnections] = useState<GraphData | null>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  useEffect(() => {
    if (!candidateId) return;

    async function fetchData() {
      // Get candidate
      const { data: candData } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", parseInt(candidateId as string))
        .single();

      if (!candData) {
        setLoading(false);
        return;
      }

      setCandidate(candData);

      // Fetch constituency, rivals, criminal cases, promises in parallel
      const [constResult, rivalsResult, casesResult, promisesResult] = await Promise.all([
        supabase
          .from("constituencies")
          .select("id, name, district")
          .eq("id", candData.constituency_id)
          .single(),
        supabase
          .from("candidates")
          .select("id, name, party, votes_received, vote_share, is_winner")
          .eq("constituency_id", candData.constituency_id)
          .eq("election_year", candData.election_year)
          .neq("id", candData.id)
          .order("votes_received", { ascending: false }),
        supabase
          .from("criminal_cases")
          .select("*")
          .eq("candidate_id", candData.id),
        supabase
          .from("promises")
          .select("*")
          .eq("candidate_id", candData.id),
      ]);

      if (constResult.data) setConstituency(constResult.data);
      if (rivalsResult.data) setRivals(rivalsResult.data);
      if (casesResult.data) setCriminalCases(casesResult.data);
      if (promisesResult.data) setPromises(promisesResult.data);

      setLoading(false);

      // Always fetch fresh English summary
      fetchAiSummary(candData.id);

      // Auto-trigger allegations search
      fetchAllegations(candData.name, candData.party, constResult.data?.name || "");
    }

    fetchData();
  }, [candidateId]);

  // Fetch AI summary from backend
  async function fetchAiSummary(candId: number) {
    setSummaryLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const res = await fetch(`${backendUrl}/api/candidate-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error === "credits_unavailable") {
          setAiSummary("__credits_unavailable__");
        } else {
          setAiSummary(data.summary_en || data.summary_ta || "");
        }
      }
    } catch {
      // Silently fail — section will show fallback
    } finally {
      setSummaryLoading(false);
    }
  }

  // Fetch allegations from backend
  async function fetchAllegations(name: string, party: string, constName: string) {
    setAllegationsLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const res = await fetch(`${backendUrl}/api/candidate-allegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, party, constituency: constName }),
      });
      if (res.ok) {
        const data = await res.json();
        setAllegations(data.allegations || []);
      } else {
        setAllegations([]);
      }
    } catch {
      setAllegations([]);
    }
    setAllegationsLoading(false);
  }

  // Fetch connections on-demand
  async function fetchConnections(forceRefresh = false) {
    if (!candidate) return;
    setConnectionsLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const res = await fetch(`${backendUrl}/api/candidate-connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidate.id,
          name: candidate.name,
          party: candidate.party,
          constituency: constituency?.name || "",
          force_refresh: forceRefresh,
        }),
      });
      if (res.ok) {
        setConnections(await res.json());
      }
    } catch {
      // silent fail
    }
    setConnectionsLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Candidate not found</p>
          <Link
            href="/districts"
            className="text-terracotta text-sm hover:underline"
          >
            ← Browse districts
          </Link>
        </div>
      </div>
    );
  }

  const color = partyColor(candidate.party);

  // Compute asset max for bar widths
  const assetValues = [
    candidate.assets_movable ?? 0,
    candidate.assets_immovable ?? 0,
    candidate.liabilities ?? 0,
  ];
  const maxAsset = Math.max(...assetValues, 1);

  const hasAssets =
    candidate.assets_movable != null ||
    candidate.assets_immovable != null ||
    candidate.net_worth != null;

  const hasCriminal =
    candidate.criminal_cases_declared > 0 ||
    candidate.criminal_cases_ecourts > 0;

  // Calculate finishing position among all candidates in this constituency
  // Rivals are already sorted by votes desc; insert current candidate to find position
  const allByVotes = [
    { id: candidate.id, votes_received: candidate.votes_received },
    ...rivals,
  ].sort((a, b) => (b.votes_received ?? 0) - (a.votes_received ?? 0));
  const position =
    allByVotes.findIndex((c) => c.id === candidate.id) + 1;
  const totalCandidates = allByVotes.length;

  // Criminal severity
  const severity = criminalSeverity(candidate.criminal_cases_declared);

  // Score only finalised after allegations finish loading
  const score = computeTransparencyScore(
    candidate,
    allegationsLoading ? 0 : allegations.length
  );

  return (
    <div className="min-h-screen bg-cream">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 mb-4">
          <Link href="/" className="hover:text-terracotta">
            Home
          </Link>
          {" / "}
          <Link href="/districts" className="hover:text-terracotta">
            Districts
          </Link>
          {constituency && (
            <>
              {" / "}
              <Link
                href={`/districts/${slugify(constituency.district)}`}
                className="hover:text-terracotta"
              >
                {constituency.district}
              </Link>
              {" / "}
              <Link
                href={`/constituency/${slugify(constituency.name)}`}
                className="hover:text-terracotta"
              >
                {constituency.name}
              </Link>
            </>
          )}
          {" / "}
          <span className="text-gray-600 font-medium">
            {candidate.name}
          </span>
        </p>

        {/* ── Candidate header ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          {/* Party color accent bar */}
          <div className="h-1.5 w-full" style={{ background: color }} />
          <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
              style={{ background: color }}
            >
              {candidate.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                  {candidate.name}
                </h1>
                {candidate.is_winner && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: color }}>
                    Won {candidate.election_year}
                  </span>
                )}
                {candidate.is_incumbent && (
                  <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2.5 py-1 rounded-full">
                    Incumbent
                  </span>
                )}
                {totalCandidates > 1 && (
                  <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full">
                    {ordinal(position)} of {totalCandidates}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-sm font-semibold"
                  style={{ color }}
                >
                  {candidate.party}
                </span>
                {candidate.alliance && (
                  <span className="text-xs text-gray-400">
                    ({candidate.alliance})
                  </span>
                )}
              </div>

              {constituency && (
                <p className="text-sm text-gray-500 mt-1">
                  Contesting from{" "}
                  <Link
                    href={`/constituency/${slugify(constituency.name)}`}
                    className="text-terracotta hover:underline"
                  >
                    {constituency.name}
                  </Link>
                  , {constituency.district} District
                </p>
              )}

              {/* Quick stats row */}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                {candidate.age && (
                  <span>
                    Age: <strong className="text-gray-900">{candidate.age}</strong>
                  </span>
                )}
                {candidate.education && (
                  <span>
                    Education:{" "}
                    <strong className="text-gray-900">
                      {candidate.education}
                    </strong>
                  </span>
                )}
                <span>
                  Year:{" "}
                  <strong className="text-gray-900">
                    {candidate.election_year}
                  </strong>
                </span>
              </div>
            </div>

            {/* Transparency score ring — right side of header */}
            <ScoreEvaluation
              score={score}
              loading={allegationsLoading}
              showBreakdown={showBreakdown}
              onToggle={() => setShowBreakdown(!showBreakdown)}
            />
          </div>

          {/* Score breakdown — expandable */}
          {!allegationsLoading && showBreakdown && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-700 mb-2">
              Candidate Score Breakdown
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 sm:gap-x-6 gap-y-1.5">
                <ScoreRow label="Criminal Record" points={score.criminal} max={35} />
                <ScoreRow label="Asset Disclosure" points={score.assetDisclosure} max={25} />
                <ScoreRow label="Affidavit Filed" points={score.affidavit} max={15} />
                <ScoreRow label="Allegations" points={score.allegations} max={25} />
                {score.mismatchPenalty < 0 && (
                  <ScoreRow label="Mismatch Penalty" points={score.mismatchPenalty} max={0} />
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Score measures transparency &amp; accountability based on public filings. Not a moral judgment.
              </p>
            </div>
          )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Election performance ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Result banner */}
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ background: candidate.is_winner ? "#f0fdf4" : "#fef2f2", borderBottom: `2px solid ${candidate.is_winner ? "#bbf7d0" : "#fecaca"}` }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: candidate.is_winner ? "#166534" : "#991b1b" }}>
                  Election Performance · {candidate.election_year}
                </p>
                <p className="text-2xl font-extrabold mt-0.5" style={{ color: candidate.is_winner ? "#15803d" : "#dc2626" }}>
                  {candidate.is_winner ? "Won" : "Lost"}
                </p>
              </div>
              {candidate.votes_received != null && (
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-gray-900">{fmt(candidate.votes_received)}</p>
                  <p className="text-xs text-gray-500">votes received</p>
                </div>
              )}
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-px bg-gray-100">
              <div className="bg-white px-4 py-3 text-center">
                <p className="text-lg font-bold text-gray-900">
                  {candidate.vote_share != null ? `${candidate.vote_share.toFixed(1)}%` : "—"}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Vote Share</p>
              </div>
              <div className="bg-white px-4 py-3 text-center">
                <p className="text-lg font-bold" style={{ color: candidate.is_winner ? "#15803d" : "#dc2626" }}>
                  {fmt(candidate.margin) || "—"}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Margin</p>
              </div>
            </div>
            {/* Position among candidates */}
            {totalCandidates > 1 && (
              <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Finished <strong className="text-gray-800">{ordinal(position)} of {totalCandidates}</strong> candidates in {constituency?.name}
                </p>
              </div>
            )}
          </div>

          {/* ── Assets & Net Worth ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-4">
              Declared Assets
            </h2>
            {hasAssets ? (
              <div className="space-y-4">
                {/* Net worth highlight */}
                {candidate.net_worth != null && (
                  <div className="bg-gray-50 rounded-xl p-4 text-center mb-2">
                    <p className="text-xs text-gray-500 mb-1">
                      Net Worth
                    </p>
                    <p className="text-2xl font-bold text-terracotta">
                      {fmtCurrency(candidate.net_worth)}
                    </p>
                  </div>
                )}

                {candidate.assets_movable != null && (
                  <AssetBar
                    label="Movable Assets"
                    amount={candidate.assets_movable}
                    maxAmount={maxAsset}
                    color="#1a5276"
                  />
                )}
                {candidate.assets_immovable != null && (
                  <AssetBar
                    label="Immovable Assets"
                    amount={candidate.assets_immovable}
                    maxAmount={maxAsset}
                    color="#2d7a4f"
                  />
                )}
                {candidate.liabilities != null && (
                  <AssetBar
                    label="Liabilities"
                    amount={candidate.liabilities}
                    maxAmount={maxAsset}
                    color="#c0392b"
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Asset data not yet available
              </p>
            )}
          </div>

          {/* ── Crorepati Calculator ── */}
          {candidate.net_worth != null && candidate.net_worth > 0 && (
            <CrorepatiCalculator netWorth={candidate.net_worth} />
          )}


          {/* ── Criminal record ── */}
          <div
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
              candidate.criminal_mismatch
                ? "border-red-300"
                : hasCriminal ? "border-red-200" : "border-gray-100"
            }`}
          >
            {/* Header strip */}
            <div className={`px-5 py-3 border-b ${hasCriminal ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}>
              <h2 className={`font-bold text-sm ${hasCriminal ? "text-red-800" : "text-green-800"}`}>
                Criminal Record
              </h2>
              {!hasCriminal && (
                <p className="text-xs text-green-600 font-medium mt-0.5">No cases declared or found in eCourts</p>
              )}
            </div>
            <div className="p-5">
            {/* Visual severity meter */}
            <CriminalSeverityMeter cases={candidate.criminal_cases_declared} />

            {hasCriminal && (
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <StatBox
                    label="Self-Declared Cases"
                    value={String(candidate.criminal_cases_declared)}
                    color={
                      candidate.criminal_cases_declared > 0
                        ? "#c0392b"
                        : "#2d7a4f"
                    }
                  />
                  <StatBox
                    label="eCourts Records"
                    value={String(candidate.criminal_cases_ecourts)}
                    color={
                      candidate.criminal_cases_ecourts > 0
                        ? "#c0392b"
                        : "#2d7a4f"
                    }
                  />
                </div>
                {candidate.criminal_mismatch && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    <p className="font-semibold">Mismatch Detected</p>
                    <p className="text-xs mt-0.5">
                      The number of cases declared in the affidavit does
                      not match eCourts records. This may indicate
                      undisclosed cases.
                    </p>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>

          {/* ── Assembly Attendance (4.9) — only show if real data exists ── */}
          {candidate.is_winner && (candidate as CandidateExtended).assembly_attendance_pct != null && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 text-sm mb-4">
                Assembly Attendance
              </h2>
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-2">
                  <svg width="96" height="96" className="-rotate-90">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                      cx="48" cy="48" r="40" fill="none"
                      stroke={((candidate as CandidateExtended).assembly_attendance_pct || 0) >= 75 ? "#2d7a4f" : ((candidate as CandidateExtended).assembly_attendance_pct || 0) >= 50 ? "#b8860b" : "#c0392b"}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - ((candidate as CandidateExtended).assembly_attendance_pct || 0) / 100)}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900">
                      {(candidate as CandidateExtended).assembly_attendance_pct}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {(candidate as CandidateExtended).assembly_sessions_attended || "?"} of {(candidate as CandidateExtended).assembly_sessions_total || "?"} sessions attended
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Source: PRS India MLATrack</p>
              </div>
            </div>
          )}

          {/* ── Questions Asked in Assembly ── */}
          {candidate.is_winner && (candidate as CandidateExtended).questions_asked != null && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 text-sm mb-3">Assembly Performance</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-extrabold text-gray-900">{(candidate as CandidateExtended).questions_asked}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Starred questions asked</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${((candidate as CandidateExtended).questions_asked || 0) >= ((candidate as CandidateExtended).questions_state_avg || 2.87) ? "text-green-600" : "text-orange-500"}`}>
                      {((candidate as CandidateExtended).questions_asked || 0) >= ((candidate as CandidateExtended).questions_state_avg || 2.87) ? "Above avg" : "Below avg"}
                    </p>
                    <p className="text-xs text-gray-400">State avg: {((candidate as CandidateExtended).questions_state_avg || 2.87).toFixed(1)}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${((candidate as CandidateExtended).questions_asked || 0) >= ((candidate as CandidateExtended).questions_state_avg || 2.87) ? "bg-green-500" : "bg-orange-400"}`}
                    style={{ width: `${Math.min(100, ((candidate as CandidateExtended).questions_asked || 0) / 10 * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400">Starred questions · 16th TN Assembly (Apr 2023 – Oct 2025)</p>
              </div>
            </div>
          )}

          {/* ── Political Connections (on-demand) ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Political Network</h2>
                <p className="text-xs text-gray-400 mt-0.5">Companies · Family · Associates · Donors</p>
              </div>
              {!connections && !connectionsLoading && (
                <button
                  onClick={() => fetchConnections()}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  <span>🕸</span> Investigate Network
                </button>
              )}
              {connections && !connectionsLoading && (
                <button
                  onClick={() => fetchConnections(true)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Refresh
                </button>
              )}
            </div>

            {connectionsLoading && (
              <div className="flex items-center gap-3 py-8 justify-center">
                <div className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-400 animate-pulse">Searching public records, company filings, news...</p>
              </div>
            )}

            {!connections && !connectionsLoading && (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">🕸</p>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  Tap <strong>Investigate Network</strong> to map this candidate's companies, family connections, and political associates from public records.
                </p>
              </div>
            )}

            {connections && !connectionsLoading && (
              <ConnectionGraph data={connections} />
            )}
          </div>

          {/* ── Criminal Case Details (4.4) ── */}
          {criminalCases.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:col-span-2">
              <h2 className="font-bold text-gray-900 text-sm mb-4">
                Case Details ({criminalCases.length})
              </h2>
              <div className="space-y-3">
                {criminalCases.map((c) => {
                  const sections = c.sections ? parseSections(c.sections) : [];
                  const worst = worstSeverity(sections);
                  const colors = SEVERITY_COLORS[worst] || SEVERITY_COLORS.minor;

                  return (
                    <div
                      key={c.id}
                      className={`rounded-xl p-4 border ${
                        !c.is_disclosed
                          ? "bg-red-50 border-red-200"
                          : `${colors.bg} ${colors.border}`
                      }`}
                    >
                      {/* Header row: badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {c.case_type && (
                          <span className="text-xs font-semibold bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700">
                            {c.case_type}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                          {worst}
                        </span>
                        {!c.is_disclosed && (
                          <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            Not Disclosed
                          </span>
                        )}
                        {c.status && (
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              c.status.toLowerCase() === "convicted"
                                ? "bg-red-100 text-red-700"
                                : c.status.toLowerCase() === "disposed" || c.status.toLowerCase() === "acquitted"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {c.status}
                          </span>
                        )}
                      </div>

                      {/* Section details with descriptions */}
                      {sections.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          {sections.map((s, i) => {
                            const sColors = s.info ? (SEVERITY_COLORS[s.info.severity] || SEVERITY_COLORS.minor) : SEVERITY_COLORS.minor;
                            return (
                              <div key={i} className="flex items-start gap-2">
                                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${sColors.bg} ${sColors.text} border ${sColors.border}`}>
                                  §{s.code}
                                </span>
                                <div className="min-w-0">
                                  {s.info ? (
                                    <>
                                      <p className="text-xs font-medium text-gray-800 leading-snug">
                                        {s.info.en}
                                      </p>
                                      <p className="text-[11px] text-gray-500 leading-snug">
                                        {s.info.ta}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-gray-500">
                                      IPC Section {s.code}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Case number & court */}
                      {(c.case_number || c.court_name) && (
                        <div className="mt-2 pt-2 border-t border-gray-200/50">
                          {c.case_number && (
                            <p className="text-xs text-gray-500">Case: {c.case_number}</p>
                          )}
                          {c.court_name && (
                            <p className="text-xs text-gray-500">Court: {c.court_name}</p>
                          )}
                        </div>
                      )}

                      {c.next_hearing && (
                        <div className="mt-2 pt-2 border-t border-gray-200/50">
                          <p className="text-[10px] text-gray-400">Next Hearing</p>
                          <p className="text-xs font-semibold text-gray-700">
                            {new Date(c.next_hearing).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── AI Summary with Sources (4.5) — auto-loads ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-gray-900 text-sm">
                  AI Summary / சுருக்கம்
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Sources: Election Commission, MyNeta, The Hindu, TNM</p>
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                AI-powered
              </span>
            </div>
            {summaryLoading ? (
              <div className="space-y-2 animate-pulse py-4">
                {[90, 75, 85, 70, 80].map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                    <div className="h-4 bg-gray-200 rounded" style={{ width: `${w}%` }} />
                  </div>
                ))}
                <p className="text-xs text-gray-400 mt-2 text-center">Generating summary with sources...</p>
              </div>
            ) : aiSummary === "__credits_unavailable__" ? (
              <p className="text-sm text-gray-400 text-center py-4">
                AI summary will be available shortly. Check back after April 6.
              </p>
            ) : aiSummary ? (
              <div className="space-y-2">
                {aiSummary.split("\n").filter(Boolean).map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-terracotta mt-0.5 flex-shrink-0">•</span>
                    <p className="text-sm text-gray-700 leading-relaxed">{line.replace(/^[-•]\s*/, "")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Summary will appear here once the AI service is available.
              </p>
            )}
          </div>

          {/* ── Allegations & News — auto-loads ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900 text-sm">
                  Allegations & News
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Sources: The Hindu, TNM, TNIE, India Today, PRS</p>
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                AI-powered
              </span>
            </div>
            {allegationsLoading ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 animate-pulse">
                  Searching verified news sources...
                </p>
              </div>
            ) : allegations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No allegations or news found for this candidate.
              </p>
            ) : (
              <div className="space-y-3">
                {allegations.map((a, i) => (
                  <div key={i} className={`rounded-xl p-3 border ${
                    a.severity === "serious" ? "bg-red-50 border-red-200" :
                    a.severity === "moderate" ? "bg-yellow-50 border-yellow-200" :
                    "bg-gray-50 border-gray-200"
                  }`}>
                    <p className="text-sm font-medium text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{a.summary}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {a.source_url && (
                        <a
                          href={a.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-terracotta hover:underline"
                        >
                          {a.source_name || "Source"} →
                        </a>
                      )}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        a.severity === "serious" ? "bg-red-100 text-red-700" :
                        a.severity === "moderate" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {a.severity}
                      </span>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-gray-400 text-center pt-2">
                  AI-curated from verified news sources. May not be exhaustive.
                </p>
              </div>
            )}
          </div>

          {/* ── Source & affidavit ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-4">
              Data Source
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">
                Election data from the{" "}
                <strong className="text-gray-900">
                  Election Commission of India
                </strong>
              </p>
              <p className="text-gray-600">
                Asset &amp; criminal data from{" "}
                <strong className="text-gray-900">
                  MyNeta.info (ADR)
                </strong>
              </p>
              {candidate.affidavit_url && (
                <a
                  href={candidate.affidavit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-terracotta text-sm font-semibold hover:underline"
                >
                  View Original Affidavit →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Scoped Chat (4.11) ── */}
        <div className="mt-6">
          <ScopedChat
            title={`Ask about ${candidate.name}`}
            placeholder={`Ask anything about ${candidate.name}...`}
            context={`The user is asking about candidate ${candidate.name} from ${candidate.party} party, contesting from ${constituency?.name || "unknown"} constituency in ${constituency?.district || ""} district. Election year: ${candidate.election_year}. ${candidate.is_winner ? "Won the election." : "Lost the election."} Votes: ${candidate.votes_received || "unknown"}, vote share: ${candidate.vote_share || "unknown"}%. Criminal cases: ${candidate.criminal_cases_declared}. Answer specifically about this candidate.`}
            suggestions={[
              `Does ${candidate.name} have criminal cases?`,
              `What is ${candidate.name}'s net worth?`,
              `How did ${candidate.name} perform in 2021?`,
            ]}
          />
        </div>

        {/* ── Rivals from same constituency ── */}
        {rivals.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-6">
            <h2 className="font-bold text-gray-900 text-sm mb-3">
              Other Candidates in {constituency?.name || "this constituency"} ({rivals.length})
            </h2>
            <div className="space-y-1">
              {rivals.map((r, i) => {
                const rColor = partyColor(r.party);
                // rival's position: they are sorted by votes desc,
                // but we need to account for the current candidate's position
                const rivalPos = allByVotes.findIndex((c) => c.id === r.id) + 1;
                return (
                  <Link
                    key={r.id}
                    href={`/candidate/${r.id}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5 text-right font-mono">
                        {ordinal(rivalPos)}
                      </span>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ background: rColor }}
                      >
                        {r.party.slice(0, 3)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 group-hover:text-terracotta transition-colors">
                          {r.name}
                        </p>
                        <p className="text-xs text-gray-400">{r.party}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {r.vote_share != null && (
                        <p className="text-sm font-semibold text-gray-700">
                          {r.vote_share.toFixed(1)}%
                        </p>
                      )}
                      {r.votes_received != null && (
                        <p className="text-xs text-gray-400">
                          {fmt(r.votes_received)} votes
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap gap-3 mt-6">
          {rivals.length > 0 && (
            <Link
              href={`/compare?ids=${candidate.id},${rivals[0].id}`}
              className="inline-flex items-center gap-2 bg-terracotta text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#a33d0e] transition-colors"
            >
              Compare with {rivals[0].name.split(" ")[0]} →
            </Link>
          )}
          {constituency && (
            <Link
              href={`/constituency/${slugify(constituency.name)}`}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full text-sm font-semibold hover:border-terracotta hover:text-terracotta transition-colors"
            >
              View {constituency.name} constituency
            </Link>
          )}
          {candidate.affidavit_url && (
            <a
              href={candidate.affidavit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full text-sm font-semibold hover:border-terracotta hover:text-terracotta transition-colors"
            >
              View Affidavit ↗
            </a>
          )}
          {/* WhatsApp Share (4.10) — enriched */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `🗳️ *${candidate.name}* (${candidate.party})\n` +
              `📍 ${constituency?.name || ""} constituency, ${constituency?.district || ""}\n\n` +
              `📊 *2021 Results:*\n` +
              `   Votes: ${candidate.votes_received?.toLocaleString("en-IN") || "N/A"} (${candidate.vote_share?.toFixed(1) || "?"}%)\n` +
              `   ${candidate.is_winner ? "✅ Won" : "❌ Lost"}\n\n` +
              `💰 *Declared Wealth:*\n` +
              `   Net Worth: ${candidate.net_worth ? (candidate.net_worth >= 10000000 ? `₹${(candidate.net_worth / 10000000).toFixed(1)} Crore` : `₹${(candidate.net_worth / 100000).toFixed(1)} Lakh`) : "N/A"}\n` +
              (candidate.assets_movable ? `   Movable: ₹${candidate.assets_movable >= 10000000 ? (candidate.assets_movable / 10000000).toFixed(1) + "Cr" : (candidate.assets_movable / 100000).toFixed(1) + "L"}\n` : "") +
              (candidate.assets_immovable ? `   Immovable: ₹${candidate.assets_immovable >= 10000000 ? (candidate.assets_immovable / 10000000).toFixed(1) + "Cr" : (candidate.assets_immovable / 100000).toFixed(1) + "L"}\n` : "") +
              `\n⚖️ *Criminal Record:*\n` +
              `   Declared: ${candidate.criminal_cases_declared} cases\n` +
              `   eCourts: ${candidate.criminal_cases_ecourts} cases\n` +
              (candidate.criminal_mismatch ? `   ⚠️ Mismatch detected!\n` : "") +
              `\n📋 Transparency Score: ${score.total}/100 (${scoreLabel(score.total)})\n` +
              (candidate.education ? `🎓 Education: ${candidate.education}\n` : "") +
              (candidate.age ? `👤 Age: ${candidate.age}\n` : "") +
              `\n🔗 Full profile: https://tnelections.info/candidate/${candidate.id}\n` +
              `\n_via tnelections.info — Know your candidates_`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Share on WhatsApp
          </a>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>
            Data from Election Commission of India · Tamil Nadu Elections
            2026
          </p>
        </div>
      </footer>
    </div>
  );
}
