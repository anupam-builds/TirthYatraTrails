import { createClient } from '@supabase/supabase-js';
import { sanitizeHotelInventoryPayload } from '../../../src/utils/hotelInventorySanitizer.js';

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
      console.error('[app/api/hotel-inventory GET error response]:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return Response.json({ error: error.message, code: error.code, details: error.details }, { status: 500 });
    }
    return Response.json(data || []);
  } catch (err: any) {
    return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

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
      console.error('[app/api/hotel-inventory POST Supabase error response]:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload: sanitizedPayload,
      });
      return Response.json({
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      }, { status: 400 });
    }
    return Response.json(data || sanitizedPayload);
  } catch (err: any) {
    console.error('[app/api/hotel-inventory] Exception:', err);
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
