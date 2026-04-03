"use client";

import Link from "next/link";
import VisitorTracker from "@/components/VisitorTracker";
import ReviewWidget from "@/components/ReviewWidget";

export default function Footer() {
  return (
    <footer className="mt-16 bg-white border-t border-gray-100">

      {/* ── Reviews banner ── */}
      <ReviewWidget />

      {/* ── Bottom bar ── */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 items-start">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-terracotta flex items-center justify-center">
                <span className="text-white text-xs font-extrabold">TN</span>
              </div>
              <span className="font-extrabold text-gray-900">tnelections.info</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Voter intelligence platform for Tamil Nadu Elections 2026. Independent, non-partisan, open data.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              © 2026 tnelections.info · Data sourced from ECI & MyNeta
            </p>
            
            <div className="mt-2">
              <VisitorTracker />
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Explore</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/districts" className="hover:text-terracotta transition-colors">All Constituencies</Link></li>
              <li><Link href="/manifesto" className="hover:text-terracotta transition-colors">Party Manifestos</Link></li>
              <li><Link href="/voter-guide" className="hover:text-terracotta transition-colors">Voter Guide</Link></li>
              <li><Link href="/vote-calculator" className="hover:text-terracotta transition-colors">Vote Calculator</Link></li>
              <li><Link href="/pledge" className="hover:text-terracotta transition-colors">Take the Pledge</Link></li>
            </ul>
          </div>

          {/* Tagline */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Mission</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Every voter deserves to know who they are voting for. We make candidate data accessible, understandable, and actionable.
            </p>

            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
              </span>
              Designed and developed by{" "}
              <a
                href="https://www.linkedin.com/in/arun-vsoundararajan/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gray-500 hover:text-[#0A66C2] transition-colors font-medium"
              >
                Arun V Soundararajan
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </span>

            
          </div>

        </div>
      </div>

    </footer>
  );
}
