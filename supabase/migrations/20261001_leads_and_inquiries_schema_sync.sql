-- Comprehensive Migration: Align 'inquiries' and 'leads' schema with all CRM frontend form properties
-- Fixes PostgREST 400 (PGRST204) schema mismatch errors across PATCH and POST requests
-- Date: 2026-10-01

-- 1. Ensure columns exist on public.inquiries
ALTER TABLE IF EXISTS public.inquiries 
  ADD COLUMN IF NOT EXISTS accommodation_preference TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_tier TEXT,
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_note TEXT,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS budget TEXT,
  ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_id TEXT;

-- 2. Ensure columns exist on public.leads
ALTER TABLE IF EXISTS public.leads 
  ADD COLUMN IF NOT EXISTS accommodation_preference TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_tier TEXT,
  ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_note TEXT,
  ADD COLUMN IF NOT EXISTS budget TEXT,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'PACKAGE',
  ADD COLUMN IF NOT EXISTS check_in_date DATE,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS guests INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS special_requests TEXT,
  ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lead_id TEXT,
  ADD COLUMN IF NOT EXISTS is_locked_for_staff BOOLEAN DEFAULT FALSE;

-- 3. Relax status check constraints on both tables to allow 'TRIP', 'Trip', and custom statuses
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'inquiries' AND constraint_name = 'inquiries_status_check'
  ) THEN
    ALTER TABLE public.inquiries DROP CONSTRAINT inquiries_status_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'leads' AND constraint_name = 'leads_status_check'
  ) THEN
    ALTER TABLE public.leads DROP CONSTRAINT leads_status_check;
  END IF;
END $$;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_inquiries_reminder_at ON public.inquiries(reminder_at);
CREATE INDEX IF NOT EXISTS idx_leads_reminder_at ON public.leads(reminder_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_accom_pref ON public.inquiries(accommodation_preference);
CREATE INDEX IF NOT EXISTS idx_leads_accom_pref ON public.leads(accommodation_preference);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- 5. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
