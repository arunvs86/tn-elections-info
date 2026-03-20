"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";

// ── Types ──────────────────────────────────────────────
interface CandidateCard {
  name: string;
  party: string;
  constituency: string;
  votes: number | null;
  vote_share: number | null;
  criminal_cases: number;
  net_worth: number | null;
  is_winner: boolean;
}

interface ComparisonData {
  candidates: CandidateCard[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  // Rich response data (optional)
  candidates?: CandidateCard[];
  comparison?: ComparisonData;
  suggestions?: string[];
}

// ── Helpers ────────────────────────────────────────────
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function partyColor(party: string): string {
  const p = (party || "").toUpperCase();
  if (p === "ADMK" || p.includes("AIADMK")) return "#2d7a4f";
  if (p.includes("DMK")) return "#c0392b";
  if (p.includes("TVK")) return "#1a5276";
  if (p.includes("BJP")) return "#d35400";
  if (p.includes("NTK")) return "#6c3483";
  if (p.includes("INC") || p.includes("CONGRESS")) return "#1565c0";
  if (p.includes("PMK")) return "#b8860b";
  return "#888";
}

function formatCurrency(val: number | null): string {
  if (val == null) return "Not disclosed";
  if (val >= 10000000) return `${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(1)} L`;
  return `${val.toLocaleString("en-IN")}`;
}

// ── Web Speech API hook ────────────────────────────────
function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition
        : null;
    setSupported(!!SpeechRecognition);
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-IN";
    }
  }, []);

  const listen = useCallback(
    (onResult: (text: string) => void) => {
      if (!recognitionRef.current) return;
      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        onResult(text);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
      setIsListening(true);
      recognitionRef.current.start();
    },
    []
  );

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return { isListening, supported, listen, stop };
}

