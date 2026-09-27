/*
# Create exec_sql helper function

Creates a SECURITY DEFINER function that executes arbitrary SQL.
Used by the exec-sql edge function to bulk-insert marketplace data.
This function is only accessible via the service role key.

1. New Functions
- exec_sql(sql_text text): Executes the given SQL string
2. Security
- SECURITY DEFINER, accessible only via service role
*/

CREATE OR REPLACE FUNCTION exec_sql(sql_text text) RETURNS void AS $$
BEGIN
  EXECUTE sql_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM anon;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
