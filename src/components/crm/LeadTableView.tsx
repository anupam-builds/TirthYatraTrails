import React, { useState, useMemo } from 'react';
import { Inquiry, InquiryStatus, StaffMember } from '../../types.js';
import { updateLeadOrInquiryStatus, cleanUnassignedValue } from '../../services/api.js';
import {
  getLeadId,
  CRM_STATUS_CONFIG,
  CRM_STATUS_LIST,
  ADMIN_CRM_STATUS_LIST,
  STAFF_CRM_STATUS_LIST,
  formatPaxCount,
  formatCrmDate,
  formatCrmTimestamp,
  generateCustomerWhatsAppLink,
} from '../../utils/crmUtils.js';
import {
  Search,
  Users,
  Phone,
  Mail,
  Calendar,
  MapPin,
  MessageSquare,
  MessageCircle,
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  Trash2,
  Edit3,
  Copy,
  Check,
  ChevronDown,
  Filter,
  UserCheck,
  HelpCircle,
  Award,
  Sparkles,
  ChevronUp,
  Send,
  Building,
  Eye,
} from 'lucide-react';
import { LeadDetailsModal } from '../LeadDetailsModal.js';

interface LeadTableViewProps {
  inquiries: Inquiry[];
  staffList: StaffMember[];
  loading?: boolean;
  isAdmin?: boolean;
  isStaffMode?: boolean;
  currentStaffId?: string;
  currentStaffName?: string;
  onUpdateStatus: (id: string, status: InquiryStatus) => Promise<void>;
  onAssignStaff?: (id: string, staffId: string) => Promise<void>;
  onDeleteInquiry?: (id: string) => Promise<void>;
  onUnlockInquiry?: (id: string) => Promise<void>;
  onEditInquiry: (inquiry: Inquiry) => void;
  onAddNote?: (id: string, text: string) => Promise<void>;
}

