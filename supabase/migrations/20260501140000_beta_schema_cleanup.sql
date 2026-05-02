-- Beta schema cleanup / production baseline.
--
-- Pre-launch assumptions:
-- - no external users have been onboarded yet
-- - table names remain stable for the existing app/Lovable integration
-- - schema should become strict now, before real customer data accumulates
--
-- This migration intentionally tightens the database more aggressively than a
-- post-launch migration would. It validates tenant consistency, promotes common
-- lifecycle strings to reusable domains/enums where practical, adds unique
-- business keys, and lays the foundation for hashed public request tokens.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared utility functions
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.request_header(header_name text)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  headers jsonb;
begin
  begin
    headers := current_setting('request.headers', true)::jsonb;
  exception when others then
    return null;
  end;

  return coalesce(
    headers ->> header_name,
    headers ->> lower(header_name),
    headers ->> replace(lower(header_name), '_', '-')
  );
end;
$$;

create or replace function public.hash_public_token(raw_token text)
returns text
language sql
immutable
as $$
  select case
    when raw_token is null or raw_token = '' then null
    else encode(digest(raw_token, 'sha256'), 'hex')
  end;
$$;

-- Backward-compatible helper for existing RLS policies. It prefers token_hash
-- when available but still supports legacy raw token comparisons while the app
-- is migrated fully to hashed public request tokens.
create or replace function public.request_id_for_token()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select r.id
  from public.photo_brief_requests r
  where coalesce(public.request_header('x-request-token'), '') <> ''
    and (
      r.token_hash = public.hash_public_token(public.request_header('x-request-token'))
      or r.token = public.request_header('x-request-token')
    )
  order by r.created_at desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- New enum domains for formerly loose string lifecycle columns
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_status') then
    create type public.workspace_status as enum ('active', 'suspended', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'captured_media_status') then
    create type public.captured_media_status as enum (
      'captured', 'analyzing', 'approved', 'needs_retake', 'rejected', 'resubmitted'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'message_channel') then
    create type public.message_channel as enum ('email', 'sms', 'both', 'system');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_direction') then
    create type public.message_direction as enum ('outbound', 'inbound', 'system');
  end if;

  if not exists (select 1 from pg_type where typname = 'request_message_kind') then
    create type public.request_message_kind as enum (
      'initial', 'reminder', 'followup', 'resubmit', 'status', 'note', 'system'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'message_template_kind') then
    create type public.message_template_kind as enum (
      'initial', 'reminder', 'followup', 'resubmit', 'custom'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'review_action') then
    create type public.review_action as enum ('approved', 'rejected', 'needs_more', 'commented');
  end if;

  if not exists (select 1 from pg_type where typname = 'review_pass_status') then
    create type public.review_pass_status as enum ('pending', 'passed', 'failed', 'needs_more', 'not_applicable');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum (
      'trialing', 'active', 'past_due', 'canceled', 'unpaid',
      'incomplete', 'incomplete_expired', 'paused'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'billing_interval') then
    create type public.billing_interval as enum ('monthly', 'annual');
  end if;

  if not exists (select 1 from pg_type where typname = 'stripe_environment') then
    create type public.stripe_environment as enum ('sandbox', 'live');
  end if;

  if not exists (select 1 from pg_type where typname = 'request_credit_pack_status') then
    create type public.request_credit_pack_status as enum (
      'pending', 'active', 'exhausted', 'expired', 'refunded', 'void'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'sms_delivery_status') then
    create type public.sms_delivery_status as enum (
      'queued', 'sent', 'delivered', 'failed', 'undelivered'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'email_delivery_status') then
    create type public.email_delivery_status as enum (
      'queued', 'pending', 'sent', 'delivered', 'failed', 'suppressed', 'skipped'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'beta_invite_status') then
    create type public.beta_invite_status as enum ('pending', 'accepted', 'expired', 'revoked');
  end if;

  if not exists (select 1 from pg_type where typname = 'context_question_input_type') then
    create type public.context_question_input_type as enum (
      'short_text', 'long_text', 'number', 'single_select', 'multi_select', 'date', 'phone', 'email'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Normalize existing data before type conversion
-- ---------------------------------------------------------------------------

update public.business_workspaces set status = 'active' where status is null or status = '';
update public.captured_media set status = 'captured' where status is null or status = '';
update public.context_questions set input_type = 'short_text' where input_type is null or input_type = '';
update public.message_templates set kind = 'custom' where kind is null or kind = '';
update public.request_messages set channel = 'system' where channel is null or channel = '';
update public.request_messages set direction = 'system' where direction is null or direction = '';
update public.request_messages set kind = 'system' where kind is null or kind = '';
update public.submission_reviews set action = 'commented' where action is null or action = '';
update public.submissions set first_pass_status = 'pending' where first_pass_status is null or first_pass_status = '';
update public.submissions set second_pass_status = 'not_applicable' where second_pass_status is null or second_pass_status = '';
update public.subscriptions set status = 'incomplete' where status is null or status = '';
update public.subscriptions set billing_interval = 'monthly' where billing_interval is null or billing_interval = '';
update public.subscriptions set environment = 'sandbox' where environment is null or environment = '';
update public.request_credit_packs set status = 'pending' where status is null or status = '';
update public.request_credit_packs set environment = 'sandbox' where environment is null or environment = '';
update public.sms_send_log set status = 'queued' where status is null or status = '';
update public.email_send_log set status = 'pending' where status is null or status = '';
update public.beta_invites set status = 'pending' where status is null or status = '';

-- ---------------------------------------------------------------------------
-- Convert loose string lifecycle columns to enum types
-- ---------------------------------------------------------------------------

alter table public.business_workspaces
  alter column status type public.workspace_status using status::public.workspace_status,
  alter column status set default 'active'::public.workspace_status,
  alter column status set not null;

alter table public.captured_media
  alter column status type public.captured_media_status using status::public.captured_media_status,
  alter column status set default 'captured'::public.captured_media_status,
  alter column status set not null;

alter table public.context_questions
  alter column input_type type public.context_question_input_type using input_type::public.context_question_input_type,
  alter column input_type set default 'short_text'::public.context_question_input_type,
  alter column input_type set not null;

alter table public.message_templates
  alter column kind type public.message_template_kind using kind::public.message_template_kind,
  alter column kind set default 'custom'::public.message_template_kind,
  alter column kind set not null;

alter table public.request_messages
  alter column channel type public.message_channel using channel::public.message_channel,
  alter column channel set default 'email'::public.message_channel,
  alter column channel set not null,
  alter column direction type public.message_direction using direction::public.message_direction,
  alter column direction set default 'outbound'::public.message_direction,
  alter column direction set not null,
  alter column kind type public.request_message_kind using kind::public.request_message_kind,
  alter column kind set not null;

alter table public.submission_reviews
  alter column action type public.review_action using action::public.review_action,
  alter column action set not null;

alter table public.submissions
  alter column first_pass_status type public.review_pass_status using first_pass_status::public.review_pass_status,
  alter column first_pass_status set default 'pending'::public.review_pass_status,
  alter column first_pass_status set not null,
  alter column second_pass_status type public.review_pass_status using second_pass_status::public.review_pass_status,
  alter column second_pass_status set default 'not_applicable'::public.review_pass_status,
  alter column second_pass_status set not null;

alter table public.subscriptions
  alter column status type public.subscription_status using status::public.subscription_status,
  alter column status set default 'incomplete'::public.subscription_status,
  alter column status set not null,
  alter column billing_interval type public.billing_interval using billing_interval::public.billing_interval,
  alter column billing_interval set default 'monthly'::public.billing_interval,
  alter column billing_interval set not null,
  alter column environment type public.stripe_environment using environment::public.stripe_environment,
  alter column environment set default 'sandbox'::public.stripe_environment,
  alter column environment set not null;

alter table public.request_credit_packs
  alter column status type public.request_credit_pack_status using status::public.request_credit_pack_status,
  alter column status set default 'pending'::public.request_credit_pack_status,
  alter column status set not null,
  alter column environment type public.stripe_environment using environment::public.stripe_environment,
  alter column environment set default 'sandbox'::public.stripe_environment,
  alter column environment set not null;

alter table public.sms_send_log
  alter column status type public.sms_delivery_status using status::public.sms_delivery_status,
  alter column status set default 'queued'::public.sms_delivery_status,
  alter column status set not null;

alter table public.email_send_log
  alter column status type public.email_delivery_status using status::public.email_delivery_status,
  alter column status set default 'pending'::public.email_delivery_status,
  alter column status set not null;

alter table public.beta_invites
  alter column status type public.beta_invite_status using status::public.beta_invite_status,
  alter column status set default 'pending'::public.beta_invite_status,
  alter column status set not null;

-- ---------------------------------------------------------------------------
-- Public request token hashing foundation
-- ---------------------------------------------------------------------------

alter table public.photo_brief_requests
  add column if not exists token_hash text,
  add column if not exists token_prefix text;

update public.photo_brief_requests
set token_hash = public.hash_public_token(token),
    token_prefix = left(token, 8)
where token is not null
  and (token_hash is null or token_prefix is null);

alter table public.photo_brief_requests
  alter column token_hash set not null,
  alter column token_prefix set not null;

-- Keep token_hash/prefix synchronized while the app still writes token.
create or replace function public.sync_photo_request_token_hash()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.token is not null and (new.token_hash is null or new.token_hash <> public.hash_public_token(new.token)) then
    new.token_hash := public.hash_public_token(new.token);
  end if;

  if new.token is not null and (new.token_prefix is null or new.token_prefix <> left(new.token, 8)) then
    new.token_prefix := left(new.token, 8);
  end if;

  return new;
end;
$$;

drop trigger if exists photo_request_token_hash_trigger on public.photo_brief_requests;
create trigger photo_request_token_hash_trigger
  before insert or update of token, token_hash, token_prefix on public.photo_brief_requests
  for each row execute function public.sync_photo_request_token_hash();

-- ---------------------------------------------------------------------------
-- Stronger foreign keys and business-key uniqueness
-- ---------------------------------------------------------------------------

alter table public.business_workspaces
  add constraint business_workspaces_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete cascade;

alter table public.workspace_members
  add constraint workspace_members_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

alter table public.photo_brief_requests
  add constraint photo_brief_requests_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.photo_brief_requests
  add constraint photo_brief_requests_assigned_to_fkey
  foreign key (assigned_to) references auth.users(id) on delete set null;

alter table public.internal_notes
  add constraint internal_notes_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.submission_reviews
  add constraint submission_reviews_reviewer_id_fkey
  foreign key (reviewer_id) references auth.users(id) on delete set null;

alter table public.platform_admins
  add constraint platform_admins_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.founding_pro_claims
  add constraint founding_pro_claims_claimed_by_fkey
  foreign key (claimed_by) references auth.users(id) on delete cascade;

-- Existing hardening migration adds several FKs as NOT VALID. In beta, validate
-- them now so generated relationships and DB guarantees are real from the start.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'request_messages_request_id_fkey' and not convalidated) then
    alter table public.request_messages validate constraint request_messages_request_id_fkey;
  end if;
  if exists (select 1 from pg_constraint where conname = 'request_messages_workspace_id_fkey' and not convalidated) then
    alter table public.request_messages validate constraint request_messages_workspace_id_fkey;
  end if;
  if exists (select 1 from pg_constraint where conname = 'message_templates_workspace_id_fkey' and not convalidated) then
    alter table public.message_templates validate constraint message_templates_workspace_id_fkey;
  end if;
  if exists (select 1 from pg_constraint where conname = 'request_credit_packs_workspace_id_fkey' and not convalidated) then
    alter table public.request_credit_packs validate constraint request_credit_packs_workspace_id_fkey;
  end if;
  if exists (select 1 from pg_constraint where conname = 'subscriptions_workspace_id_fkey' and not convalidated) then
    alter table public.subscriptions validate constraint subscriptions_workspace_id_fkey;
  end if;
  if exists (select 1 from pg_constraint where conname = 'sms_send_log_request_id_fkey' and not convalidated) then
    alter table public.sms_send_log validate constraint sms_send_log_request_id_fkey;
  end if;
  if exists (select 1 from pg_constraint where conname = 'founding_pro_claims_workspace_id_fkey' and not convalidated) then
    alter table public.founding_pro_claims validate constraint founding_pro_claims_workspace_id_fkey;
  end if;
