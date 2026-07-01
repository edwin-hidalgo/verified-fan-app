/**
 * GET /api/creators/[userId]/tracks
 * Fetch all tracks registered by a specific creator
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    console.log('[creators-tracks] Fetching tracks for user_id:', userId)

    const supabase = await createServerSupabaseClient()

    // Fetch all tracks for this creator
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('id, title, artist_name, ai_origin, play_count, duration_seconds, ai_training_allowed, sync_allowed, commercial_use_allowed, commercial_use_revenue_share_pct, story_ip_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    console.log('[creators-tracks] Query returned', tracks?.length || 0, 'tracks')

    if (error) {
      console.error('[creators-tracks] Error fetching tracks:', error)
      console.error('[creators-tracks] userId:', userId)
      console.error('[creators-tracks] Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: 'Failed to fetch tracks', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      tracks: tracks || [],
    })
  } catch (error) {
    console.error('[creators-tracks] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
