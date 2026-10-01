-- Migration: Ensure accommodation_preference column (TEXT) exists on leads and inquiries tables
-- Date: 2026-10-01
-- Fixes PGRST204: Could not find the 'accommodation_preference' column of 'leads' in the schema cache

-- 1. Ensure accommodation_preference and accommodation_tier columns exist on public.leads
ALTER TABLE IF EXISTS public.leads 
  ADD COLUMN IF NOT EXISTS accommodation_preference TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_tier TEXT;

-- 2. Ensure columns exist on public.inquiries as well
ALTER TABLE IF EXISTS public.inquiries 
  ADD COLUMN IF NOT EXISTS accommodation_preference TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_tier TEXT;

-- 3. Create indexes for quick filtering
CREATE INDEX IF NOT EXISTS idx_leads_accommodation_preference ON public.leads(accommodation_preference);
CREATE INDEX IF NOT EXISTS idx_inquiries_accommodation_preference ON public.inquiries(accommodation_preference);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
