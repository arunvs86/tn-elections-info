-- Migration 006: Live Election Results tables
-- For real-time result tracking on counting day

-- Live results per constituency (updated every 2-3 min during counting)
CREATE TABLE IF NOT EXISTS live_results (
  id                  SERIAL PRIMARY KEY,
  constituency_id     INTEGER REFERENCES constituencies(id),
  candidate_id        INTEGER REFERENCES candidates(id),
  candidate_name      TEXT NOT NULL,
  party               TEXT NOT NULL,
  votes_received      INTEGER DEFAULT 0,
  vote_share          DECIMAL,
  position            INTEGER,            -- 1 = leading, 2 = second, etc.
  rounds_counted      INTEGER DEFAULT 0,  -- how many rounds of counting done
  total_rounds        INTEGER,            -- total rounds expected
  status              TEXT DEFAULT 'counting' CHECK (status IN ('counting', 'declared', 'tie')),
  margin              INTEGER,            -- margin over 2nd place (only for position=1)
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- State-level tally (aggregated view)
CREATE TABLE IF NOT EXISTS live_tally (
  id              SERIAL PRIMARY KEY,
  party           TEXT NOT NULL,
  alliance        TEXT,
  seats_won       INTEGER DEFAULT 0,
  seats_leading   INTEGER DEFAULT 0,
  seats_trailing  INTEGER DEFAULT 0,
  total_votes     BIGINT DEFAULT 0,
  vote_share_pct  DECIMAL,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Counting metadata (overall status)
CREATE TABLE IF NOT EXISTS counting_status (
  id                    SERIAL PRIMARY KEY,
  election_date         DATE NOT NULL,
  counting_date         DATE NOT NULL,
  total_constituencies  INTEGER DEFAULT 234,
  declared              INTEGER DEFAULT 0,
  counting_in_progress  INTEGER DEFAULT 0,
  not_started           INTEGER DEFAULT 234,
  last_scrape_at        TIMESTAMPTZ,
  status                TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_live_results_constituency ON live_results(constituency_id);
CREATE INDEX IF NOT EXISTS idx_live_results_party ON live_results(party);
CREATE INDEX IF NOT EXISTS idx_live_results_status ON live_results(status);
CREATE INDEX IF NOT EXISTS idx_live_tally_party ON live_tally(party);

-- Enable Supabase Realtime on live tables (for instant browser updates)
ALTER PUBLICATION supabase_realtime ADD TABLE live_results;
ALTER PUBLICATION supabase_realtime ADD TABLE live_tally;
ALTER PUBLICATION supabase_realtime ADD TABLE counting_status;
