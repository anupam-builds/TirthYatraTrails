import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { supabase } from '../lib/supabase.js';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ==============================================================================
// 1. STATE RECONCILIATION HELPER (Optimistic & Deduplicating)
// ==============================================================================

/**
 * Pure state reconciliation function for React state arrays.
 * Handles INSERT, UPDATE, DELETE while deduplicating by ID to eliminate
 * UI flickering and duplicate key warnings when optimistic updates meet backend broadcasts.
 */
export function reconcileRealtimeList<T extends Record<string, any>>(
  prevList: T[],
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string,
  incomingRecord: T,
  idKey: keyof T = 'id' as keyof T,
  order: 'prepend' | 'append' = 'prepend'
): T[] {
  if (!incomingRecord) return prevList;
  const targetId = String(incomingRecord[idKey]);

  if (eventType === 'DELETE') {
    return prevList.filter((item) => String(item[idKey]) !== targetId);
  }

  const existingIndex = prevList.findIndex((item) => String(item[idKey]) === targetId);

  if (eventType === 'INSERT') {
    if (existingIndex !== -1) {
      // Record was already inserted optimistically; merge latest authoritative values
      const updated = [...prevList];
      updated[existingIndex] = { ...updated[existingIndex], ...incomingRecord };
      return updated;
    }
    return order === 'prepend' ? [incomingRecord, ...prevList] : [...prevList, incomingRecord];
  }

  if (eventType === 'UPDATE') {
    if (existingIndex !== -1) {
      const updated = [...prevList];
      updated[existingIndex] = { ...updated[existingIndex], ...incomingRecord };
      return updated;
    }
    // If not found in current window, insert it to keep list fresh
    return order === 'prepend' ? [incomingRecord, ...prevList] : [...prevList, incomingRecord];
  }

  return prevList;
}

// ==============================================================================
// 2. STATIC CHANNEL MULTIPLEXING REGISTRY
// Prevents channel churn, socket reconnection storms, and connection exhaustion
// ==============================================================================

type ChangeHandler = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  newRecord: any;
  oldRecord: any;
  table: string;
}) => void;

interface ChannelRegistration {
  channel: RealtimeChannel;
  subscribers: Map<string, Set<ChangeHandler>>;
  refCount: number;
}

const activeChannels = new Map<string, ChannelRegistration>();

function registerChannelListener(
  channelName: string,
  table: string,
  handler: ChangeHandler
): () => void {
  let reg = activeChannels.get(channelName);

  if (!reg) {
    const channel = supabase.channel(channelName);
    reg = {
      channel,
      subscribers: new Map(),
      refCount: 0,
    };
    activeChannels.set(channelName, reg);
  }

  if (!reg.subscribers.has(table)) {
    reg.subscribers.set(table, new Set());

    // Register Postgres change listener for this table on the shared channel
    reg.channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload: any) => {
        const eventType = (payload.eventType || payload.event || 'UPDATE') as 'INSERT' | 'UPDATE' | 'DELETE';
        const handlers = reg?.subscribers.get(table);
        if (handlers && handlers.size > 0) {
          handlers.forEach((fn) => {
            try {
              fn({
                eventType,
                newRecord: payload.new,
                oldRecord: payload.old,
                table,
              });
            } catch (err) {
              console.error(`[Realtime Sync] Error executing listener for ${table}:`, err);
            }
          });
        }
      }
    );
  }

  reg.subscribers.get(table)!.add(handler);
  reg.refCount++;

  // Subscribe channel if not already subscribed
  reg.channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      // Channel connected
    }
  });

  return () => {
    const currentReg = activeChannels.get(channelName);
    if (!currentReg) return;

    const tableSet = currentReg.subscribers.get(table);
    if (tableSet) {
      tableSet.delete(handler);
    }

    currentReg.refCount--;

    if (currentReg.refCount <= 0) {
      supabase.removeChannel(currentReg.channel);
      activeChannels.delete(channelName);
    }
  };
}

// ==============================================================================
// 3. UNIVERSAL REALTIME SYNC HOOK
// ==============================================================================