end $$;

create unique index if not exists business_workspaces_slug_unique_idx
  on public.business_workspaces(slug)
  where slug is not null;

create unique index if not exists business_workspaces_custom_domain_unique_idx
  on public.business_workspaces(custom_domain)
  where custom_domain is not null;

create unique index if not exists photo_brief_requests_token_hash_unique_idx
  on public.photo_brief_requests(token_hash);

create unique index if not exists photo_brief_requests_token_unique_idx
  on public.photo_brief_requests(token);

create unique index if not exists guide_steps_guide_order_unique_idx
  on public.guide_steps(guide_id, order_index);

create unique index if not exists context_questions_guide_order_unique_idx
  on public.context_questions(guide_id, order_index);

create unique index if not exists message_templates_workspace_kind_name_unique_idx
  on public.message_templates(workspace_id, kind, lower(name));

create unique index if not exists subscriptions_stripe_subscription_unique_idx
  on public.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

create unique index if not exists request_credit_packs_checkout_unique_idx
  on public.request_credit_packs(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists request_credit_packs_payment_intent_unique_idx
  on public.request_credit_packs(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists email_unsubscribe_tokens_token_unique_idx
  on public.email_unsubscribe_tokens(token);

create unique index if not exists beta_invites_token_hash_unique_idx
  on public.beta_invites(token_hash);

create unique index if not exists beta_invites_email_pending_unique_idx
  on public.beta_invites(lower(email))
  where status = 'pending'::public.beta_invite_status;

-- ---------------------------------------------------------------------------
-- Data quality checks
-- ---------------------------------------------------------------------------

alter table public.submissions
  add constraint submissions_readiness_score_range
  check (readiness_score is null or (readiness_score >= 0 and readiness_score <= 100));

alter table public.ai_check_results
  add constraint ai_check_results_score_range
  check (score is null or (score >= 0 and score <= 1));

alter table public.extracted_details
  add constraint extracted_details_confidence_range
  check (confidence is null or (confidence >= 0 and confidence <= 1));

alter table public.captured_media
  add constraint captured_media_confidence_range
  check (confidence is null or (confidence >= 0 and confidence <= 1));

alter table public.request_credit_packs
  add constraint request_credit_packs_amount_positive
  check (amount_cents >= 0 and pack_size > 0 and remaining >= 0 and remaining <= pack_size);

alter table public.email_send_state
  add constraint email_send_state_singleton
  check (id = 1);

alter table public.founding_pro_cache
  add constraint founding_pro_cache_singleton
  check (id = true);

alter table public.brand_profiles
  add constraint brand_profiles_primary_color_hex
  check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.photo_guides
  add constraint photo_guides_template_workspace_consistency
  check (
    (is_global_template = true and workspace_id is null)
    or (is_global_template = false)
  );

-- ---------------------------------------------------------------------------
-- updated_at triggers for mutable tables
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'business_workspaces',
    'brand_profiles',
    'profiles',
    'photo_guides',
    'guide_steps',
    'context_questions',
    'photo_brief_requests',
    'submissions',
    'captured_media',
    'subscriptions',
    'message_templates',
    'beta_invites'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at_trigger', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at_trigger',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Helpful comments for future maintainers
-- ---------------------------------------------------------------------------

comment on table public.business_workspaces is 'Tenant root for PhotoBrief. Most business-owned data hangs from workspace_id.';
comment on table public.photo_brief_requests is 'Business-created request. Public recipient access is scoped by token/token_hash.';
comment on column public.photo_brief_requests.token is 'Legacy raw public token kept for current link generation. Prefer token_hash for DB comparisons.';
comment on column public.photo_brief_requests.token_hash is 'SHA-256 hash of public recipient token for safer DB-side authorization.';
comment on table public.submissions is 'Recipient response to a photo_brief_request.';
comment on table public.submission_answers is 'Durable answers to guide/context questions captured during recipient submission.';
comment on table public.captured_media is 'Individual recipient media item attached to a submission.';
comment on table public.request_messages is 'Durable per-request communication/activity timeline.';
