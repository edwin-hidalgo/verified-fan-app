/**
 * GET /api/tracks
 * List all registered tracks (public catalog)
 *
 * POST /api/tracks — paused in demo mode (2026-09-28); it used to upload the audio, pin
 * metadata to IPFS and register an IP Asset on Story Protocol. See git history (281c6b4).
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PAUSED_MESSAGE } from '@/lib/demo'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Fetch all registered tracks (public catalog)
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('registration_status', 'registered')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[tracks-list] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tracks' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      tracks: tracks || [],
    })
  } catch (error) {
    console.error('[tracks-list] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tracks — PAUSED (demo mode, 2026-09-28). Publishing, IPFS upload and Story
 * registration are switched off; see git history (281c6b4) for the original implementation.
 */
export async function POST() {
  return NextResponse.json({ error: 'paused', message: PAUSED_MESSAGE }, { status: 503 })
}
