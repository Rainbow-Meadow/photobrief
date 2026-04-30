-- 22 beta business workspaces created 2026-04-29 → comped Pro + Founding Pro.
WITH targets(email, new_name) AS (
  VALUES
    ('hello@rainbow-meadow.org',        'Rainbow Meadow'),
    ('info@eliteappliancehvac.com',     'Elite Appliance HVAC'),
    ('info@apexappliancema.com',        'Apex Appliance MA'),
    ('info@smartfixappliancema.com',    'SmartFix Appliance MA'),
    ('contact@applianceprocare.com',    'Appliance Pro Care'),
    ('info@brightappliancerepair.com',  'Bright Appliance Repair'),
    ('info@worcestermaplumber.com',     'Worcester MA Plumber'),
    ('info@fresoloplumbing.com',        'Fresolo Plumbing'),
    ('cnunes@pipeandplumber.com',       'Pipe and Plumber'),
    ('matt@plumbing-solutions-inc.com', 'Plumbing Solutions Inc'),
    ('info@bigbluebug.com',             'Big Blue Bug'),
    ('info@fordshometown.com',          'Ford''s Hometown'),
    ('info@johnslandscape.com',         'John''s Landscape'),
    ('service@mottalandscaping.com',    'Motta Landscaping'),
    ('info@nlcinc.net',                 'NLC Inc'),
    ('info@masslandscapinginc.com',     'Mass Landscaping Inc'),
    ('ken@junkremovalinc.com',          'Junk Removal Inc'),
    ('greenteamops@gmail.com',          'Green Team Ops'),
    ('info@trashloversjunkremoval.com', 'Trash Lovers Junk Removal'),
    ('contact@junkunderjunk.com',       'Junk Under Junk'),
    ('info@yardsmartlawncare.com',      'Yard Smart Lawn Care'),
    ('junkpireremoval@gmail.com',       'Junkpire Removal')
),
mapped AS (
  SELECT t.new_name, p.id AS owner_id, p.default_workspace_id AS ws_id
  FROM targets t
  JOIN public.profiles p ON lower(p.email) = lower(t.email)
  WHERE p.default_workspace_id IS NOT NULL
)
-- 1. Rename + bump workspace tier.
, ws_update AS (
  UPDATE public.business_workspaces w
  SET name = m.new_name,
      plan_tier = 'pro',
      updated_at = now()
  FROM mapped m
  WHERE w.id = m.ws_id
  RETURNING w.id
)
-- 2. Upgrade subscription row to comped Pro + Founding Pro, non-expiring.
, sub_update AS (
  UPDATE public.subscriptions s
  SET plan_tier = 'pro',
      is_founding_pro = true,
      status = 'active',
      billing_interval = 'monthly',
      stripe_customer_id = NULL,
      stripe_subscription_id = NULL,
      price_id = NULL,
      current_period_start = now(),
      current_period_end = now() + interval '100 years',
      cancel_at_period_end = false,
      updated_at = now()
  FROM mapped m
  WHERE s.workspace_id = m.ws_id
  RETURNING s.workspace_id
)
-- 3. Founding Pro claim row (idempotent on (workspace_id) — table has no unique
--    constraint, so guard with NOT EXISTS).
INSERT INTO public.founding_pro_claims (workspace_id, claimed_by, claimed_at)
SELECT m.ws_id, m.owner_id, now()
FROM mapped m
WHERE NOT EXISTS (
  SELECT 1 FROM public.founding_pro_claims fpc WHERE fpc.workspace_id = m.ws_id
);

-- 4. Refresh the public Founding Pro counter cache so the landing banner
--    reflects the new "remaining" figure immediately.
UPDATE public.founding_pro_cache
SET remaining = GREATEST(0, 50 - (SELECT COUNT(*)::int FROM public.founding_pro_claims)),
    refreshed_at = now()
WHERE id = true;