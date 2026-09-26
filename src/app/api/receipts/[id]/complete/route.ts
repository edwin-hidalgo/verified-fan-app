/**
 * POST /api/receipts/[id]/complete
 * Finish a client-side (browser) generation's receipt.
 *
 * Request body: { "outcome": "succeeded" | "failed", "spec"?: {...}, "output_sha256"?: "...", "error"?: "..." }
 * Response: { "receipt": { ... } }
 *
 * The palette engine runs entirely in the browser — the audio never reaches this server. What
 * arrives is the spec that voiced the render, stored verbatim and hashed canonically. It is
 * never re-derived: the analyser is nondeterministic across processes (everything-hums defect
 * #64), so a receipt that recomputed its own contents could disagree with what was heard.
 *
 * The grant is re-checked here too. A revocation that landed while the browser was rendering
 * stops the result being recorded as a delivered output.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getAuthUser } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/consent/permission'
import { completeReceipt, getReceiptForUser } from '@/lib/consent/receipts'
import { PALETTE_ENGINE_VERSION, validatePaletteSpec } from '@/lib/consent/engines/palette'

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
    const supabase = await createServerSupabaseClient()
    const receipt = await getReceiptForUser(supabase, id, authUser.id)
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }
    if (receipt.execution_mode !== 'client') {
      return NextResponse.json(
        { error: 'This receipt is completed by the server, not the browser.' },
        { status: 400 }
      )
    }
    if (receipt.outcome !== 'started') {
      return NextResponse.json({ error: 'This receipt is already complete.' }, { status: 409 })
    }

    const body = await request.json()

    if (body.outcome === 'failed') {
      await completeReceipt(supabase, receipt.id, {
        outcome: 'failed',
        outcome_detail: typeof body.error === 'string' ? body.error : 'Client render failed',
      })
      const updated = await getReceiptForUser(supabase, receipt.id, authUser.id)
      return NextResponse.json({ receipt: updated })
    }

    if (body.outcome !== 'succeeded') {
      return NextResponse.json({ error: 'outcome must be succeeded or failed' }, { status: 400 })
    }

    const validation = validatePaletteSpec(body.spec)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Revoked while the browser was rendering?
    if (receipt.grant_id) {
      const recheck = await checkPermission(supabase, {
        grantId: receipt.grant_id,
        pathway: receipt.pathway,
        useTier: (receipt.request?.use_tier as 'personal' | 'commercial') || 'personal',
        userId: authUser.id,
      })
      if (!recheck.ok && recheck.reason === 'revoked') {
        await completeReceipt(supabase, receipt.id, {
          outcome: 'revoked_in_flight',
          outcome_detail: 'Grant revoked before the render was recorded',
        })
        return NextResponse.json(
          { error: 'The grant was revoked before this render completed.', receiptId: receipt.id },
          { status: 409 }
        )
      }
    }

    await completeReceipt(supabase, receipt.id, {
      outcome: 'succeeded',
      output_sha256: typeof body.output_sha256 === 'string' ? body.output_sha256 : null,
      assets_used: {
        kind: 'palette',
        spec: validation.spec,
        engine_version: PALETTE_ENGINE_VERSION,
        source_sha256: typeof body.source_sha256 === 'string' ? body.source_sha256 : null,
      },
    })

    console.log('[receipts-complete] palette render recorded', { receiptId: receipt.id })
    const updated = await getReceiptForUser(supabase, receipt.id, authUser.id)
    return NextResponse.json({ receipt: updated })
  } catch (error) {
    console.error('[receipts-complete] Error:', error)
    return NextResponse.json({ error: 'Failed to complete receipt' }, { status: 500 })
  }
}
