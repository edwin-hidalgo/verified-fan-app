/**
 * GET /api/receipts/[id]
 * One of your own receipts, with the grant it was checked against.
 *
 * Response: { "receipt": { ... }, "grant": { id, grantor_display_name, terms_version, is_test, status } | null }
 *
 * Someone else's receipt returns 404, not 403 — the same non-enumeration choice /api/my-tracks
 * makes. Whether a given id exists is not information this endpoint hands out.
 */

import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getAuthUser } from '@/lib/supabase/server'
import { getReceiptForUser } from '@/lib/consent/receipts'
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
  const receipt = await getReceiptForUser(supabase, id, authUser.id)
  if (!receipt) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  let grant = null
  if (receipt.grant_id) {
    const g = await getGrant(supabase, receipt.grant_id)
    if (g) {
      grant = {
        id: g.id,
        grantor_display_name: g.grantor_display_name,
        terms_version: g.terms_version,
        is_test: g.is_test,
        attribution_text: g.attribution_text,
        status: grantStatus(g),
      }
    }
  }

  return NextResponse.json({ receipt, grant })
}
