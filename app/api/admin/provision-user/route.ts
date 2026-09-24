import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tbsvmgmhazsiciimpuim.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
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
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters in length.' },
        { status: 400 }
      );
    }

    // 1. Create user in Supabase Auth via Admin Client
    let authUser: any = null;
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: { role, is_admin: true },
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
    const { data: allowlistData, error: allowlistError } = await supabase
      .from('admin_allowlist')
      .upsert(
        {
          email: cleanEmail,
          role,
          status: 'Active & Authorized',
        },
        { onConflict: 'email' }
      )
      .select()
      .maybeSingle();

    if (allowlistError) {
      console.error('[app/api/admin/provision-user] admin_allowlist upsert error:', allowlistError);
      return NextResponse.json(
        { success: false, error: allowlistError.message },
        { status: 500 }
      );
    }

    // 3. Return clean JSON response
    return NextResponse.json({
      success: true,
      message: 'Admin provisioned successfully',
      user: authUser || { email: cleanEmail, role },
      allowlist: allowlistData,
    });
  } catch (err: any) {
    console.error('[app/api/admin/provision-user exception]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
