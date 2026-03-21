-- Migration 004: Add self/spouse/dependent asset breakdown columns
-- Run this in Supabase SQL Editor

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assets_movable_self     DECIMAL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assets_movable_spouse   DECIMAL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assets_movable_dep      DECIMAL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assets_immovable_self   DECIMAL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assets_immovable_spouse DECIMAL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS assets_immovable_dep    DECIMAL;
