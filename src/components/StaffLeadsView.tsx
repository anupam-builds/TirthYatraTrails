import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.js';
import { api, mapInquiryRow } from '../services/api.js';
import { Inquiry } from '../types.js';
import { LeadTableView } from './crm/LeadTableView.js';
import { RefreshCw, Users, ShieldAlert } from 'lucide-react';

interface StaffLeadsViewProps {
  currentStaffId?: string;
  onEditLead?: (lead: Inquiry) => void;
  onViewLead?: (lead: Inquiry) => void;
}

export const StaffLeadsView: React.FC<StaffLeadsViewProps> = ({
  currentStaffId: propStaffId,
  onEditLead,
  onViewLead,
}) => {
  const { staffUser } = useAuth();
  // Fallback / seeded target staff ID
  const HARDCODED_STAFF_ID = 'stf-1789834704496-07kq';
  const currentStaffId = propStaffId || staffUser?.id || HARDCODED_STAFF_ID;
  const currentStaffName = staffUser?.name || 'Staff Specialist';

  const [staffLeads, setStaffLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('🔍 [StaffLeads] Staff ID Alignment Check:', {
    currentStaffId,
    hardlockedId: HARDCODED_STAFF_ID,
    matches: currentStaffId === HARDCODED_STAFF_ID,
  });

  // Normalizer helper so assignment fields never drop on render or realtime update
  const normalizeLeadRow = (row: any) => {
    if (!row) return row;
    const assignedId = row.assigned_staff_id || row.assignedStaffId || null;
    const assignedName = row.assigned_staff_name || row.assignedStaffName || null;
    return {
      ...row,
      assigned_staff_id: assignedId,
      assignedStaffId: assignedId,
      assigned_staff_name: assignedName,
      assignedStaffName: assignedName,
    };
  };

  const fetchAssignedLeads = useCallback(async () => {
    const staffId = currentStaffId || HARDCODED_STAFF_ID;
    setLoading(true);
    console.log('🔍 [StaffLeads] Querying assigned leads for staffId:', staffId);
    try {
      const [leadsRes, inqRes] = await Promise.allSettled([
        supabase.from('leads').select('*').eq('assigned_staff_id', staffId).order('created_at', { ascending: false }),
        supabase.from('inquiries').select('*').eq('assigned_staff_id', staffId).order('created_at', { ascending: false })
      ]);

      const leadsData = leadsRes.status === 'fulfilled' && (leadsRes.value as any)?.data ? (leadsRes.value as any).data : [];
      const inqData = inqRes.status === 'fulfilled' && (inqRes.value as any)?.data ? (inqRes.value as any).data : [];

      const combined = [...leadsData, ...inqData];
      const seen = new Set<string>();
      const unique = combined.filter((r) => {
        const idStr = String(r.id);
        if (seen.has(idStr)) return false;
        seen.add(idStr);
        return true;
      });

      console.log('🔍 [StaffLeads] Initial query result count:', unique.length);
      setStaffLeads(unique.map(normalizeLeadRow));
    } catch (err) {
      console.error('❌ [StaffLeads] Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }, [currentStaffId]);

  useEffect(() => {
    fetchAssignedLeads();

    const channelName = `staff-leads-${currentStaffId || HARDCODED_STAFF_ID}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('⚡ [StaffRealtime leads] RAW PAYLOAD ARRIVED:', payload);
          const rawNew = payload.new as any;
          const oldRow = payload.old as any;
          const newRow = rawNew ? normalizeLeadRow(rawNew) : null;

          setStaffLeads((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((l) => String(l.id) !== String(oldRow?.id));
            }
            if (!newRow) return prev;

            const assigned = newRow.assigned_staff_id || newRow.assignedStaffId;
            const isAssignedToStaff = String(assigned || '').trim() === String(currentStaffId || HARDCODED_STAFF_ID).trim();
            const exists = prev.some((l) => String(l.id) === String(newRow.id));

            if (exists) {
              if (!isAssignedToStaff) return prev.filter((l) => String(l.id) !== String(newRow.id));
              return prev.map((l) => (String(l.id) === String(newRow.id) ? { ...l, ...newRow } : l));
            } else if (isAssignedToStaff) {
              return [newRow, ...prev];
            }
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inquiries' },
        (payload) => {
          console.log('⚡ [StaffRealtime inquiries] RAW PAYLOAD ARRIVED:', payload);
          const rawNew = payload.new as any;
          const oldRow = payload.old as any;
          const newRow = rawNew ? normalizeLeadRow(rawNew) : null;

          setStaffLeads((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((l) => String(l.id) !== String(oldRow?.id));
            }
            if (!newRow) return prev;

            const assigned = newRow.assigned_staff_id || newRow.assignedStaffId;
            const isAssignedToStaff = String(assigned || '').trim() === String(currentStaffId || HARDCODED_STAFF_ID).trim();
            const exists = prev.some((l) => String(l.id) === String(newRow.id));

            if (exists) {
              if (!isAssignedToStaff) return prev.filter((l) => String(l.id) !== String(newRow.id));
              return prev.map((l) => (String(l.id) === String(newRow.id) ? { ...l, ...newRow } : l));
            } else if (isAssignedToStaff) {
              return [newRow, ...prev];
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 [StaffRealtime] channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStaffId, fetchAssignedLeads]);

  const mappedInquiries: Inquiry[] = staffLeads.map((l) => {
    const inq = (l.title !== undefined && l.type !== undefined) ? (l as Inquiry) : mapInquiryRow(l);
    const assignedId = (l as any).assigned_staff_id || inq.assignedStaffId || (l as any).assignedStaffId || undefined;
    const assignedName = (l as any).assigned_staff_name || inq.assignedStaffName || (l as any).assignedStaffName || undefined;
    return {
      ...inq,
      assignedStaffId: assignedId,
      assigned_staff_id: assignedId,
      assignedStaffName: assignedName,
      assigned_staff_name: assignedName,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Assigned Leads ({mappedInquiries.length})
          </h2>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Realtime Live
          </span>
        </div>
        <button
          onClick={fetchAssignedLeads}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <LeadTableView
        inquiries={mappedInquiries}
        loading={loading}
        onEdit={onEditLead}
        onView={onViewLead}
        isStaffMode={true}
        currentStaffId={currentStaffId}
        currentStaffName={currentStaffName}
        enableSelection={false}
      />
    </div>
  );
};

export default StaffLeadsView;
