/**
 * supabase/server.ts — Server-side Supabase clients
 *
 * Two clients:
 *  - createServerSupabaseClient(): SERVICE ROLE key. Bypasses RLS. For privileged
 *    DB reads/writes in API routes (catalog, track inserts, etc.).
 *  - createServerAuthClient(): ANON key bound to the request cookies. Acts as the
 *    logged-in user; use it to identify who is signed in (auth.getUser()).
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function cookieAdapter(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      } catch {
        // Called from a Server Component — safe to ignore; the proxy refreshes cookies.
      }
    },
  }
}

/** Service-role client — bypasses RLS. Do NOT expose to the browser. */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: cookieAdapter(cookieStore) }
  )
}

/** Anon client bound to the user's cookies — reflects the signed-in user. */
export async function createServerAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieAdapter(cookieStore) }
  )
}

/** Returns the validated signed-in user, or null. Safe to trust in server code. */
export async function getAuthUser() {
  const supabase = await createServerAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
