-- ── Migration 011: SIR 2026 Voter Roll Statistics ─────────────────────────
-- Run this in Supabase SQL Editor
-- Source: elections.tn.gov.in/ACwise_Gendercount_23022026.aspx (Final Roll 23/02/2026)

ALTER TABLE constituencies
  ADD COLUMN IF NOT EXISTS voters_total_2026        INTEGER,
  ADD COLUMN IF NOT EXISTS voters_male_2026         INTEGER,
  ADD COLUMN IF NOT EXISTS voters_female_2026       INTEGER,
  ADD COLUMN IF NOT EXISTS voters_third_gender_2026 INTEGER;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS constituencies_voters_total_idx ON constituencies(voters_total_2026);
