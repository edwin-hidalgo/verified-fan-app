/**
 * consent/grants.ts — reading grants, and withdrawing them
 *
 * `revokeGrant` never deletes. It stamps `revoked_at` and the moment the revocation takes
 * effect, and leaves everything else exactly as it was, because the grant is the evidence that
 * use was once authorized. Withdrawing permission should not erase the fact that permission
 * existed — that is what a revoked row is for.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Grant, GrantStatus } from './types'

export async function getGrant(supabase: SupabaseClient, id: string): Promise<Grant | null> {
  const { data, error } = await supabase.from('grants').select('*').eq('id', id).single()
  if (error || !data) return null
  return data as Grant
}

/** Every grant, newest first. Revoked ones are included so the UI can label them. */
export async function listGrants(supabase: SupabaseClient): Promise<Grant[]> {
  const { data, error } = await supabase
    .from('grants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[consent] listGrants error:', error.message)
    return []
  }
  return (data || []) as Grant[]
}

/**
 * A grant's state right now. Revocation wins over everything: a revoked grant is revoked even
 * if its window has also expired, because that is the fact worth surfacing.
 */
export function grantStatus(grant: Grant, now: Date = new Date()): GrantStatus {
  const t = now.getTime()
  if (grant.revocation_effective_at && t >= Date.parse(grant.revocation_effective_at)) return 'revoked'
  if (t < Date.parse(grant.effective_from)) return 'pending'
  if (grant.effective_until && t >= Date.parse(grant.effective_until)) return 'expired'
  return 'active'
}

export type RevokeResult =
  | { ok: true; grant: Grant }
  | { ok: false; status: 403 | 404 | 409 | 500; error: string }

/**
 * Withdraw a grant.
 *
 * Who may: the grantor. Plus — a deliberate demo affordance — anyone signed in may revoke a
 * TEST grant that has no grantor, so the revocation half of Track A can be demonstrated
 * before any real artist exists. Real grants are never in that category.
 */
export async function revokeGrant(
  supabase: SupabaseClient,
  args: { grantId: string; actorUserId: string; reason: string | null }
): Promise<RevokeResult> {
  const grant = await getGrant(supabase, args.grantId)
  if (!grant) return { ok: false, status: 404, error: 'Grant not found' }

  const isOwner = grant.grantor_user_id === args.actorUserId
  const isUnownedTestGrant = grant.is_test && grant.grantor_user_id === null
  if (!isOwner && !isUnownedTestGrant) {
    return { ok: false, status: 403, error: 'Only the grantor can revoke this grant.' }
  }
  if (!grant.revocable) {
    return { ok: false, status: 403, error: 'This grant was issued as irrevocable.' }
  }
  if (grant.revoked_at) {
    return { ok: false, status: 409, error: 'This grant is already revoked.' }
  }

  const now = new Date()
  const effective = new Date(now.getTime() + grant.revocation_notice_days * 86_400_000)

  const { data, error } = await supabase
    .from('grants')
    .update({
      revoked_at: now.toISOString(),
      revocation_effective_at: effective.toISOString(),
      revocation_reason: args.reason,
    })
    .eq('id', args.grantId)
    .is('revoked_at', null) // lost race = someone else revoked first, which is fine
    .select('*')
    .single()

  if (error || !data) {
    console.error('[consent] revokeGrant error:', error?.message)
    return { ok: false, status: 500, error: 'Failed to revoke grant' }
  }

  console.log('[consent] revoked', {
    grantId: args.grantId,
    by: args.actorUserId,
    effectiveAt: effective.toISOString(),
    noticeDays: grant.revocation_notice_days,
  })
  return { ok: true, grant: data as Grant }
}