export interface RealtimeSyncOptions<T> {
  table: string | string[]; // Single table or multiple tables multiplexed
  channelName?: string; // Defaults to 'public:content-sync-channel'
  idKey?: keyof T;
  mapRow?: (raw: any) => T;
  onInsert?: (record: T, table: string) => void;
  onUpdate?: (record: T, oldRecord: Partial<T> | null, table: string) => void;
  onDelete?: (id: string, table: string) => void;
  onChange?: (event: { type: 'INSERT' | 'UPDATE' | 'DELETE'; record: T; table: string }) => void;
  initialData?: T[];
  autoFetch?: () => Promise<T[]>;
  enabled?: boolean;
}

export interface RealtimeSyncResult<T> {
  data: T[];
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isConnected: boolean;
}

export function useRealtimeSync<T extends Record<string, any>>({
  table,
  channelName = 'public:content-sync-channel',
  idKey = 'id' as keyof T,
  mapRow = (raw: any) => raw as T,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  initialData = [],
  autoFetch,
  enabled = true,
}: RealtimeSyncOptions<T>): RealtimeSyncResult<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState<boolean>(Boolean(autoFetch));
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  const optionsRef = useRef({ onInsert, onUpdate, onDelete, onChange, mapRow, idKey });
  useEffect(() => {
    optionsRef.current = { onInsert, onUpdate, onDelete, onChange, mapRow, idKey };
  });

  const refetch = useCallback(async () => {
    if (!autoFetch) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await autoFetch();
      setData(fresh);
    } catch (err: any) {
      console.error(`[Realtime Sync] Failed autoFetch for table(s) ${String(table)}:`, err);
      setError(err?.message || 'Failed to sync data');
    } finally {
      setLoading(false);
    }
  }, [autoFetch, table]);

  // Initial load
  useEffect(() => {
    if (enabled && autoFetch) {
      refetch();
    }
  }, [enabled, refetch]);

  // Realtime subscription registration
  useEffect(() => {
    if (!enabled) return;

    const tables = Array.isArray(table) ? table : [table];
    const cleanups: Array<() => void> = [];

    tables.forEach((tbl) => {
      const cleanup = registerChannelListener(channelName, tbl, (payload) => {
        const { eventType, newRecord, oldRecord, table: sourceTable } = payload;
        const currentOpts = optionsRef.current;

        if (eventType === 'DELETE') {
          const rawId = oldRecord?.id || newRecord?.id;
          const targetId = String(rawId || '');

          if (targetId) {
            setData((prev) => prev.filter((item) => String(item[currentOpts.idKey]) !== targetId));
            currentOpts.onDelete?.(targetId, sourceTable);
            currentOpts.onChange?.({ type: 'DELETE', record: { [currentOpts.idKey]: targetId } as any, table: sourceTable });
          }
          return;
        }

        const raw = newRecord || oldRecord;
        if (!raw) return;

        const mappedRecord = currentOpts.mapRow(raw);

        setData((prev) =>
          reconcileRealtimeList(prev, eventType, mappedRecord, currentOpts.idKey)
        );

        if (eventType === 'INSERT') {
          currentOpts.onInsert?.(mappedRecord, sourceTable);
          currentOpts.onChange?.({ type: 'INSERT', record: mappedRecord, table: sourceTable });
        } else if (eventType === 'UPDATE') {
          const mappedOld = oldRecord ? currentOpts.mapRow(oldRecord) : null;
          currentOpts.onUpdate?.(mappedRecord, mappedOld, sourceTable);
          currentOpts.onChange?.({ type: 'UPDATE', record: mappedRecord, table: sourceTable });
        }
      });

      cleanups.push(cleanup);
    });

    setIsConnected(true);

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [channelName, enabled, table]);

  return {
    data,
    setData,
    loading,
    error,
    refetch,
    isConnected,
  };
}

// ==============================================================================
// 4. SPECIALIZED DOMAIN REALTIME HOOKS
// ==============================================================================

import type { Package, City, TransitHub, HotelInventory, TravelStory } from '../types.js';
import { api, mapCityRow } from '../services/api.js';

/**
 * Real-time Yatra Packages hook (subscribes to public.packages)
 */
export function useRealtimePackages(options?: {
  category?: string;
  query?: string;
  onUpdate?: (pkg: Package) => void;
  onInsert?: (pkg: Package) => void;
  onDelete?: (id: string) => void;
}) {
  return useRealtimeSync<Package>({
    table: 'packages',
    channelName: 'public:content-sync-channel',
    autoFetch: () => api.getPackages(options?.category, options?.query),
    onInsert: options?.onInsert,
    onUpdate: (pkg) => options?.onUpdate?.(pkg),
    onDelete: options?.onDelete,
  });
}

