-- Migration 017: Add myneta_id_2026 column to candidates table
-- Run this in Supabase SQL Editor before running the import phase of scrape_myneta_2026.py

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS myneta_id_2026 INTEGER;
CREATE INDEX IF NOT EXISTS idx_candidates_myneta_2026 ON candidates(myneta_id_2026);
