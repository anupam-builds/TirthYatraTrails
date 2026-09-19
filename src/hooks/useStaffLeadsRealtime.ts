import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useStaffLeadsRealtime(currentStaffId?: string) {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    if (!currentStaffId) return;

    const channel = supabase
      .channel('staff-leads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('📡 [Leads Realtime Event]:', payload);
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          setLeads((prevLeads) => {
            // If deleted
            if (payload.eventType === 'DELETE') {
              return prevLeads.filter((l) => l.id !== oldRow?.id);
            }

            // Check if this lead belongs to current staff or was newly assigned/unassigned
            const isForThisStaff = newRow?.assigned_staff_id === currentStaffId;
            const existsInState = prevLeads.some((l) => l.id === newRow?.id);

            if (existsInState) {
              // Update existing row
              return prevLeads.map((l) => (l.id === newRow.id ? newRow : l));
            } else if (isForThisStaff) {
              // Prepend new row assigned to this staff
              return [newRow, ...prevLeads];
            }
            return prevLeads;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStaffId]);

  return { leads, setLeads };
}
