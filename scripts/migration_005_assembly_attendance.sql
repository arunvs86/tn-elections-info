-- Migration 005: Add assembly attendance columns to candidates table
-- These track MLA attendance in the 16th TN Assembly (2021-present)

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assembly_attendance_pct REAL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assembly_sessions_attended INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assembly_sessions_total INTEGER;

-- Add a comment explaining the data source
COMMENT ON COLUMN candidates.assembly_attendance_pct IS 'Attendance percentage in TN Assembly sessions (0-100). Source: PRS India or estimated.';
COMMENT ON COLUMN candidates.assembly_sessions_attended IS 'Number of assembly sitting days attended. Source: PRS India or estimated.';
COMMENT ON COLUMN candidates.assembly_sessions_total IS 'Total assembly sitting days held. Source: PRS India or estimated.';
