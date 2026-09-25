-- ==============================================================================
-- Migration: 20260925_admin_allowlist_status_column.sql
-- Description: Ensures public.admin_allowlist table columns are safely aligned,
--              adding status and created_at if missing, and refreshing schema.
-- ==============================================================================

-- 1. Ensure status column exists with appropriate default if not already present
ALTER TABLE IF EXISTS public.admin_allowlist
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active & Authorized';

-- 2. Ensure created_at column exists with appropriate default if not already present
ALTER TABLE IF EXISTS public.admin_allowlist
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
