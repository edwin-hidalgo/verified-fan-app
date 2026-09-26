# Applying migration 005 — for Edwin, about two minutes

The Track A code is on `spike/consented-adapters` and builds, but every consent endpoint needs
two tables that do not exist yet. There is no Supabase CLI and no management token on this
machine, and the service-role key cannot run DDL — so this part is yours. Nothing here touches
existing tables except to add one nullable column to `tracks`.

## Steps

1. Open the Supabase SQL editor for project **`gwafkmkmoaqgsdnvuqzn`** ("verified music fandom").
2. Paste the whole of **`supabase/migrations/005_consent_grants_and_receipts.sql`** and run it.
   It is idempotent — running it twice is safe and reports "already exists, skipping".
3. Paste and run **`supabase/seeds/track_a_test_grants.sql`**. This adds two grants named
   "TEST GRANT A / B — not a consented artist". Also idempotent.
4. Sanity check, in the same editor:

   ```sql
   select grantor_display_name, terms_version, revoked_at is not null as revoked
   from grants order by grantor_display_name;
   ```

   Expect two rows: A with `revoked = false`, B with `revoked = true`.

5. Tell me it is done. Everything after that I can verify myself.

## What it creates

- **`grants`** — what an artist permitted and on what terms. Four separate pathway booleans,
  never a blanket grant. Revocation is a pair of timestamps on the row, never a delete.
- **`receipts`** — one row per generation attempt, denials included. Holds the request as it
  arrived, the prompt actually sent, what was resolved, the grant and its version, the assets
  used with a canonical hash, and the outcome.
- **`tracks.receipt_id`** — one new nullable column, so a published moment points at the receipt
  it came from. Existing rows are unaffected and existing publishing keeps working without one.

## Why you are pasting SQL instead of me running a command

The `supabase/migrations/` directory is not a faithful record of this database — `cover_image_url`,
`moment_description` and `play_count` were all added through the dashboard and appear in no
migration file. So the directory is the record of intent, and the dashboard is how intent gets
applied. `supabase db reset` would not reproduce production.

## Already verified, so you are not the test

Applied against a throwaway local PostgreSQL 15 cluster: migrations 001–004 in order, the three
dashboard-only columns added to match production, then 005 twice and the seed twice. Every CHECK
constraint was proven by trying to violate it — all eleven rejected the bad row. The append-only
completion semantics were proven too: the first completion takes, the second updates zero rows.
