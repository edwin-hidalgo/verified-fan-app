/**
 * POST /api/generate-music
 * Generate music under a grant. The permission check happens here, before anything is sent
 * anywhere or any money is spent.
 *
 * Request body:
 * {
 *   "description": "walking through rain at night, feeling contemplative",
 *   "style": "melancholic indie folk" (or any music genre/style),
 *   "duration": 30 (optional, seconds, default 30, max 190),
 *   "grant_id": "uuid — whose terms this generation runs under",
 *   "engine": "replicate_stable_audio" | "palette" (optional, default replicate),
 *   "use_tier": "personal" | "commercial" (optional, default personal)
 * }
 *
 * Response (server engines):  { "predictionId": "...", "receiptId": "...", "status": "starting" }
 * Response (client engines):  { "receiptId": "...", "status": "authorized", "prepared": {...} }
 * Response (denied):          403 { "error": "...", "receiptId": "...", "denialReason": "revoked" }
 *
 * A receipt is written either way. A denial with no record would be indistinguishable from a
 * request nobody made.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getAuthUser } from '@/lib/supabase/server'
import { ensureAppUser } from '@/lib/supabase/ensure-user'
import { checkPermission } from '@/lib/consent/permission'
import { openReceipt, attachEngineJob, completeReceipt } from '@/lib/consent/receipts'
import { getEngine, DEFAULT_ENGINE } from '@/lib/consent/engines'
import type { UseTier } from '@/lib/consent/types'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { error: 'You must be signed in to generate a moment.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { description, style, duration, grant_id: grantId } = body
    const engineKind = body.engine || DEFAULT_ENGINE
    const useTier: UseTier = body.use_tier === 'commercial' ? 'commercial' : 'personal'

    if (!description || !style) {
      return NextResponse.json({ error: 'Missing description or style' }, { status: 400 })
    }
    if (!grantId) {
      return NextResponse.json(
        { error: 'Missing grant_id — every generation runs under someone’s terms.' },
        { status: 400 }
      )
    }

    const engine = getEngine(engineKind)
    if (!engine) {
      return NextResponse.json({ error: `Unknown engine: ${engineKind}` }, { status: 400 })
    }
    if (!engine.available) {
      return NextResponse.json(
        { error: `The ${engineKind} engine is not available yet.` },
        { status: 400 }
      )
    }

    const finalDuration = Math.min(duration || 30, 190)
    const supabase = await createServerSupabaseClient()

    // Receipts reference users(id), and a signed-in user has no app row until their first
    // publish — so make one now or the first generation fails its foreign key.
    const { error: ensureError } = await ensureAppUser(supabase, authUser)
    if (ensureError) {
      return NextResponse.json({ error: 'Failed to prepare account' }, { status: 500 })
    }

    // Field 1 of the receipt: the request as it arrived.
    const requestRecord = {
      description,
      style,
      duration: finalDuration,
      grant_id: grantId,
      engine: engine.kind,
      use_tier: useTier,
      pathway: engine.requiredPathway,
    }

    const permission = await checkPermission(supabase, {
      grantId,
      pathway: engine.requiredPathway,
      useTier,
      userId: authUser.id,
    })

    if (!permission.ok) {
      const opened = await openReceipt(supabase, {
        user_id: authUser.id,
        grant_id: permission.grant?.id ?? null,
        requested_grant_id: grantId,
        grant_terms_version: permission.grant?.terms_version ?? null,
        pathway: engine.requiredPathway,
        engine: engine.kind,
        execution_mode: engine.mode,
        request: requestRecord,
        rewriting: null, // nothing was sent, so there is nothing to record
        resolved: {
          artist: permission.grant?.grantor_display_name ?? null,
          song: null,
          model: engine.kind,
        },
        decision: 'denied',
        denial_reason: permission.reason,
        outcome: 'denied',
      })
      console.log('[generate-music] DENIED', { grantId, reason: permission.reason })
      return NextResponse.json(
        {
          error: permission.message,
          receiptId: 'id' in opened ? opened.id : null,
          denialReason: permission.reason,
        },
        { status: 403 }
      )
    }

    const grant = permission.grant
    const prepared = engine.prepare(
      { description, style, durationSeconds: finalDuration, useTier },
      grant
    )

    // Opened BEFORE the engine runs, so an engine failure still leaves a record of the attempt.
    const opened = await openReceipt(supabase, {
      user_id: authUser.id,
      grant_id: grant.id,
      requested_grant_id: grantId,
      grant_terms_version: grant.terms_version,
      pathway: engine.requiredPathway,
      engine: engine.kind,
      execution_mode: engine.mode,
      request: requestRecord,
      rewriting: prepared.rewriting,
      resolved: prepared.resolved,
      decision: 'authorized',
      denial_reason: null,
      outcome: 'started',
    })
    if (!('id' in opened)) {
      return NextResponse.json({ error: 'Failed to open receipt' }, { status: 500 })
    }
    const receiptId = opened.id

    // Client-side engines do the work in the browser and finish via
    // POST /api/receipts/[id]/complete. The audio never reaches this server.
    if (engine.mode === 'client') {
      console.log('[generate-music] authorized (client engine)', { receiptId, grantId })
      return NextResponse.json({ receiptId, status: 'authorized', prepared })
    }

    try {
      const { jobId } = await engine.start!(prepared)
      await attachEngineJob(supabase, receiptId, jobId)
      console.log('[generate-music] started', { receiptId, jobId, grantId })
      return NextResponse.json({ predictionId: jobId, receiptId, status: 'starting' })
    } catch (engineError) {
      const detail = engineError instanceof Error ? engineError.message : String(engineError)
      await completeReceipt(supabase, receiptId, { outcome: 'failed', outcome_detail: detail })
      console.error('[generate-music] engine start failed:', detail)
      return NextResponse.json({ error: 'Failed to generate music', receiptId }, { status: 500 })
    }
  } catch (error) {
    console.error('[generate-music] Error creating prediction:', error)
    return NextResponse.json({ error: 'Failed to generate music' }, { status: 500 })
  }
}
