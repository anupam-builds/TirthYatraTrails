import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tbsvmgmhazsiciimpuim.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotel_id') || searchParams.get('hotelId');

    let query = supabase.from('hotel_inventory').select('*');
    if (hotelId) {
      query = query.eq('hotel_id', hotelId);
    }
    const { data, error } = await query;
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json(data || []);
  } catch (err: any) {
    return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json(data || upsertData);
  } catch (err: any) {
    return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function PATCH(request: Request) {
  return POST(request);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
