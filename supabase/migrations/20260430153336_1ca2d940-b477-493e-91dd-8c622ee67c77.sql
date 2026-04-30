-- 1) Lock down search_path on the four pgmq helpers.
ALTER FUNCTION public.enqueue_email(text, jsonb)        SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint)        SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb)   SET search_path = public, pgmq;

-- 2) Revoke EXECUTE from anon/authenticated on internal SECURITY DEFINER functions.
--    Trigger functions and server-side helpers should not be callable via PostgREST.
--    Keep public access only on functions the app legitimately calls:
--      has_workspace_role, is_workspace_member, current_period_usage,
--      current_topup_balance, founding_pro_remaining, request_id_for_token.

DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    '_notify_event(jsonb)',
    '_trigger_process_email_queue()',
    'enqueue_email(text, jsonb)',
    'read_email_batch(text, integer, integer)',
    'delete_email(text, bigint)',
    'move_to_dlq(text, text, bigint, jsonb)',
    'flag_stale_requests()',
    'run_data_retention()',
    'invalidate_founding_pro_cache()',
    'set_pass_status()',
    'notify_on_request_message()',
    'notify_on_request_opened()',
    'notify_on_submission_received()',
    'notify_submission_received_email()',
    'enforce_custom_guides_plan()',
    'enforce_internal_notes_plan()',
    'enforce_message_templates_plan()',
    'enforce_request_limit()',
    'enforce_seat_cap()',
    'credit_request_on_first_rejection()',
    'finalize_first_pass_on_review()',
    'handle_new_user()',
    'update_updated_at_column()',
    'plan_request_cap(plan_tier)',
    'plan_user_cap(plan_tier)',
    'plan_from_price_id(text)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon, authenticated, PUBLIC', fn);
  END LOOP;
END$$;

-- 3) Harden realtime.messages: keep RLS enabled with no policies, which means
--    only service_role can publish/subscribe to Broadcast/Presence channels.
--    postgres_changes subscriptions are still gated by per-table RLS, so this
--    does not break the app's existing realtime usage (notifications,
--    submissions, etc.) which all use postgres_changes.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;