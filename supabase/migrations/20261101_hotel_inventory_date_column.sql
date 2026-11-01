-- Migration: Add date column to hotel_inventory and reload PostgREST schema cache
-- Resolves PostgREST 400 error: "column hotel_inventory.date does not exist"

-- 1. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure hotel_inventory table exists
CREATE TABLE IF NOT EXISTS public.hotel_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id UUID NOT NULL,
    room_type TEXT DEFAULT 'Deluxe Room',
    allocation_count INTEGER DEFAULT 10,
    price NUMERIC DEFAULT 3500,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Ensure 'date' column exists with type DATE and default CURRENT_DATE
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- 4. Ensure other standard inventory columns exist
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS room_id TEXT;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS room_type TEXT DEFAULT 'Deluxe Room';
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS allocation_count INTEGER DEFAULT 10;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 3500;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS total_inventory INTEGER DEFAULT 10;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS booked_count INTEGER DEFAULT 0;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS blocked_count INTEGER DEFAULT 0;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS available_count INTEGER DEFAULT 10;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS base_rate NUMERIC(10, 2) DEFAULT 3500.00;
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS price_override NUMERIC(10, 2);
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'AVAILABLE';
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT 'Admin';
ALTER TABLE public.hotel_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 5. Row Level Security policies
ALTER TABLE public.hotel_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all public/authenticated access on hotel_inventory" ON public.hotel_inventory;
CREATE POLICY "Allow all public/authenticated access on hotel_inventory" 
    ON public.hotel_inventory FOR ALL 
    TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- 6. Crucial: Reload PostgREST schema cache so the column is immediately recognized
NOTIFY pgrst, 'reload schema';
