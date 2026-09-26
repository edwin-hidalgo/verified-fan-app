-- Track A seed: two TEST grants.
--
-- NEITHER IS A CONSENTED ARTIST. Every field says so, because the one thing this demo must
-- never do is let a placeholder read as a real person's permission. They exist so the
-- authorized and denied paths are both demonstrable before any artist has been approached.
--
-- Fixed UUIDs so the curl checks and the demo script can reference them. Re-runnable.

-- A: active. Permits style invocation and palette conditioning, personal use only.
INSERT INTO grants (
  id, grantor_display_name, verification_status, is_test, asset_scope,
  may_train, may_condition, may_invoke_style, may_distribute_commercially,
  use_tier, rate_instrument, revocable, revocation_notice_days,
  output_survival_rule, attribution_text, scope_specificity_text, terms_version
) VALUES (
  'a0000000-0000-4000-8000-00000000000a',
  'TEST GRANT A — not a consented artist',
  'unverified_test', true,
  'TEST: no real assets. Stands in for one artist''s catalogue for the Track A demo.',
  false, true, true, false,
  'personal', 'none', true, 0,
  'outputs_unpublished',
  'Generated under TEST GRANT A (demo only)',
  'Permits invoking a named style, and conditioning on the palette engine, for personal non-commercial moments inside ekos. Does not permit training a model, commercial distribution, or any use outside ekos.',
  '1.0'
) ON CONFLICT (id) DO NOTHING;

-- B: seeded already revoked, so the denied path needs no artist and no prior use.
INSERT INTO grants (
  id, grantor_display_name, verification_status, is_test, asset_scope,
  may_train, may_condition, may_invoke_style, may_distribute_commercially,
  use_tier, rate_instrument, revocable, revocation_notice_days,
  output_survival_rule, attribution_text, scope_specificity_text, terms_version,
  revoked_at, revocation_effective_at, revocation_reason
) VALUES (
  'b0000000-0000-4000-8000-00000000000b',
  'TEST GRANT B — not a consented artist (seeded revoked)',
  'unverified_test', true,
  'TEST: no real assets. Seeded already-revoked to demonstrate the denied path.',
  false, true, true, false,
  'personal', 'none', true, 0,
  'outputs_unpublished',
  'Generated under TEST GRANT B (demo only)',
  'Same scope as TEST GRANT A. Revoked before any use, so a denial can be shown without revoking something that was working.',
  '1.0',
  now() - interval '1 day', now() - interval '1 day', 'TEST: seeded revoked'
) ON CONFLICT (id) DO NOTHING;
