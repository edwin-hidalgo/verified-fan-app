-- Migration 005: Track A consent records — grants (immutable terms) and receipts (per-attempt ledger)
--
-- A grant is grantor x asset x pathway x terms. Revocation is a TIMESTAMPED STATE on the
-- grant, never a delete: deleting a grant destroys the record that use was once authorized.
-- New terms are a NEW ROW (supersedes_grant_id), so history is append-only by construction.
--
-- A receipt is written for EVERY generation attempt, denials included, and is completed
-- (never rewritten) when the engine reports an outcome. It preserves six things: the original
-- request, any rewriting applied, what was resolved, the grant and its terms version, the
-- assets actually used, and the outcome.
--
-- The per-track licence booleans already on `tracks` (ai_training_allowed, sync_allowed,
-- commercial_use_allowed) are dead by decision (HANDOFF ledger #18) and are NOT reused here.
-- This is the separate terms record the spike brief asks for.

-- Step 1: Grants — what an artist has permitted, and on what terms
CREATE TABLE IF NOT EXISTS grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Grantor identity. Nullable + ON DELETE SET NULL on purpose: an authorization record must
  -- outlive the account, so the display name is denormalised to keep the row readable.
  grantor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  grantor_display_name TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified_test',
  is_test BOOLEAN NOT NULL DEFAULT false,

  -- What the grant covers
  asset_scope TEXT NOT NULL,
  asset_refs JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Pathways, each its own boolean. Never a blanket grant: California AB 2602 turns on a
  -- reasonably specific description of intended uses, and `scope_specificity_text` below is
  -- the human-readable half of the same idea.
  may_train BOOLEAN NOT NULL DEFAULT false,
  may_condition BOOLEAN NOT NULL DEFAULT false,
  may_invoke_style BOOLEAN NOT NULL DEFAULT false,
  may_distribute_commercially BOOLEAN NOT NULL DEFAULT false,

  -- Terms
  use_tier TEXT NOT NULL DEFAULT 'personal',
  rate_instrument TEXT NOT NULL DEFAULT 'none',
  rate_detail TEXT,
  revocable BOOLEAN NOT NULL DEFAULT true,
  revocation_notice_days INT NOT NULL DEFAULT 0,
  output_survival_rule TEXT NOT NULL DEFAULT 'outputs_survive',
  attribution_text TEXT,
  scope_specificity_text TEXT NOT NULL,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  supersedes_grant_id UUID REFERENCES grants(id),

  -- Lifecycle. revocation_effective_at is stored rather than computed from notice days so the
  -- receipt, the UI and the permission check all read one number.
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_effective_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT grants_verification_status_check
    CHECK (verification_status IN ('unverified_test', 'self_attested', 'identity_verified')),
  CONSTRAINT grants_use_tier_check
    CHECK (use_tier IN ('personal', 'commercial')),
  CONSTRAINT grants_rate_instrument_check
    CHECK (rate_instrument IN ('none', 'flat_fee', 'per_generation', 'revenue_share', 'honorarium')),
  CONSTRAINT grants_output_survival_rule_check
    CHECK (output_survival_rule IN ('outputs_survive', 'outputs_unpublished', 'outputs_deleted')),
  CONSTRAINT grants_revocation_notice_days_check
    CHECK (revocation_notice_days >= 0),
  CONSTRAINT grants_revocable_check
    CHECK (revoked_at IS NULL OR revocable = true),
  CONSTRAINT grants_revocation_pair_check
    CHECK ((revoked_at IS NULL) = (revocation_effective_at IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_grants_grantor_user_id ON grants(grantor_user_id);
CREATE INDEX IF NOT EXISTS idx_grants_revoked_at ON grants(revoked_at);
CREATE INDEX IF NOT EXISTS idx_grants_supersedes_grant_id ON grants(supersedes_grant_id);

-- Step 2: Receipts — one row per generation attempt, denials included
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Which grant was checked. grant_id is NULL only when the requested id did not resolve at
  -- all; requested_grant_id keeps what was asked for either way.
  grant_id UUID REFERENCES grants(id),
  requested_grant_id TEXT,
  grant_terms_version TEXT,
  pathway TEXT NOT NULL,

  -- Which engine ran, and where
  engine TEXT NOT NULL,
  execution_mode TEXT NOT NULL,
  engine_job_id TEXT,

  -- The six preserved fields
  request JSONB NOT NULL,            -- 1. the original request / selection, verbatim
  rewriting JSONB,                   -- 2. template + style enrichment + the prompt actually sent
  resolved JSONB NOT NULL,           -- 3. artist / song / model as resolved
  assets_used JSONB,                 -- 5. what was actually used (palette spec stored verbatim)
  assets_sha256 TEXT,                --    sha256 of canonical JSON, so it stays verifiable
  adapter_path TEXT,                 --    reserved for Track B; no schema change needed later
  adapter_sha256 TEXT,
  adapter_strength NUMERIC(5, 2),
  decision TEXT NOT NULL,            -- 4. the permission-check result
  denial_reason TEXT,
  outcome TEXT NOT NULL,             -- 6. the outcome
  outcome_detail TEXT,
  output_url TEXT,
  output_sha256 TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT receipts_pathway_check
    CHECK (pathway IN ('train', 'condition', 'invoke_style', 'distribute_commercially')),
  CONSTRAINT receipts_engine_check
    CHECK (engine IN ('replicate_stable_audio', 'palette', 'ml_adapter')),
  CONSTRAINT receipts_execution_mode_check
    CHECK (execution_mode IN ('server', 'client')),
  CONSTRAINT receipts_decision_check
    CHECK (decision IN ('authorized', 'denied')),
  CONSTRAINT receipts_denial_reason_check
    CHECK (denial_reason IS NULL OR denial_reason IN
      ('grant_not_found', 'not_yet_effective', 'expired', 'revoked', 'pathway_not_granted', 'use_tier_not_granted')),
  CONSTRAINT receipts_outcome_check
    CHECK (outcome IN ('denied', 'started', 'succeeded', 'failed', 'revoked_in_flight')),
  CONSTRAINT receipts_denied_consistency_check
    CHECK ((decision = 'denied') = (outcome = 'denied'))
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_grant_id ON receipts(grant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_engine_job_id
  ON receipts(engine_job_id) WHERE engine_job_id IS NOT NULL;

-- Step 3: A published track points back at the receipt it came from
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tracks_receipt_id ON tracks(receipt_id);

-- Step 4: RLS. Declared for consistency with migration 001, but note that every server write
-- in this app uses the service-role client, which bypasses RLS — these policies are not what
-- protects the data. The API routes are. See HANDOFF.md "Traps".
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grants_select_all" ON grants;
CREATE POLICY "grants_select_all" ON grants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "grants_insert_own" ON grants;
CREATE POLICY "grants_insert_own" ON grants
  FOR INSERT WITH CHECK (auth.uid()::text = grantor_user_id::text);

DROP POLICY IF EXISTS "grants_update_own" ON grants;
CREATE POLICY "grants_update_own" ON grants
  FOR UPDATE USING (auth.uid()::text = grantor_user_id::text);

DROP POLICY IF EXISTS "receipts_select_own" ON receipts;
CREATE POLICY "receipts_select_own" ON receipts
  FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "receipts_insert_own" ON receipts;
CREATE POLICY "receipts_insert_own" ON receipts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
