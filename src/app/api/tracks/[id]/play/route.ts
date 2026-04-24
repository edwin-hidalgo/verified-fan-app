/**
 * POST /api/tracks/[id]/play
 * Record a verified human play of a track
 *
 * Only verified users (with x-user-id header) can record plays.
 * Plays are deduplicated per user per track (UNIQUE constraint).
 * play_count is incremented only on new plays.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params

    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID required' },
        { status: 400 }
      )
    }

    // Get authenticated user from header
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User must be authenticated to record plays' },
        { status: 401 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Check if track exists
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('play_count')
      .eq('id', trackId)
      .single()

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      )
    }

    // Try to insert play record (unique constraint handles deduplication)
    const { data: playRecord, error: playError } = await supabase
      .from('track_plays')
      .insert({
        track_id: trackId,
        user_id: userId,
      })
      .select('id')
      .single()

    // If INSERT succeeded (new play), increment play_count
    if (!playError && playRecord) {
      await supabase
        .from('tracks')
        .update({
          play_count: (track.play_count || 0) + 1,
        })
        .eq('id', trackId)

      return NextResponse.json({
        playCount: (track.play_count || 0) + 1,
        alreadyPlayed: false,
      })
    }

    // If error was unique constraint violation, this user already played this track
    if (playError?.code === '23505') {
      return NextResponse.json({
        playCount: track.play_count || 0,
        alreadyPlayed: true,
      })
    }

    // Other database errors
    if (playError) {
      console.error('[tracks-play] Database error:', playError)
      return NextResponse.json(
        { error: 'Failed to record play' },
        { status: 500 }
      )
    }

    // Shouldn't reach here, but handle gracefully
    return NextResponse.json({
      playCount: track.play_count || 0,
      alreadyPlayed: false,
    })
  } catch (error) {
    console.error('[tracks-play] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
