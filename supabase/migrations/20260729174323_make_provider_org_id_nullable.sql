/*
# Make conversation.provider_org_id nullable

The conversation table's provider_org_id was NOT NULL, but itinerary items
may not always have a provider_org_id (e.g. gems, flights). Making it nullable
allows conversations to be started from any trip item.
*/

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='conversation' AND column_name='provider_org_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE conversation ALTER COLUMN provider_org_id DROP NOT NULL;
  END IF;
END $$;
