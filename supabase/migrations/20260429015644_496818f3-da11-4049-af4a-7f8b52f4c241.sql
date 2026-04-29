ALTER TABLE public.captured_media
  ADD COLUMN IF NOT EXISTS review_comment text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS first_pass_status text NOT NULL DEFAULT 'pending'
    CHECK (first_pass_status IN ('pending','accepted','rework')),
  ADD COLUMN IF NOT EXISTS second_pass_status text NOT NULL DEFAULT 'pending'
    CHECK (second_pass_status IN ('pending','accepted','rework','n_a'));

CREATE TABLE IF NOT EXISTS public.submission_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  reviewer_id uuid,
  action text NOT NULL CHECK (action IN ('rejected','approved')),
  round int NOT NULL CHECK (round >= 1),
  summary_message text,
  rejected_media_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_reviews_submission
  ON public.submission_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_reviews_workspace
  ON public.submission_reviews(workspace_id);

ALTER TABLE public.submission_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submission reviews read by members" ON public.submission_reviews;
CREATE POLICY "submission reviews read by members"
  ON public.submission_reviews FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "submission reviews insert by members" ON public.submission_reviews;
CREATE POLICY "submission reviews insert by members"
  ON public.submission_reviews FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id) AND reviewer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_pass_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.round = 1 THEN
    IF NEW.action = 'rejected' THEN
      UPDATE public.submissions SET first_pass_status = 'rework'
        WHERE id = NEW.submission_id AND first_pass_status = 'pending';
    ELSIF NEW.action = 'approved' THEN
      UPDATE public.submissions
        SET first_pass_status = 'accepted', second_pass_status = 'n_a'
        WHERE id = NEW.submission_id AND first_pass_status = 'pending';
    END IF;
  ELSIF NEW.round >= 2 THEN
    IF NEW.action = 'approved' THEN
      UPDATE public.submissions SET second_pass_status = 'accepted'
        WHERE id = NEW.submission_id AND second_pass_status IN ('pending','rework');
    ELSIF NEW.action = 'rejected' THEN
      UPDATE public.submissions SET second_pass_status = 'rework'
        WHERE id = NEW.submission_id AND second_pass_status = 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_pass_status ON public.submission_reviews;
CREATE TRIGGER trg_set_pass_status
  AFTER INSERT ON public.submission_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_pass_status();

CREATE OR REPLACE FUNCTION public.finalize_first_pass_on_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_round int;
BEGIN
  IF NEW.status = 'reviewed'
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.first_pass_status = 'pending' THEN
    SELECT COALESCE(MAX(round), 0) + 1 INTO next_round
      FROM public.submission_reviews WHERE submission_id = NEW.id;
    INSERT INTO public.submission_reviews
      (submission_id, workspace_id, reviewer_id, action, round, summary_message)
    VALUES
      (NEW.id, NEW.workspace_id, auth.uid(), 'approved', next_round,
       'Marked reviewed without rejections.');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finalize_first_pass_on_review ON public.submissions;
CREATE TRIGGER trg_finalize_first_pass_on_review
  AFTER UPDATE OF status ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.finalize_first_pass_on_review();

DROP VIEW IF EXISTS public.requests_inbox_view;
CREATE VIEW public.requests_inbox_view
WITH (security_invoker=on) AS
WITH latest_sub AS (
  SELECT DISTINCT ON (s.request_id)
    s.request_id,
    s.readiness_score,
    s.missing_items,
    s.first_pass_status,
    s.second_pass_status,
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
  ls.first_pass_status  AS submission_first_pass_status,
  ls.second_pass_status AS submission_second_pass_status,
  GREATEST(r.updated_at, COALESCE(ls.submission_updated_at, r.updated_at)) AS last_activity_at
FROM public.photo_brief_requests r
LEFT JOIN public.photo_guides g ON g.id = r.guide_id
LEFT JOIN public.profiles p ON p.id = r.assigned_to
LEFT JOIN latest_sub ls ON ls.request_id = r.id;

GRANT SELECT ON public.requests_inbox_view TO authenticated;