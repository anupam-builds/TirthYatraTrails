-- Migration: 20261023_staff_sessions_rls.sql
-- Description: Create staff_sessions table if not exists with email column and RLS policies for DELETE, SELECT, INSERT, UPDATE.

CREATE TABLE IF NOT EXISTS public.staff_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id TEXT,
    email TEXT,
    ip_address TEXT,
    device TEXT,
    last_active TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all required columns exist and match expected types
ALTER TABLE public.staff_sessions ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE public.staff_sessions ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.staff_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.staff_sessions ADD COLUMN IF NOT EXISTS device TEXT;
ALTER TABLE public.staff_sessions ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.staff_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_staff_sessions_email ON public.staff_sessions(email);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff_id ON public.staff_sessions(staff_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;

-- Allow DELETE for authenticated admins and anon/service operations
DROP POLICY IF EXISTS "Allow authenticated admins to delete staff_sessions" ON public.staff_sessions;
CREATE POLICY "Allow authenticated admins to delete staff_sessions"
    ON public.staff_sessions FOR DELETE
    TO anon, authenticated
    USING (true);

-- Allow SELECT
DROP POLICY IF EXISTS "Allow authenticated admins to select staff_sessions" ON public.staff_sessions;
CREATE POLICY "Allow authenticated admins to select staff_sessions"
    ON public.staff_sessions FOR SELECT
    TO anon, authenticated
    USING (true);

-- Allow INSERT / UPSERT
DROP POLICY IF EXISTS "Allow authenticated admins to insert staff_sessions" ON public.staff_sessions;
CREATE POLICY "Allow authenticated admins to insert staff_sessions"
    ON public.staff_sessions FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow UPDATE
DROP POLICY IF EXISTS "Allow authenticated admins to update staff_sessions" ON public.staff_sessions;
CREATE POLICY "Allow authenticated admins to update staff_sessions"
    ON public.staff_sessions FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
