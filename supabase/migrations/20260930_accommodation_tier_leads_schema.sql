-- Migration: Ensure accommodation_tier and accommodation_preference columns on leads and inquiries tables
-- Supports restructured Budget Hotels and Premium accommodation categories

-- 1. Ensure columns exist on inquiries table
ALTER TABLE IF EXISTS public.inquiries 
  ADD COLUMN IF NOT EXISTS accommodation_tier TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_preference TEXT;

-- 2. Ensure columns exist on leads table (if present)
ALTER TABLE IF EXISTS public.leads 
  ADD COLUMN IF NOT EXISTS accommodation_tier TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_preference TEXT;

-- 3. Create indexes for quick filtering in admin CRM
CREATE INDEX IF NOT EXISTS idx_inquiries_accommodation_tier ON public.inquiries(accommodation_tier);
CREATE INDEX IF NOT EXISTS idx_leads_accommodation_tier ON public.leads(accommodation_tier);

-- 4. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
