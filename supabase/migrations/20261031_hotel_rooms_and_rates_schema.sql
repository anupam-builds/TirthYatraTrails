-- ==============================================================================
-- Migration: Hotel Rooms and Rate Plans Schema (Supabase)
-- Full CRUD & Realtime capabilities for hotel rooms and 4-tier meal plan rates
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create hotel_rooms table
CREATE TABLE IF NOT EXISTS public.hotel_rooms (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id TEXT,
  hotel_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  bed_configuration TEXT DEFAULT '1 King Bed',
  max_occupancy TEXT DEFAULT '2 Adults + 1 Child',
  price_per_night NUMERIC(10, 2) DEFAULT 4200.00,
  meal_option TEXT DEFAULT 'Bed & Breakfast',
  cancellation_policy TEXT DEFAULT 'Free cancellation up to 48 hrs before check-in',
  image_url TEXT DEFAULT '',
  ep_price NUMERIC(10, 2) DEFAULT 4200.00,
  bb_price NUMERIC(10, 2) DEFAULT 5000.00,
  map_price NUMERIC(10, 2) DEFAULT 5800.00,
  ap_price NUMERIC(10, 2) DEFAULT 6600.00,
  is_available BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS price_per_night NUMERIC(10, 2) DEFAULT 4200.00;
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS meal_option TEXT DEFAULT 'Bed & Breakfast';
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'Free cancellation up to 48 hrs before check-in';
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS bed_configuration TEXT DEFAULT '1 King Bed';
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS max_occupancy TEXT DEFAULT '2 Adults + 1 Child';
ALTER TABLE public.hotel_rooms ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- Ensure indexes for rapid lookups and realtime filtering by hotel
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_hotel_id ON public.hotel_rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_display_order ON public.hotel_rooms(hotel_id, display_order);

-- 2. Ensure hotels table has a rooms JSONB column for dual synchronization
ALTER TABLE IF EXISTS public.hotels ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]'::jsonb;

-- 3. Enable Row Level Security
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS Policies allowing read access for all and full CRUD for authenticated/anon staff
DROP POLICY IF EXISTS "Public read access on hotel_rooms" ON public.hotel_rooms;
CREATE POLICY "Public read access on hotel_rooms"
  ON public.hotel_rooms FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Staff and admin full access on hotel_rooms" ON public.hotel_rooms;
CREATE POLICY "Staff and admin full access on hotel_rooms"
  ON public.hotel_rooms FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_hotel_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hotel_rooms_updated_at ON public.hotel_rooms;
CREATE TRIGGER trigger_hotel_rooms_updated_at
  BEFORE UPDATE ON public.hotel_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_hotel_rooms_updated_at();

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
