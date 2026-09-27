/*
# Add visual_type column to catalogue_listing

1. New Columns
- `catalogue_listing.visual_type` (text, nullable) — stores the visual subject
  classification for each listing (e.g. "camel_trek", "cooking_class",
  "riad", "oncf_train"). The frontend uses this to deterministically pick
  a relevant image from a curated pool, instead of guessing from the title.

2. Security
- No RLS changes — the column is readable by anyone who can already read
  the table. No new policies needed.

3. Notes
- The column is nullable so existing rows are not broken on migration.
- A subsequent UPDATE will populate visual_type for all published listings
  based on their title and category.
*/

ALTER TABLE catalogue_listing
  ADD COLUMN IF NOT EXISTS visual_type text;
