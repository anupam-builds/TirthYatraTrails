-- Migration: Add reminder_at, reminder_note columns and support Trip status
-- Supports manual lead creation, reminders with audio-visual alerts, and Trip status

-- 1. Ensure reminder columns exist on inquiries table
ALTER TABLE IF EXISTS public.inquiries 
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_note TEXT;

-- 2. Ensure reminder columns exist on leads table
ALTER TABLE IF EXISTS public.leads 
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_note TEXT;

-- 3. Relax or remove check constraints on status if present to allow TRIP
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

-- 4. Create indexes for quick reminder scanning
CREATE INDEX IF NOT EXISTS idx_inquiries_reminder_at ON public.inquiries(reminder_at);
CREATE INDEX IF NOT EXISTS idx_leads_reminder_at ON public.leads(reminder_at);

-- 5. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
