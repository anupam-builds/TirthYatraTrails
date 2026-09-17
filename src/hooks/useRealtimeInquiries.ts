import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Inquiry } from '../types';

export function useRealtimeInquiries(onUpdate: (updatedInquiry: Inquiry) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('public:inquiries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inquiries' },
        (payload) => {
          const row = payload.new as any;
          if (!row || !row.id) return;
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}