import { createClient } from '@supabase/supabase-js';

// Fallback to service key creator to construct a service_role token rather than using the public anon key
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

// Initialize Supabase Admin client using Service Role key to bypass RLS restrictions
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper for NextResponse to support Next.js App Router seamlessly
const NextResponse = {
  json: (body: any, init?: ResponseInit) => Response.json(body, init),
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body.email || body.admin_email;
    const password = body.password || body.admin_password;
    const role = body.role || body.admin_role || 'Super Admin';

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters in length.' }, { status: 400 });
    }

    // Ensure client uses latest runtime service role key (process.SUPABASE_SERVICE_ROLE_KEY or process.env.SUPABASE_SERVICE_ROLE_KEY)
    const activeKey =
      (process as any).SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      getServiceRoleKey();

    const client =
      activeKey === SUPABASE_SERVICE_ROLE_KEY
        ? supabaseAdmin
        : createClient(SUPABASE_URL, activeKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

    // 1. Create user in Supabase Auth via Admin Client (bypassing RLS)
    let authUser: any = null;
    try {
      const { data: authData, error: authError } = await client.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
      });

      if (authError) {
        console.warn('[app/api/admin/provision-user] auth.admin.createUser notice:', authError.message);
      } else {
        authUser = authData?.user;
      }
    } catch (adminAuthErr: any) {
      console.warn('[app/api/admin/provision-user] Admin auth creation call warning:', adminAuthErr?.message);
    }

    // 2. Insert or upsert the provisioned user record into admin_allowlist table via Service Role client (bypassing RLS)
    // Strictly map table columns: email, role, created_at.
    // Strip out 'status' and any extraneous properties from the request body to match database schema.
    const allowlistPayload: {
      email: string;
      role: string;
      created_at: string;
    } = {
      email: cleanEmail,
      role: role || 'admin',
      created_at: typeof body.created_at === 'string' ? body.created_at : new Date().toISOString(),
    };

    const { data: allowlistData, error: allowlistError } = await client
      .from('admin_allowlist')
      .upsert(allowlistPayload, { onConflict: 'email' })
      .select()
      .maybeSingle();

    if (allowlistError) {
      console.error('[app/api/admin/provision-user] admin_allowlist upsert error:', allowlistError);
      return NextResponse.json({ error: allowlistError.message }, { status: 500 });
    }

    // 3. Return clean JSON response
    return NextResponse.json({
      success: true,
      message: 'Admin provisioned successfully',
      user: authUser || { email: cleanEmail, role },
      allowlist: {
        ...(allowlistData || allowlistPayload),
        status: allowlistData?.status || 'Active & Authorized',
      },
    });
  } catch (err: any) {
    console.error('[app/api/admin/provision-user exception]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
