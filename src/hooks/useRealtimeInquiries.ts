import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Inquiry } from '../types';

export function useRealtimeInquiries(onUpdate: (updatedInquiry: Inquiry) => void) {
  useEffect(() => {
    const channelName = `inquiries-realtime-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inquiries' },
        (payload) => {
          const row = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) as any;
          if (!row || !row.id) return;

          console.log(`[Realtime ${channelName}] Event: ${payload.event}`, row);

          const mapped: Inquiry = {
            id: row.id,
            title: row.title,
            type: row.type,
            fullName: row.full_name || row.fullName,
            phone: row.phone,
            email: row.email,
            checkInDate: row.check_in_date || row.checkInDate,
            guests: row.guests,
            adults: row.adults,
            children: row.children,
            childAges: row.child_ages || row.childAges,
            plan: row.plan,
            specialRequests: row.special_requests || row.specialRequests,
            pickupLocation: row.pickup_location || row.pickupLocation,
            dropoffLocation: row.dropoff_location || row.dropoffLocation,
            userId: row.user_id || row.userId,
            status: row.status,
            createdAt: row.created_at || row.createdAt,
            assignedStaffId: row.assigned_staff_id || row.assignedStaffId,
            assignedStaffName: row.assigned_staff_name || row.assignedStaffName,
            isLockedForStaff: row.is_locked_for_staff ?? row.isLockedForStaff,
            notes: row.notes || [],
          };
          onUpdate(mapped);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error(`[Realtime ${channelName}] Subscription error:`, err);
        } else {
          console.log(`[Realtime ${channelName}] Status:`, status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}