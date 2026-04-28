
-- Storage bucket for recipient-uploaded media (photos/videos/documents).
-- Public-read so recipients see thumbnails immediately and PDFs can embed signed/public URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('submission-media', 'submission-media', true)
ON CONFLICT (id) DO NOTHING;

-- Helper: identify the request_id for a token in the request header (already exists as request_id_for_token()).
-- We rely on it for token-scoped storage policies.

-- Workspace members can read all media in their workspace.
CREATE POLICY "submission-media workspace read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-media'
  AND EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.workspace_id::text = (storage.foldername(name))[1]
      AND public.is_workspace_member(s.workspace_id)
  )
);

-- Workspace members can write/delete media in their workspace folder.
CREATE POLICY "submission-media workspace write"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'submission-media'
  AND EXISTS (
    SELECT 1 FROM public.business_workspaces w
    WHERE w.id::text = (storage.foldername(name))[1]
      AND public.is_workspace_member(w.id)
  )
)
WITH CHECK (
  bucket_id = 'submission-media'
  AND EXISTS (
    SELECT 1 FROM public.business_workspaces w
    WHERE w.id::text = (storage.foldername(name))[1]
      AND public.is_workspace_member(w.id)
  )
);

-- Public (anon + authenticated) read for the bucket — bucket is public so this matches signed-url usage.
CREATE POLICY "submission-media public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'submission-media');

-- Recipient (token-bearing) inserts: must place file under {workspace_id}/{request_id}/...
-- The request_id (2nd folder segment) must match request_id_for_token().
CREATE POLICY "submission-media token insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'submission-media'
  AND public.request_id_for_token() IS NOT NULL
  AND (storage.foldername(name))[2] = public.request_id_for_token()::text
);

-- Realtime: enable change events on the inbox/notifications tables.
ALTER PUBLICATION supabase_realtime ADD TABLE public.photo_brief_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Replica identity FULL so realtime payloads include the previous row (needed for filtering).
ALTER TABLE public.photo_brief_requests REPLICA IDENTITY FULL;
ALTER TABLE public.submissions REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
