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
  const currentStaffId = propStaffId || staffUser?.id;

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dedicated fetch function for staff leads
  const fetchStaffLeads = useCallback(async () => {
    if (!currentStaffId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_staff_id', currentStaffId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLeads(data);
      } else {
        if (error) {
          console.warn('⚠️ [StaffLeadsView] Initial leads query fallback to inquiries:', error.message);
        }
        const allInquiries = await api.getInquiries();
        const filtered = allInquiries.filter(
          (i) => i.assignedStaffId === currentStaffId || i.assignedStaffName?.toLowerCase() === staffUser?.name?.toLowerCase()
        );
        setLeads(filtered);
      }
    } catch (err) {
      console.error('❌ [StaffLeadsView] Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  }, [currentStaffId, staffUser?.name]);

  // Fetch immediately on mount & listen to realtime updates
  useEffect(() => {
    fetchStaffLeads();

    const channel = supabase
      .channel('staff-assigned-leads-watcher')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          setLeads((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((l) => l.id !== oldRow?.id && String(l.id) !== String(oldRow?.id));
            }

            const belongsToStaff = newRow?.assigned_staff_id === currentStaffId;
            const exists = prev.some((l) => l.id === newRow?.id || String(l.id) === String(newRow?.id));

            if (exists) {
              // If reassigned away from this staff, remove it; otherwise update row
              if (!belongsToStaff) {
                return prev.filter((l) => l.id !== newRow?.id && String(l.id) !== String(newRow?.id));
              }
              return prev.map((l) => (l.id === newRow.id || String(l.id) === String(newRow.id) ? newRow : l));
            } else if (belongsToStaff) {
              // Newly assigned to this staff
              return [newRow, ...prev];
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStaffId, fetchStaffLeads]);

  if (!currentStaffId) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Staff Authentication Required</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Please log in with your staff credentials to view and manage your assigned leads.
        </p>
      </div>
    );
  }

  const mappedInquiries: Inquiry[] = leads.map((l) => {
    if (l.title !== undefined && l.type !== undefined) return l as Inquiry;
    return mapInquiryRow(l);
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
          onClick={fetchStaffLeads}
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
        enableSelection={false}
      />
    </div>
  );
};

export default StaffLeadsView;
