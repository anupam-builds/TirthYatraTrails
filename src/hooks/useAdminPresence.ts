import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, safeRemoveChannel } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.js';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface AdminPresenceInfo {
  id?: string;
  user_id?: string;
  email?: string;
  name?: string;
  role?: string;
  online_at?: string;
  [key: string]: any;
}

// Module-level shared singleton state across components
let sharedChannel: RealtimeChannel | null = null;
let subscribersCount = 0;
let isSettingUpChannel = false;
let setupPromise: Promise<void> | null = null;
let currentPresences: AdminPresenceInfo[] = [];
let currentEmails = new Set<string>();
let currentIds = new Set<string>();
const listeners = new Set<(presences: AdminPresenceInfo[], emails: Set<string>, ids: Set<string>) => void>();
let adminPresenceCleanupTimer: ReturnType<typeof setTimeout> | null = null;

function notifyListeners() {
  listeners.forEach((listener) => {
    listener(currentPresences, currentEmails, currentIds);
  });
}

function processPresenceState(channel: RealtimeChannel, fallbackAdmin?: { id?: string; email?: string; name?: string; role?: string } | null) {
  try {
    const rawState = channel.presenceState();
    const presences: AdminPresenceInfo[] = [];
    const emails = new Set<string>();
    const ids = new Set<string>();

    Object.entries(rawState).forEach(([key, items]) => {
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          presences.push(item);
          if (item.email) emails.add(item.email.toLowerCase().trim());
          if (item.user_id) ids.add(String(item.user_id));
          if (item.id) ids.add(String(item.id));
        });
      }
      if (key && key.includes('@')) {
        emails.add(key.toLowerCase().trim());
      }
    });

    // Always include current logged-in admin as online locally
    if (fallbackAdmin?.email) {
      emails.add(fallbackAdmin.email.toLowerCase().trim());
    }
    if (fallbackAdmin?.id) {
      ids.add(String(fallbackAdmin.id));
    }

    currentPresences = presences;
    currentEmails = emails;
    currentIds = ids;
    notifyListeners();
  } catch (err) {
    console.warn('[useAdminPresence] Error processing presence state:', err);
  }
}

async function ensureOnlineAdminsChannel(currentUser?: { id?: string; email?: string; name?: string; role?: string } | null) {
  // If channel is already joined or joining, reuse without re-subscribing or attaching duplicate listeners
  if (sharedChannel && (sharedChannel.state === 'joined' || sharedChannel.state === 'joining')) {
    if (currentUser && sharedChannel.state === 'joined') {
      sharedChannel.track({
        id: currentUser.id,
        user_id: currentUser.id,
        email: currentUser.email?.toLowerCase().trim(),
        name: currentUser.name || currentUser.email?.split('@')[0],
        role: currentUser.role,
        online_at: new Date().toISOString(),
      }).catch(() => {});
    }
    processPresenceState(sharedChannel, currentUser);
    return;
  }

  if (isSettingUpChannel && setupPromise) {
    return setupPromise;
  }

  isSettingUpChannel = true;
  setupPromise = (async () => {
    try {
      const channelName = 'online-admins';

      // 1. Check if an existing channel with that topic is already mounted in supabase.getChannels()
      const existingChannels = supabase.getChannels().filter(
        (c: any) => c.topic === `realtime:${channelName}` || c.subTopic === channelName || c.topic?.includes(channelName)
      );

      // Remove it first using await supabase.removeChannel(existingChannel)
      for (const existingChannel of existingChannels) {
        try {
          await supabase.removeChannel(existingChannel);
        } catch (e) {
          console.warn('[useAdminPresence] Error removing existing channel:', e);
        }
      }

      if (subscribersCount <= 0) {
        return;
      }

      // 2. Create fresh channel instance
      const adminChannel = supabase.channel(channelName);
      sharedChannel = adminChannel;

      // 3. Attach .on('presence', ...) listeners BEFORE subscribe
      adminChannel
        .on('presence', { event: 'sync' }, () => {
          processPresenceState(adminChannel, currentUser);
        })
        .on('presence', { event: 'join' }, ({ newPresences }: any) => {
          processPresenceState(adminChannel, currentUser);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
          processPresenceState(adminChannel, currentUser);
        });

      // 4. Call subscribe LAST
      adminChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          if (currentUser) {
            const presenceData: AdminPresenceInfo = {
              id: currentUser.id,
              user_id: currentUser.id,
              email: currentUser.email?.toLowerCase().trim(),
              name: currentUser.name || currentUser.email?.split('@')[0],
              role: currentUser.role,
              online_at: new Date().toISOString(),
            };
            try {
              await adminChannel.track(presenceData);
              processPresenceState(adminChannel, currentUser);
            } catch (err) {
              console.warn('[useAdminPresence] Failed to track presence:', err);
            }
          }
        }
      });
    } finally {
      isSettingUpChannel = false;
      setupPromise = null;
    }
  })();

  return setupPromise;
}

