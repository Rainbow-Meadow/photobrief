-- =====================================================================
-- PhotoBrief Phase 8 — schema + auth only
-- =====================================================================

-- ---------- Enums (mirror option_sets.csv) -----------------------------
CREATE TYPE public.member_role AS ENUM ('owner', 'admin', 'member');

CREATE TYPE public.plan_tier AS ENUM (
  'free', 'starter', 'pro', 'team', 'business'
);

CREATE TYPE public.request_status AS ENUM (
  'draft','sent','opened','in_progress','needs_customer_action',
  'submitted','ready_to_review','reviewed','archived','expired'
);

CREATE TYPE public.submission_status AS ENUM (
  'new','reviewed','needs_more','archived'
);

CREATE TYPE public.capture_type AS ENUM (
  'photo','video','document','label','note','measurement'
);

CREATE TYPE public.overlay_type AS ENUM (
  'wide_scene','close_up','damage_closeup','document_label',
  'model_serial_plate','receipt_order','before_after_alignment',
  'square_product_crop','vertical_story_crop','scale_reference',
  'video_motion','custom'
);

CREATE TYPE public.ai_check_type AS ENUM (
  'blur','low_light','glare','unreadable_text','wrong_shot',
  'cropped_subject','duplicate_image','missing_scale',
  'missing_required_item','label_detected','serial_model_detected',
  'receipt_order_detected','damage_visible','wide_shot_detected',
  'close_up_detected','unsafe_condition_flag'
);

CREATE TYPE public.topline_category AS ENUM (
  'service_quote_intake','property_proof_records','product_support_claims',
  'sales_marketing_content','custom_business_intake'
);

CREATE TYPE public.output_type AS ENUM (
  'service_intake_brief','proof_packet','claim_packet','listing_draft',
  'social_post_draft','condition_report','custom_brief'
);

-- ---------- updated_at helper -----------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- Tables
-- =====================================================================

-- ---------- profiles --------------------------------------------------
CREATE TABLE public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT,
  name                TEXT,
  avatar_url          TEXT,
  default_workspace_id UUID,
  last_login_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- business_workspaces ---------------------------------------
CREATE TABLE public.business_workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  industry    TEXT,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  plan_tier   public.plan_tier NOT NULL DEFAULT 'free',
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_default_workspace_fk
  FOREIGN KEY (default_workspace_id)
  REFERENCES public.business_workspaces(id)
  ON DELETE SET NULL;

CREATE INDEX idx_workspaces_owner ON public.business_workspaces(owner_id);

-- ---------- workspace_members -----------------------------------------
CREATE TABLE public.workspace_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          public.member_role NOT NULL DEFAULT 'member',
  status        TEXT NOT NULL DEFAULT 'active',
  invited_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_members_workspace ON public.workspace_members(workspace_id);

-- ---------- brand_profiles --------------------------------------------
CREATE TABLE public.brand_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL UNIQUE REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  logo_url            TEXT,
  primary_color       TEXT DEFAULT '#0A6BFF',
  request_heading     TEXT,
  intro_message       TEXT,
  completion_message  TEXT,
  contact_email       TEXT,
  contact_phone       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- photo_guides ----------------------------------------------
