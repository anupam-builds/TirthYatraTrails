import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tbsvmgmhazsiciimpuim.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { email } = req.query || {};
      let query = supabaseAdmin
        .from('admin_allowlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (email && typeof email === 'string') {
        query = query.eq('email', email.toLowerCase().trim());
      }

      const { data, error } = await query;
      if (error) {
        console.error('[pages/api/admin/allowlist GET error]:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ data, success: true });
    } catch (err) {
      console.error('[pages/api/admin/allowlist GET exception]:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const email = body.email || body.admin_email;
      const role = body.role || body.admin_role || 'Super Admin';
      const status = body.status || 'Active & Authorized';

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email address is required.' });
      }

      const cleanEmail = email.toLowerCase().trim();
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return res.status(400).json({ error: 'Please provide a valid email format.' });
      }

      const allowlistPayload = {
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
        console.error('[pages/api/admin/allowlist POST error]:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({
        success: true,
        data: {
          ...(data || allowlistPayload),
          status: data?.status || status || 'Active & Authorized',
        },
      });
    } catch (err) {
      console.error('[pages/api/admin/allowlist POST exception]:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
