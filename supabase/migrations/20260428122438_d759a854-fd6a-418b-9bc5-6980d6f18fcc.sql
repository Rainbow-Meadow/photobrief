ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'starter' BEFORE 'pro';
ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'team' AFTER 'pro';