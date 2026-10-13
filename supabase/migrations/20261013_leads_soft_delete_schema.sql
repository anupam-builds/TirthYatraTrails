-- Migration: Add soft delete columns to leads and inquiries tables
-- Allows tracking trash status: is_deleted BOOLEAN, deleted_at TIMESTAMPTZ, deleted_by TEXT
-- Date: 2026-10-13

-- 1. Ensure soft-delete columns exist on public.leads
ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- 2. Ensure soft-delete columns exist on public.inquiries
ALTER TABLE IF EXISTS public.inquiries
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- 3. Create performance indexes for filtering active vs trash leads
CREATE INDEX IF NOT EXISTS idx_leads_is_deleted ON public.leads(is_deleted);
CREATE INDEX IF NOT EXISTS idx_inquiries_is_deleted ON public.inquiries(is_deleted);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
