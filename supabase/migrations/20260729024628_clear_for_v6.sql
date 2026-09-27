DELETE FROM trip_item;
DELETE FROM catalogue_price_rule;
DELETE FROM catalogue_listing;
DELETE FROM provider_org;
DROP FUNCTION IF EXISTS _mp_generate(uuid, text, text, text[], int[], text[], bigint);
DROP FUNCTION IF EXISTS _mp_rand(bigint);
SELECT 'cleared' as status;
