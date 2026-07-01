/**
 * GET /api/my-tracks
 * Return the moments created by the signed-in user (from the auth session).
 */

import { createServerSupabaseClient, getAuthUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: tracks, error } = await supabase
    .from('tracks')
    .select('id, title, artist_name, ai_origin, play_count, duration_seconds, cover_image_url, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[my-tracks] Error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 })
  }

  return NextResponse.json({ tracks: tracks || [] })
}
