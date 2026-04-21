-- Migration: Pivot from Spotify fan profiles to World ID music registry
-- This migration renames existing Spotify tables and creates the new music registry schema

-- Step 1: Rename old tables to archive Spotify data
ALTER TABLE IF EXISTS verified_fan_scores RENAME TO spotify_verified_fan_scores;
ALTER TABLE IF EXISTS spotify_saved_tracks RENAME TO spotify_saved_tracks;
ALTER TABLE IF EXISTS spotify_top_artists RENAME TO spotify_top_artists;
ALTER TABLE IF EXISTS users RENAME TO spotify_users;

-- Drop old RLS policies (they reference the old table names)
DROP POLICY IF EXISTS "users_select_own" ON spotify_users;
DROP POLICY IF EXISTS "users_update_own" ON spotify_users;
DROP POLICY IF EXISTS "users_insert_own" ON spotify_users;

-- Update foreign key references in renamed tables
ALTER TABLE spotify_top_artists DROP CONSTRAINT IF EXISTS spotify_top_artists_user_id_fkey;
ALTER TABLE spotify_top_artists ADD CONSTRAINT spotify_top_artists_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES spotify_users(id) ON DELETE CASCADE;

ALTER TABLE spotify_saved_tracks DROP CONSTRAINT IF EXISTS spotify_saved_tracks_user_id_fkey;
ALTER TABLE spotify_saved_tracks ADD CONSTRAINT spotify_saved_tracks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES spotify_users(id) ON DELETE CASCADE;

ALTER TABLE spotify_verified_fan_scores DROP CONSTRAINT IF EXISTS verified_fan_scores_user_id_fkey;
ALTER TABLE spotify_verified_fan_scores ADD CONSTRAINT spotify_verified_fan_scores_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES spotify_users(id) ON DELETE CASCADE;

-- Step 2: Create new users table (World ID + music registry)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_wallet_address TEXT UNIQUE NOT NULL,
  world_username TEXT,
  world_nullifier_hash TEXT UNIQUE NOT NULL,
  orb_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Create tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Track metadata
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  isrc TEXT,
  duration_seconds INT,
  genre TEXT,
  release_date DATE,

  -- Files
  audio_file_url TEXT NOT NULL,
  audio_file_hash TEXT NOT NULL,

  -- Splits (contributor royalty splits)
  splits JSONB DEFAULT '[]'::jsonb,

  -- License terms (machine-readable)
  ai_training_allowed BOOLEAN DEFAULT false,
  ai_training_price_usd DECIMAL(10, 2),
  sync_allowed BOOLEAN DEFAULT false,
  sync_price_usd DECIMAL(10, 2),
  commercial_use_allowed BOOLEAN DEFAULT false,
  commercial_use_revenue_share_pct INT,

  -- Story Protocol integration
  story_ip_id TEXT,
  story_license_terms_id TEXT,
  story_tx_hash TEXT,
  ipfs_metadata_cid TEXT,

  -- Status tracking
  registration_status TEXT DEFAULT 'draft', -- draft | registering | registered | failed

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 4: Create indexes
CREATE INDEX idx_tracks_user_id ON tracks(user_id);
CREATE INDEX idx_tracks_registration_status ON tracks(registration_status);
CREATE INDEX idx_tracks_story_ip_id ON tracks(story_ip_id);
CREATE INDEX idx_users_world_wallet_address ON users(world_wallet_address);
CREATE INDEX idx_users_world_nullifier_hash ON users(world_nullifier_hash);

-- Step 5: Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies
-- Users can only see their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (true);

-- Tracks: creator can read/write own; public can read all registered tracks
CREATE POLICY "tracks_select_own" ON tracks
  FOR SELECT USING (
    auth.uid()::text = user_id::text OR
    registration_status = 'registered'
  );

CREATE POLICY "tracks_insert_own" ON tracks
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "tracks_update_own" ON tracks
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Step 7: Create Supabase Storage bucket for audio files (public read)
-- Note: This is done via Supabase UI/dashboard, not SQL
-- Command:
--   1. Go to Supabase dashboard > Storage
--   2. Create new bucket: "audio-files"
--   3. Make public (uncheck "Private bucket")
--   4. Set policy: allow public read, authenticated write
