"use client";

import Link from "next/link";
import VisitorTracker from "@/components/VisitorTracker";

export default function Footer() {
  return (
    <footer className="mt-16 bg-white border-t border-gray-100">

      {/* ── Donation banner — full-width prominent block ── */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 py-10 px-4">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-1">Support this project</p>
          <h3 className="text-xl font-extrabold text-gray-900 mb-1">This site is free & independent</h3>
          <p className="text-sm text-gray-500 mb-6">
            If tnelections.info helped you make an informed choice, kindly consider donating to help me keep the site up and running. 
          </p>
          {/* QR code — large and centred */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/qr.jpg"
            alt="UPI QR code for donation"
            className="w-56 h-56 mx-auto rounded-2xl border-2 border-orange-200 shadow-md object-contain bg-white p-2"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            suppressHydrationWarning
          />
          <p className="mt-4 text-sm font-semibold text-gray-600">Scan with PhonePe · GPay · Paytm · any UPI app</p>
          <p className="text-xs text-gray-400 mt-1">Any amount helps keep this site running 🙏</p>
        </div>
      </div>

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
          </div>

        </div>
      </div>

    </footer>
  );
}
