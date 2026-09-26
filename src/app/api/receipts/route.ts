/**
 * GET /api/receipts?grant_id=<uuid>
 * The signed-in user's own receipts, newest first — the ledger view.
 *
 * Response: { "receipts": [{ id, grant_id, decision, denial_reason, outcome, created_at, ... }] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getAuthUser } from '@/lib/supabase/server'
import { listReceiptsForUser } from '@/lib/consent/receipts'

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const grantId = new URL(request.url).searchParams.get('grant_id') || undefined
  const supabase = await createServerSupabaseClient()
  const receipts = await listReceiptsForUser(supabase, authUser.id, { grantId })
  return NextResponse.json({ receipts })
}
