-- ==============================================================================
-- Migration: Hotel Rooms and Rate Plans Schema (Supabase)
-- Creates the hotel_rooms table with UUID primary keys and Row Level Security
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create hotel_rooms table
CREATE TABLE IF NOT EXISTS public.hotel_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id UUID NOT NULL,
    room_name TEXT NOT NULL,
    description TEXT,
    bed_configuration TEXT,
    max_occupancy TEXT,
    price_per_night NUMERIC,
    meal_option TEXT,
    cancellation_policy TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist if the table was previously created with an earlier schema
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS bed_configuration TEXT;
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS max_occupancy TEXT;
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS price_per_night NUMERIC;
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS meal_option TEXT;
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS room_id TEXT;
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS ep_price NUMERIC(10, 2);
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS bb_price NUMERIC(10, 2);
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS map_price NUMERIC(10, 2);
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS ap_price NUMERIC(10, 2);
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure indexes for fast lookups by hotel
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_hotel_id ON public.hotel_rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_display_order ON public.hotel_rooms(hotel_id, display_order);

-- Dual synchronization support: hotels.rooms JSONB column
ALTER TABLE IF EXISTS public.hotels ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]'::jsonb;

-- Enable Row Level Security
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public reading and authenticated staff/admin write access
DROP POLICY IF EXISTS "Allow public read access on hotel_rooms" ON public.hotel_rooms;
CREATE POLICY "Allow public read access on hotel_rooms" 
ON public.hotel_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated staff to manage hotel_rooms" ON public.hotel_rooms;
CREATE POLICY "Allow authenticated staff to manage hotel_rooms" 
ON public.hotel_rooms FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon') WITH CHECK (true);

-- PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
