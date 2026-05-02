-- Prepare the managed beta DB for the production-baseline cleanup migration.
--
-- Lovable/Supabase may already have created some constraints while iterating in
-- beta. Drop only the specific constraint names that the next migration owns so
-- the cleanup migration can recreate them with the intended behavior.

alter table if exists public.business_workspaces drop constraint if exists business_workspaces_owner_id_fkey;
alter table if exists public.workspace_members drop constraint if exists workspace_members_user_id_fkey;
alter table if exists public.profiles drop constraint if exists profiles_id_fkey;
alter table if exists public.photo_brief_requests drop constraint if exists photo_brief_requests_created_by_fkey;
alter table if exists public.photo_brief_requests drop constraint if exists photo_brief_requests_assigned_to_fkey;
alter table if exists public.internal_notes drop constraint if exists internal_notes_user_id_fkey;
alter table if exists public.submission_reviews drop constraint if exists submission_reviews_reviewer_id_fkey;
alter table if exists public.platform_admins drop constraint if exists platform_admins_user_id_fkey;
alter table if exists public.founding_pro_claims drop constraint if exists founding_pro_claims_claimed_by_fkey;

alter table if exists public.submissions drop constraint if exists submissions_readiness_score_range;
alter table if exists public.ai_check_results drop constraint if exists ai_check_results_score_range;
alter table if exists public.extracted_details drop constraint if exists extracted_details_confidence_range;
alter table if exists public.captured_media drop constraint if exists captured_media_confidence_range;
alter table if exists public.request_credit_packs drop constraint if exists request_credit_packs_amount_positive;
alter table if exists public.email_send_state drop constraint if exists email_send_state_singleton;
alter table if exists public.founding_pro_cache drop constraint if exists founding_pro_cache_singleton;
alter table if exists public.brand_profiles drop constraint if exists brand_profiles_primary_color_hex;
alter table if exists public.photo_guides drop constraint if exists photo_guides_template_workspace_consistency;
