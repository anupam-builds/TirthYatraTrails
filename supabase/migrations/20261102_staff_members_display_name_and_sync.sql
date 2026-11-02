-- ==============================================================================
-- DATABASE SCHEMA & STAFF SYNC FIX: PUBLIC.STAFF_MEMBERS DISPLAY_NAME & AUTH SYNC
-- ==============================================================================

-- 1. Ensure standard columns exist on public.staff_members
CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  display_name TEXT,
  role TEXT DEFAULT 'staff',
  status TEXT DEFAULT 'active'
);

ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Pilgrim Operations Specialist';
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"canViewInquiries": true, "canUpdateStatus": true, "canAddNotes": true}'::jsonb;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure primary key on id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'staff_members' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.staff_members ADD PRIMARY KEY (id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Enable Row Level Security and configure open access policy
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access on staff_members" ON public.staff_members;
CREATE POLICY "Allow all access on staff_members" 
  ON public.staff_members FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- 2. Safe Backfill Migration Script: Pull existing users from auth.users into public.staff_members
INSERT INTO public.staff_members (id, email, display_name, role, status)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'role', 'staff'),
  'active'
FROM auth.users
WHERE id::text NOT IN (SELECT id::text FROM public.staff_members WHERE id IS NOT NULL)
ON CONFLICT (id) DO UPDATE SET
  display_name = COALESCE(EXCLUDED.display_name, public.staff_members.display_name),
  email = COALESCE(EXCLUDED.email, public.staff_members.email),
  role = COALESCE(EXCLUDED.role, public.staff_members.role),
  status = 'active';

-- 3. Automated Database Trigger for Future Staff
CREATE OR REPLACE FUNCTION public.handle_new_staff_member()
RETURNS TRIGGER AS $$ 
BEGIN 
  INSERT INTO public.staff_members (id, email, display_name, role, status) 
  VALUES ( 
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'), 
    'active' 
  ) 
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.staff_members.display_name),
    email = COALESCE(EXCLUDED.email, public.staff_members.email),
    role = COALESCE(EXCLUDED.role, public.staff_members.role),
    status = 'active';
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger on auth.users (if permissions allow)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_created_staff ON auth.users;
    CREATE TRIGGER on_auth_user_created_staff
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_staff_member();
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Trigger creation on auth.users notice: %', SQLERRM;
END $$;

-- 4. Refresh PostgREST API Schema Cache
NOTIFY pgrst, 'reload schema';
