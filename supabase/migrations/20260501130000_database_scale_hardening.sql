-- Database scale hardening.
--
-- This repository is linked to Lovable and the managed Supabase project. That
-- is intentional: this migration is meant to run in the Lovable/Supabase preview
-- path for this branch before anything is published from main.
--
-- The migration is additive and defensive:
-- - no table renames
-- - no destructive enum conversions
-- - no full-table validations during deploy
-- - no duplicate-sensitive unique index creation
-- - stronger constraints/triggers for future writes
--
-- Existing rows should be audited with docs/database-architecture.md before
-- validating NOT VALID constraints or promoting lookup indexes to unique.

-- ---------------------------------------------------------------------------
-- Tenant consistency helpers
-- ---------------------------------------------------------------------------

create or replace function public.assert_request_workspace_match(
  p_request_id uuid,
  p_workspace_id uuid,
  p_context text default 'request/workspace mismatch'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_request_id is null or p_workspace_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.photo_brief_requests r
    where r.id = p_request_id
      and r.workspace_id = p_workspace_id
  ) then
    raise exception '%: request % is not in workspace %', p_context, p_request_id, p_workspace_id
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.assert_submission_workspace_match(
  p_submission_id uuid,
  p_workspace_id uuid,
  p_context text default 'submission/workspace mismatch'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_submission_id is null or p_workspace_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.submissions s
    where s.id = p_submission_id
      and s.workspace_id = p_workspace_id
  ) then
    raise exception '%: submission % is not in workspace %', p_context, p_submission_id, p_workspace_id
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.assert_submission_request_match(
  p_submission_id uuid,
  p_request_id uuid,
  p_context text default 'submission/request mismatch'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_submission_id is null or p_request_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.submissions s
    where s.id = p_submission_id
      and s.request_id = p_request_id
  ) then
    raise exception '%: submission % is not for request %', p_context, p_submission_id, p_request_id
      using errcode = '23514';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Missing relationships, added NOT VALID to avoid deploy-time table scans
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'request_messages_request_id_fkey') then
    alter table public.request_messages
      add constraint request_messages_request_id_fkey
      foreign key (request_id) references public.photo_brief_requests(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'request_messages_workspace_id_fkey') then
    alter table public.request_messages
      add constraint request_messages_workspace_id_fkey
      foreign key (workspace_id) references public.business_workspaces(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'message_templates_workspace_id_fkey') then
    alter table public.message_templates
      add constraint message_templates_workspace_id_fkey
      foreign key (workspace_id) references public.business_workspaces(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'request_credit_packs_workspace_id_fkey') then
    alter table public.request_credit_packs
      add constraint request_credit_packs_workspace_id_fkey
      foreign key (workspace_id) references public.business_workspaces(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'subscriptions_workspace_id_fkey') then
    alter table public.subscriptions
      add constraint subscriptions_workspace_id_fkey
      foreign key (workspace_id) references public.business_workspaces(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sms_send_log_request_id_fkey') then
    alter table public.sms_send_log
      add constraint sms_send_log_request_id_fkey
      foreign key (request_id) references public.photo_brief_requests(id) on delete set null not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'founding_pro_claims_workspace_id_fkey') then
    alter table public.founding_pro_claims
      add constraint founding_pro_claims_workspace_id_fkey
      foreign key (workspace_id) references public.business_workspaces(id) on delete cascade not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Status/domain constraints. NOT VALID avoids auditing old rows during deploy;
