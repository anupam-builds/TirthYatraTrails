-- ==============================================================================
-- TirthYatraTrails.in: PostgREST 404 Fix for Cities & Transit Hubs
-- Purpose:
-- 1. Ensure public.cities and public.hubs exist with all columns & constraints
-- 2. Create compatibility views (destination_cities <-> cities, transit_hubs <-> hubs)
-- 3. Grant schema usage and table permissions to anon & authenticated roles
-- 4. Enable Row Level Security (RLS) with permissive public read & admin policies
-- 5. Set REPLICA IDENTITY FULL and add to supabase_realtime publication
-- 6. Execute PostgREST schema cache reload signal (NOTIFY pgrst, 'reload schema')
-- 7. Seed primary sacred cities and transit hubs
-- ==============================================================================

-- 1. Ensure Schema Usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Helper function for automated updated_at timestamp triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. TABLE: public.cities (Sacred Destination Masters)
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

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_cities_updated_at ON public.cities;
CREATE TRIGGER trigger_cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Compatibility view for alternate table naming
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'destination_cities') THEN
    CREATE OR REPLACE VIEW public.destination_cities AS SELECT * FROM public.cities;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'destinations') THEN
    CREATE OR REPLACE VIEW public.destinations AS SELECT * FROM public.cities;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. TABLE: public.hubs (Airports, Railway Stations, Bus Terminals, Helipads)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hubs (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hub_type TEXT NOT NULL DEFAULT 'AIRPORT',
  code TEXT, -- e.g. "AYJ", "VNS", "DED", "AY"
  distance_to_temple_km NUMERIC(6, 2) DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hubs_city_id ON public.hubs(city_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_hubs_updated_at ON public.hubs;
CREATE TRIGGER trigger_hubs_updated_at
  BEFORE UPDATE ON public.hubs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Compatibility view for alternate table naming
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transit_hubs') THEN
    CREATE OR REPLACE VIEW public.transit_hubs AS SELECT * FROM public.hubs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'city_hubs') THEN
    CREATE OR REPLACE VIEW public.city_hubs AS SELECT * FROM public.hubs;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. PERMISSIONS & ROLE GRANTS (CRITICAL FOR POSTGREST 404 ELIMINATION)
-- ------------------------------------------------------------------------------
-- Grant table privileges
GRANT ALL ON TABLE public.cities TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.hubs TO anon, authenticated, service_role;

-- Grant view privileges if views exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'destination_cities') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.destination_cities TO anon, authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'destinations') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.destinations TO anon, authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'transit_hubs') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transit_hubs TO anon, authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'city_hubs') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.city_hubs TO anon, authenticated, service_role;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read cities" ON public.cities;
CREATE POLICY "Public Read cities" ON public.cities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Full Access cities" ON public.cities;
CREATE POLICY "Admin Full Access cities" ON public.cities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read hubs" ON public.hubs;
CREATE POLICY "Public Read hubs" ON public.hubs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Full Access hubs" ON public.hubs;
CREATE POLICY "Admin Full Access hubs" ON public.hubs FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. REPLICA IDENTITY FULL FOR REALTIME BROADCASTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.cities REPLICA IDENTITY FULL;
ALTER TABLE public.hubs REPLICA IDENTITY FULL;

-- Add to supabase_realtime publication
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['cities', 'hubs'];
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
-- 8. INITIAL SACRED SEED DATA (UPSERT)
-- ------------------------------------------------------------------------------
INSERT INTO public.cities (id, name, state, image_url, hotel_count, popular_for)
VALUES
  ('ayodhya', 'Ayodhya', 'Uttar Pradesh', 'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80', 14, 'Shri Ram Janmabhoomi, Kanak Bhawan & Sarayu Maha Aarti'),
  ('varanasi', 'Varanasi', 'Uttar Pradesh', 'https://images.unsplash.com/photo-1571536802807-30451e3955d8?auto=format&fit=crop&w=600&q=80', 22, 'Kashi Vishwanath Jyotirlinga & Dashashwamedh Ghat'),
  ('rishikesh', 'Rishikesh & Haridwar', 'Uttarakhand', 'https://images.unsplash.com/photo-1588416936097-41850ab3d86d?auto=format&fit=crop&w=600&q=80', 18, 'Har Ki Pauri Ganga Aarti, Yoga Capital & Triveni Ghat'),
  ('kedarnath', 'Kedarnath Dham', 'Uttarakhand', 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80', 12, 'Sacred Baba Kedar Himalayan Jyotirlinga Darshan'),
  ('puri', 'Puri Dham', 'Odisha', 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=600&q=80', 16, 'Shree Jagannath Temple & Golden Beach Maha Prasad')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  state = EXCLUDED.state,
  image_url = EXCLUDED.image_url,
  hotel_count = EXCLUDED.hotel_count,
  popular_for = EXCLUDED.popular_for,
  updated_at = NOW();

INSERT INTO public.hubs (id, city_id, name, hub_type, code, distance_to_temple_km, is_primary)
VALUES
  ('hub-ayj-air', 'ayodhya', 'Maharishi Valmiki International Airport (AYJ)', 'AIRPORT', 'AYJ', 9.5, true),
  ('hub-ayj-rail', 'ayodhya', 'Ayodhya Dham Junction (AY)', 'RAILWAY_STATION', 'AY', 1.2, false),
  ('hub-vns-air', 'varanasi', 'Lal Bahadur Shastri International Airport (VNS)', 'AIRPORT', 'VNS', 24.0, true),
  ('hub-vns-rail', 'varanasi', 'Varanasi Cantt Station (BSB)', 'RAILWAY_STATION', 'BSB', 4.5, false),
  ('hub-keda-heli', 'kedarnath', 'Guptkashi & Phata Helipad Base', 'HELIPAD', 'GPK', 14.0, true),
  ('hub-puri-rail', 'puri', 'Puri Railway Station (PURI)', 'RAILWAY_STATION', 'PURI', 2.1, true)
ON CONFLICT (id) DO UPDATE SET
  city_id = EXCLUDED.city_id,
  name = EXCLUDED.name,
  hub_type = EXCLUDED.hub_type,
  code = EXCLUDED.code,
  distance_to_temple_km = EXCLUDED.distance_to_temple_km,
  is_primary = EXCLUDED.is_primary,
  updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 9. RELOAD POSTGREST SCHEMA CACHE (SIGNAL)
-- PostgREST listens to this channel and immediately rebuilds OpenAPI specs & endpoints
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
