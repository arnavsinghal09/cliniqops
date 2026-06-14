-- ============================================================================
-- Run this MANUALLY in the Supabase SQL editor:
--   Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Creates the read-only query executor used by the NL Query feature.
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_readonly_query(query text) RETURNS json AS $$
DECLARE result json;
BEGIN
  IF query !~* '^SELECT' THEN RAISE EXCEPTION 'Only SELECT queries allowed'; END IF;
  EXECUTE 'SET LOCAL statement_timeout = ''5s''';
  EXECUTE 'SELECT json_agg(t) FROM (' || query || ') t' INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;