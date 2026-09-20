import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { api, updateLeadOrInquiryStatus, cleanUnassignedValue } from '../../services/api.js';
import { Inquiry, InquiryStatus, StaffMember } from '../../types.js';
import { subscribeToNewInquiries, subscribeToInquiryUpdates } from '../../services/soundNotification.js';
import { useAuth } from '../../context/AuthContext.js';
import { LeadTableView } from '../../components/crm/LeadTableView.js';
import { LeadEditModal } from '../../components/crm/LeadEditModal.js';
import { BaseInput, BaseSelect } from '../../components/FormField.js';
import { getLeadId, formatLeadId, formatCrmTimestamp } from '../../utils/crmUtils.js';
import { useRealtimeInquiries } from '../../hooks/useRealtimeInquiries.js';
import {
  MessageSquare,
  RefreshCw,
  Trash2,
  RotateCcw,
  UserCheck,
  Search,
  Check,
  Copy,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Clock,
  Archive,
  Radio,
} from 'lucide-react';

export const AdminInquiries: React.FC = () => {
  const { adminUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [deletedInquiries, setDeletedInquiries] = useState<Inquiry[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInquiryForEdit, setSelectedInquiryForEdit] = useState<Inquiry | null>(null);

  // Realtime inquiries hook using isolated channel public:leads-realtime
  const {
    inquiries,
    setInquiries,
    connectionStatus: realtimeStatus,
    isConnected: isRealtimeConnected,
    loading,
    refetch: refetchInquiries,
  } = useRealtimeInquiries({
    channelName: 'public:leads-realtime',
    onInsert: (newInq) => {
      console.log('📡 [AdminInquiries] Realtime lead INSERT received:', newInq.id);
    },
    onUpdate: (updatedInq) => {
      console.log('🔄 [AdminInquiries] Realtime lead UPDATE received:', updatedInq.id);
      setSelectedInquiryForEdit((curr) =>
        curr && String(curr.id) === String(updatedInq.id) ? { ...curr, ...updatedInq } : curr
      );
    },
    onProfileUpdate: (profile) => {
      if (!profile?.id) return;
      setStaffList((prev) =>
        prev.map((s) =>
          String(s.id) === String(profile.id)
            ? {
                ...s,
                isOnline: Boolean(profile.is_online ?? profile.is_currently_logged_in),
                isCurrentlyLoggedIn: Boolean(profile.is_online ?? profile.is_currently_logged_in),
                lastSeen: profile.last_seen || profile.last_active_at,
              }
            : s
        )
      );
    },
  });

  // Trash UI states
  const [trashSearchQuery, setTrashSearchQuery] = useState('');
  const [selectedRestoreStaff, setSelectedRestoreStaff] = useState<Record<string, string>>({});
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadStaff();
    loadDeletedInquiries();

    // Live staff presence event listener
    const handlePresence = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.staffId) return;
      setStaffList((prev) =>
        prev.map((s) =>
          String(s.id) === String(detail.staffId)
            ? {
                ...s,
                isOnline: detail.isOnline,
                isCurrentlyLoggedIn: detail.isOnline,
                lastSeen: detail.lastSeen,
              }
            : s
        )
      );
    };
    window.addEventListener('tirth-staff-presence-changed', handlePresence);

    // Auto prepend new incoming leads live via local BroadcastChannel as fallback
    const unsubNew = subscribeToNewInquiries((newInquiry) => {
      setInquiries((prev) => [
        newInquiry,
        ...prev.filter((i) => String(i.id) !== String(newInquiry.id)),
      ]);
    });

    // Auto sync lead updates live
    const unsubUpdates = subscribeToInquiryUpdates(({ inquiry: updatedInquiry }) => {
      if (!updatedInquiry) return;
      setInquiries((prev) =>
        prev.map((item) =>
          String(item.id) === String(updatedInquiry.id)
            ? {
                ...item,
                ...updatedInquiry,
                assignedStaffId: updatedInquiry.assignedStaffId ?? item.assignedStaffId,
                assignedStaffName: updatedInquiry.assignedStaffName ?? item.assignedStaffName,
              }
            : item
        )
      );
    });

    return () => {
      window.removeEventListener('tirth-staff-presence-changed', handlePresence);
      unsubNew();
      unsubUpdates();
    };
  }, [setInquiries]);

  async function loadStaff() {
    try {
      const list = await api.getStaffMembers();
      setStaffList(list);
    } catch (err) {
      console.error('Failed loading staff for assignment:', err);
    }
  }

  async function loadDeletedInquiries() {
    setTrashLoading(true);
    try {
      const list = await api.getDeletedInquiries();
      setDeletedInquiries(list);
    } catch (err) {
      console.error('Failed to load deleted inquiries:', err);
    } finally {
      setTrashLoading(false);
    }
  }

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const [, trashList] = await Promise.all([
        refetchInquiries(),
        api.getDeletedInquiries(),
      ]);
      setDeletedInquiries(trashList);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleUpdateStatus = async (id: string, status: InquiryStatus) => {
    try {
      const res = await updateLeadOrInquiryStatus({ id, status });
      const updated = Array.isArray(res) ? (res[0] || {}) : (res || {});
      setInquiries((prev) =>
        prev.map((i) =>
          String(i.id) === String(id)
            ? {
                ...i,
                ...updated,
                assignedStaffId: updated.assignedStaffId ?? updated.assigned_staff_id ?? i.assignedStaffId,
                assignedStaffName: updated.assignedStaffName ?? updated.assigned_staff_name ?? i.assignedStaffName,
              }
            : i
        )
      );
      if (selectedInquiryForEdit && String(selectedInquiryForEdit.id) === String(id)) {
        setSelectedInquiryForEdit((curr) => (curr ? { ...curr, ...updated } : null));
      }
    } catch (err: any) {
      alert(err.message || 'Failed updating inquiry status');
    }
  };

  const handleAssignStaff = async (inquiryId: string, staffId: any, e?: any) => {
    console.log('🎯 [AdminInquiries] handleAssignStaff called with:', { inquiryId, staffId });
    try {
      // If value passed from dropdown event might be an event object or wrapped object:
      const rawStaffId = e?.target
        ? e.target.value
        : (staffId && typeof staffId === 'object'
            ? (staffId?.target?.value || staffId?.assignedStaffId || staffId?.id || staffId?.value || '')
            : staffId);

      const cleanedStaffId = cleanUnassignedValue(rawStaffId ? String(rawStaffId) : '') || '';
      const staffMember = cleanedStaffId ? staffList.find((s) => String(s.id) === String(cleanedStaffId)) : null;
      const staffName = staffMember ? staffMember.name : '';
      console.log('🎯 [AdminInquiries] Dispatching updateLeadOrInquiryStatus options object:', { inquiryId, rawStaffId, cleanedStaffId, staffName });
      
      const res = await updateLeadOrInquiryStatus({
        id: inquiryId,
        assignedStaffId: cleanedStaffId || null,
        assignedStaffName: staffName || null,
      });
      const updated = Array.isArray(res) ? (res[0] || {}) : (res || {});
      console.log('✅ [AdminInquiries] Staff assigned successfully:', { inquiryId, updated });
      setInquiries((prev) =>
        prev.map((i) =>
          String(i.id) === String(inquiryId)
            ? {
                ...i,
                ...updated,
                assignedStaffId: updated.assignedStaffId ?? updated.assigned_staff_id ?? cleanedStaffId ?? undefined,
                assignedStaffName: updated.assignedStaffName ?? updated.assigned_staff_name ?? staffName ?? undefined,
              }
            : i
        )
      );
      if (selectedInquiryForEdit && String(selectedInquiryForEdit.id) === String(inquiryId)) {
        setSelectedInquiryForEdit((curr) => (curr ? { ...curr, ...updated } : null));
      }
    } catch (err: any) {
      console.error('❌ [AdminInquiries] handleAssignStaff failed:', err);
      alert(err.message || 'Failed assigning staff');
    }
  };

  const handleSaveInquiryUpdates = async (id: string, updates: Partial<Inquiry>) => {
    try {
      const res = await updateLeadOrInquiryStatus({ id, ...updates });
      const updated = Array.isArray(res) ? (res[0] || {}) : (res || {});
      setInquiries((prev) =>
        prev.map((i) =>
          String(i.id) === String(id)
            ? {
                ...i,
                ...updated,
                assignedStaffId: updated.assignedStaffId ?? updated.assigned_staff_id ?? i.assignedStaffId,
                assignedStaffName: updated.assignedStaffName ?? updated.assigned_staff_name ?? i.assignedStaffName,
              }
            : i
        )
      );
      setSelectedInquiryForEdit(null);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save lead updates');
    }
  };

  const handleUnlockInquiry = async (inquiryId: string) => {
    if (window.confirm('Reopen and unlock this lead for staff operations? Status will be reset to CONTACTED.')) {
      try {
        const updated = await api.adminUnlockInquiry(inquiryId, 'CONTACTED');
        setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? updated : i)));
        if (selectedInquiryForEdit && selectedInquiryForEdit.id === inquiryId) {
          setSelectedInquiryForEdit(updated);
        }
      } catch (err: any) {
        alert(err.message || 'Failed to unlock inquiry');
      }
    }
  };

  const handleAddNote = async (inquiryId: string, text: string) => {
    try {
      const updated = await api.addInquiryNote(inquiryId, {
        authorName: adminUser?.name || 'Administrator',
        authorRole: 'ADMIN',
        authorId: adminUser?.id || 'admin',
        text,
      });

      setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? updated : i)));
      if (selectedInquiryForEdit && selectedInquiryForEdit.id === inquiryId) {
        setSelectedInquiryForEdit(updated);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to post note');
    }
  };

  const handleDelete = async (id: string) => {
    const inq = inquiries.find((i) => i.id === id);
    const leadId = inq ? getLeadId(inq) : id;
    if (window.confirm(`Move Lead ${leadId} to Recently Deleted / Trash Bin? You can review and restore it anytime.`)) {
      try {
        await api.deleteInquiry(id);
        setInquiries((prev) => prev.filter((i) => i.id !== id));
        loadDeletedInquiries();
        setActionMessage({
          type: 'info',
          text: `Lead ${leadId} moved to Recently Deleted / Trash Bin.`,
        });
        setTimeout(() => setActionMessage(null), 4500);
      } catch (err) {
        alert('Failed to delete inquiry');
      }
    }
  };

  const handleRestore = async (id: string) => {
    try {
      setRestoringId(id);
      const inq = deletedInquiries.find((i) => i.id === id);
      const chosenStaffId = selectedRestoreStaff[id] || inq?.assignedStaffId || staffList[0]?.id;
      const chosenStaff = staffList.find((s) => s.id === chosenStaffId);
      const staffName = chosenStaff ? chosenStaff.name : (staffList[0]?.name || 'Staff Member');

      const restored = await api.restoreInquiry(id, chosenStaffId, staffName);
      setDeletedInquiries((prev) => prev.filter((i) => i.id !== id));
      setInquiries((prev) => [restored, ...prev.filter((i) => i.id !== id)]);

      setActionMessage({
        type: 'success',
        text: `Lead ${getLeadId(restored)} successfully restored and assigned to ${restored.assignedStaffName || staffName}!`,
      });
      setTimeout(() => setActionMessage(null), 4500);
    } catch (err: any) {
      alert(err.message || 'Failed to restore inquiry');
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const inq = deletedInquiries.find((i) => i.id === id);
    const leadId = inq ? getLeadId(inq) : id;
    if (window.confirm(`Permanently erase Lead ${leadId} from the database? This action is irreversible.`)) {
      try {
        await api.permanentlyDeleteInquiry(id);
        setDeletedInquiries((prev) => prev.filter((i) => i.id !== id));
        setActionMessage({
          type: 'info',
          text: `Lead ${leadId} permanently erased.`,
        });
        setTimeout(() => setActionMessage(null), 4000);
      } catch (err) {
        alert('Failed to permanently delete inquiry');
      }
    }
  };

  const handleEmptyTrash = async () => {
    if (deletedInquiries.length === 0) return;
    if (
      window.confirm(
        `Permanently erase all ${deletedInquiries.length} inquiries in the Trash Bin? This action cannot be undone.`
      )
    ) {
      try {
        await api.emptyTrash();
        setDeletedInquiries([]);
        setActionMessage({
          type: 'info',
          text: 'Trash Bin emptied successfully.',
        });
        setTimeout(() => setActionMessage(null), 4000);
      } catch (err) {
        alert('Failed to empty trash');
      }
    }
  };

  const handleCopyLeadId = (leadId: string) => {
    navigator.clipboard.writeText(leadId);
    setCopiedId(leadId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDeletedInquiries = deletedInquiries.filter((inq) => {
    if (!trashSearchQuery.trim()) return true;
    const q = trashSearchQuery.toLowerCase();
    const leadId = getLeadId(inq).toLowerCase();
    const name = (inq.customerName || inq.fullName || '').toLowerCase();
    const phone = (inq.customerPhone || inq.whatsappNumber || '').toLowerCase();
    const email = (inq.customerEmail || inq.email || '').toLowerCase();
    const city = (inq.userCity || '').toLowerCase();
    const title = (inq.title || '').toLowerCase();
    return (
      leadId.includes(q) ||
      name.includes(q) ||
      phone.includes(q) ||
      email.includes(q) ||
      city.includes(q) ||
      title.includes(q)
    );
  });

  return (
    <AdminLayout activeTab="inquiries">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Action feedback toast */}
        {actionMessage && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-orange-50 dark:bg-orange-950/50 border-orange-300 dark:border-orange-800 text-orange-900 dark:text-orange-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* CRM Header & View Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                CRM Travel Desk
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isRealtimeConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : realtimeStatus === 'JOINING'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}
                title={`Supabase Realtime Channel: public:inquiries-global-sync (${realtimeStatus})`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRealtimeConnected
                      ? 'bg-emerald-500 animate-pulse'
                      : realtimeStatus === 'JOINING'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-slate-400'
                  }`}
                />
                <Radio className="w-3 h-3" />
                <span>{isRealtimeConnected ? 'Live Realtime Active' : `Realtime: ${realtimeStatus}`}</span>
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-serif mt-1">
              <MessageSquare className="w-6 h-6 text-orange-500 dark:text-orange-400" />
              <span>Lead &amp; Enquiry Management CRM</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive pilgrim tracking with unique TTT Lead IDs, automated sequential numbering, and staff assignment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher: Active vs Trash */}
            <div className="bg-slate-100 dark:bg-[#081220] p-1 rounded-2xl flex items-center gap-1 border border-slate-200 dark:border-slate-800 shadow-inner">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-white dark:bg-[#0d1d33] text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Active Leads</span>
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {inquiries.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('trash')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'trash'
                    ? 'bg-white dark:bg-[#0d1d33] text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Trash Bin</span>
                {deletedInquiries.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono">
                    {deletedInquiries.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1d33] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* TAB 1: ACTIVE CRM LEADS */}
        {activeTab === 'active' && (
          <>
            <LeadTableView
              inquiries={inquiries}
              staffList={staffList}
              loading={loading}
              isAdmin={true}
              onUpdateStatus={handleUpdateStatus}
              onAssignStaff={handleAssignStaff}
              onDeleteInquiry={handleDelete}
              onUnlockInquiry={handleUnlockInquiry}
              onEditInquiry={(inq) => setSelectedInquiryForEdit(inq)}
              onAddNote={handleAddNote}
            />

            {/* Detailed Modal Editor */}
            <LeadEditModal
              inquiry={selectedInquiryForEdit}
              isOpen={Boolean(selectedInquiryForEdit)}
              onClose={() => setSelectedInquiryForEdit(null)}
              onSave={handleSaveInquiryUpdates}
              staffList={staffList}
              onAddNote={handleAddNote}
            />
          </>
        )}

        {/* TAB 2: RECENTLY DELETED / TRASH BIN */}
        {activeTab === 'trash' && (
          <div className="space-y-4">
            {/* Trash Controls Bar */}
            <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-800 p-4 rounded-3xl space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      Recently Deleted / Recycle Bin
                    </span>
                    <span className="text-xs text-slate-400">
                      {deletedInquiries.length} item{deletedInquiries.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    Deleted Pilgrim Inquiries
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review removed inquiries, restore them back to the active pool with staff reassignment, or purge permanently.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {deletedInquiries.length > 0 && (
                    <button
                      onClick={handleEmptyTrash}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Empty Trash</span>
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('active')}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Back to Active Leads</span>
                  </button>
                </div>
              </div>

              {/* Search Bar for Trashed Leads */}
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <BaseInput
                  id="trash-search-query-input"
                  name="trash-search-query-input"
                  type="text"
                  placeholder="Filter deleted leads by Lead ID, Customer Name, Phone..."
                  value={trashSearchQuery}
                  onChange={(e) => setTrashSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                />
                {trashSearchQuery && (
                  <button
                    onClick={() => setTrashSearchQuery('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Trashed Leads Table */}
            <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[980px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#081220] text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3.5 px-4">Lead ID &amp; Created</th>
                      <th className="py-3.5 px-4">Customer Details</th>
                      <th className="py-3.5 px-4">Package / Destination</th>
                      <th className="py-3.5 px-4">Deleted Info</th>
                      <th className="py-3.5 px-4">Staff Reassignment</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                    {trashLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 animate-pulse">
                          Loading deleted records...
                        </td>
                      </tr>
                    ) : filteredDeletedInquiries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center space-y-2">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                            <Trash2 className="w-6 h-6" />
                          </div>
                          <p className="font-bold text-slate-700 dark:text-slate-300">
                            Trash Bin is Empty
                          </p>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Any inquiries deleted from the CRM lead list will be preserved here, allowing administrators to restore and reassign them at any time.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredDeletedInquiries.map((inq) => {
                        const lead = inq as any;
                        const leadId = formatLeadId(lead.id);
                        const assignedStaffId =
                          selectedRestoreStaff[inq.id] ||
                          inq.assignedStaffId ||
                          (staffList[0]?.id || '');

                        return (
                          <tr
                            key={inq.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-[#0a192f]/50 transition-colors"
                          >
                            {/* 1. Lead ID */}
                            <td className="py-4 px-4 align-top">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-xs tracking-tight bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                                    {formatLeadId(lead.id)}
                                  </span>
                                  <button
                                    onClick={() => handleCopyLeadId(leadId)}
                                    title="Copy Lead ID"
                                    className="text-slate-400 hover:text-rose-600 transition-colors"
                                  >
                                    {copiedId === leadId ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                <div className="text-[11px] text-slate-400 font-medium">
                                  {formatCrmTimestamp(inq.createdAt)}
                                </div>
                              </div>
                            </td>

                            {/* 2. Customer Details */}
                            <td className="py-4 px-4 align-top">
                              <div className="space-y-1">
                                <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                                  {inq.customerName || inq.fullName}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                                  <span>
                                    📞 {(inq as any).whatsapp_number || inq.phone || (inq as any).metadata?.whatsapp_number || (inq as any).metadata?.phone || inq.customerPhone || inq.whatsappNumber || 'No phone'}
                                  </span>
                                </div>
                                {inq.customerEmail && (
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
                                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{inq.customerEmail}</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 3. Package & Destination */}
                            <td className="py-4 px-4 align-top max-w-[220px]">
                              <div className="space-y-1">
                                <p className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1" title={inq.title}>
                                  {inq.title}
                                </p>
                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 text-[11px]">
                                  <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                                  <span>{inq.userCity || 'City TBD'}</span>
                                  <span className="text-slate-300 dark:text-slate-700">•</span>
                                  <span className="text-[10px] text-slate-500 font-semibold">
                                    {inq.accommodationTier || '3 Star Hotel'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 4. Deleted Timestamp & Actor */}
                            <td className="py-4 px-4 align-top">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                                  <Clock className="w-3 h-3 text-rose-500 shrink-0" />
                                  <span>{formatCrmTimestamp(inq.deletedAt || inq.createdAt)}</span>
                                </div>
                                <span className="inline-block text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  Deleted by {inq.deletedBy || 'Administrator'}
                                </span>
                              </div>
                            </td>

                            {/* 5. Staff Reassignment Dropdown */}
                            <td className="py-4 px-4 align-top">
                              <div className="space-y-1">
                                <label htmlFor={`restore-assign-staff-${inq.id}`} className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                                  Assign on Restore:
                                </label>
                                <BaseSelect
                                  id={`restore-assign-staff-${inq.id}`}
                                  name={`restore-assign-staff-${inq.id}`}
                                  value={assignedStaffId}
                                  onChange={(e) => {
                                    console.log('🎯 [AdminInquiries] Restore staff select changed:', {
                                      inquiryId: inq.id,
                                      selectedStaffId: e.target.value,
                                    });
                                    setSelectedRestoreStaff({
                                      ...selectedRestoreStaff,
                                      [inq.id]: e.target.value,
                                    });
                                  }}
                                  className="text-[11px] font-bold rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                                >
                                  {staffList.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.role.replace('_', ' ')})
                                    </option>
                                  ))}
                                </BaseSelect>
                              </div>
                            </td>

                            {/* 6. Actions: Restore & Permanent Delete */}
                            <td className="py-4 px-4 align-top text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleRestore(inq.id)}
                                  disabled={restoringId === inq.id}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                                  title="Restore this lead and return it to active CRM list"
                                >
                                  <RotateCcw className={`w-3.5 h-3.5 ${restoringId === inq.id ? 'animate-spin' : ''}`} />
                                  <span>Restore Lead</span>
                                </button>
                                <button
                                  onClick={() => handlePermanentDelete(inq.id)}
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                  title="Permanently erase from database"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
