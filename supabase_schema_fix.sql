-- ==============================================================================
-- Tirth Yatra Trails: Complete Schema Fix for Supabase Database
-- Run this script in the Supabase SQL Editor to ensure all CRM fields exist
-- ==============================================================================

-- 1. Ensure columns exist on public.inquiries
ALTER TABLE IF EXISTS public.inquiries 
  ADD COLUMN IF NOT EXISTS lead_id TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS user_city TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'PACKAGE',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS check_in_date DATE,
  ADD COLUMN IF NOT EXISTS check_out_date DATE,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS tour_start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS tour_end_date DATE,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS budget TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_tier TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_preference TEXT,
  ADD COLUMN IF NOT EXISTS hotel_tier TEXT,
  ADD COLUMN IF NOT EXISTS plan TEXT,
  ADD COLUMN IF NOT EXISTS package_name TEXT,
  ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travelers INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS total_travelers INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS guests INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS child_ages JSONB,
  ADD COLUMN IF NOT EXISTS pickup_location TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_location TEXT,
  ADD COLUMN IF NOT EXISTS special_requests TEXT,
  ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS assigned_staff_id TEXT,
  ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT,
  ADD COLUMN IF NOT EXISTS is_locked_for_staff BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_note TEXT,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Ensure columns exist on public.leads
ALTER TABLE IF EXISTS public.leads 
  ADD COLUMN IF NOT EXISTS lead_id TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS user_city TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'PACKAGE',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS check_in_date DATE,
  ADD COLUMN IF NOT EXISTS check_out_date DATE,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS tour_start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS tour_end_date DATE,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS budget TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_tier TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_preference TEXT,
  ADD COLUMN IF NOT EXISTS hotel_tier TEXT,
  ADD COLUMN IF NOT EXISTS plan TEXT,
  ADD COLUMN IF NOT EXISTS package_name TEXT,
  ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travelers INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS total_travelers INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS guests INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS child_ages JSONB,
  ADD COLUMN IF NOT EXISTS pickup_location TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_location TEXT,
  ADD COLUMN IF NOT EXISTS special_requests TEXT,
  ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS assigned_staff_id TEXT,
  ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT,
  ADD COLUMN IF NOT EXISTS is_locked_for_staff BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_note TEXT,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Ensure public.staff_sessions table, primary key, and RLS policies exist
CREATE TABLE IF NOT EXISTS public.staff_sessions (
  id UUID DEFAULT gen_random_uuid(),
  staff_id TEXT PRIMARY KEY,
  last_active TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure primary key constraint on staff_id exists if table pre-existed without PK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'staff_sessions' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.staff_sessions ADD PRIMARY KEY (staff_id);
  END IF;
END $$;

-- Enable RLS on staff_sessions
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public access on staff_sessions so presence and session queries never fail RLS
DROP POLICY IF EXISTS "Allow public all on staff_sessions" ON public.staff_sessions;
CREATE POLICY "Allow public all on staff_sessions" ON public.staff_sessions FOR ALL USING (true) WITH CHECK (true);

-- 4. Relax status check constraints if any exist
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

-- 4. Helpful CRM Indexes
CREATE INDEX IF NOT EXISTS idx_inquiries_lead_id ON public.inquiries(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_lead_id ON public.leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_staff ON public.inquiries(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_staff ON public.leads(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_reminder_at ON public.inquiries(reminder_at);
CREATE INDEX IF NOT EXISTS idx_leads_reminder_at ON public.leads(reminder_at);

-- 5. Optional RPC Helper for automated schema synchronization
CREATE OR REPLACE FUNCTION public.sync_schema()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Re-applies all missing columns idempotently
  ALTER TABLE IF EXISTS public.leads
    ADD COLUMN IF NOT EXISTS check_in_date DATE,
    ADD COLUMN IF NOT EXISTS check_out_date DATE,
    ADD COLUMN IF NOT EXISTS guests INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS travelers INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS total_travelers INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS plan TEXT,
    ADD COLUMN IF NOT EXISTS package_name TEXT,
    ADD COLUMN IF NOT EXISTS accommodation_tier TEXT,
    ADD COLUMN IF NOT EXISTS accommodation_preference TEXT,
    ADD COLUMN IF NOT EXISTS hotel_tier TEXT,
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS tour_start_date DATE,
    ADD COLUMN IF NOT EXISTS end_date DATE,
    ADD COLUMN IF NOT EXISTS tour_end_date DATE,
    ADD COLUMN IF NOT EXISTS duration_days INTEGER,
    ADD COLUMN IF NOT EXISTS budget TEXT,
    ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reminder_note TEXT,
    ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

  ALTER TABLE IF EXISTS public.inquiries
    ADD COLUMN IF NOT EXISTS check_in_date DATE,
    ADD COLUMN IF NOT EXISTS check_out_date DATE,
    ADD COLUMN IF NOT EXISTS guests INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS travelers INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS total_travelers INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS plan TEXT,
    ADD COLUMN IF NOT EXISTS package_name TEXT,
    ADD COLUMN IF NOT EXISTS accommodation_tier TEXT,
    ADD COLUMN IF NOT EXISTS accommodation_preference TEXT,
    ADD COLUMN IF NOT EXISTS hotel_tier TEXT,
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS tour_start_date DATE,
    ADD COLUMN IF NOT EXISTS end_date DATE,
    ADD COLUMN IF NOT EXISTS tour_end_date DATE,
    ADD COLUMN IF NOT EXISTS duration_days INTEGER,
    ADD COLUMN IF NOT EXISTS budget TEXT,
    ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reminder_note TEXT,
    ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

  -- Ensure staff_sessions table and RLS policy
  CREATE TABLE IF NOT EXISTS public.staff_sessions (
    id UUID DEFAULT gen_random_uuid(),
    staff_id TEXT PRIMARY KEY,
    last_active TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT,
    device TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Allow public all on staff_sessions" ON public.staff_sessions;
  CREATE POLICY "Allow public all on staff_sessions" ON public.staff_sessions FOR ALL USING (true) WITH CHECK (true);

  NOTIFY pgrst, 'reload schema';
  RETURN true;
END;
$$;

-- 7. Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
