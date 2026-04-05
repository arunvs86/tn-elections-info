-- Run this once in Supabase SQL Editor → New Query
-- Creates a server-side function that returns COUNT(DISTINCT fingerprint)
-- so the visitor count is always accurate regardless of table size.

CREATE OR REPLACE FUNCTION get_unique_visitor_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT fingerprint)::integer FROM site_visits;
$$;
