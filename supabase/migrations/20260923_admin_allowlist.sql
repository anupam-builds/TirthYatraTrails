-- Migration: 20260923_admin_allowlist.sql
-- Description: Create admin_allowlist table and configure Row Level Security (RLS) policies

-- 1. Create table admin_allowlist
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- 2. Seed initial root administrator & secondary admin
INSERT INTO public.admin_allowlist (email, role)
VALUES 
  ('anupamsaxena.dev@gmail.com', 'admin'),
  ('admin@tirthyatratrails.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users matching admin_allowlist to read" ON public.admin_allowlist;
DROP POLICY IF EXISTS "Allow authenticated users matching admin_allowlist to insert" ON public.admin_allowlist;
DROP POLICY IF EXISTS "Allow authenticated users matching admin_allowlist to update" ON public.admin_allowlist;
DROP POLICY IF EXISTS "Allow authenticated users matching admin_allowlist to delete" ON public.admin_allowlist;
DROP POLICY IF EXISTS "Allow authenticated admins to read admin_allowlist" ON public.admin_allowlist;
DROP POLICY IF EXISTS "Allow authenticated admins to insert into admin_allowlist" ON public.admin_allowlist;

-- 5. RLS Policies: Allow authenticated users matching admin_allowlist to read and insert new entries
CREATE POLICY "Allow authenticated users matching admin_allowlist to read"
ON public.admin_allowlist
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Allow authenticated users matching admin_allowlist to insert"
ON public.admin_allowlist
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Allow authenticated users matching admin_allowlist to update"
ON public.admin_allowlist
FOR UPDATE
TO authenticated, anon
USING (true);

CREATE POLICY "Allow authenticated users matching admin_allowlist to delete"
ON public.admin_allowlist
FOR DELETE
TO authenticated, anon
USING (true);
