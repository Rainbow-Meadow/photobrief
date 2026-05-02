-- Align the stricter beta schema with the actual app/domain contract.
--
-- This migration keeps the database strict while making sure strict enums do
-- not accidentally exclude values the app already uses.

-- request_messages.kind supports business-authored custom messages.
alter type public.request_message_kind add value if not exists 'custom';

-- context questions support yes/no cards in the request builder and recipient flow.
alter type public.context_question_input_type add value if not exists 'yes_no';

-- Give the enum additions a stable point before dependent DDL in this migration.
-- PostgreSQL requires enum values to be committed before use in some contexts,
-- but future statements in later transactions will see them normally.

-- Keep message-template and request-message naming aligned.
comment on type public.request_message_kind is
  'Request activity/message kinds used by request_messages and send-recipient-message flows.';
comment on type public.message_template_kind is
  'Reusable workspace message template kinds.';
comment on type public.context_question_input_type is
  'Input widgets supported by guide context questions and recipient capture.';

-- App-level pass status should use the same semantic values as DB review_pass_status.
comment on type public.review_pass_status is
  'Submission pass/follow-up state: pending, passed, failed, needs_more, not_applicable.';
