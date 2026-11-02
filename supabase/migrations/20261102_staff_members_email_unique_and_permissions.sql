-- ==============================================================================
-- DATABASE SCHEMA FIX: UNIQUE EMAIL CONSTRAINT & PERMISSIONS SCHEMA CACHE
-- ==============================================================================

-- 1. Ensure permissions column exists as JSONB
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- 2. Ensure standard columns exist on public.staff_members
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Ensure email column has a UNIQUE constraint for on_conflict=email upserts
ALTER TABLE public.staff_members DROP CONSTRAINT IF EXISTS staff_members_email_key;
ALTER TABLE public.staff_members ADD CONSTRAINT staff_members_email_key UNIQUE (email);

-- 4. Backfill default permissions for existing staff members where permissions is null or empty
UPDATE public.staff_members
SET permissions = '["canViewInquiries", "canUpdateStatus", "canAddNotes"]'::jsonb
WHERE permissions IS NULL OR permissions = '[]'::jsonb OR permissions = '{}'::jsonb;

-- 5. Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
