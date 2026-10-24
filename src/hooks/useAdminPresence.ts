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
let currentPresences: AdminPresenceInfo[] = [];
let currentEmails = new Set<string>();
let currentIds = new Set<string>();
const listeners = new Set<(presences: AdminPresenceInfo[], emails: Set<string>, ids: Set<string>) => void>();

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
    listeners.add(handleUpdate);
    subscribersCount++;

    // Ensure we do not re-subscribe or add duplicate callbacks to an already active channel
    if (!sharedChannel || sharedChannel.state === 'closed' || sharedChannel.state === 'leaving') {
      const channelName = 'online-admins';

      // Check if any stale channel with this topic already exists in supabase client
      const existing = supabase.getChannels().find(
        (c: any) => c.topic === `realtime:${channelName}` || c.subTopic === channelName
      );
      if (existing) {
        supabase.removeChannel(existing);
      }

      // Explicitly declare channel variable
      const adminChannel = supabase.channel(channelName);

      // Immediately register shared reference synchronously to block concurrent race conditions
      sharedChannel = adminChannel;

      // 1. Attach listeners FIRST
      adminChannel
        .on('presence', { event: 'sync' }, () => {
          processPresenceState(adminChannel, adminUserRef.current);
        })
        .on('presence', { event: 'join' }, ({ newPresences }: any) => {
          processPresenceState(adminChannel, adminUserRef.current);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
          processPresenceState(adminChannel, adminUserRef.current);
        });

      // 2. Call subscribe LAST
      adminChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          const currentUser = adminUserRef.current;
          if (currentUser) {
            const presenceData: AdminPresenceInfo = {
              id: currentUser.id,
              user_id: currentUser.id,
              email: currentUser.email.toLowerCase().trim(),
              name: currentUser.name || currentUser.email.split('@')[0],
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
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });
    } else {
      // Channel already exists and is subscribed: do not call .on('presence') or .subscribe() again
      setIsConnected(sharedChannel.state === 'joined');
      if (adminUserRef.current && sharedChannel.state === 'joined') {
        sharedChannel.track({
          id: adminUserRef.current.id,
          user_id: adminUserRef.current.id,
          email: adminUserRef.current.email.toLowerCase().trim(),
          name: adminUserRef.current.name || adminUserRef.current.email.split('@')[0],
          role: adminUserRef.current.role,
          online_at: new Date().toISOString(),
        }).catch(() => {});
      }
      processPresenceState(sharedChannel, adminUserRef.current);
    }

    // Track on unload / pagehide
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

      // If no more components are subscribed, cleanup the channel
      if (subscribersCount <= 0) {
        subscribersCount = 0;
        if (sharedChannel) {
          sharedChannel.untrack().catch(() => {});
          supabase.removeChannel(sharedChannel);
          sharedChannel = null;
          currentPresences = [];
          currentEmails = new Set();
          currentIds = new Set();
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
