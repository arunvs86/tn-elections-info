-- migration_007: Add delivery status columns to manifesto_promises
-- Past elections: status + evidence (kept/partial/broken/pending)
-- Upcoming elections: scores + believability (existing columns stay)

ALTER TABLE manifesto_promises ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('kept', 'partially_kept', 'broken', 'pending'));
ALTER TABLE manifesto_promises ADD COLUMN IF NOT EXISTS evidence TEXT;
ALTER TABLE manifesto_promises ADD COLUMN IF NOT EXISTS evidence_ta TEXT;