/**
 * Real-time Sacred Cities & Transit Hubs hook (multiplexed content sync)
 */
export function useRealtimeCitiesAndHubs(options?: {
  onCityChange?: (city: City) => void;
  onHubChange?: (hub: TransitHub) => void;
}) {
  const [cities, setCities] = useState<City[]>([]);
  const [hubs, setHubs] = useState<TransitHub[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [cList, hList] = await Promise.all([api.getCities(), api.getHubs()]);
      setCities(cList);
      setHubs(hList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const unsubCities = registerChannelListener('public:content-sync-channel', 'cities', (payload) => {
      if (payload.eventType === 'DELETE') {
        const id = String(payload.oldRecord?.id || payload.newRecord?.id);
        setCities((prev) => {
          const nextCities = prev.filter((c) => c.id !== id);
          setHubs((currHubs) => currHubs.filter((h) => h.cityId !== id));
          return nextCities;
        });
        return;
      }
      const raw = payload.newRecord || payload.oldRecord;
      if (!raw) return;
      const mapped: City = mapCityRow(raw);
      setCities((prev) => {
        const updated = reconcileRealtimeList(prev, payload.eventType, mapped);
        const allHubs: TransitHub[] = [];
        updated.forEach((c) => {
          if (Array.isArray(c.transitHubs)) {
            c.transitHubs.forEach((h) => {
              allHubs.push({ ...h, cityId: h.cityId || c.id, cityName: h.cityName || c.name });
            });
          }
        });
        if (allHubs.length > 0) {
          setHubs(allHubs);
        }
        return updated;
      });
      options?.onCityChange?.(mapped);
    });

    return () => {
      unsubCities();
    };
  }, [options]);

  return {
    cities,
    setCities,
    hubs,
    setHubs,
    loading,
    refetch,
  };
}

/**
 * Real-time Hotel Inventory hook with delta tracking (Full Replica Identity)
 */
export function useRealtimeHotelInventory(hotelId?: string) {
  return useRealtimeSync<HotelInventory>({
    table: 'hotel_inventory',
    channelName: 'public:content-sync-channel',
    autoFetch: () => api.getHotelInventory(hotelId),
    mapRow: (raw: any): HotelInventory => ({
      id: String(raw.id),
      hotelId: raw.hotel_id || raw.hotelId,
      hotelName: raw.hotel_name || raw.hotelName,
      roomId: raw.room_id || raw.roomId,
      roomType: raw.room_type || raw.roomType || 'Deluxe Room',
      date: raw.date,
      totalInventory: Number(raw.total_inventory ?? raw.totalInventory ?? 10),
      bookedCount: Number(raw.booked_count ?? raw.bookedCount ?? 0),
      blockedCount: Number(raw.blocked_count ?? raw.blockedCount ?? 0),
      availableCount: Number(raw.available_count ?? raw.availableCount ?? 10),
      priceOverride: raw.price_override ? Number(raw.price_override) : undefined,
      status: raw.status || 'AVAILABLE',
      updatedBy: raw.updated_by || raw.updatedBy,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    }),
  });
}

/**
 * Real-time Travel Stories hook
 */
export function useRealtimeTravelStories() {
  return useRealtimeSync<TravelStory>({
    table: 'travel_stories',
    channelName: 'public:content-sync-channel',
    autoFetch: () => api.getTravelStories(),
    mapRow: (raw: any): TravelStory => ({
      id: String(raw.id),
      title: raw.title,
      slug: raw.slug,
      authorName: raw.author_name || raw.authorName || 'Devotee Pilgrim',
      authorRole: raw.author_role || raw.authorRole,
      excerpt: raw.excerpt,
      content: raw.content || '',
      destination: raw.destination,
      coverImage: raw.cover_image || raw.coverImage,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      readTimeMinutes: Number(raw.read_time_minutes ?? raw.readTimeMinutes ?? 5),
      isPublished: Boolean(raw.is_published ?? raw.isPublished ?? true),
      publishedAt: raw.published_at,
      likesCount: Number(raw.likes_count ?? raw.likesCount ?? 0),
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    }),
  });
}