-- PostgreSQL still enforces these constraints for future writes.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'captured_media_status_domain') then
    alter table public.captured_media
      add constraint captured_media_status_domain
      check (status in ('captured', 'analyzing', 'approved', 'needs_retake', 'rejected', 'resubmitted')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'request_messages_channel_domain') then
    alter table public.request_messages
      add constraint request_messages_channel_domain
      check (channel in ('email', 'sms', 'both', 'system')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'request_messages_direction_domain') then
    alter table public.request_messages
      add constraint request_messages_direction_domain
      check (direction in ('outbound', 'inbound', 'system')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'request_messages_kind_domain') then
    alter table public.request_messages
      add constraint request_messages_kind_domain
      check (kind in ('initial', 'reminder', 'followup', 'custom', 'resubmit', 'status', 'note', 'system')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sms_send_log_status_domain') then
    alter table public.sms_send_log
      add constraint sms_send_log_status_domain
      check (status in ('queued', 'sent', 'delivered', 'failed', 'undelivered')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'subscriptions_status_domain') then
    alter table public.subscriptions
      add constraint subscriptions_status_domain
      check (status in ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'request_credit_packs_status_domain') then
    alter table public.request_credit_packs
      add constraint request_credit_packs_status_domain
      check (status in ('pending', 'active', 'exhausted', 'expired', 'refunded', 'void')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'beta_invites_status_domain') then
    alter table public.beta_invites
      add constraint beta_invites_status_domain
      check (status in ('pending', 'accepted', 'expired', 'revoked')) not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tenant consistency triggers for denormalized workspace_id columns
-- ---------------------------------------------------------------------------

create or replace function public.enforce_request_message_consistency()
returns trigger language plpgsql set search_path = public as $$
begin
  perform public.assert_request_workspace_match(new.request_id, new.workspace_id, 'request_messages workspace mismatch');
  return new;
end;
$$;

drop trigger if exists request_messages_consistency_trigger on public.request_messages;
create trigger request_messages_consistency_trigger
  before insert or update of request_id, workspace_id on public.request_messages
  for each row execute function public.enforce_request_message_consistency();

create or replace function public.enforce_submission_review_consistency()
returns trigger language plpgsql set search_path = public as $$
begin
  perform public.assert_submission_workspace_match(new.submission_id, new.workspace_id, 'submission_reviews workspace mismatch');
  return new;
end;
$$;

drop trigger if exists submission_reviews_consistency_trigger on public.submission_reviews;
create trigger submission_reviews_consistency_trigger
  before insert or update of submission_id, workspace_id on public.submission_reviews
  for each row execute function public.enforce_submission_review_consistency();

create or replace function public.enforce_internal_note_consistency()
returns trigger language plpgsql set search_path = public as $$
begin
  perform public.assert_submission_workspace_match(new.submission_id, new.workspace_id, 'internal_notes workspace mismatch');
  return new;
end;
$$;

drop trigger if exists internal_notes_consistency_trigger on public.internal_notes;
create trigger internal_notes_consistency_trigger
  before insert or update of submission_id, workspace_id on public.internal_notes
  for each row execute function public.enforce_internal_note_consistency();

create or replace function public.enforce_submission_answer_consistency()
returns trigger language plpgsql set search_path = public as $$
begin
  perform public.assert_submission_workspace_match(new.submission_id, new.workspace_id, 'submission_answers workspace mismatch');
  perform public.assert_request_workspace_match(new.request_id, new.workspace_id, 'submission_answers request workspace mismatch');
  perform public.assert_submission_request_match(new.submission_id, new.request_id, 'submission_answers submission request mismatch');
  return new;
end;
$$;

drop trigger if exists submission_answers_consistency_trigger on public.submission_answers;
create trigger submission_answers_consistency_trigger
  before insert or update of submission_id, request_id, workspace_id on public.submission_answers
  for each row execute function public.enforce_submission_answer_consistency();

create or replace function public.enforce_sms_log_consistency()
returns trigger language plpgsql set search_path = public as $$
begin
  perform public.assert_request_workspace_match(new.request_id, new.workspace_id, 'sms_send_log workspace mismatch');
  return new;
end;
$$;

drop trigger if exists sms_send_log_consistency_trigger on public.sms_send_log;
create trigger sms_send_log_consistency_trigger
  before insert or update of request_id, workspace_id on public.sms_send_log
  for each row when (new.request_id is not null)
  execute function public.enforce_sms_log_consistency();

-- ---------------------------------------------------------------------------
-- Query-path indexes for inboxes, review hydration, billing, messaging, guides
-- ---------------------------------------------------------------------------

create index if not exists photo_brief_requests_workspace_status_created_idx on public.photo_brief_requests(workspace_id, status, created_at desc);
create index if not exists photo_brief_requests_token_idx on public.photo_brief_requests(token);
create index if not exists submissions_workspace_status_created_idx on public.submissions(workspace_id, status, created_at desc);
create index if not exists submissions_request_created_idx on public.submissions(request_id, created_at desc);
create index if not exists captured_media_submission_created_idx on public.captured_media(submission_id, created_at asc);
create index if not exists captured_media_step_idx on public.captured_media(step_id) where step_id is not null;
create index if not exists ai_check_results_media_created_idx on public.ai_check_results(captured_media_id, created_at desc);
create index if not exists extracted_details_submission_idx on public.extracted_details(submission_id);
create index if not exists internal_notes_submission_created_idx on public.internal_notes(submission_id, created_at desc);
create index if not exists submission_reviews_submission_round_idx on public.submission_reviews(submission_id, round desc);
create index if not exists request_messages_request_sent_idx on public.request_messages(request_id, sent_at desc);
create index if not exists request_messages_workspace_sent_idx on public.request_messages(workspace_id, sent_at desc);
create index if not exists subscriptions_workspace_environment_created_idx on public.subscriptions(workspace_id, environment, created_at desc);
create index if not exists request_credit_packs_workspace_status_period_idx on public.request_credit_packs(workspace_id, status, period_end);
create index if not exists sms_send_log_workspace_sent_idx on public.sms_send_log(workspace_id, sent_at desc);
create index if not exists sms_send_log_request_sent_idx on public.sms_send_log(request_id, sent_at desc) where request_id is not null;
create index if not exists notifications_workspace_read_created_idx on public.notifications(workspace_id, read, created_at desc);
create index if not exists photo_guides_workspace_active_idx on public.photo_guides(workspace_id, is_active, created_at desc) where workspace_id is not null;
create index if not exists guide_steps_guide_order_idx on public.guide_steps(guide_id, order_index);
create index if not exists context_questions_guide_order_idx on public.context_questions(guide_id, order_index);

-- Provider/idempotency lookup indexes. These are intentionally non-unique until
-- duplicate audits are run in preview/production. Promote to partial unique
-- indexes after confirming there are no legacy duplicate values.
create index if not exists request_credit_packs_checkout_lookup_idx
  on public.request_credit_packs(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists request_credit_packs_payment_intent_lookup_idx
  on public.request_credit_packs(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists subscriptions_stripe_subscription_lookup_idx
  on public.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;
