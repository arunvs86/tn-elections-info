"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";
import Header from "@/components/Header";

interface Step {
  titleEn: string;
  titleTa: string;
  contentEn: React.ReactNode;
  contentTa: React.ReactNode;
}

function AccordionCard({
  step,
  index,
  isOpen,
  onToggle,
}: {
  step: Step;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { lang } = useLang();
  const title = lang === "en" ? step.titleEn : step.titleTa;
  const content = lang === "en" ? step.contentEn : step.contentTa;

  return (
    <div
      className="bg-white border border-gray-200 overflow-hidden transition-all"
      style={{ borderRadius: 14 }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-bold"
          style={{ backgroundColor: "#c84b11" }}
        >
          {index + 1}
        </span>
        <span className="flex-1 font-semibold text-gray-900 text-base sm:text-lg">
          {title}
        </span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-1 text-gray-700 text-sm sm:text-base leading-relaxed border-t border-gray-100">
          {content}
        </div>
      )}
    </div>
  );
}

const steps: Step[] = [
  {
    titleEn: "Check if you\u2019re registered",
    titleTa: "\u0ba8\u0bc0\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0baa\u0ba4\u0bbf\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0baf\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0bc1\u0bb3\u0bcd\u0bb3\u0bc0\u0bb0\u0bcd\u0b95\u0bb3\u0bbe \u0b8e\u0ba9\u0bcd\u0baa\u0ba4\u0bc8 \u0b9a\u0bb0\u0bbf\u0baa\u0bbe\u0bb0\u0bcd\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd",
    contentEn: (
      <div className="space-y-3">
        <p>Visit the Election Commission&apos;s voter search portal to check your registration:</p>
        <a
          href="https://electoralsearch.eci.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium hover:underline"
          style={{ color: "#c84b11" }}
        >
          electoralsearch.eci.gov.in
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <ul className="list-disc pl-5 space-y-1">
          <li>Search by <strong>name + age + constituency</strong></li>
          <li>Or search by your <strong>EPIC number</strong> (voter ID number)</li>
        </ul>
        <p>
          You can also check at the CEO Tamil Nadu website:{" "}
          <a
            href="https://www.elections.tn.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
            style={{ color: "#c84b11" }}
          >
            elections.tn.gov.in
          </a>
        </p>
      </div>
    ),
    contentTa: (
      <div className="space-y-3">
        <p>உங்கள் பதிவை சரிபார்க்க தேர்தல் ஆணையத்தின் வாக்காளர் தேடல் தளத்தை பார்வையிடுங்கள்:</p>
        <a
          href="https://electoralsearch.eci.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium hover:underline"
          style={{ color: "#c84b11" }}
        >
          electoralsearch.eci.gov.in
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>பெயர் + வயது + தொகுதி</strong> மூலம் தேடுங்கள்</li>
          <li>அல்லது உங்கள் <strong>EPIC எண்</strong> (வாக்காளர் அட்டை எண்) மூலம் தேடுங்கள்</li>
        </ul>
        <p>
          CEO தமிழ்நாடு இணையதளத்திலும் சரிபார்க்கலாம்:{" "}
          <a
            href="https://www.elections.tn.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
            style={{ color: "#c84b11" }}
          >
            elections.tn.gov.in
          </a>
        </p>
      </div>
    ),
  },
  {
    titleEn: "Find your polling booth",
    titleTa: "உங்கள் வாக்குச்சாவடியைக் கண்டறியுங்கள்",
    contentEn: (
      <div className="space-y-3">
        <ul className="list-disc pl-5 space-y-1">
          <li>Your polling booth is printed on your <strong>voter ID card</strong> (EPIC)</li>
          <li>You can also search for it on the CEO Tamil Nadu website</li>
          <li>
            Use our{" "}
            <Link href="/find-constituency" className="font-medium hover:underline" style={{ color: "#c84b11" }}>
              Find Your Constituency
            </Link>{" "}
            tool to locate your constituency by PIN code or GPS
          </li>
        </ul>
      </div>
    ),
    contentTa: (
      <div className="space-y-3">
        <ul className="list-disc pl-5 space-y-1">
          <li>உங்கள் வாக்குச்சாவடி உங்கள் <strong>வாக்காளர் அடையாள அட்டையில்</strong> (EPIC) அச்சிடப்பட்டிருக்கும்</li>
          <li>CEO தமிழ்நாடு இணையதளத்திலும் தேடலாம்</li>
          <li>
            எங்கள்{" "}
            <Link href="/find-constituency" className="font-medium hover:underline" style={{ color: "#c84b11" }}>
              தொகுதி கண்டறி
            </Link>{" "}
            கருவியை பயன்படுத்தி PIN குறியீடு அல்லது GPS மூலம் உங்கள் தொகுதியைக் கண்டறியுங்கள்
          </li>
        </ul>
      </div>
    ),
  },
  {
    titleEn: "What to carry on April 23",
    titleTa: "ஏப்ரல் 23 அன்று என்ன எடுத்துச் செல்ல வேண்டும்",
    contentEn: (
      <div className="space-y-3">
        <p className="font-medium">Primary ID:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Voter ID (EPIC card)</strong> &mdash; this is the primary document</li>
        </ul>
        <p className="font-medium">Alternative IDs accepted:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Aadhaar card</li>
          <li>PAN card</li>
          <li>Driving license</li>
          <li>Passport</li>
        </ul>
        <div
          className="mt-3 p-3 rounded-lg border-l-4 bg-red-50 text-red-800"
          style={{ borderColor: "#c84b11" }}
        >
          <strong>Important:</strong> DO NOT carry mobile phones inside the polling booth. Phones are not allowed.
        </div>
      </div>
    ),
    contentTa: (
      <div className="space-y-3">
        <p className="font-medium">முதன்மை அடையாள ஆவணம்:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>வாக்காளர் அடையாள அட்டை (EPIC)</strong> &mdash; இது முதன்மை ஆவணம்</li>
        </ul>
        <p className="font-medium">ஏற்றுக்கொள்ளப்படும் மாற்று ஆவணங்கள்:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>ஆதார் அட்டை</li>
          <li>PAN அட்டை</li>
          <li>ஓட்டுநர் உரிமம்</li>
          <li>கடவுச்சீட்டு</li>
        </ul>
        <div
          className="mt-3 p-3 rounded-lg border-l-4 bg-red-50 text-red-800"
          style={{ borderColor: "#c84b11" }}
        >
          <strong>முக்கியம்:</strong> வாக்குச்சாவடிக்குள் கைபேசிகளை எடுத்துச் செல்ல வேண்டாம். தொலைபேசிகள் அனுமதிக்கப்படுவதில்லை.
        </div>
      </div>
    ),
  },
  {
    titleEn: "How the EVM works",
    titleTa: "EVM எப்படி வேலை செய்கிறது",
    contentEn: (
      <div className="space-y-3">
        <p>The Electronic Voting Machine has <strong>3 units</strong>:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Ballot Unit</strong> &mdash; where you press the button</li>
          <li><strong>Control Unit</strong> &mdash; operated by the polling officer</li>
          <li><strong>VVPAT</strong> (Voter Verifiable Paper Audit Trail) &mdash; prints a slip of your vote</li>
        </ul>
        <p className="font-medium mt-2">How to vote:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Press the <strong>blue button</strong> next to your candidate&apos;s name and symbol</li>
          <li>The VVPAT slip will display for <strong>7 seconds</strong> &mdash; verify your vote</li>
          <li>If the machine malfunctions, immediately inform the <strong>presiding officer</strong></li>
        </ol>
      </div>
    ),
    contentTa: (
      <div className="space-y-3">
        <p>மின்னணு வாக்குப்பதிவு இயந்திரத்தில் <strong>3 பகுதிகள்</strong> உள்ளன:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>பாலட் யூனிட்</strong> &mdash; நீங்கள் பொத்தானை அழுத்தும் இடம்</li>
          <li><strong>கட்டுப்பாட்டு யூனிட்</strong> &mdash; வாக்குச்சாவடி அதிகாரி இயக்குவார்</li>
          <li><strong>VVPAT</strong> (வாக்காளர் சரிபார்க்கக்கூடிய தாள் தணிக்கை பாதை) &mdash; உங்கள் வாக்கின் சீட்டை அச்சிடும்</li>
        </ul>
        <p className="font-medium mt-2">வாக்களிப்பது எப்படி:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>உங்கள் வேட்பாளரின் பெயர் மற்றும் சின்னத்திற்கு அருகில் உள்ள <strong>நீல பொத்தானை</strong> அழுத்துங்கள்</li>
          <li>VVPAT சீட்டு <strong>7 வினாடிகள்</strong> காட்டப்படும் &mdash; உங்கள் வாக்கை சரிபார்க்கவும்</li>
          <li>இயந்திரம் செயலிழந்தால், உடனடியாக <strong>தலைமை அதிகாரிக்கு</strong> தெரிவிக்கவும்</li>
        </ol>
      </div>
    ),
  },
  {
    titleEn: "What is NOTA?",
    titleTa: "NOTA என்றால் என்ன?",
    contentEn: (
      <div className="space-y-3">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>NOTA</strong> stands for &ldquo;None of the Above&rdquo;</li>
          <li>It is the <strong>last button</strong> on the EVM ballot unit</li>
          <li>Your vote is counted but does <strong>not go to any candidate</strong></li>
          <li>It is a <strong>valid democratic choice</strong> &mdash; you are exercising your right to reject all candidates</li>
        </ul>
      </div>
    ),
    contentTa: (
      <div className="space-y-3">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>NOTA</strong> என்பது &ldquo;மேற்கண்டவர்களில் யாரும் இல்லை&rdquo; என்று பொருள்</li>
          <li>இது EVM பாலட் யூனிட்டில் <strong>கடைசி பொத்தான்</strong></li>
          <li>உங்கள் வாக்கு எண்ணப்படும் ஆனால் <strong>எந்த வேட்பாளருக்கும் செல்லாது</strong></li>
          <li>இது ஒரு <strong>செல்லுபடியாகும் ஜனநாயக தேர்வு</strong> &mdash; அனைத்து வேட்பாளர்களையும் நிராகரிக்கும் உங்கள் உரிமையை நீங்கள் பயன்படுத்துகிறீர்கள்</li>
        </ul>
      </div>
    ),
  },
  {
    titleEn: "Your rights as a voter",
    titleTa: "வாக்காளராக உங்கள் உரிமைகள்",
    contentEn: (
      <div className="space-y-3">
        <ul className="list-disc pl-5 space-y-2">
          <li>Voting hours: <strong>7:00 AM to 6:00 PM</strong></li>
          <li>If you are in the queue before 6:00 PM, you <strong>MUST be allowed to vote</strong></li>
          <li>No campaigning is allowed within <strong>100 metres</strong> of the polling booth</li>
          <li>
            Report violations by calling{" "}
            <strong style={{ color: "#c84b11" }}>1950</strong> (toll-free)
          </li>
        </ul>
      </div>
    ),
    contentTa: (
      <div className="space-y-3">
        <ul className="list-disc pl-5 space-y-2">
          <li>வாக்குப்பதிவு நேரம்: <strong>காலை 7:00 முதல் மாலை 6:00 வரை</strong></li>
          <li>மாலை 6:00 மணிக்கு முன் நீங்கள் வரிசையில் இருந்தால், உங்களை <strong>கட்டாயம் வாக்களிக்க அனுமதிக்க வேண்டும்</strong></li>
          <li>வாக்குச்சாவடியிலிருந்து <strong>100 மீட்டர்</strong> சுற்றளவில் பிரச்சாரம் செய்ய அனுமதி இல்லை</li>
          <li>
            மீறல்களை புகாரளிக்க{" "}
            <strong style={{ color: "#c84b11" }}>1950</strong> (கட்டணமில்லா) என்ற எண்ணில் அழைக்கவும்
          </li>
        </ul>
      </div>
    ),
  },
];

