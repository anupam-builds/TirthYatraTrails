import { useEffect } from 'react';

const SUPABASE_URL = 'https://tbsvmgmhazsiciimpuim.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea';

export function useStaffPresence(staffId?: string) {
  useEffect(() => {
    if (!staffId) return;

    const syncPresence = async (online: boolean) => {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(staffId)}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_online: online,
            last_seen: new Date().toISOString(),
          }),
          keepalive: true,
        });
      } catch (err) {
        console.warn('[useStaffPresence] Failed to sync presence status:', err);
      }
    };

    syncPresence(true);
    const handleUnload = () => syncPresence(false);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      syncPresence(false);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [staffId]);
}
