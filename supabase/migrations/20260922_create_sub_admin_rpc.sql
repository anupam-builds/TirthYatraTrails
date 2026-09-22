-- ==============================================================================
-- TirthYatraTrails: Secure Multi-Admin Provisioning via Supabase Admin RPC
-- Date: 2026-09-22
-- Target Function: public.create_sub_admin(target_email text, target_password text)
-- Security: Gated server-side so only root admin 'anupamsaxena.dev@gmail.com' can provision
-- ==============================================================================

-- Enable pgcrypto extension if not already available
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Function: create_sub_admin
CREATE OR REPLACE FUNCTION public.create_sub_admin(
  target_email text,
  target_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_email text;
  v_user_id uuid;
  v_encrypted_password text;
  v_existing_id uuid;
  v_result jsonb;
BEGIN
  -- 1. Strict Server-Side Assertion: Extract caller email from auth.jwt()
  v_caller_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  -- Enforce that only primary root admin can provision new administrators
  IF v_caller_email <> 'anupamsaxena.dev@gmail.com' THEN
    RAISE EXCEPTION 'Only root admin anupamsaxena.dev@gmail.com can provision new administrators'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Input validation and sanitization
  target_email := lower(trim(target_email));
  IF target_email IS NULL OR target_email = '' OR position('@' in target_email) = 0 THEN
    RAISE EXCEPTION 'Invalid target email address.'
      USING ERRCODE = '22023';
  END IF;

  IF target_password IS NULL OR length(trim(target_password)) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters.'
      USING ERRCODE = '22023';
  END IF;

  -- 3. Check for existing record in auth.users
  SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = target_email;

  -- Securely hash password with blowfish
  v_encrypted_password := crypt(target_password, gen_salt('bf', 10));

  IF v_existing_id IS NOT NULL THEN
    -- Update existing user with ADMIN role and new credentials
    UPDATE auth.users
    SET 
      encrypted_password = v_encrypted_password,
      raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"provider": "email", "providers": ["email"], "role": "ADMIN"}'::jsonb,
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'name', split_part(target_email, '@', 1),
        'role', 'ADMIN',
        'is_sub_admin', true,
        'provisioned_by', v_caller_email,
        'provisioned_at', now()
      ),
      updated_at = now()
    WHERE id = v_existing_id;

    v_user_id := v_existing_id;
  ELSE
    -- Insert new administrator into auth.users
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      target_email,
      v_encrypted_password,
      now(),
      '{"provider": "email", "providers": ["email"], "role": "ADMIN"}'::jsonb,
      jsonb_build_object(
        'name', split_part(target_email, '@', 1),
        'role', 'ADMIN',
        'is_sub_admin', true,
        'provisioned_by', v_caller_email,
        'provisioned_at', now()
      ),
      now(),
      now()
    );
  END IF;

  -- 4. Sync to public.users if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    INSERT INTO public.users (id, email, name, role, created_at, updated_at)
    VALUES (
      v_user_id::text,
      target_email,
      split_part(target_email, '@', 1),
      'ADMIN',
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'ADMIN', updated_at = now();
  END IF;

  -- 5. Sync to public.profiles if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    INSERT INTO public.profiles (id, email, full_name, role, is_admin, updated_at)
    VALUES (
      v_user_id::text,
      target_email,
      split_part(target_email, '@', 1),
      'ADMIN',
      true,
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'ADMIN', is_admin = true, updated_at = now();
  END IF;

  -- 6. Sync to public.staff_members as an Administrator
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_members') THEN
    INSERT INTO public.staff_members (
      id,
      name,
      email,
      role,
      designation,
      is_active,
      is_blocked,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id::text,
      split_part(target_email, '@', 1),
      target_email,
      'ADMIN',
      'Secondary Administrator',
      true,
      false,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'ADMIN', designation = 'Secondary Administrator', is_active = true, is_blocked = false, updated_at = now();
  END IF;

  -- Construct and return successful result payload
  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', target_email,
    'role', 'ADMIN',
    'provisioned_by', v_caller_email,
    'created_at', now(),
    'message', 'Sub-admin successfully provisioned with full administrator access.'
  );

  RETURN v_result;
END;
$$;

-- Grant execution permissions
REVOKE ALL ON FUNCTION public.create_sub_admin(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sub_admin(text, text) TO authenticated, service_role, anon;
