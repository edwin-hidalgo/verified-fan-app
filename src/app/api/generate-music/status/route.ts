/**
 * GET /api/generate-music/status?id=<engine job id>
 * Poll a generation, complete its receipt, and re-check the grant before delivering anything.
 *
 * Response:
 * - processing: { "status": "processing", "receiptId": "..." }
 * - succeeded:  { "status": "succeeded", "audioUrl": "https://...", "receiptId": "..." }
 * - failed:     { "status": "failed", "error": "...", "receiptId": "..." }
 *
 * Two things this does that the old handler did not. It requires a signed-in owner — the job id
 * used to be enough to read anyone's generation. And it re-runs the permission check on every
 * poll, so a grant revoked while work is in flight stops delivery: revocation that only applied
 * to requests not yet started would be a weak promise.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthUser } from '@/lib/supabase/server'
import { checkPermission } from '@/lib/consent/permission'
import { completeReceipt, getReceiptByEngineJob } from '@/lib/consent/receipts'
import { getEngine } from '@/lib/consent/engines'
import { sha256Hex } from '@/lib/consent/hash'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('id')
    if (!jobId) {
      return NextResponse.json({ error: 'Missing prediction id' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const receipt = await getReceiptByEngineJob(supabase, jobId)
    if (!receipt) {
      return NextResponse.json({ error: 'Unknown prediction' }, { status: 404 })
    }
    if (receipt.user_id !== authUser.id) {
      return NextResponse.json({ error: 'Not your generation' }, { status: 403 })
    }

    // Already finished: answer from the receipt. Polling twice is normal and must be idempotent.
    if (receipt.outcome !== 'started') {
      if (receipt.outcome === 'succeeded') {
        return NextResponse.json({
          status: 'succeeded',
          audioUrl: receipt.output_url,
          receiptId: receipt.id,
        })
      }
      return NextResponse.json({
        status: 'failed',
        error: receipt.outcome_detail || 'Generation failed',
        receiptId: receipt.id,
      })
    }

    const engine = getEngine(receipt.engine)
    if (!engine?.poll) {
      return NextResponse.json({ error: 'This generation cannot be polled' }, { status: 400 })
    }

    // Was the grant withdrawn while this was running?
    if (receipt.grant_id) {
      const recheck = await checkPermission(supabase, {
        grantId: receipt.grant_id,
        pathway: receipt.pathway,
        useTier: (receipt.request?.use_tier as 'personal' | 'commercial') || 'personal',
        userId: authUser.id,
      })
      if (!recheck.ok && recheck.reason === 'revoked') {
        await engine.cancel?.(jobId)
        await completeReceipt(supabase, receipt.id, {
          outcome: 'revoked_in_flight',
          outcome_detail: 'Grant revoked before output delivery',
        })
        console.log('[generate-music-status] revoked in flight', { receiptId: receipt.id, jobId })
        return NextResponse.json({
          status: 'failed',
          error: 'The grant was revoked while your moment was generating, so it was not delivered.',
          receiptId: receipt.id,
        })
      }
    }

    const status = await engine.poll(jobId)

    if (status.state === 'succeeded') {
      // Hash the bytes now so publish can prove the audio it stores is the audio this receipt
      // describes. Costs one extra download; buys an assertion instead of an assumption.
      let outputSha256: string | null = null
      try {
        const res = await fetch(status.outputUrl)
        if (res.ok) outputSha256 = sha256Hex(Buffer.from(await res.arrayBuffer()))
      } catch (hashError) {
        console.error('[generate-music-status] could not hash output:', hashError)
      }

      await completeReceipt(supabase, receipt.id, {
        outcome: 'succeeded',
        output_url: status.outputUrl,
        output_sha256: outputSha256,
        assets_used: {
          kind: 'prompt_only',
          model: String((receipt.resolved as { model?: string })?.model || receipt.engine),
          inference: (receipt.request as Record<string, unknown>) || {},
        },
      })
      console.log('[generate-music-status] succeeded', { receiptId: receipt.id })
      return NextResponse.json({
        status: 'succeeded',
        audioUrl: status.outputUrl,
        receiptId: receipt.id,
      })
    }

    if (status.state === 'failed') {
      await completeReceipt(supabase, receipt.id, {
        outcome: 'failed',
        outcome_detail: status.error,
      })
      console.error('[generate-music-status] failed:', status.error)
      return NextResponse.json({
        status: 'failed',
        error: status.error,
        receiptId: receipt.id,
      })
    }

    return NextResponse.json({ status: 'processing', receiptId: receipt.id })
  } catch (error) {
    console.error('[generate-music-status] Error checking prediction:', error)
    return NextResponse.json({ error: 'Failed to check prediction status' }, { status: 500 })
  }
}
