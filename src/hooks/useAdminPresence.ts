import { useState, useEffect, useCallback, useMemo } from 'react';
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

    const initOrJoinChannel = async () => {
      if (!sharedChannel || sharedChannel.state === 'closed' || sharedChannel.state === 'leaving') {
        // Explicitly create and join channel 'online-admins' as requested
        const channelName = 'online-admins';
        const channelKey = adminUser?.email ? adminUser.email.toLowerCase().trim() : `admin-${Date.now()}`;

        if (sharedChannel) {
          safeRemoveChannel(sharedChannel);
        }

        const channel = supabase.channel(channelName, {
          config: {
            presence: {
              key: channelKey,
            },
          },
        });

        // 1. Register presence listeners FIRST (before subscribe)
        channel
          .on('presence', { event: 'sync' }, () => {
            processPresenceState(channel, adminUser);
          })
          .on('presence', { event: 'join' }, () => {
            processPresenceState(channel, adminUser);
          })
          .on('presence', { event: 'leave' }, () => {
            processPresenceState(channel, adminUser);
          });

        // 2. Call subscribe LAST
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            if (adminUser) {
              const presenceData: AdminPresenceInfo = {
                id: adminUser.id,
                user_id: adminUser.id,
                email: adminUser.email.toLowerCase().trim(),
                name: adminUser.name || adminUser.email.split('@')[0],
                role: adminUser.role,
                online_at: new Date().toISOString(),
              };
              try {
                await channel.track(presenceData);
                processPresenceState(channel, adminUser);
              } catch (err) {
                console.warn('[useAdminPresence] Failed to track presence:', err);
              }
            }
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
          }
        });

        sharedChannel = channel;
      } else {
        // Channel already exists and is subscribed, just track presence without re-adding callbacks
        setIsConnected(sharedChannel.state === 'joined');
        if (adminUser && sharedChannel.state === 'joined') {
          sharedChannel.track({
            id: adminUser.id,
            user_id: adminUser.id,
            email: adminUser.email.toLowerCase().trim(),
            name: adminUser.name || adminUser.email.split('@')[0],
            role: adminUser.role,
            online_at: new Date().toISOString(),
          }).catch(() => {});
        }
        processPresenceState(sharedChannel, adminUser);
      }
    };

    initOrJoinChannel();

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
          safeRemoveChannel(sharedChannel);
          sharedChannel = null;
          currentPresences = [];
          currentEmails = new Set();
          currentIds = new Set();
        }
      }
    };
  }, [handleUpdate, adminUser]);

  // Synchronize presence tracking when adminUser updates (e.g., auth loads)
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
