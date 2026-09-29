import { NextResponse } from 'next/server'
import { PAUSED_MESSAGE } from '@/lib/demo'

export { DEMO_MODE } from '@/lib/demo'

/** What every paid or write route answers while demo mode is on. */
export const pausedResponse = () =>
  NextResponse.json({ error: 'paused', message: PAUSED_MESSAGE }, { status: 503 })
