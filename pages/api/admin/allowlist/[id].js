import { createClient } from '@supabase/supabase-js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createFallbackServiceRoleKey() {
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

function getServiceRoleKey() {
  return (
    process.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.SUPABASE_SERVICE_KEY ||
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
  process.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  getServiceRoleKey();

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract ID or Email parameter from query or URL
  const rawId = req.query?.id || req.url?.split('/').pop()?.split('?')[0] || '';
  const cleanId = decodeURIComponent(String(rawId)).trim();

  if (!cleanId) {
    return res.status(400).json({ error: 'Administrator ID or email is required.' });
  }

  const isUuid = UUID_REGEX.test(cleanId);

  // Helper to resolve email for security verification
  let targetEmail = cleanId.toLowerCase();
  if (isUuid) {
    try {
      const { data: existingRecord } = await supabaseAdmin
        .from('admin_allowlist')
        .select('email')
        .eq('id', cleanId)
        .maybeSingle();

      if (existingRecord?.email) {
        targetEmail = existingRecord.email.toLowerCase().trim();
      }
    } catch (lookupErr) {
      console.warn('[allowlist] Lookup email notice:', lookupErr?.message);
    }
  }

  // 1. DELETE METHOD: Revoke admin access
  if (req.method === 'DELETE') {
    try {
      if (targetEmail === 'anupamsaxena.dev@gmail.com') {
        return res.status(403).json({ error: 'Root administrator cannot be removed from allowlist.' });
      }

      let deleteQuery = supabaseAdmin.from('admin_allowlist').delete();
      if (isUuid) {
        deleteQuery = deleteQuery.eq('id', cleanId);
      } else {
        deleteQuery = deleteQuery.eq('email', cleanId.toLowerCase());
      }

      const { error } = await deleteQuery;

      if (error) {
        console.error('[allowlist DELETE error]:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Admin removed from allowlist successfully.',
        id: cleanId,
        email: targetEmail,
      });
    } catch (err) {
      console.error('[allowlist DELETE exception]:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }

  // 2. PUT / PATCH METHOD: Update admin role or status
  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { role, status } = body;

      if (targetEmail === 'anupamsaxena.dev@gmail.com') {
        if (role && role !== 'Super Admin' && role !== 'admin') {
          return res.status(403).json({ error: 'Root administrator role cannot be altered.' });
        }
        if (status && status !== 'Active & Authorized') {
          return res.status(403).json({ error: 'Root administrator status cannot be deactivated.' });
        }
      }

      const updatePayload = {};
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
        console.error('[allowlist UPDATE error]:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        data: data || { id: cleanId, email: targetEmail, ...updatePayload },
      });
    } catch (err) {
      console.error('[allowlist UPDATE exception]:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }

  // 3. GET METHOD: Retrieve specific admin record
  if (req.method === 'GET') {
    try {
      let getQuery = supabaseAdmin.from('admin_allowlist').select('*');
      if (isUuid) {
        getQuery = getQuery.eq('id', cleanId);
      } else {
        getQuery = getQuery.eq('email', cleanId.toLowerCase());
      }

      const { data, error } = await getQuery.maybeSingle();

      if (error) {
        console.error('[allowlist GET single error]:', error);
        return res.status(500).json({ error: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: 'Administrator not found in allowlist.' });
      }

      return res.status(200).json({ success: true, data });
    } catch (err) {
      console.error('[allowlist GET single exception]:', err);
      return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