CREATE TABLE public.photo_guides (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             UUID REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  category                 public.topline_category,
  nested_category          TEXT,
  description              TEXT,
  estimated_time_minutes   INT,
  output_type              public.output_type,
  is_global_template       BOOLEAN NOT NULL DEFAULT false,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  created_by               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_guides_workspace ON public.photo_guides(workspace_id);

-- ---------- guide_steps -----------------------------------------------
CREATE TABLE public.guide_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id        UUID NOT NULL REFERENCES public.photo_guides(id) ON DELETE CASCADE,
  order_index     INT NOT NULL,
  title           TEXT NOT NULL,
  instruction     TEXT,
  why_it_matters  TEXT,
  capture_type    public.capture_type NOT NULL DEFAULT 'photo',
  overlay_type    public.overlay_type,
  required        BOOLEAN NOT NULL DEFAULT true,
  allow_skip      BOOLEAN NOT NULL DEFAULT false,
  ai_checks       public.ai_check_type[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_steps_guide ON public.guide_steps(guide_id, order_index);

-- ---------- context_questions -----------------------------------------
CREATE TABLE public.context_questions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id            UUID NOT NULL REFERENCES public.photo_guides(id) ON DELETE CASCADE,
  order_index         INT NOT NULL,
  label               TEXT NOT NULL,
  helper_text         TEXT,
  input_type          TEXT NOT NULL DEFAULT 'short_text',
  required            BOOLEAN NOT NULL DEFAULT false,
  options             JSONB,
  conditional_logic   JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_guide ON public.context_questions(guide_id, order_index);

-- ---------- photo_brief_requests --------------------------------------
CREATE TABLE public.photo_brief_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  guide_id          UUID REFERENCES public.photo_guides(id) ON DELETE SET NULL,
  recipient_name    TEXT,
  recipient_email   TEXT,
  recipient_phone   TEXT,
  token             TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  status            public.request_status NOT NULL DEFAULT 'draft',
  custom_message    TEXT,
  due_date          DATE,
  assigned_to       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_requests_workspace ON public.photo_brief_requests(workspace_id);
CREATE INDEX idx_requests_token ON public.photo_brief_requests(token);

-- ---------- submissions -----------------------------------------------
CREATE TABLE public.submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          UUID NOT NULL REFERENCES public.photo_brief_requests(id) ON DELETE CASCADE,
  workspace_id        UUID NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  submitter_name      TEXT,
  submitter_contact   TEXT,
  status              public.submission_status NOT NULL DEFAULT 'new',
  readiness_score     INT,
  ai_summary          TEXT,
  next_action         TEXT,
  submitted_at        TIMESTAMPTZ,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_request ON public.submissions(request_id);
CREATE INDEX idx_submissions_workspace ON public.submissions(workspace_id);

-- ---------- captured_media --------------------------------------------
CREATE TABLE public.captured_media (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id     UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  step_id           UUID REFERENCES public.guide_steps(id) ON DELETE SET NULL,
  file_url          TEXT,
  thumbnail_url     TEXT,
  note              TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  ai_feedback       JSONB,
  extracted_text    TEXT,
  confidence        NUMERIC(4,3),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_submission ON public.captured_media(submission_id);

-- ---------- ai_check_results ------------------------------------------
CREATE TABLE public.ai_check_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_media_id UUID NOT NULL REFERENCES public.captured_media(id) ON DELETE CASCADE,
  check_type        public.ai_check_type NOT NULL,
  passed            BOOLEAN NOT NULL,
  score             NUMERIC(4,3),
  message           TEXT,
  suggested_fix     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aichecks_media ON public.ai_check_results(captured_media_id);

-- ---------- extracted_details -----------------------------------------
CREATE TABLE public.extracted_details (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id            UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  type                     TEXT,
  label                    TEXT NOT NULL,
  value                    TEXT,
  source_media_id          UUID REFERENCES public.captured_media(id) ON DELETE SET NULL,
  confidence               NUMERIC(4,3),
  required_for_readiness   BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_details_submission ON public.extracted_details(submission_id);

-- ---------- internal_notes --------------------------------------------
CREATE TABLE public.internal_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_submission ON public.internal_notes(submission_id);

-- ---------- notifications ---------------------------------------------
CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  read            BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);

-- ---------- subscriptions ---------------------------------------------
CREATE TABLE public.subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             UUID NOT NULL UNIQUE REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  plan_tier                public.plan_tier NOT NULL DEFAULT 'free',
  status                   TEXT NOT NULL DEFAULT 'active',
  renewal_date             DATE,
  stripe_customer_id       TEXT,
  stripe_subscription_id   TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- usage_events ----------------------------------------------
CREATE TABLE public.usage_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  related_id    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_workspace_time ON public.usage_events(workspace_id, created_at DESC);

-- =====================================================================
-- updated_at triggers
-- =====================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','business_workspaces','workspace_members','brand_profiles',
    'photo_guides','guide_steps','context_questions','photo_brief_requests',
    'submissions','captured_media','subscriptions'
  ]) LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END$$;

-- =====================================================================
-- Security-definer helpers (avoid RLS recursion)
-- =====================================================================

-- True if the calling auth.uid() is a member of the given workspace.
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- True if the caller has at least the given role in the workspace.
CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id UUID, _role public.member_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND (
        role = _role
        OR (_role = 'member')
        OR (_role = 'admin' AND role = 'owner')
      )
  );
