"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";

interface HeaderProps {
  active?: string;
}

export default function Header({ active }: HeaderProps) {
  const { lang, setLang, t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [voterOpen, setVoterOpen] = useState(false);
  const voterRef = useRef<HTMLDivElement>(null);

  // "For Voters" dropdown — action tools
  const voterTools = [
    { href: "/find-constituency", label: t("nav.find"), id: "find" },
    { href: "/vote-calculator", label: "உங்கள் vote முக்கியமா?", id: "vote-calculator" },
    { href: "/pledge", label: "Thamizhan Pledge", id: "pledge" },
    { href: "/voter-guide", label: t("nav.voterguide"), id: "voter-guide" },
    { href: "/booth-locator", label: "Booth Locator", id: "booth-locator" },
  ];

  // Direct nav links — research/info
  const directLinks = [
    { href: "/districts", label: t("nav.districts"), id: "districts" },
    { href: "/parties", label: t("nav.parties"), id: "parties" },
    { href: "/manifesto", label: t("nav.manifesto"), id: "manifesto" },
    { href: "/swing-seats", label: t("nav.swing"), id: "swing" },
    { href: "/alt-history", label: "What if they voted?", id: "alt-history" },
    { href: "/fact-check", label: t("nav.factcheck"), id: "factcheck" },
  ];

  // Extra links — in mobile menu only
  const extraLinks = [
    { href: "/manifesto", label: t("nav.manifesto"), id: "manifesto" },
    { href: "/asset-growth", label: "Wealth Growth", id: "asset-growth" },
    { href: "/alt-history", label: "What if they voted?", id: "alt-history" },
    { href: "/news", label: t("nav.news"), id: "news" },
    { href: "/results", label: t("nav.results"), id: "results" },
  ];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (voterRef.current && !voterRef.current.contains(e.target as Node)) {
        setVoterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isVoterActive = voterTools.some(l => l.id === active);

  return (
    <header className="border-b border-gray-200 bg-white/90 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="TN Elections" className="w-8 h-8" />
          <div className="hidden sm:block">
            <p className="font-bold text-sm text-gray-900 leading-none">tnelections.info</p>
            <p className="text-xs text-gray-500">{t("header.subtitle")}</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium flex-1 justify-center">

          {/* Voter Tools dropdown */}
          <div className="relative" ref={voterRef}>
            <button
              onClick={() => setVoterOpen(o => !o)}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isVoterActive ? "text-terracotta font-semibold" : "text-gray-600 hover:text-terracotta"
              }`}
            >
              Voter Tools
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"
                className={`transition-transform mt-px ${voterOpen ? "rotate-180" : ""}`}>
                <path d="M6 8L1 3h10L6 8z" />
              </svg>
            </button>
            {voterOpen && (
              <div className="absolute top-full left-0 mt-2 w-60 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50">
                {voterTools.map(link => (
                  <Link
                    key={link.id}
                    href={link.href}
                    onClick={() => setVoterOpen(false)}
                    className={`flex items-center px-4 py-2.5 text-sm hover:bg-orange-50 transition-colors ${
                      active === link.id
                        ? "text-terracotta font-semibold bg-orange-50"
                        : "text-gray-700"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Direct links */}
          {directLinks.map(link => (
            <Link
              key={link.id}
              href={link.href}
              className={`transition-colors ${
                active === link.id
                  ? "text-terracotta font-semibold"
                  : "text-gray-600 hover:text-terracotta"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: lang toggle + hamburger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="text-sm font-semibold text-terracotta border border-terracotta px-3 py-1.5 rounded-[9px] hover:bg-terracotta hover:text-white transition-colors"
          >
            {lang === "en" ? "தமிழ்" : "English"}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white max-h-[calc(100vh-60px)] overflow-y-auto">
          <nav className="max-w-6xl mx-auto px-4 py-2 flex flex-col">
            <Link href="/" onClick={() => setMenuOpen(false)}
              className="py-2.5 text-sm font-medium border-b border-gray-50 text-gray-700">
              Home
            </Link>

            {/* Voter tools section */}
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-3 mb-1 px-0.5">Voter Tools</p>
            {voterTools.map(link => (
              <Link key={link.id} href={link.href} onClick={() => setMenuOpen(false)}
                className={`py-2.5 text-sm font-medium border-b border-gray-50 ${
                  active === link.id ? "text-terracotta font-semibold" : "text-gray-700"
                }`}>
                {link.label}
              </Link>
            ))}

            {/* Research section */}
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-3 mb-1 px-0.5">Research</p>
            {[...directLinks, ...extraLinks].map(link => (
              <Link key={link.id} href={link.href} onClick={() => setMenuOpen(false)}
                className={`py-2.5 text-sm font-medium border-b border-gray-50 last:border-0 ${
                  active === link.id ? "text-terracotta font-semibold" : "text-gray-700"
                }`}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
