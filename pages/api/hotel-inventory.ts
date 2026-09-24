import { createClient } from '@supabase/supabase-js';
import { sanitizeHotelInventoryPayload } from '../../src/utils/hotelInventorySanitizer.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tbsvmgmhazsiciimpuim.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const hotelId = req.query.hotel_id || req.query.hotelId;
      let query = supabase.from('hotel_inventory').select('*');
      if (hotelId) {
        query = query.eq('hotel_id', String(hotelId));
      }
      const { data, error } = await query;
      if (error) {
        console.error('[pages/api/hotel-inventory GET error response]:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return res.status(500).json({ error: error.message, code: error.code, details: error.details });
      }
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

      // Sanitize payload strictly to match Supabase hotel_inventory database columns:
      // [id (UUID), hotel_id (UUID), room_type (TEXT), allocation_count (INTEGER), price (NUMERIC)]
      const sanitizedPayload = sanitizeHotelInventoryPayload({
        ...body,
        hotel_id: body.hotel_id || body.hotelId,
        room_type: body.room_type || body.roomType || 'Standard Devotee Room',
        allocation_count: body.allocation_count ?? body.allocationCount ?? body.rooms_count ?? body.roomsCount ?? body.total_inventory ?? body.totalInventory ?? 10,
        price: body.price ?? body.price_override ?? body.priceOverride ?? body.base_rate ?? body.baseRate ?? 2500,
      });

      const { data, error } = await supabase
        .from('hotel_inventory')
        .upsert(sanitizedPayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (error) {
        console.error('[pages/api/hotel-inventory Supabase error response]:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          payload: sanitizedPayload,
        });
        return res.status(400).json({
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      }
      return res.status(200).json(data || sanitizedPayload);
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err: any) {
    console.error('[pages/api/hotel-inventory] Exception:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