export default function VoterGuidePage() {
  const { lang, t } = useLang();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6", fontFamily: "Outfit, sans-serif" }}>
      <Header active="voter-guide" />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            {t("nav.home")}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{t("nav.voterguide")}</span>
        </nav>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {lang === "en" ? "First-Time Voter Guide" : "முதல்முறை வாக்காளர் வழிகாட்டி"}
        </h1>
        <p className="text-gray-500 text-sm sm:text-base mb-8">
          {lang === "en"
            ? "Everything you need to know before you vote on April 23, 2026."
            : "ஏப்ரல் 23, 2026 அன்று வாக்களிக்கும் முன் நீங்கள் தெரிந்து கொள்ள வேண்டிய அனைத்தும்."}
        </p>

        {/* Accordion steps */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <AccordionCard
              key={i}
              step={step}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => toggle(i)}
            />
          ))}
        </div>

        {/* Footer CTA */}
        <div
          className="mt-10 p-6 text-center border border-gray-200 bg-white"
          style={{ borderRadius: 14 }}
        >
          <p className="text-gray-700 mb-3 font-medium">
            {lang === "en"
              ? "Ready to find your constituency?"
              : "உங்கள் தொகுதியைக் கண்டறிய தயாரா?"}
          </p>
          <Link
            href="/find-constituency"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-xl transition-colors"
            style={{ backgroundColor: "#c84b11" }}
          >
            {t("nav.find")}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}
