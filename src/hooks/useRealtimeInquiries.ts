import React, { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { supabase, safeRemoveChannel } from '../lib/supabase';
import { Inquiry } from '../types';
import { api, mapInquiryRow, matchLeadId, mergeUpdatedLeadFields } from '../services/api';

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

    const isDeleted = Boolean(
      rawRow.is_deleted === true ||
      rawRow.is_deleted === 'true' ||
      rawRow.is_deleted === 1 ||
      rawRow.isDeleted === true ||
      rawRow.isDeleted === 'true' ||
      rawRow.metadata?.is_deleted === true ||
      rawRow.metadata?.is_deleted === 'true' ||
      rawRow.metadata?.isDeleted === true ||
      rawRow.metadata?.isDeleted === 'true'
    );

    if (eventType === 'INSERT') {
      if (isDeleted) {
        setInquiries((prev) => prev.filter((item) => item.id !== payload.new?.id && String(item.id) !== String(rawRow.id) && !matchLeadId(item, rawRow.id)));
        if (optionsRef.current.onDelete) {
          optionsRef.current.onDelete(String(rawRow.id));
        }
        return;
      }

      const mapped = mapInquiryRow(rawRow);
      setInquiries((prev) => {
        const exists = prev.some((i) => matchLeadId(i, mapped.id));
        if (exists) return prev;
        return [mapped, ...prev];
      });
      if (optionsRef.current.onInsert) {
        optionsRef.current.onInsert(mapped);
      }
    } else if (eventType === 'UPDATE') {
      if (isDeleted) {
        // Soft-deleted in Supabase: remove from active leads view immediately
        setInquiries((prev) => prev.filter((item) => item.id !== payload.new?.id && String(item.id) !== String(rawRow.id) && !matchLeadId(item, rawRow.id)));
        if (optionsRef.current.onDelete) {
          optionsRef.current.onDelete(String(rawRow.id));
        }
        return;
      }

      let updatedItem: Inquiry | null = null;
      setInquiries((prev) => {
        const exists = prev.some((i) => matchLeadId(i, rawRow.id));
        if (!exists) {
          const mapped = mapInquiryRow(rawRow);
          updatedItem = mapped;
          return [mapped, ...prev];
        }
        return prev.map((i) => {
          if (!matchLeadId(i, rawRow.id)) return i;
          const merged = mergeUpdatedLeadFields(i, rawRow);
          updatedItem = merged;
          return merged;
        });
      });
      if (optionsRef.current.onUpdate && updatedItem) {
        optionsRef.current.onUpdate(updatedItem);
      }
    } else {
      // Catch-all for any other event
      if (isDeleted) {
        setInquiries((prev) => prev.filter((item) => item.id !== payload.new?.id && String(item.id) !== String(rawRow.id) && !matchLeadId(item, rawRow.id)));
        if (optionsRef.current.onDelete) {
          optionsRef.current.onDelete(String(rawRow.id));
        }
        return;
      }
      setInquiries((prev) => {
        const exists = prev.some((i) => matchLeadId(i, rawRow.id));
        if (!exists) {
          const mapped = mapInquiryRow(rawRow);
          return [mapped, ...prev];
        }
        return prev.map((i) => (matchLeadId(i, rawRow.id) ? mergeUpdatedLeadFields(i, rawRow) : i));
      });
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
    const leadsChannelName = options.channelName || `leads-realtime-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const presenceChannelName = `staff-profile-sync-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    setConnectionStatus('CONNECTING');

    // 1. Dedicated isolated channel for leads/inquiries with explicit event listeners
    const leadsChannel = supabase
      .channel(leadsChannelName)
      // Listen explicitly to 'UPDATE' events on 'leads' and 'inquiries'
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload: any) => {
          handleLeadChange(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'inquiries' },
        (payload: any) => {
          handleLeadChange(payload);
        }
      )
      // Listen to 'INSERT' events on 'leads' and 'inquiries'
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload: any) => {
          handleLeadChange(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inquiries' },
        (payload: any) => {
          handleLeadChange(payload);
        }
      )
      // Listen to 'DELETE' events on 'leads' and 'inquiries'
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'leads' },
        (payload: any) => {
          handleLeadChange(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'inquiries' },
        (payload: any) => {
          handleLeadChange(payload);
        }
      )
      .subscribe((status, err) => {
        setConnectionStatus(status);
        const errMsg = err?.message || String(err || '');
        if (
          errMsg.includes('1000') ||
          errMsg.includes('socket closed') ||
          errMsg.includes('closed before') ||
          status === 'CLOSED'
        ) {
          // Normal WebSocket teardown / reconnect in React StrictMode
          return;
        }
        if (err) {
          console.warn(`[Realtime Sync] Subscription notice on ${leadsChannelName}:`, err);
          setIsConnected(false);
        } else {
          console.log(`[Realtime Sync] Leads channel ${leadsChannelName} status:`, status);
          setIsConnected(status === 'SUBSCRIBED');
        }
      });

    // 2. Separate dedicated channel for staff & profile updates (presence / online status)
    // Kept strictly bound to staff/presence state without triggering lead table re-fetches
    const presenceChannel = supabase
      .channel(presenceChannelName)
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
        const errMsg = err?.message || String(err || '');
        if (
          errMsg.includes('1000') ||
          errMsg.includes('socket closed') ||
          errMsg.includes('closed before') ||
          status === 'CLOSED'
        ) {
          return;
        }
        if (err) {
          console.warn(`[Realtime Sync] Presence subscription notice on ${presenceChannelName}:`, err);
        } else {
          console.log(`[Realtime Sync] Presence channel ${presenceChannelName} status:`, status);
        }
      });

    // Local window event listeners for instantaneous optimistic sync
    const handleLocalLeadChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.action === 'delete' || detail?.action === 'purge') {
        const idToFilter = String(detail.leadId || detail.inquiryId || detail.lead?.id || '');
        if (idToFilter) {
          setInquiries((prev) => prev.filter((i) => !matchLeadId(i, idToFilter)));
        }
        return;
      }
      if (detail?.lead) {
        if (detail.lead.isDeleted) {
          setInquiries((prev) => prev.filter((i) => !matchLeadId(i, detail.lead.id)));
          return;
        }
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

    // Cleanup channels on unmount
    return () => {
      console.log(`[Realtime Sync] Cleaning up channels ${leadsChannelName} & ${presenceChannelName}`);
      if (typeof window !== 'undefined') {
        window.removeEventListener('tirth-lead-changed', handleLocalLeadChange);
        window.removeEventListener('tirth-inquiry-changed', handleLocalLeadChange);
      }
      safeRemoveChannel(leadsChannel);
      safeRemoveChannel(presenceChannel);
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
