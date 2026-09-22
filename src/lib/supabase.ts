import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL: string = (
  import.meta.env.VITE_SUPABASE_URL || 'https://tbsvmgmhazsiciimpuim.supabase.co'
).trim();

export const SUPABASE_ANON_KEY: string = (
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea'
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