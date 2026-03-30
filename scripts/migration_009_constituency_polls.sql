-- Migration 009: Constituency-level opinion polls
-- Each visitor can vote once per constituency (fingerprint + constituency_id unique)

CREATE TABLE IF NOT EXISTS constituency_polls (
  id            SERIAL PRIMARY KEY,
  constituency_id INT NOT NULL,
  candidate_name TEXT NOT NULL,
  party         TEXT NOT NULL,
  fingerprint   TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- One vote per device per constituency
ALTER TABLE constituency_polls
  ADD CONSTRAINT constituency_polls_fingerprint_constituency_unique
  UNIQUE (fingerprint, constituency_id);

-- Index for fast result lookups
CREATE INDEX idx_constituency_polls_constituency_id
  ON constituency_polls (constituency_id);

-- RLS
ALTER TABLE constituency_polls ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "anon_insert_constituency_polls"
  ON constituency_polls
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous selects
CREATE POLICY "anon_select_constituency_polls"
  ON constituency_polls
  FOR SELECT
  TO anon
  USING (true);
