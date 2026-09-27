-- Clean up helper functions used during data generation
DROP FUNCTION IF EXISTS _mp_generate(uuid, text, text, text[], int[], text[], bigint);
DROP FUNCTION IF EXISTS _mp_rand(bigint);
