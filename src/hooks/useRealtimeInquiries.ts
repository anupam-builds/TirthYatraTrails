import React, { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { supabase } from '../lib/supabase';
import { Inquiry } from '../types';
import { api, mapInquiryRow } from '../services/api';

export interface UseRealtimeInquiriesOptions {
  onInsert?: (inquiry: Inquiry) => void;
  onUpdate?: (inquiry: Inquiry) => void;
  onDelete?: (id: string) => void;
  initialInquiries?: Inquiry[];
  autoFetch?: boolean;
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
      console.error('[Realtime Sync] Failed fetching inquiries:', err);
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

  useEffect(() => {
    // Static reliable shared channel name
    const channelName = 'public:inquiries-global-sync';
    setConnectionStatus('CONNECTING');

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inquiries' },
        (payload: any) => {
          const eventType = payload.eventType || payload.event;
          console.log(`📡 [Realtime Sync] postgres_changes [${eventType}]:`, payload);

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

    return () => {
      console.log(`[Realtime Sync] Cleaning up channel ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, []);

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
