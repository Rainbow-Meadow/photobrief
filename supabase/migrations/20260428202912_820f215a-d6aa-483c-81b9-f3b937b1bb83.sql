-- Ensure a phone number can only be suppressed once per workspace, and enable upserts.
CREATE UNIQUE INDEX IF NOT EXISTS sms_suppressions_workspace_phone_uniq
  ON public.sms_suppressions (workspace_id, phone_number);

-- Speed up timeline reads filtered by request + ordering by sent_at.
CREATE INDEX IF NOT EXISTS request_messages_request_sent_idx
  ON public.request_messages (request_id, sent_at DESC);

-- Speed up the inbound webhook's "find latest outbound for this pair" query.
CREATE INDEX IF NOT EXISTS sms_send_log_ws_to_sent_idx
  ON public.sms_send_log (workspace_id, to_number, sent_at DESC);