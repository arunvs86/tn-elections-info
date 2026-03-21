-- ============================================================
-- Migration 002: Add persons table + person_id to candidates
-- Purpose: Link the same human across multiple elections
--   e.g., "M.K. Stalin" in DMK 2021 and DMK 2026 are the same person
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Create persons table (one row per unique human)
CREATE TABLE IF NOT EXISTS persons (
  id               SERIAL PRIMARY KEY,
  canonical_name   TEXT NOT NULL,          -- e.g. "M.K. Stalin"
  gender           TEXT,                    -- M / F / Other
  dob              DATE,                    -- date of birth if known
  photo_url        TEXT,                    -- best available photo
  myneta_id        INTEGER,                 -- MyNeta's own candidate ID (most reliable cross-ref)
  notes            TEXT,                    -- any disambiguation notes
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add person_id FK to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS person_id INTEGER REFERENCES persons(id);

-- 3. Add Tamil AI summary cache columns to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_summary_ta TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_summary_en TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_summary_updated_at TIMESTAMPTZ;

-- 4. Add assembly attendance columns to candidates (for incumbents)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assembly_attendance_pct DECIMAL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assembly_sessions_attended INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assembly_sessions_total INTEGER;

-- 5. Index for person lookups
CREATE INDEX IF NOT EXISTS idx_candidates_person ON candidates(person_id);
CREATE INDEX IF NOT EXISTS idx_persons_myneta ON persons(myneta_id);

-- 6. RLS for persons table
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON persons FOR SELECT USING (true);

-- ============================================================
-- BACKFILL: Auto-create person records from 2021 candidates
-- Groups by (name, constituency) to create unique persons
-- ============================================================
-- Run this AFTER the above DDL:

INSERT INTO persons (canonical_name)
SELECT DISTINCT name FROM candidates WHERE election_year = 2021
ON CONFLICT DO NOTHING;

-- Link candidates to their person records
UPDATE candidates c
SET person_id = p.id
FROM persons p
WHERE c.name = p.canonical_name
  AND c.person_id IS NULL;
