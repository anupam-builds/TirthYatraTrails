-- ==============================================================================
-- Migration: 20260924_admin_allowlist_pgrst205.sql
-- Description: Creates the public.admin_allowlist table to resolve PGRST205,
--              seeds root admin anupamsaxena.dev@gmail.com, configures RLS,
--              and notifies PostgREST to reload schema cache.
-- ==============================================================================

-- 1. Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create public.admin_allowlist table
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Super Admin',
    status TEXT NOT NULL DEFAULT 'Active & Authorized',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_admin_allowlist_email ON public.admin_allowlist(email);

-- 4. Seed Root Administrator (anupamsaxena.dev@gmail.com)
INSERT INTO public.admin_allowlist (id, email, role, status, created_at)
VALUES (
    'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
    'anupamsaxena.dev@gmail.com',
    'Super Admin',
    'Active & Authorized',
    '2026-01-01T00:00:00.000Z'
)
ON CONFLICT (email) DO UPDATE SET
    role = 'Super Admin',
    status = 'Active & Authorized';

-- 5. Seed Enterprise Operations Admin
INSERT INTO public.admin_allowlist (id, email, role, status, created_at)
VALUES (
    'c56a4180-65aa-42ec-a945-5fd21dec0538',
    'admin@tirthyatratrails.com',
    'Admin (Enterprise Operations)',
    'Active & Authorized',
    '2026-02-15T00:00:00.000Z'
)
ON CONFLICT (email) DO NOTHING;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Public read access for admin allowlist" ON public.admin_allowlist;
CREATE POLICY "Public read access for admin allowlist"
    ON public.admin_allowlist
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated write access for admin allowlist" ON public.admin_allowlist;
CREATE POLICY "Authenticated write access for admin allowlist"
    ON public.admin_allowlist
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 8. Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
