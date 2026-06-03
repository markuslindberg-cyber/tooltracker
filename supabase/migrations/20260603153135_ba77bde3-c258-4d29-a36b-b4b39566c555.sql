
-- Revoke anon access to security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_any_role(UUID, public.app_role[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_any_role(UUID, public.app_role[]) TO authenticated, service_role;

-- Tighten permissive INSERT policies — require authenticated user identity match
DROP POLICY IF EXISTS "Transfers insert" ON public.transfers;
CREATE POLICY "Transfers insert" ON public.transfers FOR INSERT TO authenticated
  WITH CHECK (requested_by_email = (SELECT auth.jwt()->>'email'));

DROP POLICY IF EXISTS "LoanRequests insert by auth" ON public.loan_requests;
CREATE POLICY "LoanRequests insert by auth" ON public.loan_requests FOR INSERT TO authenticated
  WITH CHECK (borrower_email = (SELECT auth.jwt()->>'email'));

DROP POLICY IF EXISTS "WorkwearRequests insert" ON public.workwear_requests;
CREATE POLICY "WorkwearRequests insert" ON public.workwear_requests FOR INSERT TO authenticated
  WITH CHECK (requester_email = (SELECT auth.jwt()->>'email'));

DROP POLICY IF EXISTS "ToolLogs insertable by auth" ON public.tool_logs;
CREATE POLICY "ToolLogs insertable by auth" ON public.tool_logs FOR INSERT TO authenticated
  WITH CHECK (performed_by_email = (SELECT auth.jwt()->>'email'));

DROP POLICY IF EXISTS "Checkouts insertable" ON public.lokalvard_checkouts;
CREATE POLICY "Checkouts insertable" ON public.lokalvard_checkouts FOR INSERT TO authenticated
  WITH CHECK (utfort_av_email = (SELECT auth.jwt()->>'email')
    OR public.has_any_role(auth.uid(), ARRAY['admin','agare','admin_lokalvard']::public.app_role[]));

DROP POLICY IF EXISTS "ArtikelReq insert" ON public.lokalvard_artikel_requests;
CREATE POLICY "ArtikelReq insert" ON public.lokalvard_artikel_requests FOR INSERT TO authenticated
  WITH CHECK (requester_email = (SELECT auth.jwt()->>'email'));
