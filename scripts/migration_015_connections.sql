-- Migration 015: Candidate connections cache table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS candidate_connections (
  id              SERIAL PRIMARY KEY,
  candidate_id    INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  graph_data      JSONB NOT NULL,   -- { nodes: [], edges: [], summary: "", red_flags: [] }
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id)
);

ALTER TABLE candidate_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read connections" ON candidate_connections;
CREATE POLICY "Public read connections" ON candidate_connections FOR SELECT USING (true);
GRANT SELECT ON candidate_connections TO anon, authenticated;
