-- Inbox view: one row per request with denormalized fields the inbox needs.
CREATE OR REPLACE VIEW public.requests_inbox_view
WITH (security_invoker=on) AS
WITH latest_sub AS (
  SELECT DISTINCT ON (s.request_id)
    s.request_id,
    s.readiness_score,
    s.missing_items,
    s.updated_at AS submission_updated_at
  FROM public.submissions s
  ORDER BY s.request_id, s.updated_at DESC NULLS LAST, s.created_at DESC
)
SELECT
  r.id,
  r.workspace_id,
  r.guide_id,
  g.name AS guide_name,
  r.recipient_name,
  r.recipient_email,
  r.recipient_phone,
  r.token,
  r.status,
  r.created_at,
  r.updated_at,
  r.assigned_to,
  p.name AS assignee_name,
  r.custom_message,
  r.due_date,
  ls.readiness_score,
  ls.missing_items,
  GREATEST(r.updated_at, COALESCE(ls.submission_updated_at, r.updated_at)) AS last_activity_at
FROM public.photo_brief_requests r
LEFT JOIN public.photo_guides g ON g.id = r.guide_id
LEFT JOIN public.profiles p ON p.id = r.assigned_to
LEFT JOIN latest_sub ls ON ls.request_id = r.id;

GRANT SELECT ON public.requests_inbox_view TO authenticated;