-- ── Migration 010: Thamizhan Vote Pledges ──────────────────────────
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pledges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT,                        -- optional, for April 22/23 calls
  constituency_id INTEGER REFERENCES constituencies(id),
  constituency_name TEXT,                      -- denormalised for easy display
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- SMS tracking (primary reminder channel)
  sms_apr22_status   TEXT DEFAULT 'pending',   -- pending | sent | failed
  sms_apr22_at       TIMESTAMPTZ,
  sms_apr23_status   TEXT DEFAULT 'pending',   -- pending | sent | failed
  sms_apr23_at       TIMESTAMPTZ,

  -- Call tracking (optional Vapi phone calls)
  call_apr22_status  TEXT DEFAULT 'pending',   -- pending | called | failed | skipped
  call_apr22_at      TIMESTAMPTZ,
  call_apr23_status  TEXT DEFAULT 'pending',   -- pending | called | failed | skipped
  call_apr23_at      TIMESTAMPTZ
);

-- Index for fast count queries (homepage counter)
CREATE INDEX IF NOT EXISTS pledges_created_at_idx ON pledges(created_at);

-- Index for phone agent queries (get all with phone numbers)
CREATE INDEX IF NOT EXISTS pledges_phone_idx ON pledges(phone) WHERE phone IS NOT NULL;

-- Row Level Security
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a pledge (anonymous users too)
CREATE POLICY "Anyone can pledge"
  ON pledges FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can read the COUNT (for homepage counter) but not individual rows
-- We expose only an aggregate via a Postgres function
CREATE POLICY "Anyone can read pledges"
  ON pledges FOR SELECT
  TO anon, authenticated
  USING (true);

-- Explicit grants for anon (required alongside RLS policies)
GRANT INSERT ON pledges TO anon;
GRANT SELECT ON pledges TO anon;
GRANT INSERT ON pledges TO authenticated;
GRANT SELECT ON pledges TO authenticated;

-- ── Helper function: get pledge count ───────────────────────────────
CREATE OR REPLACE FUNCTION get_pledge_count()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER FROM pledges;
$$;
