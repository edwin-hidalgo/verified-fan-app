/**
 * GET /api/generate-music/status — PAUSED (demo mode, 2026-09-28).
 *
 * Live generation and registration were paused after the hackathon. This route no longer calls
 * Replicate; it answers every request with 503 so neither the UI nor a script can spend or write.
 * The original implementation is in git history (tag hackathon-as-deployed, 281c6b4).
 */

import { NextResponse } from 'next/server'
import { PAUSED_MESSAGE } from '@/lib/demo'

export async function GET() {
  return NextResponse.json({ error: 'paused', message: PAUSED_MESSAGE }, { status: 503 })
}
