-- Migration 002: Add ai_origin column to tracks table
-- Values: 'human' | 'ai_assisted' | 'ai_generated'

ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS ai_origin TEXT NOT NULL DEFAULT 'human';

-- Constraint to enforce only valid values
ALTER TABLE tracks
  ADD CONSTRAINT tracks_ai_origin_check
  CHECK (ai_origin IN ('human', 'ai_assisted', 'ai_generated'));

-- Index for potential future catalog filtering by origin
CREATE INDEX IF NOT EXISTS idx_tracks_ai_origin ON tracks(ai_origin);
