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

    const supabase = await createServerSupabaseClient()

    // Fetch all tracks for this creator
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('id, title, artist_name, ai_origin, play_count, story_ip_id, created_at')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[creators-tracks] Error fetching tracks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tracks' },
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
