-- ============================================================
-- party_facts table — verified facts for the Voter Quiz
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- Each row is ONE verifiable fact tied to a party + quiz topic.
-- NEVER insert unverified claims. Every fact must have source_url.
-- fact_type: 'concern' = negative for the party | 'positive' = achievement
-- verified: set TRUE only when source_url has been manually checked

CREATE TABLE IF NOT EXISTS party_facts (
  id             SERIAL PRIMARY KEY,
  party          TEXT NOT NULL CHECK (party IN ('DMK','TVK','AIADMK')),
  category       TEXT NOT NULL,   -- matches quiz question id
                                  -- employment | women | agriculture |
                                  -- education | corruption | healthcare | cost_of_living
  fact_text      TEXT NOT NULL,
  fact_text_ta   TEXT,
  fact_type      TEXT NOT NULL CHECK (fact_type IN ('concern','positive')),
  source_name    TEXT NOT NULL,   -- e.g. "The Hindu", "TN Budget 2024-25"
  source_url     TEXT,            -- direct link — required for verified=true
  verified       BOOLEAN DEFAULT FALSE,
  display_order  INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (read-only public access is fine — this is public data)
ALTER TABLE party_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read party_facts"
  ON party_facts FOR SELECT
  USING (true);

-- Index for fast quiz queries
CREATE INDEX IF NOT EXISTS idx_party_facts_party_cat ON party_facts (party, category);
CREATE INDEX IF NOT EXISTS idx_party_facts_verified  ON party_facts (verified);