// ── Candidate mini-card ────────────────────────────────
function CandidateMiniCard({ c }: { c: CandidateCard }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 text-xs">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-bold text-gray-900">{c.name}</span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ background: partyColor(c.party) }}
        >
          {c.party}
        </span>
      </div>
      <p className="text-gray-500 text-[10px] mb-1.5">{c.constituency}</p>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <p className="text-gray-400">Votes</p>
          <p className="font-semibold text-gray-700">
            {c.votes?.toLocaleString("en-IN") || "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-400">Net Worth</p>
          <p className="font-semibold text-gray-700">
            {formatCurrency(c.net_worth)}
          </p>
        </div>
        <div>
          <p className="text-gray-400">Cases</p>
          <p
            className={`font-semibold ${
              c.criminal_cases > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {c.criminal_cases}
          </p>
        </div>
      </div>
      {c.is_winner && (
        <span className="inline-block mt-1.5 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
          Winner
        </span>
      )}
    </div>
  );
}

// ── Main ChatWidget ────────────────────────────────────
export default function ChatWidget() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: t("chat.welcome"),
      timestamp: new Date(),
      suggestions: [
        t("chat.suggestion1"),
        t("chat.suggestion2"),
        t("chat.suggestion3"),
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isListening, supported, listen, stop } = useSpeechRecognition();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  // Extract keywords from natural language query
  function extractSearchTerm(text: string): string {
    // Remove common question prefixes to get the core search term
    let cleaned = text
      .replace(/^(who is|what is|tell me about|show me|find|search|get|list|what are|how many|which)/i, "")
      .replace(/\b(the|a|an|of|in|for|from|mla|mp|candidate|candidates|constituency|district|results|election|elections|2021|2026)\b/gi, "")
      .replace(/[?.,!]/g, "")
      .trim();
    // If nothing left, return original
    return cleaned || text.trim();
  }

  // Local Supabase fallback when backend is unreachable
  async function handleLocalFallback(text: string) {
    const searchTerm = extractSearchTerm(text);

    try {
      // Try matching a constituency
      const { data: constituencies } = await supabase
        .from("constituencies")
        .select("id,name,district,current_mla,current_mla_party")
        .ilike("name", `%${searchTerm}%`)
        .limit(1);

      if (constituencies && constituencies.length > 0) {
        const cons = constituencies[0];
        // Fetch candidates for this constituency
        const { data: candidates } = await supabase
          .from("candidates")
          .select("*")
          .eq("constituency_id", cons.id)
          .eq("election_year", 2021)
          .order("votes_received", { ascending: false });

        const cards: CandidateCard[] = (candidates || []).map((c: any) => ({
          name: c.name,
          party: c.party,
          constituency: cons.name,
          votes: c.votes_received,
          vote_share: c.vote_share,
          criminal_cases: c.criminal_cases_declared || 0,
          net_worth: c.net_worth,
          is_winner: c.is_winner || false,
        }));

        const winner = cards.find((c) => c.is_winner);
        const responseText = winner
          ? `${cons.name} (${cons.district} district): The current MLA is ${winner.name} from ${winner.party}${winner.votes ? `, who won with ${winner.votes.toLocaleString("en-IN")} votes (${winner.vote_share}%)` : ""}. There were ${cards.length} candidates in 2021.`
          : `${cons.name} (${cons.district} district): Found ${cards.length} candidates from the 2021 election.`;

        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            text: responseText,
            timestamp: new Date(),
            candidates: cards.length > 0 ? cards.slice(0, 5) : undefined,
            suggestions: [
              `Compare top 2 in ${cons.name}`,
              `Criminal cases in ${cons.name}?`,
              `Swing seats in ${cons.district}`,
            ],
          },
        ]);
        return;
      }

      // Try matching a candidate by name
      const { data: candidateRows } = await supabase
        .from("candidates")
        .select("*, constituencies(name,district)")
        .ilike("name", `%${searchTerm}%`)
        .eq("election_year", 2021)
        .limit(5);

      if (candidateRows && candidateRows.length > 0) {
        const cards: CandidateCard[] = candidateRows.map((c: any) => ({
          name: c.name,
          party: c.party,
          constituency: c.constituencies?.name || "",
          votes: c.votes_received,
          vote_share: c.vote_share,
          criminal_cases: c.criminal_cases_declared || 0,
          net_worth: c.net_worth,
          is_winner: c.is_winner || false,
        }));

        const first = cards[0];
        const responseText = `Found ${cards.length} candidate(s) matching "${searchTerm}". ${first.name} (${first.party}) contested from ${first.constituency}${first.is_winner ? " and won" : ""}.`;

        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            text: responseText,
            timestamp: new Date(),
            candidates: cards,
            suggestions: [
              "Compare with opponents",
              "Criminal case details",
              `More about ${first.constituency}`,
            ],
          },
        ]);
        return;
      }

      // Nothing found
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          text: `I couldn't find results for "${searchTerm}". Try a constituency name like "Singanallur" or "Coimbatore South", or a candidate name.`,
          timestamp: new Date(),
          suggestions: [
            "Who is the MLA of Singanallur?",
            "Show me Chennai results",
            "DMK candidates in Coimbatore",
          ],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          text: "Sorry, I'm having trouble connecting right now. Please try again.",
          timestamp: new Date(),
        },
      ]);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    try {
      // Build conversation context (last 5 messages)
      const context = [...messages.slice(-4), userMsg].map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          context,
        }),
      });

      if (!res.ok) throw new Error(`Backend returned ${res.status}`);

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        text: data.response || "I couldn't find an answer. Try rephrasing?",
        timestamp: new Date(),
        candidates: data.candidates || undefined,
        comparison: data.comparison || undefined,
        suggestions: data.suggestions || undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Fallback: query Supabase directly from the frontend
      await handleLocalFallback(text.trim());
    } finally {
      setLoading(false);
    }
  }

  function handleVoice() {
    if (isListening) {
      stop();
    } else {
      listen((text) => {
        setInput(text);
        // Auto-send after voice input
        setTimeout(() => sendMessage(text), 300);
      });
    }
  }

  // ── Render ──
  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-terracotta text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
          aria-label="Open chat"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-48px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-terracotta text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">🗳️</span>
              <div>
                <p className="font-bold text-sm leading-none">
                  {t("chat.title")}
                </p>
                <p className="text-[10px] text-white/70">
                  {t("chat.subtitle")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/chat"
                className="text-white/70 hover:text-white text-xs transition-colors"
                title="Open full page"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id}>
                {/* Message bubble */}
                <div
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-terracotta text-white rounded-br-md"
                        : "bg-gray-50 text-gray-800 rounded-bl-md border border-gray-100"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>

                {/* Rich: Candidate cards */}
                {msg.candidates && msg.candidates.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.candidates.slice(0, 5).map((c, i) => (
                      <CandidateMiniCard key={i} c={c} />
                    ))}
                    {msg.candidates.length > 5 && (
                      <p className="text-[10px] text-gray-400 text-center">
                        +{msg.candidates.length - 5} more candidates
                      </p>
                    )}
                  </div>
                )}

                {/* Rich: Comparison table */}
                {msg.comparison && msg.comparison.candidates.length >= 2 && (
                  <div className="mt-2 bg-white rounded-xl border border-gray-100 p-3 overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="text-left pb-1">Field</th>
                          {msg.comparison.candidates.map((c, i) => (
                            <th key={i} className="text-right pb-1">
                              {c.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-gray-700">
                        <tr className="border-t border-gray-50">
                          <td className="py-1 text-gray-500">Party</td>
                          {msg.comparison.candidates.map((c, i) => (
                            <td key={i} className="py-1 text-right font-bold">
                              <span
                                className="px-1.5 py-0.5 rounded text-white text-[9px]"
                                style={{ background: partyColor(c.party) }}
                              >
                                {c.party}
                              </span>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-gray-50">
                          <td className="py-1 text-gray-500">Votes</td>
                          {msg.comparison.candidates.map((c, i) => (
                            <td key={i} className="py-1 text-right">
                              {c.votes?.toLocaleString("en-IN") || "—"}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-gray-50">
                          <td className="py-1 text-gray-500">Net Worth</td>
                          {msg.comparison.candidates.map((c, i) => (
                            <td key={i} className="py-1 text-right">
                              {formatCurrency(c.net_worth)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t border-gray-50">
                          <td className="py-1 text-gray-500">Cases</td>
                          {msg.comparison.candidates.map((c, i) => (
                            <td
                              key={i}
                              className={`py-1 text-right font-bold ${
                                c.criminal_cases > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {c.criminal_cases}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Suggestion chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        className="text-[11px] text-terracotta bg-terracotta/5 hover:bg-terracotta/10 border border-terracotta/20 px-2.5 py-1 rounded-full transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 rounded-2xl rounded-bl-md border border-gray-100 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-gray-100 px-3 py-2.5 flex items-center gap-2 flex-shrink-0 bg-white">
            {/* Voice button */}
            {supported && (
              <button
                onClick={handleVoice}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            )}

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={
                isListening ? t("chat.listening") : t("chat.placeholder")
              }
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta/30"
              disabled={loading || isListening}
            />

            {/* Send button */}
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-9 h-9 bg-terracotta text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-terracotta/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
