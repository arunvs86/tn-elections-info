"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";

interface HeaderProps {
  /** Which nav link is currently active (highlighted) */
  active?: "home" | "districts" | "factcheck" | "swing" | "chat";
}

export default function Header({ active }: HeaderProps) {
  const { lang, setLang, t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/districts", key: "nav.districts", id: "districts" },
    { href: "/fact-check", key: "nav.factcheck", id: "factcheck" },
    { href: "/swing-seats", key: "nav.swingseats", id: "swing" },
  ];

  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🗳️</span>
          <div>
            <p className="font-bold text-gray-900 leading-none">tnelections.info</p>
            <p className="text-xs text-gray-500">Tamil Nadu 2026</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          {navLinks.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className={
                active === link.id
                  ? "text-terracotta font-semibold"
                  : "hover:text-terracotta transition-colors"
              }
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        {/* Right side: lang toggle + hamburger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="text-sm font-semibold text-terracotta border border-terracotta px-3 py-1.5 rounded-[9px] hover:bg-terracotta hover:text-white transition-colors"
          >
            {lang === "en" ? "தமிழ்" : "English"}
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className={`text-sm font-medium ${active === "home" ? "text-terracotta" : "text-gray-600 hover:text-terracotta"} transition-colors`}
            >
              {t("nav.home")}
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`text-sm font-medium ${
                  active === link.id
                    ? "text-terracotta font-semibold"
                    : "text-gray-600 hover:text-terracotta"
                } transition-colors`}
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
