/**
 * Next.js App Router API Route for Staff & Admin Online Presence
 * Route: /api/admin/staff/[id]/presence
 * Handles: PATCH, POST, GET, OPTIONS
 */

export async function PATCH(
  request: Request,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(context?.params);
    const id = resolvedParams?.id || 'unknown';

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const isOnline = Boolean(body.isOnline ?? body.is_online ?? true);
    const lastSeen = body.lastSeen || new Date().toISOString();

    return new Response(
      JSON.stringify({
        success: true,
        id,
        isOnline,
        isCurrentlyLoggedIn: isOnline,
        lastSeen,
        lastActiveAt: lastSeen,
        updatedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Failed to update presence',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  return PATCH(request, context);
}

export async function PUT(
  request: Request,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  return PATCH(request, context);
}

export async function GET(
  request: Request,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const id = resolvedParams?.id || 'unknown';

  return new Response(
    JSON.stringify({
      id,
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
