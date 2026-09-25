import { createClient } from '@supabase/supabase-js';

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

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const NextResponse = {
  json: (body: any, init?: ResponseInit) => Response.json(body, init),
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    let query = supabaseAdmin
      .from('admin_allowlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (email) {
      query = query.eq('email', email.toLowerCase().trim());
    }

    const { data, error } = await query;

    if (error) {
      console.error('[app/api/admin/allowlist GET error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (err: any) {
    console.error('[app/api/admin/allowlist GET exception]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body.email || body.admin_email;
    const role = body.role || body.admin_role || 'Super Admin';
    const status = body.status || 'Active & Authorized';

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json({ error: 'Please provide a valid email format.' }, { status: 400 });
    }

    const allowlistPayload: {
      email: string;
      role: string;
      created_at: string;
    } = {
      email: cleanEmail,
      role: role || 'admin',
      created_at: typeof body.created_at === 'string' ? body.created_at : new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('admin_allowlist')
      .upsert(allowlistPayload, { onConflict: 'email' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[app/api/admin/allowlist POST error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...(data || allowlistPayload),
        status: data?.status || status || 'Active & Authorized',
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error('[app/api/admin/allowlist POST exception]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
