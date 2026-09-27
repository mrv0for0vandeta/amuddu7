DELETE FROM trip_item;
DELETE FROM catalogue_price_rule;
DELETE FROM catalogue_listing;
DELETE FROM provider_org;

CREATE OR REPLACE FUNCTION exec_sql(sql_text text) RETURNS void AS $$
BEGIN
  EXECUTE sql_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM anon;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
