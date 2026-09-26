/**
 * consent/receipts.ts — the ledger
 *
 * One row per generation attempt, denials included. Opened before anything runs, completed
 * once, never rewritten: `completeReceipt` updates only where `outcome = 'started'`, so a
 * duplicate poll or a retried webhook cannot overwrite a finished record. Append-only is
 * enforced by that WHERE clause rather than by a trigger, matching a repo that has none.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { hashJson } from './hash'
import type {
  AssetsUsed,
  DenialReason,
  EngineKind,
  ExecutionMode,
  Pathway,
  Receipt,
  ReceiptDecision,
  ReceiptOutcome,
} from './types'

export interface OpenReceiptInput {
  user_id: string
  grant_id: string | null
  requested_grant_id: string
  grant_terms_version: string | null
  pathway: Pathway
  engine: EngineKind
  execution_mode: ExecutionMode
  /** Field 1: the request exactly as it arrived. */
  request: Record<string, unknown>
  /** Field 2: what we did to it before sending. Null when nothing was sent (a denial). */
  rewriting: Record<string, unknown> | null
  /** Field 3: the artist, song and model actually resolved. */
  resolved: Record<string, unknown>
  decision: ReceiptDecision
  denial_reason: DenialReason | null
  outcome: Extract<ReceiptOutcome, 'denied' | 'started'>
}

export async function openReceipt(
  supabase: SupabaseClient,
  input: OpenReceiptInput
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase.from('receipts').insert(input).select('id').single()
  if (error || !data) {
    console.error('[consent] openReceipt error:', error?.message)
    return { error: error?.message || 'Failed to open receipt' }
  }
  return { id: data.id as string }
}

/** Link the engine's own job id once it exists, so a poll can find its receipt. */
export async function attachEngineJob(
  supabase: SupabaseClient,
  receiptId: string,
  engineJobId: string
): Promise<void> {
  const { error } = await supabase
    .from('receipts')
    .update({ engine_job_id: engineJobId })
    .eq('id', receiptId)
  if (error) console.error('[consent] attachEngineJob error:', error.message)
}

export interface CompleteReceiptInput {
  outcome: Extract<ReceiptOutcome, 'succeeded' | 'failed' | 'revoked_in_flight'>
  outcome_detail?: string | null
  output_url?: string | null
  output_sha256?: string | null
  /** Field 5. Hashed canonically here so callers cannot forget. */
  assets_used?: AssetsUsed | null
}

/**
 * Finish a receipt. Returns `{ updated: false }` when the row was already complete — that is
 * the normal outcome of a second poll, not an error.
 */
export async function completeReceipt(
  supabase: SupabaseClient,
  receiptId: string,
  input: CompleteReceiptInput
): Promise<{ updated: boolean }> {
  const patch: Record<string, unknown> = {
    outcome: input.outcome,
    outcome_detail: input.outcome_detail ?? null,
    output_url: input.output_url ?? null,
    output_sha256: input.output_sha256 ?? null,
    completed_at: new Date().toISOString(),
  }

  if (input.assets_used) {
    patch.assets_used = input.assets_used
    patch.assets_sha256 = hashJson(input.assets_used)
    if (input.assets_used.kind === 'ml_adapter') {
      patch.adapter_path = input.assets_used.adapter_path
      patch.adapter_sha256 = input.assets_used.adapter_sha256
      patch.adapter_strength = input.assets_used.adapter_strength
    }
  }

  const { data, error } = await supabase
    .from('receipts')
    .update(patch)
    .eq('id', receiptId)
    .eq('outcome', 'started') // append-only: a finished receipt is never rewritten
    .select('id')

  if (error) {
    console.error('[consent] completeReceipt error:', error.message)
    return { updated: false }
  }
  return { updated: (data?.length ?? 0) > 0 }
}

export async function getReceiptForUser(
  supabase: SupabaseClient,
  receiptId: string,
  userId: string
): Promise<Receipt | null> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .eq('user_id', userId)
    .single()
  if (error || !data) return null
  return data as Receipt
}

export async function getReceiptByEngineJob(
  supabase: SupabaseClient,
  engineJobId: string
): Promise<Receipt | null> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('engine_job_id', engineJobId)
    .single()
  if (error || !data) return null
  return data as Receipt
}

export async function listReceiptsForUser(
  supabase: SupabaseClient,
  userId: string,
  opts: { grantId?: string; limit?: number } = {}
): Promise<Partial<Receipt>[]> {
  let q = supabase
    .from('receipts')
    .select(
      'id, grant_id, grant_terms_version, pathway, engine, decision, denial_reason, outcome, created_at, completed_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50)
  if (opts.grantId) q = q.eq('grant_id', opts.grantId)

  const { data, error } = await q
  if (error) {
    console.error('[consent] listReceiptsForUser error:', error.message)
    return []
  }
  return (data || []) as Partial<Receipt>[]
}
