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
            const isSoftDeleted = Boolean(
              newRow?.is_deleted === true ||
              newRow?.is_deleted === 'true' ||
              newRow?.is_deleted === 1 ||
              newRow?.isDeleted === true ||
              newRow?.metadata?.is_deleted === true ||
              newRow?.metadata?.isDeleted === true
            );

            // If deleted or marked soft-deleted
            if (payload.eventType === 'DELETE' || isSoftDeleted) {
              const targetId = oldRow?.id || newRow?.id;
              return prevLeads.filter((l) => l.id !== targetId && String(l.id) !== String(targetId));
            }

            const belongsToStaff = newRow?.assigned_staff_id === currentStaffId;
            const existsInState = prevLeads.some((l) => l.id === newRow?.id || String(l.id) === String(newRow?.id));

            if (existsInState) {
              // If reassigned away from this staff, remove it; otherwise update row
              if (!belongsToStaff) {
                return prevLeads.filter((l) => l.id !== newRow?.id && String(l.id) !== String(newRow?.id));
              }
              return prevLeads.map((l) => (l.id === newRow.id || String(l.id) === String(newRow.id) ? newRow : l));
            } else if (belongsToStaff) {
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
