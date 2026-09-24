-- Migration: Create hotel_inventory table and reload PostgREST schema cache
-- Fixes PGRST205 / 404 errors during upserts, updates and queries

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.hotel_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
    rooms_count INTEGER DEFAULT 0,
    allocation_status TEXT DEFAULT 'Available',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Additional flexible columns supporting live room inventory grid and rate overrides
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS room_id TEXT;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS room_type TEXT DEFAULT 'Deluxe Room';
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS total_inventory INTEGER DEFAULT 10;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS booked_count INTEGER DEFAULT 0;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS blocked_count INTEGER DEFAULT 0;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS available_count INTEGER DEFAULT 10;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS base_rate NUMERIC(10, 2) DEFAULT 3500.00;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS price_override NUMERIC(10, 2);
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'AVAILABLE';
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT 'Admin';
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.hotel_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all public/authenticated access on hotel_inventory" ON public.hotel_inventory;
CREATE POLICY "Allow all public/authenticated access on hotel_inventory" 
    ON public.hotel_inventory FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
