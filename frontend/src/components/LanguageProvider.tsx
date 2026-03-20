"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Lang, translate } from "@/lib/i18n";

// ── Context type ──────────────────────────────────
interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

// ── Provider ──────────────────────────────────────
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Persist language preference in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("tn_lang") as Lang | null;
    if (saved === "en" || saved === "ta") {
      setLangState(saved);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("tn_lang", l);
    // Update <html> lang attribute for accessibility
    document.documentElement.lang = l === "ta" ? "ta" : "en";
  }, []);

  const t = useCallback(
    (key: string) => translate(key, lang),
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────
export function useLang() {
  return useContext(LangContext);
}
