-- Migration: 20260923_root_admin_atharv.sql
-- Description: Provision & Update Root Admin credentials for anupamsaxena.dev@gmail.com
-- Sets password to '@Atharv_1996' and asserts Super Admin role in admin_allowlist

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Ensure admin_allowlist table exists
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'Super Admin',
  status text DEFAULT 'Active & Authorized',
  created_at timestamptz DEFAULT now()
);

-- 2. Upsert Root Administrator into admin_allowlist
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

-- 3. Upsert secondary admin
INSERT INTO public.admin_allowlist (id, email, role, status, created_at)
VALUES (
  'c56a4180-65aa-42ec-a945-5fd21dec0538',
  'admin@tirthyatratrails.com',
  'Admin (Enterprise Operations)',
  'Active & Authorized',
  '2026-02-15T00:00:00.000Z'
)
ON CONFLICT (email) DO UPDATE SET
  role = 'Admin (Enterprise Operations)',
  status = 'Active & Authorized';

-- 4. Set/Update password in Supabase Auth if auth.users is accessible
DO $$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
BEGIN
  -- Hash '@Atharv_1996' with blowfish
  v_encrypted_password := crypt('@Atharv_1996', gen_salt('bf', 10));

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'anupamsaxena.dev@gmail.com';

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET 
      encrypted_password = v_encrypted_password,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"provider": "email", "providers": ["email"], "role": "ADMIN"}'::jsonb,
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"name": "Anupam Saxena (Root Admin)"}'::jsonb,
      updated_at = now()
    WHERE id = v_user_id;
  ELSE
    -- If user doesn't exist in auth.users, create new entry
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
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
      'authenticated',
      'authenticated',
      'anupamsaxena.dev@gmail.com',
      v_encrypted_password,
      now(),
      '{"provider": "email", "providers": ["email"], "role": "ADMIN"}'::jsonb,
      '{"name": "Anupam Saxena (Root Admin)"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'auth.users update skipped or restricted: %', SQLERRM;
END $$;
