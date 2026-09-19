import { useEffect } from 'react';

const SUPABASE_URL = 'https://tbsvmgmhazsiciimpuim.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UVZU3WJhR1sz8EuseHB6Uw_lxb5_-ea';

export function useStaffPresence(staffId?: string) {
  useEffect(() => {
    if (!staffId) return;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(staffId);
    const targetTable = staffId.startsWith('stf-') || !isUuid ? 'staff_members' : 'profiles';

    const syncPresence = async (online: boolean) => {
      try {
        const nowIso = new Date().toISOString();
        const payload: Record<string, any> = {
          is_online: online,
          last_seen: nowIso,
        };

        if (targetTable === 'staff_members') {
          payload.last_active_at = nowIso;
          payload.is_currently_logged_in = online;
        }

        const res = await fetch(`${SUPABASE_URL}/rest/v1/${targetTable}?id=eq.${encodeURIComponent(staffId)}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          keepalive: true,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.warn(`[useStaffPresence] PATCH ${targetTable} failed (${res.status}):`, errText);
        }
      } catch (err) {
        console.warn(`[useStaffPresence] Failed to sync presence on ${targetTable}:`, err);
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
