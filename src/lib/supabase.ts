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