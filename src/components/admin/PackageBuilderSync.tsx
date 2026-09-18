import React, { useState, useEffect, useCallback } from 'react';
import { Package } from '../../types.js';
import { api, mapPackageRow } from '../../services/api.js';
import { reconcileRealtimeList } from '../../hooks/useRealtimeSync.js';
import { supabase } from '../../lib/supabase.js';
import {
  Compass,
  Calendar,
  Users,
  CheckCircle2,
  Radio,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  Save,
} from 'lucide-react';

interface PackageBuilderSyncProps {
  initialPackageId?: string;
}

/**
 * Concrete React State-Merging Logic Example for Multi-Admin Collaborative Package Builder.
 * Features:
 * 1. Multiplexed subscription to 'public:content-sync-channel'
 * 2. In-place deduplication via `reconcileRealtimeList` to eliminate duplicate rows & key collisions
 * 3. Optimistic local updates with automatic rollback on network failure
 * 4. Real-time delta notification when another operator updates pricing or itinerary
 */
export const PackageBuilderSync: React.FC<PackageBuilderSyncProps> = ({ initialPackageId }) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [activePackage, setActivePackage] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastRemoteEdit, setLastRemoteEdit] = useState<{
    operator: string;
    action: string;
    timestamp: string;
  } | null>(null);

  // 1. Initial Data Fetching
  useEffect(() => {
    loadPackages();
  }, []);

  async function loadPackages() {
    setLoading(true);
    try {
      const list = await api.getPackages();
      setPackages(list);
      if (list.length > 0) {
        const found = initialPackageId ? list.find((p) => p.id === initialPackageId) : list[0];
        setActivePackage(found || list[0]);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
    } finally {
      setLoading(false);
    }
  }

  // 2. Realtime State Merging & Channel Subscription
  useEffect(() => {
    const channelName = 'public:content-sync-channel';
    const channel = supabase.channel(channelName);

    const handlePayload = (payload: any) => {
      const eventType = payload.eventType || payload.event || 'UPDATE';
      const raw = payload.new || payload.old;
      if (!raw) return;

      const remotePackage = mapPackageRow(raw);

      // Reconcile package list in-place
      setPackages((prevList) => reconcileRealtimeList(prevList, eventType, remotePackage));

      // If the currently edited package was updated by another operator, merge state
      setActivePackage((current) => {
        if (!current || current.id !== remotePackage.id) return current;

        // Notify user of incoming delta
        setLastRemoteEdit({
          operator: 'Colleague Operator',
          action: `Price: ₹${remotePackage.startingPrice.toLocaleString('en-IN')}`,
          timestamp: new Date().toLocaleTimeString(),
        });
        setTimeout(() => setLastRemoteEdit(null), 6000);

        return {
          ...current,
          ...remotePackage,
        };
      });
    };

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yatra_packages' }, handlePayload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, handlePayload)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Optimistic Itinerary Day Insertion with Merge Logic
  const handleAddDay = () => {
    if (!activePackage) return;
    const currentItinerary = activePackage.itinerary || [];
    const nextDayNumber = currentItinerary.length + 1;
    const newDay = {
      day: nextDayNumber,
      title: `Sacred Darshan & Temple Puja (Day ${nextDayNumber})`,
      desc: 'Morning holy snan and special sankalp with facilitation priest.',
    };

    const updatedPackage: Package = {
      ...activePackage,
      itinerary: [...currentItinerary, newDay],
    };

    // Optimistic UI merge
    setActivePackage(updatedPackage);
    setPackages((prev) => reconcileRealtimeList(prev, 'UPDATE', updatedPackage));
  };

  // 4. Save & Broadcast to Remote Admins
  const handleSavePackage = async () => {
    if (!activePackage) return;
    setIsSyncing(true);
    try {
      const saved = await api.updatePackage(activePackage.id, activePackage);
      // Authoritative state reconciliation
      setPackages((prev) => reconcileRealtimeList(prev, 'UPDATE', saved));
      setActivePackage(saved);
    } catch (err) {
      console.error('Save failed, rolling back to previous state:', err);
      loadPackages();
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-500" />
        Connecting to collaborative package builder...
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-orange-500" />
              <span>Collaborative Itinerary &amp; Pricing Builder</span>
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              WAL Deduplicated (reconcileRealtimeList)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Simultaneous multi-operator editing with state reconciliation, zero duplicate keys, and instant broadcast.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activePackage?.id || ''}
            onChange={(e) => {
              const selected = packages.find((p) => p.id === e.target.value);
              if (selected) setActivePackage(selected);
            }}
            className="bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleSavePackage}
            disabled={isSyncing}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSyncing ? 'Syncing...' : 'Save & Broadcast'}</span>
          </button>
        </div>
      </div>

      {/* Remote Edit Delta Toast */}
      {lastRemoteEdit && (
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-3 flex items-center justify-between text-xs text-sky-900 dark:text-sky-200 animate-fade-in">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-500 animate-pulse" />
            <span className="font-bold">Live Remote Edit from {lastRemoteEdit.operator}:</span>
            <span>{lastRemoteEdit.action}</span>
          </div>
          <span className="text-[10px] opacity-75">{lastRemoteEdit.timestamp}</span>
        </div>
      )}

      {/* Editor Details */}
      {activePackage && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Package Title</label>
              <input
                type="text"
                value={activePackage.title}
                onChange={(e) => setActivePackage({ ...activePackage, title: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Starting Price (₹)</label>
              <input
                type="number"
                value={activePackage.startingPrice}
                onChange={(e) => setActivePackage({ ...activePackage, startingPrice: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Circuit Duration</label>
              <input
                type="text"
                value={activePackage.duration}
                onChange={(e) => setActivePackage({ ...activePackage, duration: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Itinerary Schedule Builder */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Itinerary Schedule ({activePackage.itinerary?.length || 0} Days)
              </h3>
              <button
                onClick={handleAddDay}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-orange-500" />
                <span>Add Day</span>
              </button>
            </div>

            <div className="space-y-2">
              {(activePackage.itinerary || []).map((dayItem, index) => (
                <div
                  key={index}
                  className="bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex items-start gap-3 text-xs"
                >
                  <span className="px-2 py-1 rounded bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-bold font-mono text-[10px]">
                    Day {dayItem.day}
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">{dayItem.title}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">{dayItem.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
