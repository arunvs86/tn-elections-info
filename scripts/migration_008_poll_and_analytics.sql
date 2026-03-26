-- Migration 008: Opinion Poll + Visitor Counter
-- Run via Supabase SQL Editor

-- ── Visitor counter (simple page view tracker) ──
CREATE TABLE IF NOT EXISTS site_visits (
  id          BIGSERIAL PRIMARY KEY,
  visited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page        TEXT NOT NULL DEFAULT '/',
  fingerprint TEXT  -- anonymous browser fingerprint (no PII)
);

-- Index for counting unique visitors
CREATE INDEX IF NOT EXISTS idx_site_visits_fingerprint ON site_visits(fingerprint);
CREATE INDEX IF NOT EXISTS idx_site_visits_date ON site_visits(visited_at);

-- ── Opinion poll votes ──
CREATE TABLE IF NOT EXISTS opinion_poll_votes (
  id          BIGSERIAL PRIMARY KEY,
  alliance    TEXT NOT NULL CHECK (alliance IN ('DMK+', 'ADMK+', 'TVK', 'NTK')),
  voted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fingerprint TEXT NOT NULL  -- one vote per browser
);

-- Unique constraint: one vote per fingerprint
CREATE UNIQUE INDEX IF NOT EXISTS idx_opinion_poll_unique_vote ON opinion_poll_votes(fingerprint);

-- ── RLS Policies ──
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE opinion_poll_votes ENABLE ROW LEVEL SECURITY;

-- Public can INSERT visits
CREATE POLICY "Anyone can log visits" ON site_visits FOR INSERT WITH CHECK (true);
-- Public can read aggregate counts only (enforced at app level)
CREATE POLICY "Anyone can read visits" ON site_visits FOR SELECT USING (true);

-- Public can INSERT votes (one per fingerprint)
CREATE POLICY "Anyone can vote" ON opinion_poll_votes FOR INSERT WITH CHECK (true);
-- Public can read vote counts
CREATE POLICY "Anyone can read votes" ON opinion_poll_votes FOR SELECT USING (true);

-- ── Aggregate view for quick poll results ──
CREATE OR REPLACE VIEW opinion_poll_results AS
SELECT
  alliance,
  COUNT(*) as votes,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM opinion_poll_votes), 0), 1) as percentage
FROM opinion_poll_votes
GROUP BY alliance
ORDER BY votes DESC;

-- ── Aggregate view for visitor stats ──
CREATE OR REPLACE VIEW visitor_stats AS
SELECT
  COUNT(*) as total_visits,
  COUNT(DISTINCT fingerprint) as unique_visitors,
  COUNT(DISTINCT DATE(visited_at)) as active_days
FROM site_visits;
