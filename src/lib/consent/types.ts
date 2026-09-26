/**
 * consent/types.ts — the vocabulary of Track A
 *
 * A grant is grantor x asset x pathway x terms. A receipt is what actually happened when
 * someone tried to use one. Both are records first and features second: the point is that
 * afterwards you can say exactly what was permitted, what was asked for, and what ran.
 */

/** The five licensable pathways from EKOS-SCOPE-MAP §A1, minus voice (out of scope). */
export type Pathway = 'train' | 'condition' | 'invoke_style' | 'distribute_commercially'

export type UseTier = 'personal' | 'commercial'
export type VerificationStatus = 'unverified_test' | 'self_attested' | 'identity_verified'
export type RateInstrument = 'none' | 'flat_fee' | 'per_generation' | 'revenue_share' | 'honorarium'
export type OutputSurvivalRule = 'outputs_survive' | 'outputs_unpublished' | 'outputs_deleted'

export type EngineKind = 'replicate_stable_audio' | 'palette' | 'ml_adapter'
export type ExecutionMode = 'server' | 'client'

export type DenialReason =
  | 'grant_not_found'
  | 'not_yet_effective'
  | 'expired'
  | 'revoked'
  | 'pathway_not_granted'
  | 'use_tier_not_granted'

export type ReceiptDecision = 'authorized' | 'denied'
export type ReceiptOutcome = 'denied' | 'started' | 'succeeded' | 'failed' | 'revoked_in_flight'

/** Derived, not stored: a grant's state at a moment in time. */
export type GrantStatus = 'active' | 'pending' | 'expired' | 'revoked'

/** Maps a pathway to the grant column that permits it. */
export const PATHWAY_COLUMN: Record<Pathway, keyof Pick<Grant,
  'may_train' | 'may_condition' | 'may_invoke_style' | 'may_distribute_commercially'>> = {
  train: 'may_train',
  condition: 'may_condition',
  invoke_style: 'may_invoke_style',
  distribute_commercially: 'may_distribute_commercially',
}

export interface Grant {
  id: string
  grantor_user_id: string | null
  grantor_display_name: string
  verification_status: VerificationStatus
  is_test: boolean
  asset_scope: string
  asset_refs: unknown[]
  may_train: boolean
  may_condition: boolean
  may_invoke_style: boolean
  may_distribute_commercially: boolean
  use_tier: UseTier
  rate_instrument: RateInstrument
  rate_detail: string | null
  revocable: boolean
  revocation_notice_days: number
  output_survival_rule: OutputSurvivalRule
  attribution_text: string | null
  scope_specificity_text: string
  terms_version: string
  supersedes_grant_id: string | null
  effective_from: string
  effective_until: string | null
  revoked_at: string | null
  revocation_effective_at: string | null
  revocation_reason: string | null
  created_at: string
}

/** A grant plus its derived status — what the API hands the client. */
export interface GrantWithStatus extends Grant {
  status: GrantStatus
}

/**
 * What was actually used to make the audio. Stored verbatim, never re-derived — the palette
 * analyser is nondeterministic across processes (everything-hums defect #64), so a receipt
 * that promised to recompute its own spec would be promising something it cannot do.
 */
export type AssetsUsed =
  | { kind: 'prompt_only'; model: string; inference: Record<string, unknown> }
  | { kind: 'palette'; spec: unknown; engine_version: string; source_sha256?: string | null }
  | {
      kind: 'ml_adapter'
      adapter_path: string
      adapter_sha256: string
      adapter_strength: number
      model: string
    }

export interface Receipt {
  id: string
  user_id: string
  grant_id: string | null
  requested_grant_id: string | null
  grant_terms_version: string | null
  pathway: Pathway
  engine: EngineKind
  execution_mode: ExecutionMode
  engine_job_id: string | null
  request: Record<string, unknown>
  rewriting: Record<string, unknown> | null
  resolved: Record<string, unknown>
  assets_used: AssetsUsed | null
  assets_sha256: string | null
  adapter_path: string | null
  adapter_sha256: string | null
  adapter_strength: number | null
  decision: ReceiptDecision
  denial_reason: DenialReason | null
  outcome: ReceiptOutcome
  outcome_detail: string | null
  output_url: string | null
  output_sha256: string | null
  created_at: string
  completed_at: string | null
}

export type PermissionResult =
  | { ok: true; grant: Grant }
  | { ok: false; reason: DenialReason; grant: Grant | null; message: string }
