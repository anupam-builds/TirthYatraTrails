-- Migration: Add quick_summary JSONB column to packages table
-- Allows storing structured array of custom key-value summary attributes per package
-- e.g., [{ "label": "Meals", "value": "100% Pure Vegetarian" }, { "label": "Medical", "value": "Oxygen & Doctor on Call" }]

ALTER TABLE IF EXISTS public.packages
  ADD COLUMN IF NOT EXISTS quick_summary JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS itinerary JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS inclusions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exclusions JSONB DEFAULT '[]'::jsonb;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
