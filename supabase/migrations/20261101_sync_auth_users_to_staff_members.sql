-- ==============================================================================
-- DATABASE TRIGGER & SCHEMA MIGRATION: AUTH.USERS -> PUBLIC.STAFF_MEMBERS SYNC
-- ==============================================================================
-- Automatically synchronizes new Supabase Auth users to public.staff_members.
-- Ensures all required columns exist: id (matching auth uuid), email, display_name,
-- role, status ('active'/'blocked'), and permissions.

-- 1. Ensure public.staff_members table exists with all required columns
CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'STAFF',
  designation TEXT DEFAULT 'Pilgrim Operations Specialist',
  phone TEXT,
  password TEXT,
  status TEXT DEFAULT 'active',
  is_active BOOLEAN DEFAULT TRUE,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  permissions JSONB DEFAULT '{"canViewInquiries": true, "canUpdateStatus": true, "canAddNotes": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Idempotently ensure all columns exist
ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'STAFF',
  ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Pilgrim Operations Specialist',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"canViewInquiries": true, "canUpdateStatus": true, "canAddNotes": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Enable Row Level Security and grant access
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access on staff_members" ON public.staff_members;
CREATE POLICY "Allow all access on staff_members" 
  ON public.staff_members FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- 3. Trigger Function: Sync auth.users to public.staff_members
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_sync()
RETURNS trigger AS $$
DECLARE
  v_name TEXT;
  v_role TEXT;
BEGIN
  -- Extract name and role from raw_user_meta_data safely
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    CASE WHEN NEW.raw_user_meta_data->>'is_admin' = 'true' THEN 'ADMIN' ELSE 'STAFF' END
  );

  -- Upsert into public.staff_members
  INSERT INTO public.staff_members (
    id,
    email,
    name,
    display_name,
    role,
    status,
    is_active,
    is_blocked,
    permissions,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    v_name,
    v_name,
    v_role,
    'active',
    true,
    false,
    '{"canViewInquiries": true, "canUpdateStatus": true, "canAddNotes": true}'::jsonb,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    display_name = COALESCE(EXCLUDED.display_name, staff_members.display_name),
    name = COALESCE(EXCLUDED.name, staff_members.name),
    role = COALESCE(EXCLUDED.role, staff_members.role),
    status = 'active',
    is_active = true,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on auth.users (wrapped safely)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_created_sync_staff ON auth.users;
    CREATE TRIGGER on_auth_user_created_sync_staff
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_sync();
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not bind trigger on auth.users: %', SQLERRM;
END $$;

-- 5. Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
