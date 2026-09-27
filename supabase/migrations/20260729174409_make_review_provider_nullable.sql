/*
# Make review.provider_org_id nullable

The review table's provider_org_id was nullable already, but we ensure it here.
*/
-- Already nullable from original migration, no action needed.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='review' AND column_name='provider_org_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE review ALTER COLUMN provider_org_id DROP NOT NULL;
  END IF;
END $$;
