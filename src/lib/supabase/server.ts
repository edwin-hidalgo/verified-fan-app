/**
 * supabase/server.ts — Server-side Supabase clients
 *
 * Three clients, and the difference between the first two is not what it looks like:
 *  - createServerSupabaseClient(): SERVICE ROLE key, but bound to the request cookies, so when a
 *    user is signed in it ACTS AS THAT USER and RLS applies. Used for the app's existing reads
 *    and writes, which work because permissive policies exist.
 *  - createServerAuthClient(): ANON key bound to the request cookies. Acts as the logged-in
 *    user; use it to identify who is signed in (auth.getUser()).
 *  - createAdminClient(): SERVICE ROLE key with NO session. This is the one that actually
 *    bypasses RLS.
 */

import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
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

/**
 * Server client carrying the service-role key AND the user's cookies.
 *
 * ⚠️ It does NOT bypass RLS, despite what this comment used to claim. `@supabase/ssr` binds the
 * session from the cookie jar, so when a user is signed in this client acts AS THAT USER and RLS
 * applies — measured 2026-09-26: an UPDATE with no matching policy returned 0 rows and a null
 * error, i.e. it failed silently. Use `createAdminClient()` for writes that must not depend on a
 * policy existing.
 */
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

/**
 * A true service-role client: no cookies, no session, so RLS really is bypassed.
 *
 * For writes the application must be able to make regardless of who is signed in — the consent
 * ledger above all. A receipt that silently fails to record because a policy is missing is worse
 * than no receipt, because it looks like success.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
