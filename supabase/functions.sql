-- RUN THIS MANUALLY IN THE SUPABASE SQL EDITOR (Dashboard → SQL Editor → New query).
-- This is NOT executed by the app at runtime; it defines a read-only RPC that the
-- NL Query feature calls via supabaseAdmin.rpc('execute_readonly_query', { query }).

CREATE OR REPLACE FUNCTION execute_readonly_query(query text) RETURNS json AS $$
DECLARE result json;
BEGIN
  -- Reject anything that does not begin with SELECT (case-insensitive).
  IF query !~* '^SELECT' THEN RAISE EXCEPTION 'Only SELECT queries allowed'; END IF;

  -- Cap execution time so a pathological query can't hang the connection.
  EXECUTE 'SET LOCAL statement_timeout = ''5s''';

  -- Wrap the user query as a derived table and aggregate rows into JSON.
  -- Wrapping in "SELECT ... FROM ( <query> ) t" also neutralises any trailing
  -- second statement, because a semicolon-separated statement is invalid here.
  EXECUTE 'SELECT json_agg(t) FROM (' || query || ') t' INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;