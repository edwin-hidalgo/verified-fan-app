/**
 * GET /api/stats
 * Public endpoint returning live registry statistics
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // Get total track count
    const { count: totalTracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*', { count: 'exact', head: true })

    if (tracksError) {
      console.error('[stats] Error fetching track count:', tracksError)
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }

    // Get total plays across all tracks
    const { data: playsData, error: playsError } = await supabase
      .from('tracks')
      .select('play_count')

    if (playsError) {
      console.error('[stats] Error fetching plays:', playsError)
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }

    const totalPlays = playsData.reduce((sum, track) => sum + (track.play_count || 0), 0)

    return NextResponse.json({
      totalTracks: totalTracks || 0,
      totalPlays,
    })
  } catch (error) {
    console.error('[stats] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
