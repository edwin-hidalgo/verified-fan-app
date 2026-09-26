/**
 * GET /api/grants
 * Every grant, newest first, each with its derived status.
 *
 * Response: { "grants": [{ ...grant, "status": "active" | "pending" | "expired" | "revoked" }] }
 *
 * Revoked grants are included deliberately: the chooser has to be able to offer one and have
 * the attempt refused, and a revoked grant is a fact about the world rather than a row to hide.
 */

import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getAuthUser } from '@/lib/supabase/server'
import { grantStatus, listGrants } from '@/lib/consent/grants'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()
  const grants = await listGrants(supabase)
  return NextResponse.json({
    grants: grants.map((g) => ({ ...g, status: grantStatus(g) })),
  })
}
