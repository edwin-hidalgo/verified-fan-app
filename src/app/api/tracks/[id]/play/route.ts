/**
 * POST /api/tracks/[id]/play
 * Record a play of a moment. Open to everyone (no sign-in required) — streaming
 * is public, so any listener's play increments the count.
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
      return NextResponse.json({ error: 'Track ID required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('play_count')
      .eq('id', trackId)
      .single()

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    const newCount = (track.play_count || 0) + 1
    const { error: updateError } = await supabase
      .from('tracks')
      .update({ play_count: newCount })
      .eq('id', trackId)

    if (updateError) {
      console.error('[tracks-play] Update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to record play' }, { status: 500 })
    }

    return NextResponse.json({ playCount: newCount })
  } catch (error) {
    console.error('[tracks-play] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
