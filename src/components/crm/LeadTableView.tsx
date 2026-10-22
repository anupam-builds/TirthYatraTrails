import React, { useState, useMemo, useEffect } from 'react';
import { Inquiry, InquiryStatus, StaffMember } from '../../types.js';
import { updateLeadOrInquiryStatus, cleanUnassignedValue } from '../../services/api.js';
import { BaseInput, BaseSelect } from '../FormField.js';
import {
  getLeadId,
  formatLeadId,
  formatSequentialLeadId,
  computeSequentialLeadIdMap,
  CRM_STATUS_CONFIG,
  CRM_STATUS_LIST,
  ADMIN_CRM_STATUS_LIST,
  STAFF_CRM_STATUS_LIST,
  formatPaxCount,
  formatCrmDate,
  formatCrmTimestamp,
  generateCustomerWhatsAppLink,
  parseAccommodationTier,
  getLeadReminderStatus,
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
  Plus,
  Bell,
  Compass,
  XCircle,
  CalendarClock,
  MoreVertical,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { LeadDetailsModal } from '../LeadDetailsModal.js';
import { CreateLeadModal } from './CreateLeadModal.js';
import { ReminderAlertBanner } from './ReminderAlertBanner.js';
import { QuickReminderModal } from './QuickReminderModal.js';
import { LeadNotesModal } from './LeadNotesModal.js';

interface LeadTableViewProps {
  inquiries: Inquiry[];
  staffList?: StaffMember[];
  loading?: boolean;
  isAdmin?: boolean;
  isStaffMode?: boolean;
  currentStaffId?: string;
  currentStaffName?: string;
  onUpdateStatus?: (id: string, status: InquiryStatus) => Promise<void>;
  onAssignStaff?: (id: string, staffId: string) => Promise<void>;
  onDeleteInquiry?: (id: string) => Promise<void>;
  onUnlockInquiry?: (id: string) => Promise<void>;
  onEditInquiry?: (inquiry: Inquiry) => void;
  onAddNote?: (id: string, text: string) => Promise<void>;
  onEdit?: (inquiry: Inquiry) => void;
  onView?: (inquiry: Inquiry) => void;
  enableSelection?: boolean;
  onCreateLead?: () => void;
  onLeadCreated?: (newLead: Inquiry) => void;
}

export const LeadTableView: React.FC<LeadTableViewProps> = ({
  inquiries,
  staffList = [],
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
  onEdit,
  onView,
  onCreateLead,
  onLeadCreated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedDetailedLead, setSelectedDetailedLead] = useState<Inquiry | null>(null);
  const [selectedLeadForReminder, setSelectedLeadForReminder] = useState<Inquiry | null>(null);
  const [selectedLeadForNotes, setSelectedLeadForNotes] = useState<Inquiry | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{
    lead: Inquiry;
    seqLeadId: string;
    openUpwards: boolean;
    top: number;
    bottom: number;
    right: number;
  } | null>(null);

  // Close floating popover on click outside, scroll, resize, or escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.floating-crm-popover') && !target.closest('.lead-row-menu-btn')) {
        setMenuAnchor(null);
      }
    };
    const handleScrollOrResize = () => {
      setMenuAnchor(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuAnchor(null);
      }
    };

    if (menuAnchor) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [menuAnchor]);

  // Local state for optimistic updates and immediate persistence
  const [localInquiries, setLocalInquiries] = useState<Inquiry[]>(inquiries);

  useEffect(() => {
    setLocalInquiries(inquiries);
  }, [inquiries]);

  // In Staff Mode, staff members can ONLY view inquiries explicitly assigned to them by the administrator
  // Prioritize incoming inquiries prop so remote realtime status updates render immediately without lag
  const baseInquiries = useMemo(() => {
    const activeList = inquiries && inquiries.length > 0 ? inquiries : localInquiries;
    if (!isStaffMode) return activeList;
    const targetId = String(currentStaffId || '').trim().toLowerCase();
    const targetName = String(currentStaffName || '').trim().toLowerCase();

    // If no target ID or Name in staff mode, don't filter out everything
    if (!targetId && !targetName) return activeList;

    return activeList.filter((inq) => {
      // 1. Strict & normalized ID matching (handles assigned_staff_id and assignedStaffId)
      const rawStaffId = (inq as any).assigned_staff_id || inq.assignedStaffId || '';
      const inqStaffId = String(rawStaffId).trim().toLowerCase();
      const hasStaffId = Boolean(inqStaffId && inqStaffId !== 'undefined' && inqStaffId !== 'null' && inqStaffId !== '--unassigned--');
      const matchesId = hasStaffId && targetId !== '' && inqStaffId === targetId;

      // 2. Resilient Name matching (trimmed, case-insensitive, whitespace-normalized)
      const rawStaffName = (inq as any).assigned_staff_name || inq.assignedStaffName || '';
      const inqStaffName = String(rawStaffName).trim().toLowerCase();
      const hasStaffName = Boolean(inqStaffName && inqStaffName !== 'undefined' && inqStaffName !== 'null');
      const matchesName = hasStaffName && Boolean(
        targetName && (
          inqStaffName === targetName ||
          inqStaffName.replace(/\s+/g, ' ') === targetName.replace(/\s+/g, ' ')
        )
      );

      return matchesId || matchesName;
    });
  }, [inquiries, localInquiries, isStaffMode, currentStaffId, currentStaffName]);

  // Status options: Admin has 7 (New, Contacted, Cancelled, Postponed, Confirmed, Trip, Closed), Staff has 7
  const statusOptions = isAdmin ? ADMIN_CRM_STATUS_LIST : STAFF_CRM_STATUS_LIST;

  // Summary Metrics calculation matching workflow
  const totalCount = baseInquiries.length;
  const newCount = baseInquiries.filter((i) => !i.status || i.status === 'NEW').length;
  const contactedCount = baseInquiries.filter((i) => i.status === 'CONTACTED').length;
  const confirmedCount = baseInquiries.filter((i) => i.status === 'CONFIRMED').length;
  const tripCount = baseInquiries.filter((i) => i.status === 'TRIP' || i.status === 'Trip').length;
  const cancelledCount = baseInquiries.filter((i) => i.status === 'CANCELLED' || i.status === 'Cancelled').length;
  const postponedCount = baseInquiries.filter((i) => i.status === 'POSTPONED' || i.status === 'Postponed').length;
  const closedCount = baseInquiries.filter((i) => i.status === 'CLOSED').length;
  const unassignedCount = baseInquiries.filter((i) => {
    const raw = (i as any).assigned_staff_id || i.assignedStaffId;
    return !raw || raw === '--Unassigned--';
  }).length;

  const handleCopyLeadId = (leadId: string) => {
    navigator.clipboard.writeText(leadId);
    setCopiedId(leadId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Direct WhatsApp chat handler targeting the customer's specific phone number with Lead ID
  const handleDirectWhatsAppClick = (inq: Inquiry, visualLeadId?: string) => {
    const activeLead = inq as any;
    const currentLeadId =
      visualLeadId ||
      (activeLead.lead_id && /^TTT\d+$/i.test(String(activeLead.lead_id).trim()) ? String(activeLead.lead_id).trim().toUpperCase() : '') ||
      (activeLead.leadId && /^TTT\d+$/i.test(String(activeLead.leadId).trim()) ? String(activeLead.leadId).trim().toUpperCase() : '') ||
      (inq.id ? leadSeqIdMap.get(String(inq.id)) : undefined) ||
      'TTT00000001';

    let wa = generateCustomerWhatsAppLink({ ...inq, lead_id: currentLeadId, leadId: currentLeadId }, currentStaffName, currentLeadId);
    if (!wa || !wa.url) {
      const promptPhone = window.prompt(`No valid phone found for ${inq.customerName || inq.fullName || 'this customer'}. Please enter WhatsApp phone number:`, '');
      if (promptPhone && promptPhone.trim()) {
        wa = generateCustomerWhatsAppLink({ ...inq, phone: promptPhone.trim(), lead_id: currentLeadId, leadId: currentLeadId }, currentStaffName, currentLeadId);
      }
    }

    if (wa && wa.url) {
      window.open(wa.url, '_blank', 'noopener,noreferrer');
      // Automatically advance NEW leads to CONTACTED in background
      if (!inq.status || inq.status === 'NEW') {
        const exactId = (inq as any).id || inq.id;
        if (onUpdateStatus) {
          onUpdateStatus(exactId, 'CONTACTED').catch(() => {});
        } else {
          updateLeadOrInquiryStatus({ id: exactId, status: 'CONTACTED' }).catch(() => {});
        }
      }
    } else {
      alert(`No valid phone number found for ${activeLead.customer_name || inq.customerName || inq.fullName || 'this customer'}.`);
    }
  };

  const handleOpenWhatsApp = (inq: Inquiry, visualLeadId?: string) => {
    handleDirectWhatsAppClick(inq, visualLeadId);
  };

  // Compute chronological sequential IDs (oldest -> TTT00000001, TTT00000002, ...)
  // Consistent across filtering and search queries
  const leadSeqIdMap = useMemo(() => {
    return computeSequentialLeadIdMap(baseInquiries);
  }, [baseInquiries]);

  // Filter inquiries
  const filteredInquiries = baseInquiries.filter((inq) => {
    // Status Filter
    if (statusFilter !== 'ALL') {
      const isTripFilter = statusFilter === 'TRIP' || statusFilter === 'Trip';
      const isTripInq = inq.status === 'TRIP' || inq.status === 'Trip';
      if (isTripFilter && !isTripInq) return false;

      const isCancelledFilter = statusFilter === 'CANCELLED' || statusFilter === 'Cancelled';
      const isCancelledInq = inq.status === 'CANCELLED' || inq.status === 'Cancelled';
      if (isCancelledFilter && !isCancelledInq) return false;

      const isPostponedFilter = statusFilter === 'POSTPONED' || statusFilter === 'Postponed';
      const isPostponedInq = inq.status === 'POSTPONED' || inq.status === 'Postponed';
      if (isPostponedFilter && !isPostponedInq) return false;

      const isFollowUpFilter = statusFilter === 'FOLLOW_UP_REQUIRED' || statusFilter === 'Follow-up Required';
      const isFollowUpInq = inq.status === 'FOLLOW_UP_REQUIRED' || inq.status === 'Follow-up Required';
      if (isFollowUpFilter && !isFollowUpInq) return false;

      const isNegFilter = statusFilter === 'NEGOTIATION' || statusFilter === 'Negotiation';
      const isNegInq = inq.status === 'NEGOTIATION' || inq.status === 'Negotiation';
      if (isNegFilter && !isNegInq) return false;

      if (!isTripFilter && !isCancelledFilter && !isPostponedFilter && !isFollowUpFilter && !isNegFilter && inq.status !== statusFilter) return false;
    }

    // Staff filter (Applicable only in Admin mode)
    if (isAdmin) {
      const inqStaff = (inq as any).assigned_staff_id || inq.assignedStaffId || '';
      const hasAssigned = Boolean(inqStaff && inqStaff !== '--Unassigned--');
      if (staffFilter === 'UNASSIGNED' && hasAssigned) {
        return false;
      } else if (staffFilter === 'MY' && currentStaffId && inqStaff !== currentStaffId) {
        return false;
      } else if (staffFilter !== 'ALL' && staffFilter !== 'UNASSIGNED' && staffFilter !== 'MY' && inqStaff !== staffFilter) {
        return false;
      }
    }

    // Search query matching Lead ID (sequential or raw UUID), name, phone, or city
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const lead = inq as any;
      const seqId = (leadSeqIdMap.get(String(inq.id)) || '').toLowerCase();
      const rawLeadId = (formatLeadId(lead.id) || getLeadId(inq)).toLowerCase();
      const name = (inq.customerName || inq.fullName || '').toLowerCase();
      const phone = (lead.whatsapp_number || lead.phone || lead.metadata?.whatsapp_number || lead.metadata?.phone || inq.customerPhone || inq.whatsappNumber || '').toLowerCase();
      const city = (inq.userCity || '').toLowerCase();
      const title = (inq.title || inq.referenceName || '').toLowerCase();
      const tagsStr = (inq.tags || []).join(' ').toLowerCase();

      const matches =
        seqId.includes(q) ||
        rawLeadId.includes(q) ||
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
      {/* Real-time Audio & Visual Reminder Alert Banner */}
      <ReminderAlertBanner
        inquiries={localInquiries}
        onEditInquiry={(inq) => {
          if (onEditInquiry) onEditInquiry(inq);
          else if (onEdit) onEdit(inq);
        }}
        onUpdateInquiry={async (id, updates) => {
          const res = await updateLeadOrInquiryStatus({ id, ...updates });
          const updated = Array.isArray(res) ? (res[0] || {}) : (res || {});
          setLocalInquiries((prev) =>
            prev.map((item) =>
              String(item.id) === String(id)
                ? { ...item, ...updates, ...updated }
                : item
            )
          );
        }}
        isStaffMode={isStaffMode}
        currentStaffId={currentStaffId}
        currentStaffName={currentStaffName}
      />

      {/* 1. SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5">
        {/* Total Enquiries */}
        <div
          onClick={() => {
            setStatusFilter('ALL');
            if (isAdmin) setStaffFilter('ALL');
          }}
          className={`px-2.5 py-3 sm:px-3 sm:py-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs min-w-0 flex flex-col justify-between ${
            statusFilter === 'ALL' && staffFilter === 'ALL'
              ? 'bg-orange-50 border-orange-300 dark:bg-orange-950/40 dark:border-orange-700 ring-2 ring-orange-500/20'
              : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-orange-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span
              className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 leading-tight truncate"
              title={isStaffMode ? 'My Assigned Leads' : 'Total Leads'}
            >
              {isStaffMode ? 'My Leads' : 'Total Leads'}
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex flex-col min-w-0">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono leading-none tracking-tight">
              {totalCount}
            </span>
            <span
              className="mt-1 text-[10px] sm:text-[10.5px] font-medium text-slate-400 dark:text-slate-400 tracking-tight truncate"
              title={isStaffMode ? 'assigned desk' : 'registered'}
            >
              {isStaffMode ? 'assigned desk' : 'registered'}
            </span>
          </div>
        </div>

        {/* New Leads */}
        <div
          onClick={() => setStatusFilter('NEW')}
          className={`px-2.5 py-3 sm:px-3 sm:py-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs min-w-0 flex flex-col justify-between ${
            statusFilter === 'NEW'
              ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-amber-700 dark:text-amber-400 leading-tight truncate">
              New Leads
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex flex-col min-w-0">
            <span className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300 font-mono leading-none tracking-tight">
              {newCount}
            </span>
            <span
              className="mt-1 text-[10px] sm:text-[10.5px] font-medium text-slate-400 dark:text-slate-400 tracking-tight truncate"
              title="awaiting contact"
            >
              awaiting
            </span>
          </div>
        </div>

        {/* Contacted */}
        <div
          onClick={() => setStatusFilter('CONTACTED')}
          className={`px-2.5 py-3 sm:px-3 sm:py-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs min-w-0 flex flex-col justify-between ${
            statusFilter === 'CONTACTED'
              ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/40 dark:border-blue-700 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 leading-tight truncate">
              Contacted
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex flex-col min-w-0">
            <span className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-300 font-mono leading-none tracking-tight">
              {contactedCount}
            </span>
            <span
              className="mt-1 text-[10px] sm:text-[10.5px] font-medium text-slate-400 dark:text-slate-400 tracking-tight truncate"
              title="active consults"
            >
              active consults
            </span>
          </div>
        </div>

        {/* Confirmed Bookings */}
        <div
          onClick={() => setStatusFilter('CONFIRMED')}
          className={`px-2.5 py-3 sm:px-3 sm:py-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs min-w-0 flex flex-col justify-between ${
            statusFilter === 'CONFIRMED'
              ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 leading-tight truncate">
              Confirmed
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex flex-col min-w-0">
            <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono leading-none tracking-tight">
              {confirmedCount}
            </span>
            <span
              className="mt-1 text-[10px] sm:text-[10.5px] font-medium text-slate-400 dark:text-slate-400 tracking-tight truncate"
              title="confirmed bookings"
            >
              confirmed
            </span>
          </div>
        </div>

        {/* Trip - Itinerary Ready & Finalized for Travel */}
        <div
          onClick={() => setStatusFilter('TRIP')}
          className={`px-2.5 py-3 sm:px-3 sm:py-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs min-w-0 flex flex-col justify-between ${
            statusFilter === 'TRIP' || statusFilter === 'Trip'
              ? 'bg-purple-50 border-purple-300 dark:bg-purple-950/40 dark:border-purple-700 ring-2 ring-purple-500/20'
              : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-purple-700 dark:text-purple-400 leading-tight truncate">
              Trip
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex flex-col min-w-0">
            <span className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-300 font-mono leading-none tracking-tight">
              {tripCount}
            </span>
            <span
              className="mt-1 text-[10px] sm:text-[10.5px] font-medium text-slate-400 dark:text-slate-400 tracking-tight truncate"
              title="travel ready"
            >
              travel ready
            </span>
          </div>
        </div>

        {/* Cancelled */}
        <div
          onClick={() => setStatusFilter('CANCELLED')}
          className={`px-2.5 py-3 sm:px-3 sm:py-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs min-w-0 flex flex-col justify-between ${
            statusFilter === 'CANCELLED' || statusFilter === 'Cancelled'
              ? 'bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-700 ring-2 ring-red-500/20'
              : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-red-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-red-700 dark:text-red-400 leading-tight truncate">
              Cancelled
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400">
              <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex flex-col min-w-0">
            <span className="text-xl sm:text-2xl font-black text-red-700 dark:text-red-300 font-mono leading-none tracking-tight">
              {cancelledCount}
            </span>
            <span
              className="mt-1 text-[10px] sm:text-[10.5px] font-medium text-slate-400 dark:text-slate-400 tracking-tight truncate"
              title="cancelled"
            >
              cancelled
            </span>
          </div>
        </div>

        {/* Postponed */}
        <div
          onClick={() => setStatusFilter('POSTPONED')}
          className={`px-2.5 py-3 sm:px-3 sm:py-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs min-w-0 flex flex-col justify-between ${
            statusFilter === 'POSTPONED' || statusFilter === 'Postponed'
              ? 'bg-orange-50 border-orange-300 dark:bg-orange-950/40 dark:border-orange-700 ring-2 ring-orange-500/20'
              : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-orange-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-orange-700 dark:text-orange-400 leading-tight truncate">
              Postponed
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <CalendarClock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex flex-col min-w-0">
            <span className="text-xl sm:text-2xl font-black text-orange-700 dark:text-orange-300 font-mono leading-none tracking-tight">
              {postponedCount}
            </span>
            <span
              className="mt-1 text-[10px] sm:text-[10.5px] font-medium text-slate-400 dark:text-slate-400 tracking-tight truncate"
              title="deferred dates"
            >
              deferred
            </span>
          </div>
        </div>

        {/* Closed */}
        <div
          onClick={() => setStatusFilter('CLOSED')}
          className={`px-2.5 py-3 sm:px-3 sm:py-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs min-w-0 flex flex-col justify-between ${
            statusFilter === 'CLOSED'
              ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 ring-2 ring-slate-400/20'
              : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight truncate">
              Closed
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex flex-col min-w-0">
            <span className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-300 font-mono leading-none tracking-tight">
              {closedCount}
            </span>
            <span
              className="mt-1 text-[10px] sm:text-[10.5px] font-medium text-slate-400 dark:text-slate-400 tracking-tight truncate"
              title="finalized"
            >
              finalized
            </span>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER BAR */}
      <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Global Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <BaseInput
              id="crm-leads-global-search"
              name="crm-leads-global-search"
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

          <div className="flex items-center gap-3 shrink-0">
            {/* Assigned Staff Filter - Admin Only */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <label htmlFor="crm-filter-by-staff" className="text-xs font-bold text-slate-500 shrink-0">Staff:</label>
                <BaseSelect
                  id="crm-filter-by-staff"
                  name="crm-filter-by-staff"
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
                </BaseSelect>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Assigned To You ({totalCount})</span>
              </div>
            )}

            {/* Prominent Create Lead Button (Accessible to both Admin & Staff) */}
            <button
              type="button"
              id="crm-create-lead-btn"
              onClick={() => {
                if (onCreateLead) onCreateLead();
                else setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white text-xs font-black shadow-md hover:shadow-orange-600/30 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 text-amber-200" />
              <span>Create Lead</span>
            </button>
          </div>
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
            const count = baseInquiries.filter((i) => {
              if (st === 'TRIP') return i.status === 'TRIP' || i.status === 'Trip';
              if (st === 'CANCELLED') return i.status === 'CANCELLED' || i.status === 'Cancelled';
              if (st === 'POSTPONED') return i.status === 'POSTPONED' || i.status === 'Postponed';
              if (st === 'FOLLOW_UP_REQUIRED') return i.status === 'FOLLOW_UP_REQUIRED' || i.status === 'Follow-up Required';
              if (st === 'NEGOTIATION') return i.status === 'NEGOTIATION' || i.status === 'Negotiation';
              return i.status === st;
            }).length;
            const cfg = CRM_STATUS_CONFIG[st];
            const isActive =
              statusFilter === st ||
              (st === 'CANCELLED' && statusFilter === 'Cancelled') ||
              (st === 'POSTPONED' && statusFilter === 'Postponed') ||
              (st === 'FOLLOW_UP_REQUIRED' && statusFilter === 'Follow-up Required') ||
              (st === 'NEGOTIATION' && statusFilter === 'Negotiation') ||
              (st === 'TRIP' && statusFilter === 'Trip');
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
      <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#081220] text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3 w-[115px]">Lead ID &amp; Date</th>
                <th className="py-3 px-3 w-[135px]">Assigned Staff</th>
                <th className="py-3 px-3 w-[160px]">Customer</th>
                <th className="py-3 px-3 min-w-[150px]">City / Package</th>
                <th className="py-3 px-3 w-[120px]">Status</th>
                <th className="py-3 px-3 w-[135px]">Dates / Duration</th>
                <th className="py-3 px-3 w-[210px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 animate-pulse">
                    Loading CRM database records...
                  </td>
                </tr>
              ) : filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 space-y-2">
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
                filteredInquiries.map((inq, index) => {
                  const lead = inq as any;
                  const currentAssignedId = lead.assigned_staff_id || lead.assignedStaffId || inq.assignedStaffId || '--Unassigned--';
                  // Priority: Look up explicit lead_id or leadId, then globally sequenced ID (TTT00000001, etc.), fallback to sequential position index
                  const seqLeadId =
                    (lead.lead_id && /^TTT\d+$/i.test(String(lead.lead_id).trim()) ? String(lead.lead_id).trim().toUpperCase() : '') ||
                    (lead.leadId && /^TTT\d+$/i.test(String(lead.leadId).trim()) ? String(lead.leadId).trim().toUpperCase() : '') ||
                    (lead.id && /^TTT\d+$/i.test(String(lead.id).trim()) ? String(lead.id).trim().toUpperCase() : '') ||
                    leadSeqIdMap.get(String(inq.id)) ||
                    formatSequentialLeadId(index + 1);
                  const rawLeadId = formatLeadId(lead.id);
                  const paxStr = formatPaxCount(inq);
                  const statusCfg = CRM_STATUS_CONFIG[inq.status as InquiryStatus] || CRM_STATUS_CONFIG.NEW;
                  const isLocked = Boolean(inq.isLockedForStaff || inq.status === 'CLOSED');
                  const notesCount = inq.followUpNotes?.length || 0;
                  const phoneCandidate =
                    lead.whatsapp_number ||
                    lead.phone ||
                    lead.whatsapp ||
                    lead.mobile ||
                    lead.contact ||
                    lead.customer_phone ||
                    lead.customerPhone ||
                    lead.phone_number ||
                    lead.phoneNumber ||
                    lead.metadata?.whatsapp_number ||
                    lead.metadata?.phone ||
                    lead.metadata?.customer_phone ||
                    lead.metadata?.mobile ||
                    inq.customerPhone ||
                    inq.whatsappNumber ||
                    '';
                  const waData = generateCustomerWhatsAppLink({ ...inq, lead_id: seqLeadId, leadId: seqLeadId }, currentStaffName, seqLeadId);
                  const leadEndDate = inq.endDate || lead.end_date || lead.endDate || inq.end_date || lead.metadata?.end_date;
                  const leadDurationDays = inq.durationDays ?? lead.duration_days ?? lead.durationDays ?? inq.duration_days ?? lead.metadata?.duration_days;
                  const leadBudget = inq.budget || lead.budget || lead.metadata?.budget;

                  return (
                    <React.Fragment key={inq.id}>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-[#0a192f]/50 transition-colors group">
                        {/* 1. Lead ID & Date */}
                        <td className="py-3 px-3 align-middle">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                title={`System UUID: ${lead.id}`}
                                className="font-mono font-black text-orange-600 dark:text-orange-400 text-xs tracking-tight bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded-md border border-orange-200 dark:border-orange-800/80"
                              >
                                {seqLeadId}
                              </span>
                              <button
                                onClick={() => handleCopyLeadId(seqLeadId)}
                                title={`Copy Lead ID (${seqLeadId})`}
                                className="text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
                              >
                                {copiedId === seqLeadId ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                              {formatCrmTimestamp(inq.createdAt)}
                            </div>
                          </div>
                        </td>

                        {/* 2. Assigned Staff - Editable ONLY by Admin */}
                        <td className="py-3 px-3 align-middle">
                          {isAdmin && onAssignStaff ? (
                            <BaseSelect
                              id={`row-assigned-staff-${lead.id}`}
                              name={`row-assigned-staff-${lead.id}`}
                              value={currentAssignedId === null ? '--Unassigned--' : currentAssignedId}
                              onChange={async (e) => {
                                const rawVal = e?.target ? e.target.value : ((e as any)?.assignedStaffId || e);
                                const rawStaffId = typeof rawVal === 'object' && rawVal !== null
                                  ? ((rawVal as any)?.target?.value || (rawVal as any)?.assignedStaffId || (rawVal as any)?.id || (rawVal as any)?.value || '')
                                  : rawVal;
                                const cleaned = cleanUnassignedValue(String(rawStaffId || '')) || '';
                                const staffMember = cleaned ? staffList.find((s) => String(s.id) === String(cleaned)) : null;
                                const staffName = staffMember ? staffMember.name : '';

                                // Optimistic local state update
                                setLocalInquiries((prev) =>
                                  prev.map((item) =>
                                    String(item.id) === String(lead.id)
                                      ? {
                                          ...item,
                                          assignedStaffId: cleaned || undefined,
                                          assigned_staff_id: cleaned || null,
                                          assignedStaffName: staffName || undefined,
                                          assigned_staff_name: staffName || null,
                                        }
                                      : item
                                  )
                                );

                                try {
                                  if (onAssignStaff) {
                                    await onAssignStaff(lead.id, String(cleaned));
                                  } else {
                                    const res = await updateLeadOrInquiryStatus({
                                      id: lead.id,
                                      status: inq.status || 'NEW',
                                      assignedStaffId: cleaned || null,
                                      assignedStaffName: staffName || null,
                                    });
                                    const updated = Array.isArray(res) ? (res[0] || {}) : (res || {});
                                    setLocalInquiries((prev) =>
                                      prev.map((item) =>
                                        String(item.id) === String(lead.id)
                                          ? {
                                              ...item,
                                              ...updated,
                                              assignedStaffId: updated.assignedStaffId ?? updated.assigned_staff_id ?? (cleaned || undefined),
                                              assigned_staff_id: updated.assigned_staff_id ?? updated.assignedStaffId ?? (cleaned || null),
                                              assignedStaffName: updated.assignedStaffName ?? updated.assigned_staff_name ?? (staffName || undefined),
                                              assigned_staff_name: updated.assigned_staff_name ?? updated.assignedStaffName ?? (staffName || null),
                                            }
                                          : item
                                      )
                                    );
                                  }
                                } catch (err) {
                                  console.error('Failed assigning staff:', err);
                                  setLocalInquiries(inquiries);
                                }
                              }}
                              className="text-[11px] font-bold rounded-lg px-2 py-1 border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 max-w-[130px] truncate"
                            >
                              <option value="--Unassigned--">-- Unassigned --</option>
                              {staffList.map((stf) => (
                                <option key={stf.id} value={stf.id}>
                                  {stf.name}
                                </option>
                              ))}
                            </BaseSelect>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 max-w-[130px] truncate">
                                <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="truncate">
                                  {inq.assignedStaffName ||
                                    lead.assigned_staff_name ||
                                    staffList.find((s) => s.id === (currentAssignedId !== '--Unassigned--' ? currentAssignedId : inq.assignedStaffId))?.name ||
                                    (isStaffMode ? 'Assigned to You' : 'Unassigned')}
                                </span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 3. Customer Details (Name & Mobile Number ONLY - Compact) */}
                        <td className="py-3 px-3 align-middle">
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1 truncate">
                              <span className="truncate" title={inq.customerName || inq.fullName}>
                                {inq.customerName || inq.fullName}
                              </span>
                              {isLocked && (
                                <Lock className="w-3 h-3 text-rose-500 shrink-0" title="Locked lead" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1 truncate">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{phoneCandidate || 'No phone'}</span>
                            </div>
                          </div>
                        </td>

                        {/* 4. City / Package (Concise & Combined) */}
                        <td className="py-3 px-3 align-middle">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-bold text-xs truncate">
                              <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                              <span className="truncate" title={inq.userCity || 'City TBD'}>
                                {inq.userCity || 'City TBD'}
                              </span>
                            </div>
                            <div
                              className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]"
                              title={inq.title || inq.referenceName || ''}
                            >
                              {inq.title || inq.referenceName || 'Yatra Package'}
                            </div>
                          </div>
                        </td>

                        {/* 5. Status Dropdown */}
                        <td className="py-3 px-3 align-middle">
                          {isStaffMode && (isLocked || inq.status === 'CLOSED') ? (
                            <div
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 select-none whitespace-nowrap"
                              title="This lead is Closed and permanently locked for staff."
                            >
                              <Lock className="w-3 h-3 text-rose-500 shrink-0" />
                              <span>Closed</span>
                            </div>
                          ) : (
                            <BaseSelect
                              id={`row-lead-status-${lead.id}`}
                              name={`row-lead-status-${lead.id}`}
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
                                // Immediate optimistic state update
                                setLocalInquiries((prev) =>
                                  prev.map((item) =>
                                    String(item.id) === String(lead.id)
                                      ? { ...item, status: newStatus }
                                      : item
                                  )
                                );
                                try {
                                  if (onUpdateStatus) {
                                    await onUpdateStatus(lead.id, newStatus);
                                  } else {
                                    const res = await updateLeadOrInquiryStatus({ id: lead.id, status: newStatus });
                                    const updated = Array.isArray(res) ? (res[0] || {}) : (res || {});
                                    setLocalInquiries((prev) =>
                                      prev.map((item) =>
                                        String(item.id) === String(lead.id)
                                          ? { ...item, ...updated, status: updated.status || newStatus }
                                          : item
                                      )
                                    );
                                  }
                                } catch (err) {
                                  setLocalInquiries(inquiries);
                                }
                              }}
                              className={`text-[11px] font-extrabold rounded-lg px-2 py-1 border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                                statusCfg.badgeClass
                              }`}
                            >
                              {statusOptions.map((st) => (
                                <option key={st} value={st}>
                                  {CRM_STATUS_CONFIG[st]?.label || st}
                                </option>
                              ))}
                            </BaseSelect>
                          )}
                        </td>

                        {/* 6. Dates / Duration */}
                        <td className="py-3 px-3 align-middle">
                          <div className="space-y-0.5 text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                              <Calendar className="w-3 h-3 text-orange-500 shrink-0" />
                              <span>{formatCrmDate(inq.checkInDate)}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              {leadDurationDays ? (
                                <span>{leadDurationDays}d</span>
                              ) : inq.tourDuration ? (
                                <span>{inq.tourDuration}</span>
                              ) : null}
                              {paxStr && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{paxStr}</span>
                                </>
                              )}
                              {leadBudget && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{leadBudget}</span>
                                </>
                              )}
                              {inq.reminder_at && (
                                <span
                                  title={`Follow-up Reminder: ${getLeadReminderStatus(inq.reminder_at).label}`}
                                  className="text-amber-500 font-bold ml-0.5"
                                >
                                  🔔
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 7. Action Buttons (Side-by-Side: Detailed + WhatsApp + 3-Dots Menu) */}
                        <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5 relative lead-row-menu-container">
                            {/* Detailed Inspection Drawer */}
                            <button
                              type="button"
                              onClick={() => {
                                if (onView) onView({ ...inq, leadId: seqLeadId });
                                else setSelectedDetailedLead({ ...inq, leadId: seqLeadId });
                              }}
                              title="Detailed Yatra Lead Inspection"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-orange-700 dark:text-orange-300 bg-orange-100 hover:bg-orange-600 hover:text-white dark:bg-orange-950/70 dark:hover:bg-orange-600 dark:hover:text-white border border-orange-200 dark:border-orange-800 transition-all cursor-pointer shadow-2xs shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detailed</span>
                            </button>

                            {/* Direct WhatsApp Action Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDirectWhatsAppClick(inq, seqLeadId);
                              }}
                              title={
                                waData
                                  ? `Open WhatsApp chat with ${inq.customerName || inq.fullName || 'Customer'} (+${waData.phone}) [Lead: ${seqLeadId}]`
                                  : `Open WhatsApp chat with ${inq.customerName || inq.fullName || 'Customer'}`
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 shadow-2xs transition-all cursor-pointer shrink-0"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current" />
                              <span>WhatsApp</span>
                            </button>

                            {/* 3-Dots Floating Dropdown Trigger Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                if (menuAnchor && menuAnchor.lead.id === lead.id) {
                                  setMenuAnchor(null);
                                } else {
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  // Open upwards above the button by default or whenever space allows
                                  const openUpwards = spaceAbove >= 180 || spaceBelow < 200;

                                  setMenuAnchor({
                                    lead: inq,
                                    seqLeadId,
                                    openUpwards,
                                    top: rect.bottom + 6,
                                    bottom: Math.max(12, window.innerHeight - rect.top + 6),
                                    right: Math.max(12, window.innerWidth - rect.right),
                                  });
                                }
                              }}
                              title="Actions (Set Reminder, Edit Note, Delete)"
                              className={`lead-row-menu-btn p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                menuAnchor && menuAnchor.lead.id === lead.id
                                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                              }`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating 3-Dots Action Popover (Pops open upwards above the 3-dots button) */}
      {menuAnchor &&
        createPortal(
          <div
            role="menu"
            style={
              menuAnchor.openUpwards
                ? {
                    position: 'fixed',
                    bottom: `${menuAnchor.bottom}px`,
                    right: `${menuAnchor.right}px`,
                    zIndex: 9999,
                  }
                : {
                    position: 'fixed',
                    top: `${menuAnchor.top}px`,
                    right: `${menuAnchor.right}px`,
                    zIndex: 9999,
                  }
            }
            className={`floating-crm-popover w-48 rounded-2xl bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-800 shadow-2xl py-1 text-left divide-y divide-slate-100 dark:divide-slate-800 text-xs animate-in fade-in select-none ${
              menuAnchor.openUpwards
                ? 'slide-in-from-bottom-2 origin-bottom-right'
                : 'slide-in-from-top-2 origin-top-right'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              {/* 1. Set / Manage Reminder */}
              {isStaffMode && (menuAnchor.lead.isLockedForStaff || menuAnchor.lead.status === 'CLOSED') ? (
                <div className="px-3 py-1.5 text-[11px] text-slate-400 cursor-not-allowed">
                  Reminders locked (Closed)
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const targetLead = { ...menuAnchor.lead, leadId: menuAnchor.seqLeadId };
                    setMenuAnchor(null);
                    setSelectedLeadForReminder(targetLead);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Bell
                      className={`w-3.5 h-3.5 ${
                        menuAnchor.lead.reminder_at ? 'text-amber-500 fill-amber-500/20' : 'text-slate-400'
                      }`}
                    />
                    <span>{menuAnchor.lead.reminder_at ? 'Manage Reminder' : 'Set Reminder'}</span>
                  </div>
                  {menuAnchor.lead.reminder_at && (
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </button>
              )}

              {/* 2. Edit Note */}
              <button
                type="button"
                onClick={() => {
                  const targetLead = { ...menuAnchor.lead, leadId: menuAnchor.seqLeadId };
                  setMenuAnchor(null);
                  setSelectedLeadForNotes(targetLead);
                }}
                className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit Note</span>
                </div>
                {(menuAnchor.lead.followUpNotes?.length || 0) > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold text-[10px]">
                    {menuAnchor.lead.followUpNotes?.length}
                  </span>
                )}
              </button>

              {/* 3. Edit Details */}
              {isStaffMode && (menuAnchor.lead.isLockedForStaff || menuAnchor.lead.status === 'CLOSED') ? (
                <div className="px-3 py-1.5 text-[11px] text-slate-400 cursor-not-allowed">
                  Edit locked (Closed)
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const targetLead = { ...menuAnchor.lead, leadId: menuAnchor.seqLeadId };
                    setMenuAnchor(null);
                    if (onEditInquiry) onEditInquiry(targetLead);
                    else if (onEdit) onEdit(targetLead);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit Details</span>
                </button>
              )}
            </div>

            {/* Admin Unlock or Delete */}
            {(isAdmin && (menuAnchor.lead.isLockedForStaff || onDeleteInquiry)) && (
              <div className="py-1">
                {isAdmin && menuAnchor.lead.isLockedForStaff && onUnlockInquiry && (
                  <button
                    type="button"
                    onClick={() => {
                      const leadId = menuAnchor.lead.id;
                      setMenuAnchor(null);
                      onUnlockInquiry(leadId);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unlock Lead</span>
                  </button>
                )}

                {isAdmin && onDeleteInquiry && (
                  <button
                    type="button"
                    onClick={() => {
                      const leadId = menuAnchor.lead.id;
                      setMenuAnchor(null);
                      onDeleteInquiry(leadId);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>,
          document.body
        )}

      {/* Slide-over Detailed Drawer / Modal */}
      <LeadDetailsModal
        lead={selectedDetailedLead}
        isStaffMode={isStaffMode}
        onClose={() => setSelectedDetailedLead(null)}
        onUpdateLead={async (id, updates) => {
          if (isStaffMode && (selectedDetailedLead?.status === 'CLOSED' || selectedDetailedLead?.isLockedForStaff)) {
            alert('You cannot change a closed lead.');
            return;
          }
          const res = await updateLeadOrInquiryStatus({ id, ...updates });
          const updated = Array.isArray(res) ? (res[0] || {}) : (res || {});
          setLocalInquiries((prev) =>
            prev.map((item) =>
              String(item.id) === String(id)
                ? { ...item, ...updates, ...updated }
                : item
            )
          );
          if (selectedDetailedLead && String(selectedDetailedLead.id) === String(id)) {
            setSelectedDetailedLead((prev: any) => ({ ...prev, ...updates, ...updated }));
          }
        }}
        onEditLead={(leadToEdit) => {
          if (isStaffMode && (leadToEdit?.status === 'CLOSED' || leadToEdit?.isLockedForStaff)) {
            alert('You cannot change a closed lead.');
            return;
          }
          setSelectedDetailedLead(null);
          if (onEditInquiry) onEditInquiry(leadToEdit);
          else if (onEdit) onEdit(leadToEdit);
        }}
      />

      {/* Quick Reminder Modal (1-click from table row) */}
      <QuickReminderModal
        lead={selectedLeadForReminder}
        isOpen={Boolean(selectedLeadForReminder)}
        onClose={() => setSelectedLeadForReminder(null)}
        isStaffMode={isStaffMode}
        onSave={async (id, updates) => {
          const res = await updateLeadOrInquiryStatus({ id, ...updates });
          const updated = Array.isArray(res) ? (res[0] || {}) : (res || {});
          setLocalInquiries((prev) =>
            prev.map((item) =>
              String(item.id) === String(id)
                ? { ...item, ...updates, ...updated }
                : item
            )
          );
        }}
      />

      {/* Dedicated Lead Notes Modal */}
      <LeadNotesModal
        lead={selectedLeadForNotes}
        isOpen={Boolean(selectedLeadForNotes)}
        onClose={() => setSelectedLeadForNotes(null)}
        isStaffMode={isStaffMode}
        currentStaffName={currentStaffName}
        onAddNote={async (id, text) => {
          if (onAddNote) {
            await onAddNote(id, text);
          }
          const newNote = {
            id: `note-${Date.now()}`,
            authorName: currentStaffName || (isAdmin ? 'Administrator' : 'Staff'),
            authorRole: isAdmin ? 'ADMIN' : 'STAFF',
            text,
            createdAt: new Date().toISOString(),
          };
          setLocalInquiries((prev) =>
            prev.map((item) =>
              String(item.id) === String(id)
                ? {
                    ...item,
                    followUpNotes: [...(item.followUpNotes || []), newNote as any],
                  }
                : item
            )
          );
          setSelectedLeadForNotes((prev) =>
            prev && String(prev.id) === String(id)
              ? {
                  ...prev,
                  followUpNotes: [...(prev.followUpNotes || []), newNote as any],
                }
              : prev
          );
        }}
      />

      {/* Manual Entry Create Lead Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newLead) => {
          setLocalInquiries((prev) => [newLead, ...prev.filter((i) => i.id !== newLead.id)]);
          if (onLeadCreated) onLeadCreated(newLead);
        }}
        staffList={staffList}
        isStaffMode={isStaffMode}
        currentStaffId={currentStaffId}
        currentStaffName={currentStaffName}
      />
    </div>
  );
};
