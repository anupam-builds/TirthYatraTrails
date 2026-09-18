import React, { useState, useEffect } from 'react';
import { HotelInventory, Hotel } from '../../types.js';
import { api, mapHotelInventoryRow } from '../../services/api.js';
import { reconcileRealtimeList } from '../../hooks/useRealtimeSync.js';
import { supabase } from '../../lib/supabase.js';
import {
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  Minus,
  Sparkles,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Clock,
  Radio,
} from 'lucide-react';

interface HotelInventoryGridProps {
  hotel: Hotel;
  onClose?: () => void;
}

export const HotelInventoryGrid: React.FC<HotelInventoryGridProps> = ({ hotel, onClose }) => {
  const [inventory, setInventory] = useState<HotelInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);
  const [recentDelta, setRecentDelta] = useState<{
    id: string;
    roomType: string;
    date: string;
    changeType: 'BOOKING' | 'BLOCK' | 'PRICE' | 'ALLOCATION';
    text: string;
  } | null>(null);

  // Fetch initial allocations
  useEffect(() => {
    loadInventory();
  }, [hotel.id]);

  async function loadInventory() {
    setLoading(true);
    try {
      const data = await api.getHotelInventory(hotel.id);
      setInventory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Real-time synchronization with Postgres delta tracking (REPLICA IDENTITY FULL)
  useEffect(() => {
    const channelName = 'public:content-sync-channel';
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hotel_inventory',
          filter: `hotel_id=eq.${hotel.id}`,
        },
        (payload: any) => {
          const eventType = payload.eventType || payload.event || 'UPDATE';
          const newRow = payload.new;
          const oldRow = payload.old;

          if (eventType === 'DELETE') {
            const id = String(oldRow?.id || newRow?.id);
            setInventory((prev) => prev.filter((item) => item.id !== id));
            return;
          }

          if (newRow) {
            const mappedNew = mapHotelInventoryRow(newRow);

            // Calculate Delta using REPLICA IDENTITY FULL
            if (oldRow && eventType === 'UPDATE') {
              const oldBooked = Number(oldRow.booked_count ?? 0);
              const newBooked = Number(newRow.booked_count ?? 0);
              const oldBlocked = Number(oldRow.blocked_count ?? 0);
              const newBlocked = Number(newRow.blocked_count ?? 0);

              if (newBooked > oldBooked) {
                setRecentDelta({
                  id: mappedNew.id,
                  roomType: mappedNew.roomType,
                  date: mappedNew.date,
                  changeType: 'BOOKING',
                  text: `Delta: +${newBooked - oldBooked} Booked (${mappedNew.availableCount} available)`,
                });
              } else if (newBlocked > oldBlocked) {
                setRecentDelta({
                  id: mappedNew.id,
                  roomType: mappedNew.roomType,
                  date: mappedNew.date,
                  changeType: 'BLOCK',
                  text: `Delta: +${newBlocked - oldBlocked} Blocked for VIP Yatra`,
                });
              }
              setTimeout(() => setRecentDelta(null), 5000);
            }

            // Deduplicate and reconcile in-place to prevent UI jitter
            setInventory((prev) => reconcileRealtimeList(prev, eventType, mappedNew));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotel.id]);

  // Adjust Blocked count optimistically & persist
  const handleAdjustBlocked = async (item: HotelInventory, delta: number) => {
    const newBlocked = Math.max(0, Math.min(item.totalInventory - item.bookedCount, item.blockedCount + delta));
    const newAvailable = Math.max(0, item.totalInventory - item.bookedCount - newBlocked);

    let newStatus = item.status;
    if (newAvailable === 0) newStatus = 'SOLD_OUT';
    else if (newStatus !== 'BLOCKED' && newAvailable <= 2) newStatus = 'FAST_FILLING';
    else if (newStatus !== 'BLOCKED') newStatus = 'AVAILABLE';

    const optimistic: HotelInventory = {
      ...item,
      blockedCount: newBlocked,
      availableCount: newAvailable,
      status: newStatus,
      updatedBy: 'Admin (Live)',
    };

    // 1. Optimistic reconcile
    setInventory((prev) => reconcileRealtimeList(prev, 'UPDATE', optimistic));

    // 2. Persist to Supabase
    try {
      await api.updateHotelInventory(item.id, {
        blockedCount: newBlocked,
        status: newStatus,
        updatedBy: 'Admin Operator',
      });
    } catch (err) {
      console.error('Failed to update inventory:', err);
      loadInventory(); // Rollback on network failure
    }
  };

  const getStatusBadge = (status: HotelInventory['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> Available
          </span>
        );
      case 'FAST_FILLING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 w-fit">
            <TrendingDown className="w-3 h-3" /> Fast Filling
          </span>
        );
      case 'SOLD_OUT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3" /> Sold Out
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1 w-fit">
            <Lock className="w-3 h-3" /> Blocked
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-orange-500" />
              <span>{hotel.name} • Live Inventory Grid</span>
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Postgres WAL (REPLICA IDENTITY FULL)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-operator room allocations, instant VIP blocks, and automated available inventory calculation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadInventory}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
            title="Refresh Inventory"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Delta Broadcast Alert Banner */}
      {recentDelta && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between animate-fade-in text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="font-bold">Live Delta Broadcast:</span>
            <span>
              {recentDelta.roomType} on {recentDelta.date} — {recentDelta.text}
            </span>
          </div>
          <span className="text-[10px] font-mono opacity-75">Full WAL Delta</span>
        </div>
      )}

      {/* Inventory Table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Synchronizing inventory matrix...</p>
        </div>
      ) : inventory.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500">
          No inventory rows configured for this accommodation.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081220]/50 text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Room Category</th>
                <th className="py-3 px-4 text-center">Total Allotment</th>
                <th className="py-3 px-4 text-center">Booked</th>
                <th className="py-3 px-4 text-center">Blocked (VIP)</th>
                <th className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">Available</th>
                <th className="py-3 px-4">Rate Override</th>
                <th className="py-3 px-4">Realtime Status</th>
                <th className="py-3 px-4 text-right">Quick Allocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {inventory.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                    recentDelta?.id === item.id ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    <span>{item.date}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {item.roomType}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                    {item.totalInventory}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-orange-600 dark:text-orange-400">
                    {item.bookedCount}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-purple-600 dark:text-purple-400">
                    {item.blockedCount}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block font-extrabold text-sm ${
                        item.availableCount === 0
                          ? 'text-rose-600'
                          : item.availableCount <= 2
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {item.availableCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                    {item.priceOverride ? `₹${item.priceOverride.toLocaleString('en-IN')}` : 'Standard'}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleAdjustBlocked(item, 1)}
                        disabled={item.availableCount === 0}
                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-0.5 disabled:opacity-40 cursor-pointer"
                        title="Block 1 room for VIP/Special Request"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Block</span>
                      </button>
                      <button
                        onClick={() => handleAdjustBlocked(item, -1)}
                        disabled={item.blockedCount === 0}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-0.5 disabled:opacity-40 cursor-pointer"
                        title="Release 1 blocked room"
                      >
                        <Minus className="w-3 h-3" />
                        <span>Release</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