$$;

-- Reads the recipient token from the request header `x-request-token`
-- and returns the matching request id (or NULL). Used by RLS so the
-- token itself never appears in queries.
CREATE OR REPLACE FUNCTION public.request_id_for_token()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hdrs JSONB;
  tok  TEXT;
  rid  UUID;
BEGIN
  BEGIN
    hdrs := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF hdrs IS NULL THEN RETURN NULL; END IF;
  tok := hdrs ->> 'x-request-token';
  IF tok IS NULL OR length(tok) < 8 THEN RETURN NULL; END IF;

  SELECT id INTO rid
  FROM public.photo_brief_requests
  WHERE token = tok
  LIMIT 1;

  RETURN rid;
END;
$$;

-- =====================================================================
-- Enable RLS on every table
-- =====================================================================
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_workspaces   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_guides          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_steps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_brief_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captured_media        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_check_results      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_details     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events          ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- Policies
-- =====================================================================

-- ---------- profiles -------------------------------------------------
CREATE POLICY "profiles self read"   ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---------- business_workspaces --------------------------------------
CREATE POLICY "ws members read" ON public.business_workspaces
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(id));
CREATE POLICY "ws owner insert" ON public.business_workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ws admins update" ON public.business_workspaces
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(id, 'admin'))
  WITH CHECK (public.has_workspace_role(id, 'admin'));

-- ---------- workspace_members ----------------------------------------
CREATE POLICY "members read self workspace" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "members insert by admin or owner-bootstrap" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_workspace_role(workspace_id, 'admin')
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.business_workspaces w
        WHERE w.id = workspace_id AND w.owner_id = auth.uid()
      )
    )
  );
CREATE POLICY "members update by admin" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'))
  WITH CHECK (public.has_workspace_role(workspace_id, 'admin'));
CREATE POLICY "members delete by admin" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'));

-- ---------- brand_profiles -------------------------------------------
CREATE POLICY "brand read by members" ON public.brand_profiles
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "brand write by admins" ON public.brand_profiles
  FOR ALL TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'))
  WITH CHECK (public.has_workspace_role(workspace_id, 'admin'));

-- Recipients can read the brand for the workspace tied to their token's request.
CREATE POLICY "brand read by token" ON public.brand_profiles
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.photo_brief_requests r
      WHERE r.id = public.request_id_for_token()
        AND r.workspace_id = brand_profiles.workspace_id
    )
  );

-- ---------- photo_guides ---------------------------------------------
CREATE POLICY "guides workspace read" ON public.photo_guides
  FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));
CREATE POLICY "guides workspace write" ON public.photo_guides
  FOR ALL TO authenticated
  USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
  WITH CHECK (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));

-- Recipients see only the guide that powers their request.
CREATE POLICY "guides read by token" ON public.photo_guides
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.photo_brief_requests r
      WHERE r.id = public.request_id_for_token()
        AND r.guide_id = photo_guides.id
    )
  );

