-- Database scale hardening advisory.
--
-- This repository is linked to Lovable and the managed Supabase project, so
-- migrations merged to main can affect live app/database behavior. This file is
-- intentionally non-mutating. It records the next database-hardening migration
-- plan without applying constraints, triggers, or indexes automatically.
--
-- See docs/database-architecture.md for the deployment order, audit SQL, and
-- the manual SQL to apply in staging before promoting to production.

select 'PhotoBrief database scale hardening advisory migration: no schema changes applied automatically.' as notice;
