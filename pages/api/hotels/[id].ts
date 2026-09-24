import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tbsvmgmhazsiciimpuim.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: any, res: any) {
  const { id } = req.query || {};
  const hotelId = String(id || req.url?.split('/').pop()?.split('?')[0] || '');

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .eq('id', hotelId)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      if (!data) {
        return res.status(404).json({ error: 'Hotel not found', id: hotelId });
      }
      return res.status(200).json(data);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      
      const payload: Record<string, any> = {
        name: body.name,
        city_id: body.cityId || body.city_id,
        city_name: body.cityName || body.city_name,
        address: body.address,
        description: body.description,
        base_price: body.basePrice || body.base_price,
        star_rating: body.starRating || body.star_rating,
        distance_to_temple: body.distanceToTemple || body.distance_to_temple,
        darshan_type: body.darshanType || body.darshan_type,
        is_featured: body.isFeatured !== undefined ? body.isFeatured : body.is_featured,
        is_top_rated: body.isTopRated !== undefined ? body.isTopRated : body.is_top_rated,
      };

      if (body.images) payload.images = body.images;
      if (body.amenities) payload.amenities = body.amenities;
      if (body.rooms) payload.rooms = body.rooms;

      // Clean up undefined keys
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      const { data, error } = await supabase
        .from('hotels')
        .update(payload)
        .eq('id', hotelId)
        .select()
        .maybeSingle();

      if (error) {
        // If update failed because record doesn't exist, attempt upsert
        const upsertPayload = { ...payload, id: hotelId };
        const { data: upsertData, error: upsertErr } = await supabase
          .from('hotels')
          .upsert(upsertPayload)
          .select()
          .maybeSingle();

        if (upsertErr) {
          return res.status(500).json({ error: upsertErr.message });
        }
        return res.status(200).json(upsertData || { success: true, ...body, id: hotelId });
      }

      return res.status(200).json(data || { success: true, ...body, id: hotelId });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('hotels').delete().eq('id', hotelId);
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ success: true, id: hotelId });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err: any) {
    console.error('[API /api/hotels/[id]] Unhandled error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
