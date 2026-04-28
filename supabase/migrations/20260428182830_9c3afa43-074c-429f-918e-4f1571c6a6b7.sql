
DELETE FROM public.context_questions WHERE guide_id IN (SELECT id FROM public.photo_guides WHERE is_global_template = true);
DELETE FROM public.guide_steps WHERE guide_id IN (SELECT id FROM public.photo_guides WHERE is_global_template = true);
DELETE FROM public.photo_guides WHERE is_global_template = true;
