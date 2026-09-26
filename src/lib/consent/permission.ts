/**
 * consent/permission.ts — the check that has to happen before anything generates
 *
 * This is the load-bearing idea of the whole spike: whether an artist may be invoked is
 * ANSWERED BY A LOOKUP against a terms record, not inferred by a model and not decided by what
 * someone typed into a prompt. Both outcomes are logged, because a denial that leaves no trace
 * is indistinguishable from a request nobody made.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getGrant, grantStatus } from './grants'
import {
  PATHWAY_COLUMN,
  type DenialReason,
  type Pathway,
  type PermissionResult,
  type UseTier,
} from './types'

const DENIAL_MESSAGE: Record<DenialReason, string> = {
  grant_not_found: 'That grant does not exist.',
  not_yet_effective: 'That grant has not taken effect yet.',
  expired: 'That grant has expired.',
  revoked: 'That grant has been revoked, so it can no longer be used.',
  pathway_not_granted: 'That grant does not permit this kind of use.',
  use_tier_not_granted: 'That grant permits personal use only.',
}

export async function checkPermission(
  supabase: SupabaseClient,
  args: { grantId: string; pathway: Pathway; useTier: UseTier; userId: string }
): Promise<PermissionResult> {
  const grant = await getGrant(supabase, args.grantId)

  const deny = (reason: DenialReason): PermissionResult => {
    console.log('[consent] permission', {
      grantId: args.grantId,
      pathway: args.pathway,
      useTier: args.useTier,
      userId: args.userId,
      ok: false,
      reason,
    })
    return { ok: false, reason, grant, message: DENIAL_MESSAGE[reason] }
  }

  if (!grant) return deny('grant_not_found')

  // Order matters: report the most specific true thing. A revoked grant reads as revoked even
  // if it would also have expired.
  const status = grantStatus(grant)
  if (status === 'revoked') return deny('revoked')
  if (status === 'pending') return deny('not_yet_effective')
  if (status === 'expired') return deny('expired')

  if (!grant[PATHWAY_COLUMN[args.pathway]]) return deny('pathway_not_granted')
  if (args.useTier === 'commercial' && grant.use_tier !== 'commercial') {
    return deny('use_tier_not_granted')
  }

  console.log('[consent] permission', {
    grantId: args.grantId,
    pathway: args.pathway,
    useTier: args.useTier,
    userId: args.userId,
    ok: true,
    termsVersion: grant.terms_version,
  })
  return { ok: true, grant }
}
