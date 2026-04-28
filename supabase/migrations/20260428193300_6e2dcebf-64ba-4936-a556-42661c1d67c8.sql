-- White-label flag on brand_profiles
ALTER TABLE public.brand_profiles
  ADD COLUMN IF NOT EXISTS hide_photobrief_branding boolean NOT NULL DEFAULT false;

-- Custom domain on workspaces
ALTER TABLE public.business_workspaces
  ADD COLUMN IF NOT EXISTS custom_domain text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_workspaces_custom_domain
  ON public.business_workspaces(custom_domain)
  WHERE custom_domain IS NOT NULL;

-- Webhook subscriptions
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['submission.created','submission.reviewed']::text[],
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_workspace
  ON public.webhook_subscriptions(workspace_id);

ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view webhooks" ON public.webhook_subscriptions;
CREATE POLICY "Members can view webhooks"
  ON public.webhook_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = webhook_subscriptions.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert webhooks" ON public.webhook_subscriptions;
CREATE POLICY "Members can insert webhooks"
  ON public.webhook_subscriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = webhook_subscriptions.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update webhooks" ON public.webhook_subscriptions;
CREATE POLICY "Members can update webhooks"
  ON public.webhook_subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = webhook_subscriptions.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete webhooks" ON public.webhook_subscriptions;
CREATE POLICY "Members can delete webhooks"
  ON public.webhook_subscriptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = webhook_subscriptions.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_webhook_subscriptions_updated
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  status_code int,
  ok boolean NOT NULL DEFAULT false,
  error text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_subscription
  ON public.webhook_deliveries(subscription_id, attempted_at DESC);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view webhook deliveries" ON public.webhook_deliveries;
CREATE POLICY "Members can view webhook deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = webhook_deliveries.workspace_id
        AND wm.user_id = auth.uid()
    )
  );
