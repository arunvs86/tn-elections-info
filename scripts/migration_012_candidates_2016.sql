-- Migration 012: Support 2016 candidate data + cross-year analysis views
-- Run this in Supabase SQL Editor BEFORE running scrape_myneta_2016.py import

-- 0. Create persons table if it was never created (from migration_002)
CREATE TABLE IF NOT EXISTS persons (
  id               SERIAL PRIMARY KEY,
  canonical_name   TEXT NOT NULL,
  gender           TEXT,
  dob              DATE,
  photo_url        TEXT,
  myneta_id        INTEGER,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS person_id INTEGER REFERENCES persons(id);
CREATE INDEX IF NOT EXISTS idx_candidates_person ON candidates(person_id);
CREATE INDEX IF NOT EXISTS idx_persons_myneta ON persons(myneta_id);

ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read" ON persons;
CREATE POLICY "Public read" ON persons FOR SELECT USING (true);

-- Backfill: create person records for existing 2021 candidates
INSERT INTO persons (canonical_name)
SELECT DISTINCT name FROM candidates WHERE election_year = 2021
ON CONFLICT DO NOTHING;

-- Link 2021 candidates to their person records
UPDATE candidates c
SET person_id = p.id
FROM persons p
WHERE c.name = p.canonical_name
  AND c.election_year = 2021
  AND c.person_id IS NULL;

-- 1. Add myneta_id_2016 column to candidates (to track import source + enable dedup)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS myneta_id_2016 INTEGER;
CREATE INDEX IF NOT EXISTS idx_candidates_myneta_2016 ON candidates(myneta_id_2016);

-- 2. Ensure election_year index exists for fast cross-year queries
CREATE INDEX IF NOT EXISTS idx_candidates_election_year ON candidates(election_year);

-- ============================================================
-- VIEW: asset_growth
-- For each person who ran in BOTH 2016 and 2021,
-- shows their net worth in each year and the growth %.
-- Red flag: >500% growth = potentially suspicious wealth accumulation
-- ============================================================
CREATE OR REPLACE VIEW asset_growth AS
SELECT
  p.id            AS person_id,
  p.canonical_name AS name,
  c16.party        AS party_2016,
  c21.party        AS party_2021,
  -- Flag party hoppers
  CASE WHEN c16.party IS DISTINCT FROM c21.party
       THEN TRUE ELSE FALSE END AS party_changed,
  c16.constituency_id  AS constituency_id_2016,
  c21.constituency_id  AS constituency_id_2021,
  const16.name         AS constituency_2016,
  const21.name         AS constituency_2021,
  c16.net_worth        AS net_worth_2016,
  c21.net_worth        AS net_worth_2021,
  -- Growth in rupees
  (c21.net_worth - c16.net_worth) AS net_worth_change,
  -- Growth percentage (NULL if 2016 worth is 0 or NULL)
  CASE
    WHEN c16.net_worth IS NULL OR c16.net_worth = 0 THEN NULL
    ELSE ROUND(
      ((c21.net_worth::DECIMAL - c16.net_worth) / c16.net_worth) * 100,
      1
    )
  END AS growth_pct,
  -- Flag: >500% growth
  CASE
    WHEN c16.net_worth > 0 AND c21.net_worth > 0
     AND ((c21.net_worth::DECIMAL - c16.net_worth) / c16.net_worth) > 5.0
    THEN TRUE ELSE FALSE
  END AS suspicious_growth,
  c21.criminal_cases_declared  AS criminal_cases_2021,
  c16.criminal_cases_declared  AS criminal_cases_2016
FROM persons p
JOIN candidates c16 ON c16.person_id = p.id AND c16.election_year = 2016
JOIN candidates c21 ON c21.person_id = p.id AND c21.election_year = 2021
LEFT JOIN constituencies const16 ON const16.id = c16.constituency_id
LEFT JOIN constituencies const21 ON const21.id = c21.constituency_id;

-- Grant public read on the view
GRANT SELECT ON asset_growth TO anon;
GRANT SELECT ON asset_growth TO authenticated;

-- ============================================================
-- VIEW: party_hoppers
-- Candidates who changed party between 2016 and 2021
-- ============================================================
CREATE OR REPLACE VIEW party_hoppers AS
SELECT
  p.id             AS person_id,
  p.canonical_name AS name,
  c16.party        AS party_2016,
  c21.party        AS party_2021,
  const21.name     AS constituency_2021,
  c21.net_worth    AS net_worth_2021,
  c21.criminal_cases_declared AS criminal_cases_2021
FROM persons p
JOIN candidates c16 ON c16.person_id = p.id AND c16.election_year = 2016
JOIN candidates c21 ON c21.person_id = p.id AND c21.election_year = 2021
LEFT JOIN constituencies const21 ON const21.id = c21.constituency_id
WHERE c16.party IS DISTINCT FROM c21.party
  AND c16.party IS NOT NULL
  AND c21.party IS NOT NULL
ORDER BY c21.net_worth DESC NULLS LAST;

GRANT SELECT ON party_hoppers TO anon;
GRANT SELECT ON party_hoppers TO authenticated;

-- ============================================================
-- VIEW: asset_growth_by_district
-- Aggregated per district for the heatmap
-- Avg growth % + count of suspicious (>500%) candidates
-- ============================================================
CREATE OR REPLACE VIEW asset_growth_by_district AS
SELECT
  c.district       AS district_name,
  COUNT(*)         AS candidates_both_years,
  ROUND(AVG(ag.growth_pct), 1) AS avg_growth_pct,
  COUNT(*) FILTER (WHERE ag.suspicious_growth) AS suspicious_count,
  MAX(ag.net_worth_2021) AS max_net_worth_2021,
  ROUND(AVG(ag.net_worth_2021), 0) AS avg_net_worth_2021
FROM asset_growth ag
JOIN constituencies c ON c.id = ag.constituency_id_2021
WHERE ag.growth_pct IS NOT NULL
GROUP BY c.district
ORDER BY avg_growth_pct DESC NULLS LAST;

GRANT SELECT ON asset_growth_by_district TO anon;
GRANT SELECT ON asset_growth_by_district TO authenticated;

-- ============================================================
-- NOTES for next features:
--
-- Asset Growth Heatmap:
--   GET /api/asset-growth/by-district → asset_growth_by_district view
--   Colour districts by avg_growth_pct (green=low, red=high)
--
-- Party Hopper Tracker:
--   GET /api/party-hoppers → party_hoppers view
--
-- Dynastic Politics Tracker:
--   Requires manual tagging or a separate family_relations table
--   OR: ML approach — check if last name matches another politician in same district
-- ============================================================
