/*
# Clear marketplace data for regeneration

Deletes all generated listings, price rules, and providers so we can
regenerate with region-appropriate experiences.

1. Deletes: trip_item, catalogue_price_rule, catalogue_listing, provider_org
2. Drops: helper functions from previous generation
3. Security: No schema changes, no policy changes.
*/

DELETE FROM trip_item;
DELETE FROM catalogue_price_rule;
DELETE FROM catalogue_listing;
DELETE FROM provider_org;

DROP FUNCTION IF EXISTS _marketplace_rand();
DROP FUNCTION IF EXISTS _lang_pack(int);

SELECT 'cleared' as status;
