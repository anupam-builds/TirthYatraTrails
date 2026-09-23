import { useEffect } from 'react';
import { api } from '../services/api.js';

export function useStaffPresence(staffId?: string) {
  useEffect(() => {
    // Skip unassigned tokens or root admin IDs
    if (!staffId || staffId.startsWith('usr-root')) return;

    const currentId = staffId;

    const syncPresence = async (online: boolean) => {
      try {
        await api.setStaffOnlineStatus(currentId, online);
      } catch (err) {
        console.warn('[useStaffPresence] sync error:', err);
      }
    };

    // 1. Mark online immediately on session active / component mount
    syncPresence(true);

    // 2. Continuous heartbeat every 30 seconds to refresh last_seen and maintain live presence
    const heartbeatInterval = setInterval(() => {
      syncPresence(true);
    }, 30000);

    // 3. Mark offline when user closes tab, navigates away, or unloads
    const handleUnload = () => {
      syncPresence(false);
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      syncPresence(false);
    };
  }, [staffId]);
}

export default useStaffPresence;
