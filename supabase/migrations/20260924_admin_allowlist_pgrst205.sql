-- ==============================================================================
-- Migration: 20260924_admin_allowlist_pgrst205.sql
-- Description: Creates public.admin_allowlist, public.agency_settings, and
--              public.sacred_cities tables to resolve PGRST205 / 404 errors,
--              seeds root admin anupamsaxena.dev@gmail.com, configures RLS,
--              and notifies PostgREST to reload schema cache.
-- ==============================================================================

-- 1. Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create public.admin_allowlist table
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Super Admin',
    status TEXT NOT NULL DEFAULT 'Active & Authorized',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_admin_allowlist_email ON public.admin_allowlist(email);

-- 4. Seed Root Administrator (anupamsaxena.dev@gmail.com)
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

-- 5. Seed Enterprise Operations Admin
INSERT INTO public.admin_allowlist (id, email, role, status, created_at)
VALUES (
    'c56a4180-65aa-42ec-a945-5fd21dec0538',
    'admin@tirthyatratrails.com',
    'Admin (Enterprise Operations)',
    'Active & Authorized',
    '2026-02-15T00:00:00.000Z'
)
ON CONFLICT (email) DO NOTHING;

-- 6. Enable Row Level Security (RLS) for admin_allowlist
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for admin allowlist" ON public.admin_allowlist;
CREATE POLICY "Public read access for admin allowlist"
    ON public.admin_allowlist
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated write access for admin allowlist" ON public.admin_allowlist;
CREATE POLICY "Authenticated write access for admin allowlist"
    ON public.admin_allowlist
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 7. Create public.agency_settings table
CREATE TABLE IF NOT EXISTS public.agency_settings (
    id TEXT PRIMARY KEY DEFAULT 'agency-settings-default',
    contact_phone TEXT NOT NULL DEFAULT '+91 98765 43210',
    emergency_phone TEXT NOT NULL DEFAULT '+91 98765 43211',
    support_email TEXT NOT NULL DEFAULT 'support@tirthyatratrails.com',
    whatsapp_helpline TEXT NOT NULL DEFAULT '+91 98765 43210',
    desk_name TEXT NOT NULL DEFAULT 'TirthYatraTrails Central Travel Desk',
    email TEXT NOT NULL DEFAULT 'support@tirthyatratrails.com',
    phone TEXT NOT NULL DEFAULT '+91 98765 43210',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed initial agency settings row
INSERT INTO public.agency_settings (id, contact_phone, emergency_phone, support_email, whatsapp_helpline, desk_name, email, phone)
VALUES (
    'agency-settings-default',
    '+91 98765 43210',
    '+91 98765 43211',
    'support@tirthyatratrails.com',
    '+91 98765 43210',
    'TirthYatraTrails Central Travel Desk',
    'support@tirthyatratrails.com',
    '+91 98765 43210'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for agency_settings" ON public.agency_settings;
CREATE POLICY "Public read access for agency_settings"
    ON public.agency_settings
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Write access for agency_settings" ON public.agency_settings;
CREATE POLICY "Write access for agency_settings"
    ON public.agency_settings
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 8. Create public.sacred_cities view / table alias
CREATE TABLE IF NOT EXISTS public.sacred_cities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT,
    popular_for TEXT,
    image_url TEXT,
    hotel_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.sacred_cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for sacred_cities" ON public.sacred_cities;
CREATE POLICY "Public read access for sacred_cities"
    ON public.sacred_cities
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 9. Ensure public.hotels columns and full RLS write/read policies for anon and authenticated users
CREATE TABLE IF NOT EXISTS public.hotels (
    id TEXT PRIMARY KEY,
    city_id TEXT,
    city_name TEXT,
    name TEXT NOT NULL,
    star_rating NUMERIC DEFAULT 4,
    google_rating NUMERIC(3, 2) DEFAULT 4.5,
    review_count INTEGER DEFAULT 0,
    address TEXT,
    description TEXT,
    images JSONB DEFAULT '[]'::JSONB,
    amenities JSONB DEFAULT '[]'::JSONB,
    base_price NUMERIC DEFAULT 3500,
    price_per_night NUMERIC DEFAULT 3500,
    rating NUMERIC DEFAULT 4.5,
    image TEXT,
    image_url TEXT,
    featured BOOLEAN DEFAULT FALSE,
    is_top_rated BOOLEAN DEFAULT FALSE,
    distance_to_temple TEXT,
    distance_from_temple TEXT,
    darshan_type TEXT,
    rooms JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all optional columns exist
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS is_top_rated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS price_per_night NUMERIC;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS distance_to_temple TEXT;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS distance_from_temple TEXT;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS darshan_type TEXT;

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for hotels" ON public.hotels;
CREATE POLICY "Public read access for hotels"
    ON public.hotels
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Full write access for hotels" ON public.hotels;
CREATE POLICY "Full write access for hotels"
    ON public.hotels
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 10. Guarantee public.hotel_inventory table & RLS policies
CREATE TABLE IF NOT EXISTS public.hotel_inventory (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    room_id TEXT,
    room_type TEXT NOT NULL DEFAULT 'Deluxe Room',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_inventory INTEGER NOT NULL DEFAULT 10 CHECK (total_inventory >= 0),
    booked_count INTEGER NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
    blocked_count INTEGER NOT NULL DEFAULT 0 CHECK (blocked_count >= 0),
    available_count INTEGER NOT NULL DEFAULT 10,
    base_rate NUMERIC(10, 2) NOT NULL DEFAULT 3500.00,
    price_override NUMERIC(10, 2),
    status TEXT DEFAULT 'AVAILABLE',
    updated_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hotel_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for hotel_inventory" ON public.hotel_inventory;
CREATE POLICY "Public read access for hotel_inventory"
    ON public.hotel_inventory
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Full write access for hotel_inventory" ON public.hotel_inventory;
CREATE POLICY "Full write access for hotel_inventory"
    ON public.hotel_inventory
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 11. Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
