-- ==============================================================================
-- TirthYatraTrails.in: Supabase Realtime Content Sync Migration
-- Modules: Yatra Packages, Cities & Transit Hubs, Hotels & Inventory, Travel Stories
-- Date: 2026-09-18
-- ==============================================================================

-- 1. Helper function for automated updated_at timestamp triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. CITIES (Sacred Destination Masters)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT DEFAULT 'India',
  image_url TEXT,
  hotel_count INTEGER DEFAULT 0,
  popular_for TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_cities_updated_at ON public.cities;
CREATE TRIGGER trigger_cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. TRANSIT HUBS (Airports, Railway Stations, Bus Terminals, Helipads)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hubs (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hub_type TEXT NOT NULL CHECK (hub_type IN ('AIRPORT', 'RAILWAY_STATION', 'BUS_TERMINAL', 'HELIPAD')),
  code TEXT, -- e.g. "AYJ", "VNS", "DED"
  distance_to_temple_km NUMERIC(6, 2),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hubs_city_id ON public.hubs(city_id);

DROP TRIGGER IF EXISTS trigger_hubs_updated_at ON public.hubs;
CREATE TRIGGER trigger_hubs_updated_at
  BEFORE UPDATE ON public.hubs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 4. HOTELS (Sacred Accommodations & Stays)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotels (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  city_name TEXT,
  name TEXT NOT NULL,
  star_rating INTEGER DEFAULT 3,
  google_rating NUMERIC(3, 2) DEFAULT 4.5,
  review_count INTEGER DEFAULT 0,
  address TEXT,
  description TEXT,
  images JSONB DEFAULT '[]'::JSONB,
  amenities JSONB DEFAULT '[]'::JSONB,
  base_price INTEGER DEFAULT 0,
  is_top_rated BOOLEAN DEFAULT FALSE,
  distance_to_temple TEXT,
  darshan_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotels_city_id ON public.hotels(city_id);

DROP TRIGGER IF EXISTS trigger_hotels_updated_at ON public.hotels;
CREATE TRIGGER trigger_hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. HOTEL INVENTORY (Daily Allocations, Blocks, and Rates per Room Type)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotel_inventory (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id TEXT,
  room_type TEXT NOT NULL,
  date DATE NOT NULL,
  total_inventory INTEGER NOT NULL DEFAULT 10 CHECK (total_inventory >= 0),
  booked_count INTEGER NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
  blocked_count INTEGER NOT NULL DEFAULT 0 CHECK (blocked_count >= 0),
  available_count INTEGER NOT NULL DEFAULT 10 CHECK (available_count >= 0),
  price_override INTEGER,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'FAST_FILLING', 'SOLD_OUT', 'BLOCKED')),
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hotel_inventory_date_room UNIQUE (hotel_id, room_type, date)
);

CREATE INDEX IF NOT EXISTS idx_hotel_inventory_hotel_date ON public.hotel_inventory(hotel_id, date);

-- Automated available_count calculation trigger
CREATE OR REPLACE FUNCTION public.handle_hotel_inventory_math()
RETURNS TRIGGER AS $$
BEGIN
  NEW.available_count = GREATEST(0, NEW.total_inventory - NEW.booked_count - NEW.blocked_count);
  IF NEW.available_count = 0 THEN
    NEW.status = 'SOLD_OUT';
  ELSIF NEW.status != 'BLOCKED' AND NEW.available_count <= 2 THEN
    NEW.status = 'FAST_FILLING';
  ELSIF NEW.status != 'BLOCKED' THEN
    NEW.status = 'AVAILABLE';
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hotel_inventory_math ON public.hotel_inventory;
CREATE TRIGGER trigger_hotel_inventory_math
  BEFORE INSERT OR UPDATE ON public.hotel_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_hotel_inventory_math();

-- ------------------------------------------------------------------------------
-- 6. YATRA PACKAGES (Pilgrimage Circuits & Custom Itineraries)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.yatra_packages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  duration TEXT NOT NULL,
  booked_rank TEXT,
  image_url TEXT,
  gallery_images JSONB DEFAULT '[]'::JSONB,
  starting_price INTEGER NOT NULL DEFAULT 0,
  overview TEXT,
  highlights JSONB DEFAULT '[]'::JSONB,
  cancellation_policy TEXT,
  category TEXT NOT NULL,
  package_type TEXT,
  experience_level TEXT,
  hotels_level TEXT,
  transfers TEXT,
  itinerary JSONB DEFAULT '[]'::JSONB,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yatra_packages_category ON public.yatra_packages(category);

DROP TRIGGER IF EXISTS trigger_yatra_packages_updated_at ON public.yatra_packages;
CREATE TRIGGER trigger_yatra_packages_updated_at
  BEFORE UPDATE ON public.yatra_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Backward compatibility view for legacy queries targeting 'packages'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'packages') THEN
    CREATE OR REPLACE VIEW public.packages AS SELECT * FROM public.yatra_packages;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. TRAVEL STORIES / BLOGS (Pilgrim Experiences & Sacred Temple Guides)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT DEFAULT 'Devotee Pilgrim',
  excerpt TEXT,
  content TEXT NOT NULL,
  destination TEXT,
  cover_image TEXT,
  tags JSONB DEFAULT '[]'::JSONB,
  read_time_minutes INTEGER DEFAULT 5,
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_stories_slug ON public.travel_stories(slug);
CREATE INDEX IF NOT EXISTS idx_travel_stories_published ON public.travel_stories(is_published, published_at DESC);

DROP TRIGGER IF EXISTS trigger_travel_stories_updated_at ON public.travel_stories;
CREATE TRIGGER trigger_travel_stories_updated_at
  BEFORE UPDATE ON public.travel_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 8. REPLICA IDENTITY CONFIGURATION
-- Required for Supabase Realtime to broadcast complete OLD and NEW row deltas
-- ------------------------------------------------------------------------------
ALTER TABLE public.hotel_inventory REPLICA IDENTITY FULL;
ALTER TABLE public.yatra_packages REPLICA IDENTITY FULL;
ALTER TABLE public.cities REPLICA IDENTITY FULL;
ALTER TABLE public.hubs REPLICA IDENTITY FULL;
ALTER TABLE public.hotels REPLICA IDENTITY FULL;
ALTER TABLE public.travel_stories REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- 9. SUPABASE REALTIME PUBLICATION REGISTRATION
-- Adds all relational content tables to the realtime engine
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['yatra_packages', 'cities', 'hubs', 'hotels', 'hotel_inventory', 'travel_stories'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- Enables public read for pilgrims and authenticated operator write
-- ------------------------------------------------------------------------------
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yatra_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_stories ENABLE ROW LEVEL SECURITY;

-- Allow read to all (devotees, staff, admin)
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['cities', 'hubs', 'hotels', 'hotel_inventory', 'yatra_packages', 'travel_stories'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public Read %I" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public Read %I" ON public.%I FOR SELECT USING (true);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Admin Full Access %I" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Admin Full Access %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;
