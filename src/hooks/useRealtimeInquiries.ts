import React, { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { supabase } from '../lib/supabase';
import { Inquiry } from '../types';
import { api, mapInquiryRow } from '../services/api';

export interface UseRealtimeInquiriesOptions {
  onInsert?: (inquiry: Inquiry) => void;
  onUpdate?: (inquiry: Inquiry) => void;
  onDelete?: (id: string) => void;
  onProfileUpdate?: (profile: any) => void;
  initialInquiries?: Inquiry[];
  autoFetch?: boolean;
  channelName?: string;
}

export interface UseRealtimeInquiriesResult {
  inquiries: Inquiry[];
  setInquiries: Dispatch<SetStateAction<Inquiry[]>>;
  connectionStatus: string;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

type HookInput = ((updatedInquiry: Inquiry) => void) | UseRealtimeInquiriesOptions | undefined;

export function useRealtimeInquiries(param?: HookInput): UseRealtimeInquiriesResult {
  // Normalize parameter to support both callback function and options object
  const options: UseRealtimeInquiriesOptions =
    typeof param === 'function' ? { onUpdate: param } : (param || {});

  const [inquiries, setInquiries] = useState<Inquiry[]>(options.initialInquiries || []);
  const [connectionStatus, setConnectionStatus] = useState<string>('CONNECTING');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(options.autoFetch !== false);
  const [error, setError] = useState<string | null>(null);

  // Store options in ref to avoid reconnecting channel whenever inline callbacks change
  const optionsRef = useRef<UseRealtimeInquiriesOptions>(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInquiries();
      setInquiries(data);
    } catch (err: any) {
      console.error('[Realtime Sync] Failed fetching inquiries/leads:', err);
      setError(err.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch if autoFetch is not explicitly false
  useEffect(() => {
    if (options.autoFetch !== false) {
      refetch();
    }
  }, [refetch, options.autoFetch]);

  // Handle lead/inquiry row mutation payload
  const handleLeadChange = useCallback((payload: any) => {
    const eventType = payload.eventType || payload.event;
    console.log(`📡 [Realtime Sync] Lead/Inquiry change [${eventType}]:`, payload);

    if (eventType === 'DELETE') {
      const deletedId = String(payload.old?.id || payload.new?.id || '');
      if (deletedId) {
        setInquiries((prev) => prev.filter((i) => String(i.id) !== deletedId));
        if (optionsRef.current.onDelete) {
          optionsRef.current.onDelete(deletedId);
        }
      }
      return;
    }

    const rawRow = payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old;
    if (!rawRow || !rawRow.id) {
      console.warn('[Realtime Sync] Received payload without valid row or id:', payload);
      return;
    }

    const mapped = mapInquiryRow(rawRow);

    if (eventType === 'INSERT') {
      setInquiries((prev) => {
        const exists = prev.some((i) => String(i.id) === String(mapped.id));
        if (exists) return prev;
        return [mapped, ...prev];
      });
      if (optionsRef.current.onInsert) {
        optionsRef.current.onInsert(mapped);
      }
    } else {
      // UPDATE or other
      setInquiries((prev) => {
        const exists = prev.some((i) => String(i.id) === String(mapped.id));
        if (!exists) {
          return [mapped, ...prev];
        }
        return prev.map((i) => (String(i.id) === String(mapped.id) ? { ...i, ...mapped } : i));
      });
      if (optionsRef.current.onUpdate) {
        optionsRef.current.onUpdate(mapped);
      }
    }
  }, []);

  // Handle staff/profile online status updates
  const handleProfileChange = useCallback((payload: any) => {
    console.log('📡 [Realtime Sync] Profile/Staff change:', payload);
    const profileRow = payload.new || payload.old;
    if (!profileRow) return;

    if (optionsRef.current.onProfileUpdate) {
      optionsRef.current.onProfileUpdate(profileRow);
    }

    // Also broadcast custom window event for instant cross-component synchronization
    if (typeof window !== 'undefined' && profileRow.id) {
      window.dispatchEvent(
        new CustomEvent('tirth-staff-presence-changed', {
          detail: {
            staffId: profileRow.id,
            isOnline: Boolean(profileRow.is_online ?? profileRow.is_currently_logged_in),
            lastSeen: profileRow.last_seen || profileRow.last_active_at,
          },
        })
      );
    }
  }, []);

  // Realtime Supabase Channel Subscription
  useEffect(() => {
    const channelName = options.channelName || 'schema-db-changes';
    setConnectionStatus('CONNECTING');

    const channel = supabase
      .channel(channelName)
      // Listen to 'leads' table changes (INSERT/UPDATE/DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload: any) => {
          handleLeadChange(payload);
        }
      )
      // Also listen to 'inquiries' table changes (INSERT/UPDATE/DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inquiries' },
        (payload: any) => {
          handleLeadChange(payload);
        }
      )
      // Listen to 'profiles' table changes (UPDATE) to refresh online staff indicators
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload: any) => {
          handleProfileChange(payload);
        }
      )
      // Also listen to 'staff_members' table changes (UPDATE)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'staff_members' },
        (payload: any) => {
          handleProfileChange(payload);
        }
      )
      .subscribe((status, err) => {
        setConnectionStatus(status);
        if (err) {
          console.error(`[Realtime Sync] Subscription error on ${channelName}:`, err);
          setIsConnected(false);
        } else {
          console.log(`[Realtime Sync] Channel ${channelName} status:`, status);
          setIsConnected(status === 'SUBSCRIBED');
        }
      });

    // Local window event listeners for instantaneous optimistic sync
    const handleLocalLeadChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.lead) {
        setInquiries((prev) => {
          const exists = prev.some((i) => String(i.id) === String(detail.lead.id));
          if (!exists) return [detail.lead, ...prev];
          return prev.map((i) => (String(i.id) === String(detail.lead.id) ? { ...i, ...detail.lead } : i));
        });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('tirth-lead-changed', handleLocalLeadChange);
      window.addEventListener('tirth-inquiry-changed', handleLocalLeadChange);
    }

    // Cleanup channel on unmount
    return () => {
      console.log(`[Realtime Sync] Cleaning up channel ${channelName}`);
      if (typeof window !== 'undefined') {
        window.removeEventListener('tirth-lead-changed', handleLocalLeadChange);
        window.removeEventListener('tirth-inquiry-changed', handleLocalLeadChange);
      }
      supabase.removeChannel(channel);
    };
  }, [handleLeadChange, handleProfileChange, options.channelName]);

  return {
    inquiries,
    setInquiries,
    connectionStatus,
    isConnected,
    loading,
    error,
    refetch,
  };
}

/**
 * Convenience hook specifically naming lead sync requirements
 */
export function useRealtimeLeadSync(options?: {
  onLeadChange?: (lead: Inquiry, eventType: string) => void;
  onProfileUpdate?: (profile: any) => void;
  initialLeads?: Inquiry[];
  channelName?: string;
}) {
  return useRealtimeInquiries({
    channelName: options?.channelName || 'schema-db-changes',
    initialInquiries: options?.initialLeads,
    onInsert: (lead) => options?.onLeadChange?.(lead, 'INSERT'),
    onUpdate: (lead) => options?.onLeadChange?.(lead, 'UPDATE'),
    onDelete: (id) => options?.onLeadChange?.({ id } as Inquiry, 'DELETE'),
    onProfileUpdate: options?.onProfileUpdate,
  });
}
