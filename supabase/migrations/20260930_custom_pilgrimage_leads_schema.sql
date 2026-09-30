-- Migration: Add end_date, duration_days, and budget columns to inquiries and leads tables
-- Supports Custom Pilgrimage inquiry requirements

-- 1. Ensure columns exist on inquiries table
ALTER TABLE IF EXISTS public.inquiries 
  ADD COLUMN IF NOT EXISTS end_date TEXT,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS budget TEXT;

-- 2. Ensure columns exist on leads table (if present)
ALTER TABLE IF EXISTS public.leads 
  ADD COLUMN IF NOT EXISTS end_date TEXT,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS budget TEXT;

-- 3. Create indexes for efficient date and budget range queries
CREATE INDEX IF NOT EXISTS idx_inquiries_end_date ON public.inquiries(end_date);
CREATE INDEX IF NOT EXISTS idx_leads_end_date ON public.leads(end_date);

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
