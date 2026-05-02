-- Canonical domain enum definitions.
--
-- This migration intentionally runs before the beta schema cleanup migration so
-- column conversions see the complete app/database contract from the start.
-- Later migrations use `create type if not exists`-style guards, so defining
-- these here prevents narrower enum definitions from being created.

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
      'initial', 'reminder', 'followup', 'custom', 'resubmit', 'status', 'note', 'system'
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
      'short_text', 'long_text', 'number', 'single_select', 'multi_select',
      'yes_no', 'date', 'phone', 'email'
    );
  end if;
end $$;
