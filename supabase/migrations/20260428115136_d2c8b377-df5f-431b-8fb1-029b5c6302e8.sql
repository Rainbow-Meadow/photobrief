-- Revoke direct API access from internal helpers; they're still
-- callable from RLS policies and triggers (which run with table-owner
-- privileges), just not through PostgREST.
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid)            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_workspace_role(uuid, public.member_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_id_for_token()               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user()                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column()           FROM PUBLIC, anon, authenticated;