-- ==============================================================================
-- DATABASE SCHEMA FIX: ADD PERMISSIONS COLUMN TO PUBLIC.STAFF_MEMBERS
-- ==============================================================================

-- 1. Ensure permissions column exists as JSONB (supports both permission arrays and permission objects)
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '["canViewInquiries", "canUpdateStatus", "canAddNotes"]'::jsonb;

-- 2. Also ensure standard schema columns are in place
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Pilgrim Operations Specialist';
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 3. Backfill default permissions for existing staff members where permissions is null or empty
UPDATE public.staff_members
SET permissions = '["canViewInquiries", "canUpdateStatus", "canAddNotes"]'::jsonb
WHERE permissions IS NULL OR permissions = '[]'::jsonb OR permissions = '{}'::jsonb;

-- 4. Update automated sync trigger to populate permissions on new auth users
CREATE OR REPLACE FUNCTION public.handle_new_staff_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_members (id, email, display_name, role, status, permissions)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    'active',
    '["canViewInquiries", "canUpdateStatus", "canAddNotes"]'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.staff_members.display_name),
    permissions = COALESCE(public.staff_members.permissions, EXCLUDED.permissions);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_staff ON auth.users;
CREATE TRIGGER on_auth_user_created_staff
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_staff_member();

-- 5. Refresh PostgREST API Schema Cache immediately
NOTIFY pgrst, 'reload schema';
