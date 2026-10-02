import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://tbsvmgmhazsiciimpuim.supabase.co'
).trim();

const SUPABASE_ANON_KEY = (
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea'
).trim();

const SUPABASE_SERVICE_ROLE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''
).trim();

const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const supabaseServer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawEmail = req.body?.email || '';
    let targetEmail = String(rawEmail).toLowerCase().trim();

    if (!targetEmail) {
      const authHeader = req.headers.authorization || '';
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
      return res.status(400).json({ error: 'Valid user email or session token required.' });
    }

    const cleanEmail = targetEmail.toLowerCase().trim();

    if (!supabaseAdmin) {
      return res.status(200).json({ ok: true, message: 'Use client-side supabase.auth session.' });
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
      return res.status(500).json({ error: 'Failed to generate token hash.' });
    }

    const { data: sessionData, error: sessionErr } = await supabaseServer.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'email',
    });

    if (sessionErr || !sessionData?.session) {
      return res.status(500).json({ error: sessionErr?.message || 'Could not verify token.' });
    }

    return res.status(200).json({
      ok: true,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
        expires_in: sessionData.session.expires_in,
        user: sessionData.user,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
