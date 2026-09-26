/**
 * ensure-user.ts — guarantee an app `users` row for a signed-in auth user
 *
 * Supabase Auth creates the auth user; the app's own `users` table is a separate
 * FK target. Until 2026-09-26 the only place that reconciled the two was the
 * publish handler, so a user who signed up and generated without ever publishing
 * had no `users` row — and anything keyed to `users(id)` (receipts) would fail
 * its foreign key on the very first attempt. Every route that writes a row
 * referencing `users` calls this first.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

/** The display name the app shows, in the order the publish flow has always resolved it. */
export function displayNameFor(authUser: User): string {
  return (
    (authUser.user_metadata?.display_name as string) ||
    authUser.email?.split('@')[0] ||
    'Creator'
  )
}

/**
 * Upsert the app `users` row. Returns a message on failure rather than throwing,
 * so callers keep the repo's `{ error }` + status-code convention.
 */
export async function ensureAppUser(
  supabase: SupabaseClient,
  authUser: User
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('users').upsert(
    {
      id: authUser.id,
      email: authUser.email,
      display_name: displayNameFor(authUser),
    },
    { onConflict: 'id' }
  )

  if (error) {
    console.error('[ensure-user] User upsert error:', error.message)
    return { error: error.message }
  }
  return { error: null }
}