export function useAdminPresence() {
  const { adminUser } = useAuth();
  const adminUserRef = useRef(adminUser);
  adminUserRef.current = adminUser;

  const [onlinePresences, setOnlinePresences] = useState<AdminPresenceInfo[]>(currentPresences);
  const [onlineEmails, setOnlineEmails] = useState<Set<string>>(currentEmails);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(currentIds);
  const [isConnected, setIsConnected] = useState<boolean>(sharedChannel?.state === 'joined');

  // Callback to update local component state when shared presence changes
  const handleUpdate = useCallback(
    (presences: AdminPresenceInfo[], emails: Set<string>, ids: Set<string>) => {
      setOnlinePresences([...presences]);
      setOnlineEmails(new Set(emails));
      setOnlineIds(new Set(ids));
    },
    []
  );

  useEffect(() => {
    if (adminPresenceCleanupTimer) {
      clearTimeout(adminPresenceCleanupTimer);
      adminPresenceCleanupTimer = null;
    }

    listeners.add(handleUpdate);
    subscribersCount++;

    ensureOnlineAdminsChannel(adminUserRef.current).then(() => {
      setIsConnected(sharedChannel?.state === 'joined');
    });

    const handleBeforeUnload = () => {
      if (sharedChannel) {
        sharedChannel.untrack().catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      listeners.delete(handleUpdate);
      subscribersCount--;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);

      // If no more components are subscribed, debounce cleanup to survive React StrictMode remounts
      if (subscribersCount <= 0) {
        subscribersCount = 0;
        if (sharedChannel) {
          if (adminPresenceCleanupTimer) clearTimeout(adminPresenceCleanupTimer);
          adminPresenceCleanupTimer = setTimeout(() => {
            if (subscribersCount <= 0 && sharedChannel) {
              const toRemove = sharedChannel;
              sharedChannel = null;
              toRemove.untrack().catch(() => {});
              safeRemoveChannel(toRemove, 100);
              currentPresences = [];
              currentEmails = new Set();
              currentIds = new Set();
            }
          }, 250);
        }
      }
    };
  }, [handleUpdate]);

  // Synchronize presence tracking when adminUser updates (e.g., auth loads or changes)
  useEffect(() => {
    if (sharedChannel && adminUser && sharedChannel.state === 'joined') {
      sharedChannel.track({
        id: adminUser.id,
        user_id: adminUser.id,
        email: adminUser.email.toLowerCase().trim(),
        name: adminUser.name || adminUser.email.split('@')[0],
        role: adminUser.role,
        online_at: new Date().toISOString(),
      }).then(() => {
        if (sharedChannel) {
          processPresenceState(sharedChannel, adminUser);
        }
      }).catch(() => {});
    }
  }, [adminUser]);

  // Helper to determine if an administrator is online
  const isOnline = useCallback(
    (target: { id?: string; email?: string } | string | undefined | null): boolean => {
      if (!target) return false;

      // Current active admin is always online in their own session
      const currentEmail = adminUser?.email?.toLowerCase().trim();
      const currentId = adminUser?.id ? String(adminUser.id) : '';

      if (typeof target === 'string') {
        const clean = target.toLowerCase().trim();
        if (clean.includes('@')) {
          if (currentEmail && clean === currentEmail) return true;
          return onlineEmails.has(clean);
        }
        if (currentId && target === currentId) return true;
        return onlineIds.has(target);
      }

      const email = target.email?.toLowerCase().trim();
      const id = target.id ? String(target.id) : '';

      if (email) {
        if (currentEmail && email === currentEmail) return true;
        if (onlineEmails.has(email)) return true;
      }

      if (id) {
        if (currentId && id === currentId) return true;
        if (onlineIds.has(id)) return true;
      }

      return false;
    },
    [adminUser, onlineEmails, onlineIds]
  );

  // Number of unique connected online administrators
  const onlineCount = useMemo(() => {
    const unique = new Set<string>();
    onlineEmails.forEach((email) => unique.add(email));
    if (adminUser?.email) unique.add(adminUser.email.toLowerCase().trim());
    return unique.size;
  }, [onlineEmails, adminUser]);

  return {
    isOnline,
    onlineCount,
    onlinePresences,
    onlineEmails,
    onlineIds,
    isConnected,
    channel: sharedChannel,
  };
}

export default useAdminPresence;
