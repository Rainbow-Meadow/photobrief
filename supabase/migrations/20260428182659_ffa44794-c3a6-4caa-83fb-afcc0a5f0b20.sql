
-- Rename topline_category enum values to match workbook
ALTER TYPE topline_category RENAME VALUE 'service_quote_intake' TO 'field_service_quote_intake';
ALTER TYPE topline_category RENAME VALUE 'property_proof_records' TO 'property_realestate_claims';
ALTER TYPE topline_category RENAME VALUE 'product_support_claims' TO 'commerce_warranty_resale';
ALTER TYPE topline_category RENAME VALUE 'sales_marketing_content' TO 'marketing_content_capture';
ALTER TYPE topline_category ADD VALUE IF NOT EXISTS 'care_health_living_systems';

-- Add workflow_type + recommended_plan_tier to photo_guides
ALTER TABLE public.photo_guides
  ADD COLUMN IF NOT EXISTS workflow_type text,
  ADD COLUMN IF NOT EXISTS recommended_plan_tier text;

-- Add reason_to_ask to context_questions
ALTER TABLE public.context_questions
  ADD COLUMN IF NOT EXISTS reason_to_ask text;
