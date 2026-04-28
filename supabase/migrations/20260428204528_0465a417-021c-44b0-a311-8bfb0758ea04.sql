
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email LIKE 'qa-%@photobrief.test';

UPDATE public.profiles
SET onboarded_at = COALESCE(onboarded_at, now())
WHERE email LIKE 'qa-%@photobrief.test';

UPDATE public.business_workspaces w
SET plan_tier = CASE
  WHEN u.email LIKE 'qa-free-%'     THEN 'free'::plan_tier
  WHEN u.email LIKE 'qa-starter-%'  THEN 'starter'::plan_tier
  WHEN u.email LIKE 'qa-pro-%'      THEN 'pro'::plan_tier
  WHEN u.email LIKE 'qa-team-%'     THEN 'team'::plan_tier
  WHEN u.email LIKE 'qa-business-%' THEN 'business'::plan_tier
  ELSE w.plan_tier
END
FROM auth.users u
WHERE w.owner_id = u.id AND u.email LIKE 'qa-%@photobrief.test';

UPDATE public.subscriptions s
SET plan_tier = w.plan_tier
FROM public.business_workspaces w, auth.users u
WHERE s.workspace_id = w.id AND w.owner_id = u.id
  AND u.email LIKE 'qa-%@photobrief.test';
