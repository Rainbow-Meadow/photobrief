ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Treat all existing users as already onboarded.
UPDATE public.profiles SET onboarded_at = now() WHERE onboarded_at IS NULL;