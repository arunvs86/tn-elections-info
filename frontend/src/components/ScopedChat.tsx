"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface ScopedChatProps {
  title: string;
  placeholder: string;
  context: string; // e.g. "This conversation is about Singanallur constituency"
  suggestions: string[];
}

export default function ScopedChat({ title, placeholder, context, suggestions }: ScopedChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${context}\n\nUser question: ${text.trim()}`,
          context: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.response || data.text || "Sorry, I couldn't process that.";
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong. Please try again." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Unable to connect to the server." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!expanded) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-left"
        >
          <h3 className="font-bold text-gray-900 text-sm mb-1">{title}</h3>
          <p className="text-xs text-gray-500">{placeholder}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {suggestions.slice(0, 3).map((s, i) => (
              <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Collapse
        </button>
      </div>

      {/* Messages */}
      <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
        {messages.length === 0 && (
          <div className="space-y-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="block w-full text-left text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-2 rounded-lg transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm px-3 py-2 rounded-xl max-w-[85%] ${
              m.role === "user"
                ? "bg-terracotta text-white ml-auto"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="bg-gray-100 text-gray-400 text-sm px-3 py-2 rounded-xl max-w-[85%] animate-pulse">
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-terracotta"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-terracotta text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-[#a33d0e] transition-colors"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