-- ---------- guide_steps ----------------------------------------------
CREATE POLICY "steps workspace read" ON public.guide_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.photo_guides g
      WHERE g.id = guide_steps.guide_id
        AND (g.workspace_id IS NULL OR public.is_workspace_member(g.workspace_id))
    )
  );
CREATE POLICY "steps workspace write" ON public.guide_steps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.photo_guides g
      WHERE g.id = guide_steps.guide_id
        AND g.workspace_id IS NOT NULL
        AND public.is_workspace_member(g.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.photo_guides g
      WHERE g.id = guide_steps.guide_id
        AND g.workspace_id IS NOT NULL
        AND public.is_workspace_member(g.workspace_id)
    )
  );
CREATE POLICY "steps read by token" ON public.guide_steps
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.photo_brief_requests r
      WHERE r.id = public.request_id_for_token()
        AND r.guide_id = guide_steps.guide_id
    )
  );

-- ---------- context_questions ----------------------------------------
CREATE POLICY "questions workspace read" ON public.context_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.photo_guides g
      WHERE g.id = context_questions.guide_id
        AND (g.workspace_id IS NULL OR public.is_workspace_member(g.workspace_id))
    )
  );
CREATE POLICY "questions workspace write" ON public.context_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.photo_guides g
      WHERE g.id = context_questions.guide_id
        AND g.workspace_id IS NOT NULL
        AND public.is_workspace_member(g.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.photo_guides g
      WHERE g.id = context_questions.guide_id
        AND g.workspace_id IS NOT NULL
        AND public.is_workspace_member(g.workspace_id)
    )
  );
CREATE POLICY "questions read by token" ON public.context_questions
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.photo_brief_requests r
      WHERE r.id = public.request_id_for_token()
        AND r.guide_id = context_questions.guide_id
    )
  );

-- ---------- photo_brief_requests -------------------------------------
CREATE POLICY "requests workspace read" ON public.photo_brief_requests
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "requests workspace write" ON public.photo_brief_requests
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Recipient: read only the request matching the header token.
CREATE POLICY "requests read by token" ON public.photo_brief_requests
  FOR SELECT TO anon, authenticated
  USING (id = public.request_id_for_token());
-- Recipient: update only their own request (status + responses).
CREATE POLICY "requests update by token" ON public.photo_brief_requests
  FOR UPDATE TO anon, authenticated
  USING (id = public.request_id_for_token())
  WITH CHECK (id = public.request_id_for_token());

-- ---------- submissions ----------------------------------------------
CREATE POLICY "submissions workspace read" ON public.submissions
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "submissions workspace write" ON public.submissions
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Recipient: read & insert their submission, update while in progress.
CREATE POLICY "submissions read by token" ON public.submissions
  FOR SELECT TO anon, authenticated
  USING (request_id = public.request_id_for_token());
CREATE POLICY "submissions insert by token" ON public.submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    request_id = public.request_id_for_token()
    AND request_id IS NOT NULL
  );
CREATE POLICY "submissions update by token" ON public.submissions
  FOR UPDATE TO anon, authenticated
  USING (request_id = public.request_id_for_token())
  WITH CHECK (request_id = public.request_id_for_token());

-- ---------- captured_media -------------------------------------------
CREATE POLICY "media workspace read" ON public.captured_media
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = captured_media.submission_id
        AND public.is_workspace_member(s.workspace_id)
    )
  );
CREATE POLICY "media workspace write" ON public.captured_media
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = captured_media.submission_id
        AND public.is_workspace_member(s.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = captured_media.submission_id
        AND public.is_workspace_member(s.workspace_id)
    )
  );

CREATE POLICY "media read by token" ON public.captured_media
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = captured_media.submission_id
        AND s.request_id = public.request_id_for_token()
    )
  );
CREATE POLICY "media insert by token" ON public.captured_media
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = captured_media.submission_id
        AND s.request_id = public.request_id_for_token()
    )
  );
