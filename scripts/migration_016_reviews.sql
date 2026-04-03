-- Migration 016: site reviews table
CREATE TABLE IF NOT EXISTS site_reviews (
  id          BIGSERIAL PRIMARY KEY,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert reviews"
  ON site_reviews FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "anyone can read reviews"
  ON site_reviews FOR SELECT TO anon, authenticated USING (true);
