import { createClient } from '@supabase/supabase-js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createFallbackServiceRoleKey(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      role: 'service_role',
      iss: 'supabase',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 315360000,
    })
  ).toString('base64url');
  return `${header}.${payload}.service_role_fallback_key`;
}

function getServiceRoleKey(): string {
  return (
    (process as any).SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (process as any).SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    createFallbackServiceRoleKey()
  );
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://tbsvmgmhazsiciimpuim.supabase.co';

const SUPABASE_SERVICE_ROLE_KEY =
  (process as any).SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  getServiceRoleKey();

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const NextResponse = {
  json: (body: any, init?: ResponseInit) => Response.json(body, init),
};

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function extractCleanId(request: Request, context: any): Promise<string> {
  const resolvedParams = await Promise.resolve(context?.params || {});
  let id = resolvedParams?.id;
  if (!id) {
    const url = new URL(request.url);
    const segments = url.pathname.split('/').filter(Boolean);
    id = segments[segments.length - 1];
  }
  return decodeURIComponent(String(id || '')).trim();
}

export async function DELETE(request: Request, context: any) {
  try {
    const cleanId = await extractCleanId(request, context);
    if (!cleanId) {
      return NextResponse.json({ error: 'Administrator ID or email is required.' }, { status: 400 });
    }

    const isUuid = UUID_REGEX.test(cleanId);
    let targetEmail = cleanId.toLowerCase();

    if (isUuid) {
      try {
        const { data: existing } = await supabaseAdmin
          .from('admin_allowlist')
          .select('email')
          .eq('id', cleanId)
          .maybeSingle();
        if (existing?.email) {
          targetEmail = existing.email.toLowerCase().trim();
        }
      } catch (err: any) {
        console.warn('[app/api/admin/allowlist/[id]] Lookup notice:', err?.message);
      }
    }

    if (targetEmail === 'anupamsaxena.dev@gmail.com') {
      return NextResponse.json({ error: 'Root administrator cannot be removed from allowlist.' }, { status: 403 });
    }

    let deleteQuery = supabaseAdmin.from('admin_allowlist').delete();
    if (isUuid) {
      deleteQuery = deleteQuery.eq('id', cleanId);
    } else {
      deleteQuery = deleteQuery.eq('email', cleanId.toLowerCase());
    }

    const { error } = await deleteQuery;
    if (error) {
      console.error('[app/api/admin/allowlist/[id] DELETE error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Admin removed from allowlist successfully.',
      id: cleanId,
      email: targetEmail,
    });
  } catch (err: any) {
    console.error('[app/api/admin/allowlist/[id] DELETE exception]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const cleanId = await extractCleanId(request, context);
    if (!cleanId) {
      return NextResponse.json({ error: 'Administrator ID or email is required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { role, status } = body;
    const isUuid = UUID_REGEX.test(cleanId);

    let targetEmail = cleanId.toLowerCase();
    if (isUuid) {
      try {
        const { data: existing } = await supabaseAdmin
          .from('admin_allowlist')
          .select('email')
          .eq('id', cleanId)
          .maybeSingle();
        if (existing?.email) {
          targetEmail = existing.email.toLowerCase().trim();
        }
      } catch (err: any) {
        console.warn('[app/api/admin/allowlist/[id]] Lookup notice:', err?.message);
      }
    }

    if (targetEmail === 'anupamsaxena.dev@gmail.com') {
      if (role && role !== 'Super Admin' && role !== 'admin') {
        return NextResponse.json({ error: 'Root administrator role cannot be altered.' }, { status: 403 });
      }
      if (status && status !== 'Active & Authorized') {
        return NextResponse.json({ error: 'Root administrator status cannot be deactivated.' }, { status: 403 });
      }
    }

    const updatePayload: Record<string, any> = {};
    if (role !== undefined && typeof role === 'string') {
      updatePayload.role = role.trim();
    }
    if (status !== undefined && typeof status === 'string') {
      updatePayload.status = status.trim();
    }

    let updateQuery = supabaseAdmin.from('admin_allowlist').update(updatePayload);
    if (isUuid) {
      updateQuery = updateQuery.eq('id', cleanId);
    } else {
      updateQuery = updateQuery.eq('email', cleanId.toLowerCase());
    }

    const { data, error } = await updateQuery.select().maybeSingle();
    if (error) {
      console.error('[app/api/admin/allowlist/[id] PUT error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || { id: cleanId, email: targetEmail, ...updatePayload },
    });
  } catch (err: any) {
    console.error('[app/api/admin/allowlist/[id] PUT exception]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: any) {
  return PUT(request, context);
}

export async function GET(request: Request, context: any) {
  try {
    const cleanId = await extractCleanId(request, context);
    if (!cleanId) {
      return NextResponse.json({ error: 'Administrator ID or email is required.' }, { status: 400 });
    }

    const isUuid = UUID_REGEX.test(cleanId);
    let getQuery = supabaseAdmin.from('admin_allowlist').select('*');
    if (isUuid) {
      getQuery = getQuery.eq('id', cleanId);
    } else {
      getQuery = getQuery.eq('email', cleanId.toLowerCase());
    }

    const { data, error } = await getQuery.maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Administrator not found in allowlist.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
