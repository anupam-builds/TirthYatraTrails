import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Inquiry } from '../types';

export function useRealtimeInquiries(onUpdate: (updatedInquiry: Inquiry) => void) {
  useEffect(() => {
    // Use a static, reliable shared channel name instead of random per-mount strings
    const channelName = 'public:inquiries-global-sync';
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inquiries' },
        (payload) => {
          // Supabase postgres_changes payload structure: payload.new contains new record (or empty on delete), payload.old has primary keys/old values
          const rawRow = payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old;
          if (!rawRow || !rawRow.id) {
            console.warn('[Realtime Sync] Received payload without valid row/id:', payload);
            return;
          }

          console.log(`[Realtime Sync] Event [${payload.event}] raw row:`, rawRow);

          const mapped: Inquiry = {
            id: rawRow.id,
            title: rawRow.title ?? '',
            type: rawRow.type ?? '',
            fullName: rawRow.full_name || rawRow.fullName || '',
            phone: rawRow.phone ?? '',
            email: rawRow.email ?? '',
            checkInDate: rawRow.check_in_date || rawRow.checkInDate || '',
            guests: Number(rawRow.guests ?? 1),
            adults: Number(rawRow.adults ?? 1),
            children: Number(rawRow.children ?? 0),
            childAges: rawRow.child_ages || rawRow.childAges || [],
            plan: rawRow.plan ?? '',
            specialRequests: rawRow.special_requests || rawRow.specialRequests || '',
            pickupLocation: rawRow.pickup_location || rawRow.pickupLocation || '',
            dropoffLocation: rawRow.dropoff_location || rawRow.dropoffLocation || '',
            userId: rawRow.user_id || rawRow.userId || '',
            status: rawRow.status || 'NEW',
            createdAt: rawRow.created_at || rawRow.createdAt || new Date().toISOString(),
            assignedStaffId: rawRow.assigned_staff_id || rawRow.assignedStaffId || undefined,
            assignedStaffName: rawRow.assigned_staff_name || rawRow.assignedStaffName || undefined,
            isLockedForStaff: rawRow.is_locked_for_staff ?? rawRow.isLockedForStaff ?? false,
            notes: Array.isArray(rawRow.notes) ? rawRow.notes : [],
          };

          console.log('[Realtime Sync] Mapped inquiry ready for state update:', mapped);
          onUpdate(mapped);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error(`[Realtime Sync] Subscription error on ${channelName}:`, err);
        } else {
          console.log(`[Realtime Sync] Channel ${channelName} status:`, status);
        }
      });

    return () => {
      console.log(`[Realtime Sync] Cleaning up channel ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}