-- Migration 004: Switch identity from World ID to Supabase Auth (email)
-- Post-hackathon refocus: creators sign in with email instead of World ID.
-- The app `users` row is keyed by the Supabase Auth user id (users.id = auth.uid()).

-- World wallet is no longer the identity; allow it to be null for email users.
ALTER TABLE users ALTER COLUMN world_wallet_address DROP NOT NULL;

-- Email-account fields.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- (world_nullifier_hash was already made nullable in migration 003.)
