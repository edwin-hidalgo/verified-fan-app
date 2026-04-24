/**
 * GET /api/tracks/[id]
 * Fetch track details and creator information
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params
    console.log('[tracks-get] Fetching track:', trackId)

    if (!trackId) {
      console.log('[tracks-get] No trackId provided')
      return NextResponse.json(
        { error: 'Track ID required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Fetch track
    console.log('[tracks-get] Querying Supabase for track')
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single()

    console.log('[tracks-get] Query result:', { track, trackError })

    if (trackError || !track) {
      console.error('[tracks-get] Track not found:', trackError)
      return NextResponse.json(
        { error: 'Track not found', details: trackError?.message },
        { status: 404 }
      )
    }

    // Fetch creator
    const { data: creator, error: creatorError } = await supabase
      .from('users')
      .select('*')
      .eq('id', track.user_id)
      .single()

    if (creatorError) {
      console.error('[tracks-get] Creator not found:', creatorError)
    }

    return NextResponse.json({
      track,
      creator,
    })
  } catch (error) {
    console.error('[tracks-get] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
