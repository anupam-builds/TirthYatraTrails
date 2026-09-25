import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  // 1. ENV CHECK:
  // Ensure the API route checks for process.env.NEXT_PUBLIC_SUPABASE_URL and process.env.SUPABASE_SERVICE_ROLE_KEY.
  // If either is missing, return a clear JSON error response ({ error: "Missing server environment variables" }) with status 500 rather than crashing.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing server environment variables' });
  }

  try {
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

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const email = body.email || body.admin_email;
    const password = body.password || body.admin_password;
    const role = body.role || body.admin_role || 'Super Admin';

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters in length.' });
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
        console.warn('[pages/api/admin/provision-user.ts] auth.admin.createUser notice:', authError.message);
      } else {
        authUser = authData?.user;
      }
    } catch (adminAuthErr: any) {
      console.warn('[pages/api/admin/provision-user.ts] Admin auth creation call warning:', adminAuthErr?.message);
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
      console.error('[pages/api/admin/provision-user.ts] admin_allowlist upsert error:', allowlistError);
      return res.status(500).json({ error: allowlistError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Admin provisioned successfully',
      user: authUser || { email: cleanEmail, role },
      allowlist: {
        ...(allowlistData || allowlistPayload),
        status: allowlistData?.status || 'Active & Authorized',
      },
    });
  } catch (err: any) {
    console.error('[pages/api/admin/provision-user.ts exception]:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
