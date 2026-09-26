import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://tbsvmgmhazsiciimpuim.supabase.co',
  supabaseAnonKey || 'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea',
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.sessionStorage : null,
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 15,
      },
    },
  }
);

export const staffSupabase = supabase;
export default supabase;
