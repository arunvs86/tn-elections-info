-- ============================================================
-- tnelections.info — Supabase PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Persons (unique humans — links same person across elections)
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

-- Constituencies (all 234 TN assembly constituencies)
CREATE TABLE IF NOT EXISTS constituencies (
  id                   SERIAL PRIMARY KEY,
  name                 TEXT NOT NULL,
  district             TEXT NOT NULL,
  constituency_number  INTEGER,
  total_voters_2021    INTEGER,
  total_voters_2026    INTEGER,
  turnout_2021         DECIMAL,
  current_mla          TEXT,
  current_mla_party    TEXT,
  alliance_2026        TEXT,
  is_swing_seat        BOOLEAN DEFAULT FALSE,
  swing_margin_2021    INTEGER,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates (all elections 2001-2026)
CREATE TABLE IF NOT EXISTS candidates (
  id                      SERIAL PRIMARY KEY,
  name                    TEXT NOT NULL,
  constituency_id         INTEGER REFERENCES constituencies(id),
  party                   TEXT NOT NULL,
  alliance                TEXT,
  election_year           INTEGER NOT NULL,
  is_incumbent            BOOLEAN DEFAULT FALSE,
  is_winner               BOOLEAN DEFAULT FALSE,
  votes_received          INTEGER,
  vote_share              DECIMAL,
  margin                  INTEGER,
  assets_movable          DECIMAL,
  assets_movable_self     DECIMAL,
  assets_movable_spouse   DECIMAL,
  assets_movable_dep      DECIMAL,
  assets_immovable        DECIMAL,
  assets_immovable_self   DECIMAL,
  assets_immovable_spouse DECIMAL,
  assets_immovable_dep    DECIMAL,
  liabilities             DECIMAL,
  net_worth               DECIMAL,
  education               TEXT,
  age                     INTEGER,
  criminal_cases_declared INTEGER DEFAULT 0,
  criminal_cases_ecourts  INTEGER DEFAULT 0,
  criminal_mismatch       BOOLEAN DEFAULT FALSE,
  affidavit_url           TEXT,
  photo_url               TEXT,
  person_id               INTEGER REFERENCES persons(id),
  ai_summary_ta           TEXT,
  ai_summary_en           TEXT,
  ai_summary_updated_at   TIMESTAMPTZ,
  assembly_attendance_pct DECIMAL,
  assembly_sessions_attended INTEGER,
  assembly_sessions_total INTEGER,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Criminal cases detail
CREATE TABLE IF NOT EXISTS criminal_cases (
  id            SERIAL PRIMARY KEY,
  candidate_id  INTEGER REFERENCES candidates(id),
  case_number   TEXT,
  court_name    TEXT,
  case_type     TEXT,
  sections      TEXT,
  status        TEXT,
  next_hearing  DATE,
  ecourts_url   TEXT,
  is_disclosed  BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Election results by year per constituency
CREATE TABLE IF NOT EXISTS election_results (
  id                  SERIAL PRIMARY KEY,
  constituency_id     INTEGER REFERENCES constituencies(id),
  election_year       INTEGER NOT NULL,
  winner_name         TEXT,
  winner_party        TEXT,
  winner_votes        INTEGER,
  winner_vote_share   DECIMAL,
  runner_up_name      TEXT,
  runner_up_party     TEXT,
  runner_up_votes     INTEGER,
  margin              INTEGER,
  total_votes         INTEGER,
  turnout             DECIMAL,
  total_candidates    INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Individual candidate promises
CREATE TABLE IF NOT EXISTS promises (
  id                SERIAL PRIMARY KEY,
  candidate_id      INTEGER REFERENCES candidates(id),
  party             TEXT,
  election_year     INTEGER,
  promise_text      TEXT NOT NULL,
  promise_text_tamil TEXT,
  category          TEXT,
  status            TEXT CHECK (status IN ('kept','broken','partial','pending')),
  evidence_url      TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Party manifesto promises (pre-scored by AI)
CREATE TABLE IF NOT EXISTS manifesto_promises (
  id                  SERIAL PRIMARY KEY,
  party               TEXT NOT NULL,
  election_year       INTEGER NOT NULL,
  promise_text        TEXT NOT NULL,
  promise_text_tamil  TEXT,
  category            TEXT,
  fiscal_score        INTEGER CHECK (fiscal_score BETWEEN 0 AND 10),
  specificity_score   INTEGER CHECK (specificity_score BETWEEN 0 AND 10),
  past_delivery_score INTEGER CHECK (past_delivery_score BETWEEN 0 AND 10),
  overall_score       INTEGER,
  believability_label TEXT,
  ai_reasoning        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Published opinion polls
CREATE TABLE IF NOT EXISTS polls (
  id             SERIAL PRIMARY KEY,
  source         TEXT NOT NULL,
  published_date DATE,
  sample_size    INTEGER,
  dmk_share      DECIMAL,
  aiadmk_share   DECIMAL,
  tvk_share      DECIMAL,
  bjp_share      DECIMAL,
  ntk_share      DECIMAL,
  inc_share      DECIMAL,
  others_share   DECIMAL,
  source_url     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- AI fact-checks (saved for community reuse)
CREATE TABLE IF NOT EXISTS fact_checks (
  id                SERIAL PRIMARY KEY,
  claim_text        TEXT NOT NULL,
  claim_language    TEXT DEFAULT 'en',
  party_about       TEXT,
  verdict           TEXT CHECK (verdict IN ('true','misleading','false','unverifiable')),
  confidence_pct    INTEGER,
  explanation       TEXT,
  explanation_tamil TEXT,
  sources           JSONB,
  reasoning_trace   JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Agent messages — THE LIVE FEED TABLE
-- Every INSERT here triggers Supabase Realtime → browser gets the message
CREATE TABLE IF NOT EXISTS agent_messages (
  id           SERIAL PRIMARY KEY,
  session_id   TEXT NOT NULL,
  from_agent   TEXT NOT NULL,
  to_agent     TEXT,
  message      TEXT NOT NULL,
  message_type TEXT DEFAULT 'info',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Daily AI briefings (generated at 7AM IST by cron)
CREATE TABLE IF NOT EXISTS daily_briefings (
  id           SERIAL PRIMARY KEY,
  briefing_date DATE UNIQUE NOT NULL,
  title_en     TEXT,
  title_ta     TEXT,
  body_en      TEXT,
  body_ta      TEXT,
  stories      JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes (speed up the most common queries) ──────────────────────
CREATE INDEX IF NOT EXISTS idx_candidates_constituency ON candidates(constituency_id);
CREATE INDEX IF NOT EXISTS idx_candidates_year ON candidates(election_year);
CREATE INDEX IF NOT EXISTS idx_results_constituency ON election_results(constituency_id);
CREATE INDEX IF NOT EXISTS idx_results_year ON election_results(election_year);
CREATE INDEX IF NOT EXISTS idx_agent_messages_session ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created ON agent_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fact_checks_created ON fact_checks(created_at DESC);

-- ── Enable Realtime on agent_messages ───────────────────────────────
-- This allows Supabase to push new rows to subscribed browser clients
-- Run this AFTER creating the tables
ALTER PUBLICATION supabase_realtime ADD TABLE agent_messages;

-- ── Row Level Security (RLS) ─────────────────────────────────────────
-- Allow public read access to all tables (elections data is public)
-- The service role key (backend) bypasses RLS entirely

ALTER TABLE constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE criminal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifesto_promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;

-- Public can read everything (election data should be public)
CREATE POLICY "Public read" ON constituencies FOR SELECT USING (true);
CREATE POLICY "Public read" ON candidates FOR SELECT USING (true);
CREATE POLICY "Public read" ON criminal_cases FOR SELECT USING (true);
CREATE POLICY "Public read" ON election_results FOR SELECT USING (true);
CREATE POLICY "Public read" ON promises FOR SELECT USING (true);
CREATE POLICY "Public read" ON manifesto_promises FOR SELECT USING (true);
CREATE POLICY "Public read" ON polls FOR SELECT USING (true);
CREATE POLICY "Public read" ON fact_checks FOR SELECT USING (true);
CREATE POLICY "Public read" ON agent_messages FOR SELECT USING (true);
CREATE POLICY "Public read" ON daily_briefings FOR SELECT USING (true);
CREATE POLICY "Public read" ON live_results FOR SELECT USING (true);
CREATE POLICY "Public read" ON live_tally FOR SELECT USING (true);
CREATE POLICY "Public read" ON counting_status FOR SELECT USING (true);
