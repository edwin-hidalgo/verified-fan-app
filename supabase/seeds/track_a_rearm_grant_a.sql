-- Re-arm TEST GRANT A after the demo revokes it.
--
-- Note what this does NOT do: it does not un-revoke anything. The revoked row stays exactly
-- as it is, because it is the record that use was once authorized and then withdrawn. A new
-- version is a new row pointing at the old one.
INSERT INTO grants (
  grantor_display_name, verification_status, is_test, asset_scope,
  may_train, may_condition, may_invoke_style, may_distribute_commercially,
  use_tier, rate_instrument, revocable, revocation_notice_days,
  output_survival_rule, attribution_text, scope_specificity_text,
  terms_version, supersedes_grant_id
)
SELECT
  grantor_display_name, verification_status, is_test, asset_scope,
  may_train, may_condition, may_invoke_style, may_distribute_commercially,
  use_tier, rate_instrument, revocable, revocation_notice_days,
  output_survival_rule, attribution_text, scope_specificity_text,
  '1.1', id
FROM grants
WHERE id = 'a0000000-0000-4000-8000-00000000000a';
