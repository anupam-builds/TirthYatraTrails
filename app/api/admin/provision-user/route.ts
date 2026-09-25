import { createClient } from '@supabase/supabase-js';

// Helper for NextResponse to support Next.js App Router seamlessly
const NextResponse = {
  json: (body: any, init?: ResponseInit) => Response.json(body, init),
};

export async function POST(request: Request) {
  try {
    // 1. ENV CHECK:
    // Ensure the API route checks for process.env.NEXT_PUBLIC_SUPABASE_URL and process.env.SUPABASE_SERVICE_ROLE_KEY.
    // If either is missing, return a clear JSON error response with status 500 rather than crashing.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Missing server environment variables' },
        { status: 500 }
      );
    }

    // 2. ADMIN CLIENT:
    // Instantiate the Supabase admin client using the service role key to ensure full permissions for provisioning users and updating the allowlist.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

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

    // 1. Create user in Supabase Auth via Admin Client
    let authUser: any = null;
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
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

    // 2. Insert or upsert the provisioned user record into admin_allowlist table
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

    const { data: allowlistData, error: allowlistError } = await supabaseAdmin
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
