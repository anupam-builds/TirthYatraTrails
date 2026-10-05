-- Migration: Ensure leads and inquiries support CANCELLED and POSTPONED statuses without constraint violations
-- Date: 2026-10-05

DO $$ 
BEGIN
  -- 1. Drop check constraint on inquiries if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'inquiries' AND constraint_name = 'inquiries_status_check'
  ) THEN
    ALTER TABLE public.inquiries DROP CONSTRAINT inquiries_status_check;
  END IF;

  -- 2. Drop check constraint on leads if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'leads' AND constraint_name = 'leads_status_check'
  ) THEN
    ALTER TABLE public.leads DROP CONSTRAINT leads_status_check;
  END IF;

  -- 3. If status column is an enum type, add the new values safely
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'inquiry_status'
  ) THEN
    BEGIN
      ALTER TYPE public.inquiry_status ADD VALUE IF NOT EXISTS 'CANCELLED';
      ALTER TYPE public.inquiry_status ADD VALUE IF NOT EXISTS 'Cancelled';
      ALTER TYPE public.inquiry_status ADD VALUE IF NOT EXISTS 'POSTPONED';
      ALTER TYPE public.inquiry_status ADD VALUE IF NOT EXISTS 'Postponed';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'lead_status'
  ) THEN
    BEGIN
      ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'CANCELLED';
      ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Cancelled';
      ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'POSTPONED';
      ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Postponed';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END;
  END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
