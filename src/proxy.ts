/**
 * proxy.ts — Next.js 16 Proxy (formerly middleware.ts)
 *
 * Runs before routes render. Here it only refreshes the Supabase auth session
 * and redirects signed-out users away from create-only routes.
 */

import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and files. Keeps auth-cookie refresh
     * running on pages + API routes without touching Next internals.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ico)$).*)',
  ],
}
