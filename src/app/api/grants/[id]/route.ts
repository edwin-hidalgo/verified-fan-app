/**
 * GET /api/grants/[id]
 * One grant and its status — the payload behind "see terms".
 *
 * Response: { "grant": { ... }, "status": "active" | ... }
 */

import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getAuthUser } from '@/lib/supabase/server'
import { getGrant, grantStatus } from '@/lib/consent/grants'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const grant = await getGrant(supabase, id)
  if (!grant) {
    return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
  }

  return NextResponse.json({ grant, status: grantStatus(grant) })
}
