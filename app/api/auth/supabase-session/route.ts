import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ''
).trim();

const SUPABASE_ANON_KEY = (
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();

const SUPABASE_SERVICE_ROLE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  (process as any).SUPABASE_SERVICE_ROLE_KEY ||
  ''
).trim();

const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const supabaseServer = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder-anon-key', {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    let targetEmail = body.email ? String(body.email).toLowerCase().trim() : '';

    if (!targetEmail) {
      const authHeader = request.headers.get('authorization') || '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            targetEmail = payload.email || '';
          } else {
            const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
            targetEmail = decoded.email || '';
          }
        } catch {}
      }
    }

    if (!targetEmail) {
      return new Response(JSON.stringify({ error: 'Valid email address or auth token required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = targetEmail.toLowerCase().trim();

    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ ok: true, message: 'Use client-side supabase.auth session.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
    });

    if (linkErr && linkErr.message.includes('User not found')) {
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
        user_metadata: { role: cleanEmail === 'anupamsaxena.dev@gmail.com' ? 'ADMIN' : 'STAFF' },
      });
      const retry = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
      });
      linkData = retry.data;
    }

    if (!linkData?.properties?.hashed_token) {
      return new Response(JSON.stringify({ error: 'Failed to generate token' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: sessionData, error: sessionErr } = await supabaseServer.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'email',
    });

    if (sessionErr || !sessionData?.session) {
      return new Response(JSON.stringify({ error: sessionErr?.message || 'Could not verify token' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_at: sessionData.session.expires_at,
          expires_in: sessionData.session.expires_in,
          user: sessionData.user,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
