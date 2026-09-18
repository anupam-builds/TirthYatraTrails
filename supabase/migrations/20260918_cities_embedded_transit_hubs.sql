-- ==============================================================================
-- TirthYatraTrails.in: Embedded Transit Hubs Schema Migration
-- Purpose:
-- 1. Standardize transit hubs inside public.cities as an embedded JSONB column
-- 2. Eliminate all 404 queries targeting non-existent /hubs or /transit_hubs tables
-- 3. Index transit_hubs with GIN for fast JSON queries
-- 4. Backfill existing sacred cities with their key transit hubs
-- 5. Ensure cities is part of supabase_realtime publication
-- 6. Trigger PostgREST schema reload signal
-- ==============================================================================

-- 1. Add transit_hubs JSONB column to public.cities
ALTER TABLE public.cities 
ADD COLUMN IF NOT EXISTS transit_hubs JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Create GIN index for JSONB operations
CREATE INDEX IF NOT EXISTS idx_cities_transit_hubs_gin 
ON public.cities USING GIN (transit_hubs);

-- 3. Ensure permissions for anon, authenticated, service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cities TO anon, authenticated, service_role;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read cities" ON public.cities;
CREATE POLICY "Public Read cities" ON public.cities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Full Access cities" ON public.cities;
CREATE POLICY "Admin Full Access cities" ON public.cities FOR ALL USING (true) WITH CHECK (true);

-- 5. Backfill Sacred Transit Hubs into public.cities (JSONB)
UPDATE public.cities
SET transit_hubs = jsonb_build_array(
  jsonb_build_object(
    'id', 'hub-ayj-air',
    'cityId', 'ayodhya',
    'cityName', 'Ayodhya',
    'name', 'Maharishi Valmiki International Airport (AYJ)',
    'hubType', 'AIRPORT',
    'code', 'AYJ',
    'distanceToTempleKm', 9.5,
    'isPrimary', true
  ),
  jsonb_build_object(
    'id', 'hub-ayj-rail',
    'cityId', 'ayodhya',
    'cityName', 'Ayodhya',
    'name', 'Ayodhya Dham Junction (AY)',
    'hubType', 'RAILWAY_STATION',
    'code', 'AY',
    'distanceToTempleKm', 1.2,
    'isPrimary', false
  )
)
WHERE LOWER(id) LIKE '%ayodhya%' OR LOWER(name) LIKE '%ayodhya%';

UPDATE public.cities
SET transit_hubs = jsonb_build_array(
  jsonb_build_object(
    'id', 'hub-vns-air',
    'cityId', 'varanasi',
    'cityName', 'Varanasi',
    'name', 'Lal Bahadur Shastri International Airport (VNS)',
    'hubType', 'AIRPORT',
    'code', 'VNS',
    'distanceToTempleKm', 24.0,
    'isPrimary', true
  ),
  jsonb_build_object(
    'id', 'hub-vns-rail',
    'cityId', 'varanasi',
    'cityName', 'Varanasi',
    'name', 'Varanasi Cantt Station (BSB)',
    'hubType', 'RAILWAY_STATION',
    'code', 'BSB',
    'distanceToTempleKm', 4.5,
    'isPrimary', false
  )
)
WHERE LOWER(id) LIKE '%varanasi%' OR LOWER(name) LIKE '%varanasi%';

UPDATE public.cities
SET transit_hubs = jsonb_build_array(
  jsonb_build_object(
    'id', 'hub-keda-heli',
    'cityId', 'kedarnath',
    'cityName', 'Kedarnath',
    'name', 'Guptkashi & Phata Helipad Base',
    'hubType', 'HELIPAD',
    'code', 'GPK',
    'distanceToTempleKm', 14.0,
    'isPrimary', true
  )
)
WHERE LOWER(id) LIKE '%kedarnath%' OR LOWER(name) LIKE '%kedarnath%';

UPDATE public.cities
SET transit_hubs = jsonb_build_array(
  jsonb_build_object(
    'id', 'hub-puri-rail',
    'cityId', 'puri',
    'cityName', 'Puri',
    'name', 'Puri Railway Station (PURI)',
    'hubType', 'RAILWAY_STATION',
    'code', 'PURI',
    'distanceToTempleKm', 2.1,
    'isPrimary', true
  )
)
WHERE LOWER(id) LIKE '%puri%' OR LOWER(name) LIKE '%puri%';

-- 6. Configure Realtime Replication for public.cities
ALTER TABLE public.cities REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cities'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'cities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cities;
  END IF;
END $$;

-- 7. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