CREATE POLICY "media update by token" ON public.captured_media
  FOR UPDATE TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = captured_media.submission_id
        AND s.request_id = public.request_id_for_token()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = captured_media.submission_id
        AND s.request_id = public.request_id_for_token()
    )
  );

-- ---------- ai_check_results -----------------------------------------
CREATE POLICY "ai checks workspace read" ON public.ai_check_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.captured_media m
      JOIN public.submissions s ON s.id = m.submission_id
      WHERE m.id = ai_check_results.captured_media_id
        AND public.is_workspace_member(s.workspace_id)
    )
  );
CREATE POLICY "ai checks workspace write" ON public.ai_check_results
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.captured_media m
      JOIN public.submissions s ON s.id = m.submission_id
      WHERE m.id = ai_check_results.captured_media_id
        AND public.is_workspace_member(s.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.captured_media m
      JOIN public.submissions s ON s.id = m.submission_id
      WHERE m.id = ai_check_results.captured_media_id
        AND public.is_workspace_member(s.workspace_id)
    )
  );
-- Recipients can see AI feedback on their own media.
CREATE POLICY "ai checks read by token" ON public.ai_check_results
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.captured_media m
      JOIN public.submissions s ON s.id = m.submission_id
      WHERE m.id = ai_check_results.captured_media_id
        AND s.request_id = public.request_id_for_token()
    )
  );

-- ---------- extracted_details ----------------------------------------
CREATE POLICY "details workspace read" ON public.extracted_details
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = extracted_details.submission_id
        AND public.is_workspace_member(s.workspace_id)
    )
  );
CREATE POLICY "details workspace write" ON public.extracted_details
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = extracted_details.submission_id
        AND public.is_workspace_member(s.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = extracted_details.submission_id
        AND public.is_workspace_member(s.workspace_id)
    )
  );
-- NOTE: no recipient/anon policy on extracted_details.

-- ---------- internal_notes (NEVER public) -----------------------------
CREATE POLICY "notes read by members" ON public.internal_notes
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "notes insert by members" ON public.internal_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND user_id = auth.uid()
  );
CREATE POLICY "notes update by author" ON public.internal_notes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));
CREATE POLICY "notes delete by author or admin" ON public.internal_notes
  FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND (user_id = auth.uid() OR public.has_workspace_role(workspace_id, 'admin'))
  );

-- ---------- notifications --------------------------------------------
CREATE POLICY "notifications self read" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));
CREATE POLICY "notifications self update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- Inserts go through service role (edge functions); no anon/auth insert policy.

-- ---------- subscriptions --------------------------------------------
CREATE POLICY "subs read by members" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "subs write by admin" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'))
  WITH CHECK (public.has_workspace_role(workspace_id, 'admin'));

-- ---------- usage_events ---------------------------------------------
CREATE POLICY "usage read by members" ON public.usage_events
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
-- Inserts handled by edge functions via service role.

-- =====================================================================
-- Auth wiring: auto-create profile + workspace on signup
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_id UUID;
  display_name TEXT;
BEGIN
  display_name := COALESCE(
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Workspace
  INSERT INTO public.business_workspaces (name, owner_id, plan_tier)
  VALUES (COALESCE(display_name, 'My workspace') || '''s workspace', NEW.id, 'free')
  RETURNING id INTO ws_id;

  -- Owner membership
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (ws_id, NEW.id, 'owner', 'active');

  -- Brand profile defaults
  INSERT INTO public.brand_profiles (workspace_id, intro_message, completion_message)
  VALUES (
    ws_id,
    'Hi! Help us help you — a few quick photos.',
    'Thanks! We''ve got everything we need.'
  );

  -- Subscription row
  INSERT INTO public.subscriptions (workspace_id, plan_tier, status)
  VALUES (ws_id, 'free', 'active');

  -- Profile
  INSERT INTO public.profiles (id, email, name, default_workspace_id)
  VALUES (NEW.id, NEW.email, display_name, ws_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();