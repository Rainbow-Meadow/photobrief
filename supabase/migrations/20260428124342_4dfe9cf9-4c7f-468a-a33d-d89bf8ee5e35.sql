CREATE OR REPLACE FUNCTION public.current_period_usage(_workspace_id uuid, _event_type text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Reject callers that aren't members of the workspace.
  IF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'Not authorized for workspace %', _workspace_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN (
    SELECT COALESCE(COUNT(*), 0)::int
    FROM public.usage_events ue
    WHERE ue.workspace_id = _workspace_id
      AND ue.event_type = _event_type
      AND ue.created_at >= COALESCE(
        (SELECT current_period_start FROM public.subscriptions s
          WHERE s.workspace_id = _workspace_id ORDER BY s.created_at DESC LIMIT 1),
        date_trunc('month', now())
      )
      AND ue.created_at < COALESCE(
        (SELECT current_period_end FROM public.subscriptions s
          WHERE s.workspace_id = _workspace_id ORDER BY s.created_at DESC LIMIT 1),
        date_trunc('month', now()) + interval '1 month'
      )
  );
END;
$$;