export const LeadTableView: React.FC<LeadTableViewProps> = ({
  inquiries,
  staffList,
  loading = false,
  isAdmin = false,
  isStaffMode = false,
  currentStaffId,
  currentStaffName,
  onUpdateStatus,
  onAssignStaff,
  onDeleteInquiry,
  onUnlockInquiry,
  onEditInquiry,
  onAddNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedDetailedLead, setSelectedDetailedLead] = useState<Inquiry | null>(null);

  // Accordion for inline notes
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [submittingNote, setSubmittingNote] = useState<Record<string, boolean>>({});

  // In Staff Mode, staff members can ONLY view inquiries explicitly assigned to them by the administrator
  const baseInquiries = useMemo(() => {
    if (!isStaffMode) return inquiries;
    const targetId = String(currentStaffId || '').trim().toLowerCase();
    const targetName = String(currentStaffName || '').trim().toLowerCase();

    return inquiries.filter((inq) => {
      // 1. Strict & normalized ID matching
      const inqStaffId = String(inq.assignedStaffId || '').trim().toLowerCase();
      const hasStaffId = Boolean(inqStaffId && inqStaffId !== 'undefined' && inqStaffId !== 'null');
      const matchesId = hasStaffId && targetId !== '' && inqStaffId === targetId;

      // 2. Resilient Name matching (trimmed, case-insensitive, whitespace-normalized)
      const inqStaffName = String(inq.assignedStaffName || '').trim().toLowerCase();
      const hasStaffName = Boolean(inqStaffName && inqStaffName !== 'undefined' && inqStaffName !== 'null');
      const matchesName = hasStaffName && Boolean(
        targetName && (
          inqStaffName === targetName ||
          inqStaffName.replace(/\s+/g, ' ') === targetName.replace(/\s+/g, ' ')
        )
      );

      return matchesId || matchesName;
    });
  }, [inquiries, isStaffMode, currentStaffId, currentStaffName]);

  // Status options: Admin has 4 (New, Contacted, Confirmed, Closed), Staff has 3 (New, Contacted, Closed)
  const statusOptions = isAdmin ? ADMIN_CRM_STATUS_LIST : STAFF_CRM_STATUS_LIST;

  // Summary Metrics calculation matching workflow
  const totalCount = baseInquiries.length;
  const newCount = baseInquiries.filter((i) => !i.status || i.status === 'NEW').length;
  const contactedCount = baseInquiries.filter((i) => i.status === 'CONTACTED').length;
  const confirmedCount = baseInquiries.filter((i) => i.status === 'CONFIRMED').length;
  const closedCount = baseInquiries.filter((i) => i.status === 'CLOSED').length;
  const unassignedCount = baseInquiries.filter((i) => !i.assignedStaffId).length;

  const handleCopyLeadId = (leadId: string) => {
    navigator.clipboard.writeText(leadId);
    setCopiedId(leadId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSendNote = async (id: string) => {
    const text = (noteInputs[id] || '').trim();
    if (!text || !onAddNote) return;

    setSubmittingNote((prev) => ({ ...prev, [id]: true }));
    try {
      await onAddNote(id, text);
      setNoteInputs((prev) => ({ ...prev, [id]: '' }));
    } catch (err: any) {
      alert(err.message || 'Failed to post note');
    } finally {
      setSubmittingNote((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Direct WhatsApp chat handler with prompt to mark as CONTACTED if currently NEW
  const handleOpenWhatsApp = async (inq: Inquiry) => {
    const waData = generateCustomerWhatsAppLink(inq, currentStaffName);
    if (!waData) {
      alert(`No valid phone or WhatsApp number found for ${inq.customerName || inq.fullName || 'this pilgrim'}.`);
      return;
    }

    // If status is NEW, prompt to optionally mark as CONTACTED
    if (!inq.status || inq.status === 'NEW') {
      const shouldUpdate = window.confirm(
        `Open WhatsApp chat with ${inq.customerName || inq.fullName} (${waData.phone})?\n\n` +
        `• Click "OK" to update this lead's status to CONTACTED and launch WhatsApp.\n` +
        `• Click "Cancel" to open WhatsApp without changing the lead status.`
      );
      if (shouldUpdate) {
        try {
          if (onUpdateStatus) {
            await onUpdateStatus(inq.id, 'CONTACTED');
          } else {
            await updateLeadOrInquiryStatus(inq.id, 'CONTACTED');
          }
        } catch (err: any) {
          console.error('Failed to update status to CONTACTED:', err);
        }
      }
    }

    // Open pre-filled WhatsApp chat in a new tab
    window.open(waData.url, '_blank', 'noopener,noreferrer');
  };

  // Filter inquiries
  const filteredInquiries = baseInquiries.filter((inq) => {
    // Status Filter
    if (statusFilter !== 'ALL' && inq.status !== statusFilter) {
      return false;
    }

    // Staff filter (Applicable only in Admin mode)
    if (isAdmin) {
      if (staffFilter === 'UNASSIGNED' && inq.assignedStaffId) {
        return false;
      } else if (staffFilter === 'MY' && currentStaffId && inq.assignedStaffId !== currentStaffId) {
        return false;
      } else if (staffFilter !== 'ALL' && staffFilter !== 'UNASSIGNED' && staffFilter !== 'MY' && inq.assignedStaffId !== staffFilter) {
        return false;
      }
    }

    // Search query matching Lead ID, name, phone, or city
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const lead = inq as any;
      const leadId = getLeadId(inq).toLowerCase();
      const name = (inq.customerName || inq.fullName || '').toLowerCase();
      const phone = (lead.whatsapp_number || lead.phone || lead.metadata?.whatsapp_number || lead.metadata?.phone || inq.customerPhone || inq.whatsappNumber || '').toLowerCase();
      const city = (inq.userCity || '').toLowerCase();
      const title = (inq.title || inq.referenceName || '').toLowerCase();
      const tagsStr = (inq.tags || []).join(' ').toLowerCase();

      const matches =
        leadId.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        city.includes(q) ||
        title.includes(q) ||
        tagsStr.includes(q);

      if (!matches) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. SUMMARY METRICS CARDS */}
      <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        {/* Total Enquiries */}
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setStaffFilter('ALL');
          }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'ALL' && staffFilter === 'ALL'
              ? 'bg-orange-50 border-orange-300 dark:bg-orange-950/40 dark:border-orange-700 ring-2 ring-orange-500/20'
              : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-orange-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isStaffMode ? 'My Assigned Leads' : 'Total Leads'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{totalCount}</span>
            <span className="text-[11px] font-semibold text-slate-400">
              {isStaffMode ? 'assigned to your desk' : 'leads registered'}
            </span>
          </div>
        </div>

        {/* New Leads */}
        <div
          onClick={() => setStatusFilter('NEW')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'NEW'
              ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">New Leads</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
              {newCount}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">awaiting contact</span>
          </div>
        </div>

        {/* Contacted */}
        <div
          onClick={() => setStatusFilter('CONTACTED')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'CONTACTED'
              ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Contacted</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">
              {contactedCount}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">active consultations</span>
          </div>
        </div>

        {/* Confirmed Bookings - Admin Dashboard & Travel Desk View */}
        {isAdmin && (
          <div
            onClick={() => setStatusFilter('CONFIRMED')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === 'CONFIRMED'
                ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700 ring-2 ring-emerald-500/20'
                : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Confirmed</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                {confirmedCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">bookings confirmed</span>
            </div>
          </div>
        )}

        {/* Closed */}
        <div
          onClick={() => setStatusFilter('CLOSED')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'CLOSED'
              ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 ring-2 ring-slate-400/20'
              : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Closed</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-700 dark:text-slate-300 font-mono">
              {closedCount}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">finalized records</span>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER BAR */}
      <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Global Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Lead ID (e.g. TTT00000001), Customer Name, Phone, or City..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Assigned Staff Filter - Admin Only */}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 shrink-0">Staff:</span>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
              >
                <option value="ALL">All Representatives</option>
                <option value="UNASSIGNED">Unassigned Only</option>
                {staffList.map((stf) => (
                  <option key={stf.id} value={stf.id}>
                    {stf.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Assigned To You ({totalCount})</span>
            </div>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-[#081220] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            All Leads ({totalCount})
          </button>
          {statusOptions.map((st) => {
            const count = baseInquiries.filter((i) => i.status === st).length;
            const cfg = CRM_STATUS_CONFIG[st];
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#081220] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cfg?.label || st}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. COMPREHENSIVE CRM LEADS TABLE */}
      <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#081220] text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">Lead ID &amp; Date</th>
                <th className="py-3.5 px-4">Assigned Staff</th>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">City / Accom. Tier</th>
                <th className="py-3.5 px-4">Package Interest &amp; Tags</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Arrival Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 animate-pulse">
                    Loading CRM database records...
                  </td>
                </tr>
              ) : filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      {isStaffMode && baseInquiries.length === 0
                        ? 'No leads currently assigned to your desk'
                        : 'No leads match your search criteria'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isStaffMode && baseInquiries.length === 0
                        ? 'When an administrator assigns inquiries to your desk, they will appear here in real-time.'
                        : 'Try clearing filters or search terms.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInquiries.map((inq) => {
                  const lead = inq as any;
                  const leadId = getLeadId(inq);
                  const paxStr = formatPaxCount(inq);
                  const statusCfg = CRM_STATUS_CONFIG[inq.status as InquiryStatus] || CRM_STATUS_CONFIG.NEW;
                  const isLocked = Boolean(inq.isLockedForStaff || inq.status === 'CLOSED');
                  const isNotesExpanded = expandedNotes[inq.id] || false;
                  const notesCount = inq.followUpNotes?.length || 0;
                  const phoneCandidate =
                    lead.whatsapp_number ||
                    lead.phone ||
                    lead.metadata?.whatsapp_number ||
                    lead.metadata?.phone ||
                    inq.customerPhone ||
                    inq.whatsappNumber ||
                    '';
                  const hasPhone = Boolean(phoneCandidate && phoneCandidate !== 'No phone');

                  return (
                    <React.Fragment key={inq.id}>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-[#0a192f]/50 transition-colors group">
                        {/* 1. Lead ID & Date */}
                        <td className="py-4 px-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-black text-orange-600 dark:text-orange-400 text-xs tracking-tight bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800/80">
                                {leadId}
                              </span>
                              <button
                                onClick={() => handleCopyLeadId(leadId)}
                                title="Copy Lead ID"
                                className="text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                              >
                                {copiedId === leadId ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedDetailedLead(inq)}
                                title="Inspect Detailed Lead Profile"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-100 hover:bg-orange-600 hover:text-white dark:bg-orange-950/60 dark:hover:bg-orange-600 text-orange-700 dark:text-orange-400 text-[10px] font-bold border border-orange-300 dark:border-orange-800/80 transition-all cursor-pointer shadow-2xs"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Detailed</span>
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                              {formatCrmTimestamp(inq.createdAt)}
                            </div>
                          </div>
                        </td>

                        {/* 2. Assigned Staff - Editable ONLY by Admin */}
                        <td className="py-4 px-4 align-top">
                          {isAdmin && onAssignStaff ? (
                            <select
                              value={inq.assignedStaffId || ''}
                              onChange={async (e) => {
                                const rawVal = e.target.value;
                                console.log('🎯 [LeadTableView] Assignment dropdown changed:', {
                                  leadId: inq.id,
                                  selectedValue: rawVal,
                                  previousAssigned: inq.assignedStaffId,
                                });
                                const cleaned = cleanUnassignedValue(rawVal) || '';
                                try {
                                  if (onAssignStaff) {
                                    console.log('🎯 [LeadTableView] Calling onAssignStaff with:', { leadId: inq.id, staffId: cleaned });
                                    await onAssignStaff(inq.id, cleaned);
                                  } else {
                                    console.log('🎯 [LeadTableView] Calling updateLeadOrInquiryStatus with:', { leadId: inq.id, status: inq.status, assignedStaffId: cleaned });
                                    await updateLeadOrInquiryStatus(inq.id, inq.status || 'NEW', cleaned || undefined);
                                  }
                                  console.log('✅ [LeadTableView] Staff assigned successfully for lead:', inq.id, { staffId: cleaned });
                                } catch (err) {
                                  console.error('❌ [LeadTableView] Failed assigning staff for lead:', inq.id, err);
                                }
                              }}
                              className="text-[11px] font-bold rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                            >
                              <option value="">-- Unassigned --</option>
                              {staffList.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                <UserCheck className="w-3 h-3 text-emerald-500" />
                                <span>
                                  {inq.assignedStaffName ||
                                    staffList.find((s) => s.id === inq.assignedStaffId)?.name ||
                                    (isStaffMode ? 'Assigned to You' : 'Unassigned')}
                                </span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 3. Customer Details */}
                        <td className="py-4 px-4 align-top">
                          <div className="space-y-1">
                            <div className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                              <span>{inq.customerName || inq.fullName}</span>
                              {isLocked && (
                                <Lock className="w-3 h-3 text-rose-500 shrink-0" title="Locked lead" />
                              )}
                            </div>
                            <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                              <span>
                                📞 {lead.whatsapp_number || lead.phone || lead.metadata?.whatsapp_number || lead.metadata?.phone || inq.customerPhone || inq.whatsappNumber || 'No phone'}
                              </span>
                              {hasPhone && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenWhatsApp(inq)}
                                  title={`Chat with ${inq.customerName || inq.fullName} on WhatsApp`}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-emerald-700 dark:text-emerald-400 hover:text-white dark:hover:text-white border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold transition-all cursor-pointer shadow-2xs shrink-0"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </button>
                              )}
                            </div>
                            {inq.customerEmail && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{inq.customerEmail}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 4. City / Accommodation Tier */}
                        <td className="py-4 px-4 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                              <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                              <span>{inq.userCity || 'City TBD'}</span>
                            </div>
                            <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {inq.accommodationTier || '3 Star Hotel'}
                            </span>
                          </div>
                        </td>

                        {/* 5. Package Interest & Tags */}
                        <td className="py-4 px-4 align-top max-w-[220px]">
                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1" title={inq.title}>
                              {inq.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-1">
                              {(inq.tags && inq.tags.length > 0 ? inq.tags : [inq.type]).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-100 dark:border-orange-800/60 whitespace-nowrap"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* 7. Status Dropdown (NEW, CONTACTED, CLOSED) */}
                        <td className="py-4 px-4 align-top">
                          {isStaffMode && (isLocked || inq.status === 'CLOSED') ? (
                            <div
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 select-none"
                              title="This lead is Closed and permanently locked for staff. Contact an Administrator to modify."
                            >
                              <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>Closed (Locked)</span>
                            </div>
                          ) : (
                            <select
                              value={inq.status || 'NEW'}
                              disabled={isStaffMode && (isLocked || inq.status === 'CLOSED')}
                              onChange={async (e) => {
                                const newStatus = e.target.value as InquiryStatus;
                                if (isStaffMode && newStatus === 'CLOSED') {
                                  const proceed = window.confirm(
                                    'Warning: Changing status to CLOSED will lock this lead permanently for staff. Only an Administrator will be able to reopen it. Proceed?'
                                  );
                                  if (!proceed) return;
                                }
                                if (onUpdateStatus) {
                                  await onUpdateStatus(inq.id, newStatus);
                                } else {
                                  await updateLeadOrInquiryStatus(inq.id, newStatus);
                                }
                              }}
                              className={`text-xs font-extrabold rounded-xl px-3 py-1.5 border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                                statusCfg.badgeClass
                              }`}
                            >
                              {statusOptions.map((st) => (
                                <option key={st} value={st}>
                                  {CRM_STATUS_CONFIG[st]?.label || st}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* 8. Arrival Date */}
                        <td className="py-4 px-4 align-top">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span>{formatCrmDate(inq.checkInDate)}</span>
                          </div>
                        </td>

                        {/* 9. Actions */}
                        <td className="py-4 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Detailed Inspection Drawer */}
                            <button
                              type="button"
                              onClick={() => setSelectedDetailedLead(inq)}
                              title="Detailed Yatra Lead Inspection"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-orange-700 dark:text-orange-300 bg-orange-100/80 dark:bg-orange-950/60 hover:bg-orange-600 hover:text-white dark:hover:bg-orange-600 dark:hover:text-white border border-orange-300 dark:border-orange-800 transition-all cursor-pointer shadow-2xs shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detailed</span>
                            </button>

                            {/* Quick Edit modal */}
                            <button
                              onClick={() => onEditInquiry(inq)}
                              title="Edit Lead Details"
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* WhatsApp Direct */}
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(inq)}
                              title={`Direct WhatsApp chat with ${inq.customerName || inq.fullName}`}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-white hover:bg-emerald-600 dark:text-emerald-400 dark:hover:text-white dark:hover:bg-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>

                            {/* Notes Accordion Toggle */}
                            <button
                              onClick={() => toggleNotes(inq.id)}
                              title="Staff Notes & Logs"
                              className={`p-1.5 rounded-lg transition-colors relative ${
                                isNotesExpanded
                                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <MessageSquare className="w-4 h-4" />
                              {notesCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-600 text-white text-[9px] font-black flex items-center justify-center">
                                  {notesCount}
                                </span>
                              )}
                            </button>

                            {/* Admin Unlock if locked */}
                            {isAdmin && inq.isLockedForStaff && onUnlockInquiry && (
                              <button
                                onClick={() => onUnlockInquiry(inq.id)}
                                title="Reopen & Unlock Lead for Staff"
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                              >
                                <Unlock className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete (Admin only) */}
                            {isAdmin && onDeleteInquiry && (
                              <button
                                onClick={() => onDeleteInquiry(inq.id)}
                                title="Delete Lead"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Accordion Expandable Row: Staff Follow-up Notes & Log */}
                      {isNotesExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-[#071322]/80 border-b border-slate-200 dark:border-slate-800">
                          <td colSpan={8} className="p-4">
                            <div className="max-w-4xl mx-auto space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                                  <span>Internal Follow-up Notes for Lead {leadId}</span>
                                </span>
                                {inq.specialRequests && (
                                  <span className="text-[11px] font-normal text-slate-500 italic">
                                    Special Request: "{inq.specialRequests}"
                                  </span>
                                )}
                              </div>

                              {inq.followUpNotes && inq.followUpNotes.length > 0 ? (
                                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                  {inq.followUpNotes.map((note) => (
                                    <div
                                      key={note.id}
                                      className="p-2.5 rounded-xl bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 text-xs space-y-0.5"
                                    >
                                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                          {note.authorName} ({note.authorRole})
                                        </span>
                                        <span>{formatCrmTimestamp(note.createdAt)}</span>
                                      </div>
                                      <p className="text-slate-800 dark:text-slate-200">{note.text}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">No notes logged yet.</p>
                              )}

                              {onAddNote && (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    placeholder="Add quick follow-up note (e.g. Called devotee; sent customized quotation)..."
                                    value={noteInputs[inq.id] || ''}
                                    onChange={(e) =>
                                      setNoteInputs({ ...noteInputs, [inq.id]: e.target.value })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSendNote(inq.id);
                                      }
                                    }}
                                    className="flex-1 px-3 py-2 bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                                  />
                                  <button
                                    onClick={() => handleSendNote(inq.id)}
                                    disabled={submittingNote[inq.id] || !noteInputs[inq.id]?.trim()}
                                    className="px-3.5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Log Note</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Detailed Drawer / Modal */}
      <LeadDetailsModal
        lead={selectedDetailedLead}
        onClose={() => setSelectedDetailedLead(null)}
      />
    </div>
  );
};
