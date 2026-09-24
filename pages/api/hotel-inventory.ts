import { createClient } from '@supabase/supabase-js';

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
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const id = body.id || `inv-${Date.now()}`;

      const upsertData = {
        id,
        hotel_id: body.hotel_id || body.hotelId,
        rooms_count: body.rooms_count ?? body.roomsCount ?? 10,
        allocation_status: body.allocation_status || 'AVAILABLE',
        room_id: body.room_id || null,
        room_type: body.room_type || 'Standard Devotee Room',
        date: body.date || new Date().toISOString().split('T')[0],
        total_inventory: body.total_inventory ?? 10,
        booked_count: body.booked_count ?? 0,
        blocked_count: body.blocked_count ?? 0,
        available_count: body.available_count ?? 10,
        base_rate: body.base_rate ?? 2500,
        price_override: body.price_override ?? null,
        status: body.status || 'AVAILABLE',
        updated_by: body.updated_by || 'admin',
      };

      const { data, error } = await supabase
        .from('hotel_inventory')
        .upsert(upsertData)
        .select()
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data || upsertData);
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err: any) {
    console.error('[API /api/hotel-inventory] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
