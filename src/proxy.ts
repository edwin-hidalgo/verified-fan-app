/**
 * proxy.ts — Next.js 16 Proxy (formerly middleware.ts)
 *
 * ARCHIVE-ONLY GUARD. This file is not part of the app as it was deployed; it
 * exists solely on the public archive of the April 2026 World Build 3 build,
 * served at ekos-world-build-3-hack.vercel.app so it can be linked from a
 * portfolio.
 *
 * Source commit is 281c6b4 — the state that was live on production, which
 * includes the uncommitted work the submission actually shipped with. The
 * `hackathon-final` tag (672b205) is the last commit made DURING the hackathon
 * weekend and is NOT the submitted app; archiving it once produced a visibly
 * different site.
 *
 * The deployed build authenticated only in the browser (a `user_id` in
 * localStorage, see src/lib/hooks/useAuthedUser.ts) and its API routes enforced
 * nothing of their own. Fine for a judged demo, not fine for a permanently
 * public link: anyone could POST straight to the routes and insert rows into
 * the live Supabase project or spend real money on Replicate and Anthropic.
 *
 * So the archive serves every read path and refuses every write path, and also
 * refuses the one read path that should never have been public — the debug
 * route that enumerates every user. Together with the paid API keys being left
 * unset on this deployment, that is two independent locks on the same door.
 */

import { NextResponse, type NextRequest } from 'next/server'

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// "DEBUG ENDPOINT - Remove this before shipping to production!" — its own words.
const BLOCKED_PATHS = ['/api/debug']

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isApi = path.startsWith('/api/')
  const isBlocked = BLOCKED_PATHS.some((p) => path.startsWith(p))

  if (isBlocked || (isApi && !READ_METHODS.has(request.method))) {
    return NextResponse.json(
      {
        error: 'archive_read_only',
        message:
          'This is a frozen archive of the ekos World Build 3 hackathon build (April 2026). Browsing and playback work; creating, registering and verifying are disabled.',
      },
      { status: 403 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ico)$).*)',
  ],
}
