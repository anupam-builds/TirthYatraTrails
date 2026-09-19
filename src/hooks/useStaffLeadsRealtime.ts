import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useStaffLeadsRealtime(currentStaffId?: string) {
  const [staffLeads, setStaffLeads] = useState<any[]>([]);

  useEffect(() => {
    if (!currentStaffId) return;

    const channel = supabase
      .channel('staff-leads-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('📡 [Staff Realtime] Leads updated:', payload);
          const updatedRow = payload.new as any;
          if (updatedRow && updatedRow.assigned_staff_id === currentStaffId) {
            // Merge or prepend into local staff leads state
            setStaffLeads((prev) => {
              const exists = prev.some((l) => l.id === updatedRow.id);
              if (exists) {
                return prev.map((l) => (l.id === updatedRow.id ? updatedRow : l));
              }
              return [updatedRow, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStaffId]);

  return { staffLeads, setStaffLeads };
}
