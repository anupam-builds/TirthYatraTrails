import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tbsvmgmhazsiciimpuim.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const hotelId = params.id;
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', hotelId)
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return Response.json({ error: 'Hotel not found', id: hotelId }, { status: 404 });
    }
    return Response.json(data);
  } catch (err: any) {
    return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const hotelId = params.id;
    const body = await request.json();

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

    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    const { data, error } = await supabase
      .from('hotels')
      .update(payload)
      .eq('id', hotelId)
      .select()
      .maybeSingle();

    if (error) {
      const { data: upsertData, error: upsertErr } = await supabase
        .from('hotels')
        .upsert({ ...payload, id: hotelId })
        .select()
        .maybeSingle();

      if (upsertErr) {
        return Response.json({ error: upsertErr.message }, { status: 500 });
      }
      return Response.json(upsertData || { success: true, ...body, id: hotelId });
    }

    return Response.json(data || { success: true, ...body, id: hotelId });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  return PUT(request, context);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const hotelId = params.id;
    const { error } = await supabase.from('hotels').delete().eq('id', hotelId);
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ success: true, id: hotelId });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
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
