-- Migration 018: Add sections column to candidates table
-- Stores comma-separated IPC/BNS section codes e.g. "420,406,307"
-- Run in Supabase SQL Editor before running enrich_sections_2026.py

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS sections TEXT;
