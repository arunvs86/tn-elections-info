import { createClient } from "@supabase/supabase-js";

// These env vars are set in .env.local
// NEXT_PUBLIC_ prefix means they are safely exposed to the browser
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[supabase.ts] Missing env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
  );
}

// Single shared client instance — reused across all components
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Database type helpers ─────────────────────────
// These TypeScript types mirror the Supabase table columns.
// If you add a column to Supabase, add it here too.

export type Constituency = {
  id: number;
  name: string;
  district: string;
  constituency_number: number | null;
  total_voters_2021: number | null;
  total_voters_2026: number | null;
  turnout_2021: number | null;
  current_mla: string | null;
  current_mla_party: string | null;
  alliance_2026: string | null;
  is_swing_seat: boolean;
  swing_margin_2021: number | null;
};

export type Candidate = {
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
};

export type AgentMessage = {
  id: number;
  session_id: string;
  from_agent: string;
  to_agent: string | null;
  message: string;
  message_type: string;
  created_at: string;
};

export type FactCheck = {
  id: number;
  claim_text: string;
  claim_language: string;
  party_about: string | null;
  verdict: "true" | "misleading" | "false" | "unverifiable";
  confidence_pct: number;
  explanation: string;
  explanation_tamil: string | null;
  sources: Record<string, string>[] | null;
  reasoning_trace: Record<string, unknown>[] | null;
  created_at: string;
};

export type ElectionResult = {
  id: number;
  constituency_id: number;
  election_year: number;
  winner_name: string;
  winner_party: string;
  winner_votes: number;
  winner_vote_share: number;
  runner_up_name: string;
  runner_up_party: string;
  runner_up_votes: number;
  margin: number;
  total_votes: number;
  turnout: number;
  total_candidates: number;
};
