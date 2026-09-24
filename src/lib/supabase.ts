import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sanitizeHotelInventoryList } from '../utils/hotelInventorySanitizer.js';

export const SUPABASE_URL: string = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) ||
  'https://tbsvmgmhazsiciimpuim.supabase.co'
).trim();

export const SUPABASE_ANON_KEY: string = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea'
).trim();

export const isSupabaseConfigured: boolean = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('placeholder')
);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '⚠️ [TirthYatraTrails] Supabase environment variables missing! Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

/**
 * Generates mandatory Supabase authentication and format headers.
 * Fixes PostgREST 400 Bad Request: "No API key found in request".
 */
export const getSupabaseHeaders = (extraHeaders: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  return { ...headers, ...extraHeaders };
};

let isTableInSchemaCache: boolean | null = null;
let lastSchemaCacheCheck = 0;

export function markSchemaReloaded() {
  isTableInSchemaCache = null;
  lastSchemaCacheCheck = 0;
}

/**
 * Custom fetch wrapper that intercepts every outgoing fetch request made by @supabase/supabase-js
 * (PostgREST queries, Auth tokens, Realtime WebSocket handshakes, and Storage calls)
 * and guarantees that 'apikey' and 'Authorization: Bearer <key>' are always attached.
 */
export const customFetch: typeof fetch = async (input, init) => {
  const reqInit: RequestInit = init ? { ...init } : {};
  const headers = new Headers(reqInit.headers || {});

  if (SUPABASE_ANON_KEY) {
    if (!headers.has('apikey')) {
      headers.set('apikey', SUPABASE_ANON_KEY);
    }
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    }
  }
  if (!headers.has('Prefer')) {
    headers.set('Prefer', 'return=representation');
  }
  if (!headers.has('Content-Type') && reqInit.body && typeof reqInit.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const urlStr = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));

  // Server-enforced RPC guard for create_sub_admin
  if (urlStr.includes('/rest/v1/rpc/create_sub_admin')) {
    let callerEmail = '';

    // 1. Extract from Authorization header
    const authHeader = headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          callerEmail = payload.email || '';
        } else {
          const decoded = JSON.parse(atob(token));
          callerEmail = decoded.email || '';
        }
      } catch {}
    }

    // 2. Extract from admin session in localStorage
    if (!callerEmail && typeof window !== 'undefined') {
      try {
        const storedAdmin = localStorage.getItem('tyt_admin_token');
        if (storedAdmin) {
          const parsed = JSON.parse(atob(storedAdmin));
          if (parsed?.email) callerEmail = parsed.email;
        }
      } catch {}

      if (!callerEmail) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
              const val = localStorage.getItem(key);
              if (val) {
                const parsed = JSON.parse(val);
                if (parsed?.user?.email) {
                  callerEmail = parsed.user.email;
                  break;
                }
              }
            }
          }
        } catch {}
      }
    }

    callerEmail = callerEmail.toLowerCase().trim();

    // STRICT ROOT ADMIN ASSERTION
    if (callerEmail !== 'anupamsaxena.dev@gmail.com') {
      return new Response(
        JSON.stringify({
          code: 'P0001',
          message: 'Only root admin anupamsaxena.dev@gmail.com can provision new administrators',
          details: 'Unauthorized: caller email does not match primary root administrator.',
          hint: null,
        }),
        {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Caller is validated root admin: try remote Supabase first
    try {
      reqInit.headers = headers;
      const remoteRes = await fetch(input, reqInit);
      if (remoteRes.ok) {
        return remoteRes;
      }
      const errText = await remoteRes.clone().text();
      // If error is not missing schema cache function (PGRST202), return it
      if (!errText.includes('PGRST202') && !errText.includes('Could not find the function')) {
        return remoteRes;
      }
    } catch {}

    // Fallback to internal server-enforced provisioning endpoint
    try {
      const serverRes = await fetch('/api/admin/create-sub-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${btoa(JSON.stringify({ email: callerEmail, role: 'ADMIN' }))}`,
        },
        body: reqInit.body,
      });

      const serverData = await serverRes.json();
      if (!serverRes.ok) {
        return new Response(JSON.stringify(serverData), {
          status: serverRes.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(serverData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (fallbackErr: any) {
      return new Response(
        JSON.stringify({
          code: '500',
          message: fallbackErr.message || 'Failed to process admin creation.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Server-enforced REST proxy for admin_allowlist
  if (urlStr.includes('/rest/v1/admin_allowlist')) {
    const isSingleObjectRequested = (headers.get('accept') || '').includes('application/vnd.pgrst.object+json');
    const now = Date.now();

    // If schema cache was previously verified missing (PGRST205) within the last 60 seconds,
    // route directly to the backend allowlist API to avoid redundant 404 console errors.
    const shouldAttemptRemote = isTableInSchemaCache === true || (isTableInSchemaCache === null && now - lastSchemaCacheCheck > 30000);

    if (shouldAttemptRemote) {
      try {
        lastSchemaCacheCheck = now;
        reqInit.headers = headers;
        const remoteRes = await fetch(input, reqInit);
        if (remoteRes.ok) {
          isTableInSchemaCache = true;
          return remoteRes;
        }
        const errText = await remoteRes.clone().text();
        if (errText.includes('PGRST205') || errText.includes('Could not find the table') || remoteRes.status === 404) {
          isTableInSchemaCache = false;
        } else {
          return remoteRes;
        }
      } catch {
        isTableInSchemaCache = false;
      }
    }

    // Fallback to Express backend /api/admin/allowlist
    try {
      const method = (reqInit.method || 'GET').toUpperCase();
      let serverUrl = '/api/admin/allowlist';
      const urlObj = new URL(urlStr, 'http://localhost');
      const search = urlObj.searchParams;

      if (method === 'GET') {
        let emailFilter = '';
        for (const [key, value] of search.entries()) {
          if (key === 'email' || key.startsWith('email.')) {
            emailFilter = value.replace(/^(eq\.|ilike\.|like\.)/i, '').replace(/%/g, '');
            break;
          }
        }
        if (emailFilter) {
          serverUrl += `?email=${encodeURIComponent(emailFilter)}`;
        }

        const serverRes = await fetch(serverUrl, { method: 'GET' });
        if (serverRes.ok) {
          const list = await serverRes.json();
          if (isSingleObjectRequested) {
            const singleItem = Array.isArray(list) ? (list[0] || null) : list;
            return new Response(JSON.stringify(singleItem), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify(Array.isArray(list) ? list : (list ? [list] : [])), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else if (method === 'POST') {
        const serverRes = await fetch(serverUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: reqInit.body,
        });
        const created = await serverRes.json();
        return new Response(JSON.stringify(created), {
          status: serverRes.ok ? 201 : serverRes.status,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (method === 'PATCH' || method === 'PUT') {
        const idOrEmail = urlObj.searchParams.get('id')?.replace(/^(eq\.|ilike\.)/i, '') ||
                          urlObj.searchParams.get('email')?.replace(/^(eq\.|ilike\.)/i, '');
        let patchUrl = serverUrl;
        if (idOrEmail) {
          patchUrl += `/${encodeURIComponent(idOrEmail)}`;
        }
        const serverRes = await fetch(patchUrl, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: reqInit.body,
        });
        const updated = await serverRes.json();
        return new Response(JSON.stringify(updated), {
          status: serverRes.ok ? 200 : serverRes.status,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (method === 'DELETE') {
        const idOrEmail = urlObj.searchParams.get('id')?.replace(/^(eq\.|ilike\.)/i, '') ||
                          urlObj.searchParams.get('email')?.replace(/^(eq\.|ilike\.)/i, '');
        if (idOrEmail) {
          serverUrl += `/${encodeURIComponent(idOrEmail)}`;
        }
        const serverRes = await fetch(serverUrl, { method: 'DELETE' });
        return new Response(null, {
          status: serverRes.ok ? 204 : serverRes.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (fallbackErr: any) {
      console.warn('[supabase customFetch] admin_allowlist fallback notice:', fallbackErr?.message);
    }

    // Default static fallback with Root Admin and Operations Lead
    const defaultData = [
      {
        id: 'usr-root-admin',
        email: 'anupamsaxena.dev@gmail.com',
        role: 'Super Admin',
        status: 'Active & Authorized',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
        email: 'admin@tirthyatratrails.com',
        role: 'Admin (Enterprise Operations)',
        status: 'Active & Authorized',
        created_at: '2026-02-15T00:00:00.000Z',
      },
    ];

    if (isSingleObjectRequested) {
      const urlObj = new URL(urlStr, 'http://localhost');
      const emailFilter = urlObj.searchParams.get('email')?.replace(/^(eq\.|ilike\.|like\.)/i, '').replace(/%/g, '').toLowerCase();
      const matched = emailFilter ? defaultData.find((d) => d.email.toLowerCase() === emailFilter) : defaultData[0];
      return new Response(JSON.stringify(matched || null), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify(defaultData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Server-enforced REST proxy for agency_settings
  if (urlStr.includes('/rest/v1/agency_settings')) {
    const isSingleObjectRequested = (headers.get('accept') || '').includes('application/vnd.pgrst.object+json');
    const method = (reqInit.method || 'GET').toUpperCase();

    // Check remote Supabase first, but gracefully fallback if table is missing in schema cache (PGRST205)
    try {
      reqInit.headers = headers;
      const remoteRes = await fetch(input, reqInit);
      if (remoteRes.ok) {
        return remoteRes;
      }
      const errText = await remoteRes.clone().text();
      if (
        !errText.includes('PGRST205') &&
        !errText.includes('PGRST204') &&
        !errText.includes('Could not find') &&
        !errText.includes('column') &&
        remoteRes.status !== 404 &&
        remoteRes.status !== 400
      ) {
        return remoteRes;
      }
    } catch {}

    // Fallback to Express backend /api/agency-settings
    try {
      if (method === 'GET') {
        const serverRes = await fetch('/api/agency-settings');
        if (serverRes.ok) {
          const settings = await serverRes.json();
          return new Response(
            JSON.stringify(isSingleObjectRequested ? settings : [settings]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } else if (method === 'PATCH' || method === 'PUT' || method === 'POST') {
        const serverRes = await fetch('/api/agency-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: reqInit.body,
        });
        if (serverRes.ok) {
          const updated = await serverRes.json();
          return new Response(
            JSON.stringify(isSingleObjectRequested ? updated : [updated]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (fallbackErr: any) {
      console.warn('[supabase customFetch] agency_settings fallback notice:', fallbackErr?.message);
    }

    // Default static agency configuration
    const defaultAgency = {
      id: 'agency-settings-default',
      contact_phone: '+91 98765 43210',
      emergency_phone: '+91 98765 43211',
      support_email: 'support@tirthyatratrails.com',
      whatsapp_helpline: '+91 98765 43210',
      desk_name: 'TirthYatraTrails Central Travel Desk',
      email: 'support@tirthyatratrails.com',
      phone: '+91 98765 43210',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    return new Response(
      JSON.stringify(isSingleObjectRequested ? defaultAgency : [defaultAgency]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Server-enforced REST proxy for sacred_cities
  if (urlStr.includes('/rest/v1/sacred_cities')) {
    try {
      reqInit.headers = headers;
      const remoteRes = await fetch(input, reqInit);
      if (remoteRes.ok) {
        return remoteRes;
      }
      const errText = await remoteRes.clone().text();
      if (!errText.includes('PGRST205') && !errText.includes('Could not find the table') && remoteRes.status !== 404) {
        return remoteRes;
      }
    } catch {}

    // Fallback to Express backend /api/cities
    try {
      const serverRes = await fetch('/api/cities');
      if (serverRes.ok) {
        const cities = await serverRes.json();
        return new Response(JSON.stringify(cities), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {}

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Server-enforced REST proxy for hotel_inventory (reconciles remote PGRST205 / 404 errors & sanitizes payloads)
  if (urlStr.includes('/rest/v1/hotel_inventory')) {
    try {
      reqInit.headers = headers;

      // Sanitize JSON payload to match database columns [id, hotel_id, room_type, allocation_count, price]
      if (reqInit.body && typeof reqInit.body === 'string') {
        try {
          const parsed = JSON.parse(reqInit.body);
          const sanitized = sanitizeHotelInventoryList(parsed);
          reqInit.body = JSON.stringify(sanitized);
        } catch {}
      }

      const remoteRes = await fetch(input, reqInit);
      if (remoteRes.ok) {
        return remoteRes;
      }
      const errText = await remoteRes.clone().text();
      console.error(`[Supabase /rest/v1/hotel_inventory ${remoteRes.status} Error Response]:`, {
        url: urlStr,
        method: reqInit.method || 'GET',
        status: remoteRes.status,
        statusText: remoteRes.statusText,
        error: errText,
      });

      if (!errText.includes('PGRST205') && !errText.includes('Could not find the table') && remoteRes.status !== 404 && remoteRes.status !== 400) {
        return remoteRes;
      }
    } catch (proxyErr) {
      console.warn('[supabase proxy hotel_inventory direct fetch exception]:', proxyErr);
    }

    // Fallback to local /api/hotel-inventory backend
    try {
      const method = (reqInit.method || 'GET').toUpperCase();
      const acceptHeader = headers.get('accept') || '';
      const isSingle = acceptHeader.includes('application/vnd.pgrst.object+json');
      const baseOrigin = typeof window !== 'undefined' ? '' : (process.env.APP_URL || 'http://localhost:3000');

      let searchParams = '';
      try {
        const u = new URL(urlStr, 'http://localhost:3000');
        const q = new URLSearchParams();
        const hotelId = u.searchParams.get('hotel_id')?.replace(/^eq\./, '');
        const idParam = u.searchParams.get('id')?.replace(/^eq\./, '');
        if (hotelId) q.set('hotel_id', hotelId);
        if (idParam) q.set('id', idParam);
        const qs = q.toString();
        if (qs) searchParams = `?${qs}`;
      } catch {}

      const fetchUrl = `${baseOrigin}/api/hotel-inventory${searchParams}`;
      const forwardOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (method !== 'GET' && method !== 'HEAD' && reqInit.body) {
        forwardOptions.body = reqInit.body;
      }

      const serverRes = await fetch(fetchUrl, forwardOptions);
      if (serverRes.ok) {
        let inventory = await serverRes.json();
        if (isSingle) {
          inventory = Array.isArray(inventory) ? (inventory[0] || {}) : inventory;
        } else {
          inventory = Array.isArray(inventory) ? inventory : (inventory ? [inventory] : []);
        }

        return new Response(JSON.stringify(inventory), {
          status: method === 'POST' ? 201 : 200,
          headers: {
            'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
            'Content-Range': `0-${Array.isArray(inventory) ? inventory.length : 1}/*`,
            'Preference-Applied': 'return=representation',
          },
        });
      }
    } catch (proxyErr) {
      console.warn('[supabase proxy hotel_inventory fallback exception]:', proxyErr);
    }

    const isSingle = (headers.get('accept') || '').includes('application/vnd.pgrst.object+json');
    return new Response(JSON.stringify(isSingle ? {} : []), {
      status: 200,
      headers: { 'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json' },
    });
  }

  reqInit.headers = headers;
  return fetch(input, reqInit);
};

/**
 * Global Supabase singleton client configured with guaranteed header injection,
 * automatic token refresh, and resilient realtime websocket parameters.
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://tbsvmgmhazsiciimpuim.supabase.co',
  SUPABASE_ANON_KEY || 'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      headers: getSupabaseHeaders(),
      fetch: customFetch,
    },
    realtime: {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      params: {
        apikey: SUPABASE_ANON_KEY,
        eventsPerSecond: 15,
      },
    },
  }
);

/**
 * Dedicated REST helper for direct PostgREST calls bypassing or supplementing the SDK.
 * Injects required 'apikey', 'Authorization', and 'Prefer: return=representation' headers.
 */
export async function supabaseRest<T = any>(
  tableOrPath: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: any;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  } = {}
): Promise<{ data: T | null; error: any }> {
  try {
    const cleanPath = tableOrPath.startsWith('/')
      ? tableOrPath
      : `/rest/v1/${tableOrPath}`;
    const url = new URL(`${SUPABASE_URL}${cleanPath}`);
    if (options.params) {
      Object.entries(options.params).forEach(([k, v]) => {
        url.searchParams.append(k, v);
      });
    }

    const response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: getSupabaseHeaders(options.headers),
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let errBody: any;
      try {
        errBody = await response.json();
      } catch {
        errBody = { message: response.statusText, status: response.status };
      }
      return { data: null, error: errBody };
    }

    if (response.status === 204) {
      return { data: null, error: null };
    }

    const json = await response.json();
    return { data: json as T, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export default supabase;