-- Verified Fan Identity — Supabase Schema

-- users table
CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id_hash   text UNIQUE,
  spotify_id      text UNIQUE,
  display_name    text,
  profile_image   text,
  is_artist       boolean DEFAULT false,
  is_verified     boolean DEFAULT false,
  spotify_connected boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- spotify_top_artists table
CREATE TABLE IF NOT EXISTS spotify_top_artists (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,
  artist_spotify_id text,
  artist_name     text,
  artist_image    text,
  time_range      text,
  rank            integer,
  fetched_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, artist_spotify_id, time_range)
);

-- spotify_saved_tracks table
CREATE TABLE IF NOT EXISTS spotify_saved_tracks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,
  track_spotify_id text,
  track_name      text,
  artist_spotify_id text,
  artist_name     text,
  saved_at        timestamptz,
  fetched_at      timestamptz DEFAULT now()
);

-- verified_fan_scores table
CREATE TABLE IF NOT EXISTS verified_fan_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,
  artist_spotify_id text,
  artist_name     text,
  artist_image    text,
  fan_score       integer,
  top_artist_short boolean DEFAULT false,
  top_artist_medium boolean DEFAULT false,
  top_artist_long boolean DEFAULT false,
  saved_track_count integer DEFAULT 0,
  rank_short      integer,
  rank_medium     integer,
  rank_long       integer,
  verified_at     timestamptz DEFAULT now(),
  UNIQUE(user_id, artist_spotify_id)
);

-- Create indexes for common queries
CREATE INDEX idx_spotify_top_artists_user_id ON spotify_top_artists(user_id);
CREATE INDEX idx_spotify_saved_tracks_user_id ON spotify_saved_tracks(user_id);
CREATE INDEX idx_verified_fan_scores_user_id ON verified_fan_scores(user_id);
CREATE INDEX idx_verified_fan_scores_artist_spotify_id ON verified_fan_scores(artist_spotify_id);
CREATE INDEX idx_verified_fan_scores_fan_score ON verified_fan_scores(fan_score DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_top_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_saved_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_fan_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can read/write their own data
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (
    auth.uid()::text = id::text OR is_verified = true  -- Can see verified users
  );

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "spotify_top_artists_select_own" ON spotify_top_artists
  FOR SELECT USING (
    auth.uid()::text = user_id::text OR
    user_id IN (SELECT id FROM users WHERE is_verified = true)
  );

CREATE POLICY "spotify_top_artists_insert_own" ON spotify_top_artists
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "spotify_saved_tracks_select_own" ON spotify_saved_tracks
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "spotify_saved_tracks_insert_own" ON spotify_saved_tracks
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "verified_fan_scores_select_all" ON verified_fan_scores
  FOR SELECT USING (
    auth.uid()::text = user_id::text OR is_verified = true
  );

CREATE POLICY "verified_fan_scores_insert_own" ON verified_fan_scores
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
