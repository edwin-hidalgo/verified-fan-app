/**
 * POST /api/grants/[id]/revoke
 * Withdraw a grant. Request body: { "reason": "..." } (optional)
 *
 * Response: { "grant": { ...with revoked_at and revocation_effective_at set } }
 *
 * Nothing is deleted. The grant keeps every field it had and gains the timestamps, because the
 * record that use was once authorized is the point — an artist withdrawing permission should
 * not erase the evidence that they gave it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { grantStatus, revokeGrant } from '@/lib/consent/grants'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const { id } = await params
    const reason = await request
      .json()
      .then((b) => (typeof b?.reason === 'string' ? b.reason : null))
      .catch(() => null)

    const supabase = createAdminClient()
    const result = await revokeGrant(supabase, {
      grantId: id,
      actorUserId: authUser.id,
      reason,
    })

    if (!result.ok) {
      console.log('[grants-revoke] refused', { grantId: id, status: result.status })
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    console.log('[grants-revoke] revoked', { grantId: id, by: authUser.id })
    return NextResponse.json({
      grant: { ...result.grant, status: grantStatus(result.grant) },
    })
  } catch (error) {
    console.error('[grants-revoke] Error:', error)
    return NextResponse.json({ error: 'Failed to revoke grant' }, { status: 500 })
  }
}
