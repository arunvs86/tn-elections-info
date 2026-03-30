"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useLang } from "@/components/LanguageProvider";

export default function BoothLocatorPage() {
  const { lang } = useLang();
  const [epicNumber, setEpicNumber] = useState("");

  const isTa = lang === "ta";

  // Build direct search URL for ECI voter search portal
  const eciSearchUrl = epicNumber.trim()
    ? `https://electoralsearch.eci.gov.in/?lang=en`
    : `https://electoralsearch.eci.gov.in/?lang=en`;

  const ceoTnUrl = "https://ceotn.nic.in/";
  const voterHelpline = "tel:1950";

  return (
    <div className="min-h-screen" style={{ background: "#faf9f6" }}>
      <Header />
      <div className="max-w-xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-6">
          <Link
            href="/voter-guide"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-3"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {isTa ? "வாக்காளர் வழிகாட்டி" : "Voter Guide"}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isTa ? "வாக்குச் சாவடி கண்டறி" : "Find Your Polling Booth"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isTa
              ? "உங்கள் வாக்காளர் அடையாள அட்டை எண் (EPIC) அல்லது CEO TN இணையதளம் மூலம் உங்கள் வாக்குச் சாவடி கண்டறியுங்கள்."
              : "Find your polling booth using your Voter ID (EPIC number) or through the CEO Tamil Nadu portal."}
          </p>
        </div>

        {/* Quick method cards */}
        <div className="space-y-4">

          {/* Method 1: ECI Voter Search */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-white text-base font-bold"
                style={{ backgroundColor: "#c84b11" }}>1</span>
              <div>
                <h2 className="font-bold text-gray-900">
                  {isTa ? "ECI வாக்காளர் தேடல்" : "ECI Voter Search (Recommended)"}
                </h2>
                <p className="text-xs text-gray-500">
                  {isTa ? "EPIC எண் மூலம் வாக்குச் சாவடி கண்டறிக" : "Search by EPIC number to find booth & address"}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder={isTa ? "EPIC எண் உள்ளிடுக (எ.கா. TN/01/123/000001)" : "Enter EPIC number (e.g. TN/01/123/000001)"}
                value={epicNumber}
                onChange={(e) => setEpicNumber(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono"
              />
            </div>

            <a
              href={eciSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#c84b11" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {isTa ? "ECI வாக்காளர் தேடலுக்கு செல்க" : "Go to ECI Voter Search"}
            </a>
            <p className="text-[11px] text-gray-400 mt-2 text-center">
              {isTa
                ? "electoralsearch.eci.gov.in இல் EPIC எண்ணை உள்ளிட்டு தேடுங்கள்"
                : "Enter your EPIC number at electoralsearch.eci.gov.in"}
            </p>
          </div>

          {/* Method 2: CEO TN Portal */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-white text-base font-bold"
                style={{ backgroundColor: "#c84b11" }}>2</span>
              <div>
                <h2 className="font-bold text-gray-900">
                  {isTa ? "CEO தமிழ்நாடு இணையதளம்" : "CEO Tamil Nadu Portal"}
                </h2>
                <p className="text-xs text-gray-500">
                  {isTa ? "பெயர் அல்லது முகவரி மூலம் தேடுங்கள்" : "Search by name or address"}
                </p>
              </div>
            </div>
            <a
              href={ceoTnUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-colors hover:bg-gray-50"
              style={{ borderColor: "#c84b11", color: "#c84b11" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {isTa ? "ceotn.nic.in திறக்க" : "Open ceotn.nic.in"}
            </a>
          </div>

          {/* Method 3: Voter Helpline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-white text-base font-bold"
                style={{ backgroundColor: "#c84b11" }}>3</span>
              <div>
                <h2 className="font-bold text-gray-900">
                  {isTa ? "வாக்காளர் உதவி எண்" : "Voter Helpline 1950"}
                </h2>
                <p className="text-xs text-gray-500">
                  {isTa ? "24 மணி நேர தேர்தல் உதவி சேவை" : "24-hour election helpline by ECI"}
                </p>
              </div>
            </div>
            <a
              href={voterHelpline}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {isTa ? "1950 அழைக்க" : "Call 1950"}
            </a>
          </div>

          {/* Steps card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-3">
              {isTa ? "ECI தேடல் படிகள்" : "How to find your booth on ECI portal"}
            </h2>
            <ol className="space-y-2 text-sm text-gray-600">
              {(isTa ? [
                "electoralsearch.eci.gov.in திறக்கவும்",
                '"EPIC No." தாவலை தேர்ந்தெடுக்கவும்',
                "உங்கள் வாக்காளர் அடையாள அட்டை எண்ணை உள்ளிடவும்",
                "உங்கள் வாக்குச் சாவடி பெயர், முகவரி தெரியும்",
                "\"Get Directions\" பொத்தானை அழுத்தி Google Maps திறக்கவும்",
              ] : [
                "Open electoralsearch.eci.gov.in",
                'Click the "EPIC No." tab',
                "Enter your Voter ID (EPIC) number",
                "Your polling booth name and address will appear",
                'Click "Get Directions" to open in Google Maps',
              ]).map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* EPIC number tip */}
          <div className="bg-orange-50 rounded-2xl border border-orange-100 p-4">
            <p className="text-xs font-semibold text-orange-800 mb-1">
              {isTa ? "EPIC எண் எங்கே இருக்கும்?" : "Where is my EPIC number?"}
            </p>
            <p className="text-xs text-orange-700">
              {isTa
                ? "உங்கள் வாக்காளர் அடையாள அட்டையின் முன் பகுதியில் மேலே தெரியும். TN என்று தொடங்கும் 10-அட்டவணை எண் அது. (எ.கா. TN/01/123/000001)"
                : "It's printed on the front of your Voter ID card — a 10-character code starting with TN. (e.g. TN/01/123/000001)"}
            </p>
          </div>

          {/* Back to Voter Guide */}
          <div className="text-center pt-2">
            <Link
              href="/voter-guide"
              className="text-sm font-medium hover:underline"
              style={{ color: "#c84b11" }}
            >
              {isTa ? "← வாக்காளர் வழிகாட்டிக்கு திரும்பு" : "← Back to Voter Guide"}
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
