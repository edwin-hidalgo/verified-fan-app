-- Migration 006: the RLS policies migration 005 implied but did not write
--
-- 005 declared RLS on grants and receipts with SELECT and INSERT policies, on the assumption
-- recorded throughout this repo that server writes use a service-role client and bypass RLS
-- anyway. That assumption is FALSE, measured 2026-09-26: createServerSupabaseClient passes the
-- service key but @supabase/ssr binds the session from cookies, so a signed-in request acts as
-- that user and RLS applies. An UPDATE with no matching policy returned zero rows and a NULL
-- error — a silent no-op that looked like success.
--
-- Two fixes were made. The routes now use a genuine no-session service-role client
-- (createAdminClient), which is what actually makes the ledger writable. And these policies
-- exist so the declared model is true rather than aspirational: if a cookie-bound client ever
-- touches these tables again, it behaves the way the schema says it does.

-- A receipt's owner may complete their own receipt, and only while it is still open.
-- Append-only is enforced in code too (UPDATE ... WHERE outcome = 'started'); this is the
-- same rule expressed where the database can hold it.
DROP POLICY IF EXISTS "receipts_update_own_while_open" ON receipts;
CREATE POLICY "receipts_update_own_while_open" ON receipts
  FOR UPDATE
  USING (auth.uid()::text = user_id::text AND outcome = 'started')
  WITH CHECK (auth.uid()::text = user_id::text);

-- Revocation. The grantor may always revoke. Unowned TEST grants are revocable by any signed-in
-- user, deliberately, so the revocation half of the demo works before a real artist exists —
-- is_test is never set on a real grant.
DROP POLICY IF EXISTS "grants_update_own" ON grants;
CREATE POLICY "grants_update_own" ON grants
  FOR UPDATE
  USING (
    auth.uid()::text = grantor_user_id::text
    OR (is_test = true AND grantor_user_id IS NULL)
  )
  WITH CHECK (
    auth.uid()::text = grantor_user_id::text
    OR (is_test = true AND grantor_user_id IS NULL)
  );

-- Nobody deletes a grant or a receipt through the API. No DELETE policy is defined, so with RLS
-- on, a cookie-bound client cannot remove either. The record surviving is the point.
