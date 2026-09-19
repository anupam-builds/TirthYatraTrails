import React, { useState, useEffect } from 'react';
import { Inquiry, InquiryStatus, StaffMember } from '../../types.js';
import {
  getLeadId,
  CRM_STATUS_CONFIG,
  CRM_STATUS_LIST,
  ADMIN_CRM_STATUS_LIST,
  STAFF_CRM_STATUS_LIST,
  ACCOMMODATION_TIERS,
  formatPaxCount,
  formatCrmTimestamp,
  generateCustomerWhatsAppLink,
} from '../../utils/crmUtils.js';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  Tag,
  Building,
  CheckCircle2,
  Clock,
  MessageSquare,
  MessageCircle,
  Send,
  Copy,
  Check,
  Lock,
} from 'lucide-react';

interface LeadEditModalProps {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Inquiry>) => Promise<void>;
  staffList: StaffMember[];
  isStaffMode?: boolean;
  currentStaffName?: string;
  onAddNote?: (inquiryId: string, text: string) => Promise<void>;
}

export const LeadEditModal: React.FC<LeadEditModalProps> = ({
  inquiry,
  isOpen,
  onClose,
  onSave,
  staffList,
  isStaffMode = false,
  currentStaffName,
  onAddNote,
}) => {
  const [formData, setFormData] = useState<Partial<Inquiry>>({});
  const [saving, setSaving] = useState(false);
  const [copiedLeadId, setCopiedLeadId] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (inquiry) {
      const phoneVal = (inquiry as any).whatsapp_number || inquiry.phone || (inquiry as any).metadata?.whatsapp_number || (inquiry as any).metadata?.phone || inquiry.customerPhone || inquiry.whatsappNumber || '';
      setFormData({
        customerName: inquiry.customerName || inquiry.fullName || '',
        fullName: inquiry.customerName || inquiry.fullName || '',
        customerPhone: phoneVal,
        whatsappNumber: phoneVal,
        customerEmail: inquiry.customerEmail || inquiry.email || '',
        email: inquiry.customerEmail || inquiry.email || '',
        userCity: inquiry.userCity || '',
        checkInDate: inquiry.checkInDate || '',
        adults: inquiry.adults !== undefined ? inquiry.adults : inquiry.guests || 2,
        children: inquiry.children !== undefined ? inquiry.children : 0,
        accommodationTier: inquiry.accommodationTier || '3 Star Hotel',
        status: inquiry.status || 'NEW',
        assignedStaffId: inquiry.assignedStaffId || '',
        assignedStaffName: inquiry.assignedStaffName || '',
        title: inquiry.title || inquiry.referenceName || '',
        specialRequests: inquiry.specialRequests || '',
        tags: inquiry.tags ? [...inquiry.tags] : [],
        tourDuration: inquiry.tourDuration || '',
        pickupLocation: inquiry.pickupLocation || '',
        dropoffLocation: inquiry.dropoffLocation || '',
      });
    }
  }, [inquiry]);

  if (!isOpen || !inquiry) return null;

  const leadId = getLeadId(inquiry);
  const isLocked = Boolean((inquiry.isLockedForStaff || inquiry.status === 'CLOSED') && isStaffMode);
  const statusOptions = isStaffMode ? STAFF_CRM_STATUS_LIST : ADMIN_CRM_STATUS_LIST;

  const handleCopyLeadId = () => {
    navigator.clipboard.writeText(leadId);
    setCopiedLeadId(true);
    setTimeout(() => setCopiedLeadId(false), 2000);
  };

  const handleStaffChange = (staffId: string) => {
    console.log('🎯 [LeadEditModal] handleStaffChange called with:', staffId);
    if (!staffId) {
      setFormData((prev) => ({
        ...prev,
        assignedStaffId: undefined,
        assignedStaffName: undefined,
      }));
    } else {
      const selected = staffList.find((s) => s.id === staffId);
      console.log('🎯 [LeadEditModal] Selected staff member:', selected);
      setFormData((prev) => ({
        ...prev,
        assignedStaffId: staffId,
        assignedStaffName: selected ? selected.name : staffId,
      }));
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const currentTags = formData.tags || [];
      if (!currentTags.includes(tagInput.trim())) {
        setFormData((prev) => ({
          ...prev,
          tags: [...currentTags, tagInput.trim()],
        }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tagToRemove),
    }));
  };

  const handleOpenWhatsApp = () => {
    const waData = generateCustomerWhatsAppLink(formData, currentStaffName);
    if (!waData) {
      alert(`No valid phone or WhatsApp number is on record for ${formData.customerName || 'this customer'}.`);
      return;
    }

    if (formData.status === 'NEW') {
      const shouldUpdate = window.confirm(
        `Open WhatsApp chat with ${formData.customerName || 'Customer'} (${waData.phone})?\n\n` +
        `• Click "OK" to update this lead's status to CONTACTED and launch WhatsApp.\n` +
        `• Click "Cancel" to open WhatsApp without changing the lead status.`
      );
      if (shouldUpdate) {
        setFormData((prev) => ({ ...prev, status: 'CONTACTED' }));
      }
    }

    window.open(waData.url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      alert('This inquiry is locked and cannot be edited by staff.');
      return;
    }

    if (isStaffMode && formData.status === 'CLOSED' && inquiry.status !== 'CLOSED') {
      const proceed = window.confirm(
        'Warning: Changing status to CLOSED will lock this lead permanently for staff. Only an Administrator will be able to reopen it. Proceed?'
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      const adultsCount = Number(formData.adults || 2);
      const childrenCount = Number(formData.children || 0);

      const rawPhone = (formData.customerPhone || formData.whatsappNumber || (formData as any).phone || '').trim();
      const existingMeta = (inquiry as any).metadata || {};

      const updates: Partial<Inquiry> = {
        ...formData,
        fullName: formData.customerName,
        customerName: formData.customerName,
        email: formData.customerEmail,
        customerEmail: formData.customerEmail,
        phone: rawPhone,
        whatsapp_number: rawPhone,
        whatsappNumber: rawPhone,
        customerPhone: rawPhone,
        guests: adultsCount + childrenCount,
        adults: adultsCount,
        children: childrenCount,
        metadata: {
          ...existingMeta,
          whatsapp_number: rawPhone,
          phone: rawPhone,
          full_name: formData.customerName,
          email: formData.customerEmail,
          package_interest: formData.title,
          start_date: formData.checkInDate,
          adults: adultsCount,
          children: childrenCount,
          pickup_city: formData.pickupLocation,
          drop_city: formData.dropoffLocation,
          accommodation_tier: formData.plan || formData.selectedPlan,
          special_requests: formData.specialRequests,
        },
      };

      // Ensure staff members cannot modify staff assignment fields
      if (isStaffMode) {
        delete updates.assignedStaffId;
        delete updates.assignedStaffName;
      }

      await onSave(inquiry.id, updates);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save lead updates');
    } finally {
      setSaving(false);
    }
  };

  const handlePostNote = async () => {
    if (!newNoteText.trim() || !onAddNote) return;
    setAddingNote(true);
    try {
      await onAddNote(inquiry.id, newNoteText.trim());
      setNewNoteText('');
    } catch (err: any) {
      alert(err.message || 'Failed to add follow-up note');
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#0d1d33] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700/80 my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/80 dark:bg-[#0a192f]">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-base font-extrabold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/60 px-3 py-1 rounded-xl border border-orange-200 dark:border-orange-800 flex items-center gap-2">
                <span>{leadId}</span>
                <button
                  type="button"
                  onClick={handleCopyLeadId}
                  title="Copy Lead ID"
                  className="p-1 hover:bg-orange-200 dark:hover:bg-orange-900/60 rounded-lg text-orange-700 dark:text-orange-300 transition-colors"
                >
                  {copiedLeadId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </span>

              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  CRM_STATUS_CONFIG[formData.status as InquiryStatus]?.badgeClass ||
                  'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {CRM_STATUS_CONFIG[formData.status as InquiryStatus]?.label || formData.status}
              </span>

              {inquiry.isLockedForStaff && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-md">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-serif mt-2">
              Edit Lead Details: {inquiry.customerName || inquiry.fullName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3" />
              <span>Created on {formatCrmTimestamp(inquiry.createdAt)}</span>
              {inquiry.updatedAt && (
                <span className="ml-2">· Last updated {formatCrmTimestamp(inquiry.updatedAt)}</span>
              )}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Customer Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-orange-500" />
              <span>Customer Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName || ''}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    WhatsApp / Phone Number
                  </label>
                  {Boolean(formData.customerPhone) && (
                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 cursor-pointer transition-colors"
                      title="Open direct WhatsApp chat with customer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Chat on WhatsApp</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={formData.customerPhone || ''}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={formData.customerEmail || ''}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Origin City / Devotee Residence
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.userCity || ''}
                    onChange={(e) => setFormData({ ...formData, userCity: e.target.value })}
                    placeholder="e.g. New Delhi, Mumbai, Bengaluru"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: CRM Workflow, Assignment & Status */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />
              <span>CRM Workflow &amp; Assignment</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Lead Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lead Status
                </label>
                {isStaffMode && (isLocked || inquiry.status === 'CLOSED') ? (
                  <div>
                    <div className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Closed (Locked)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Closed inquiries cannot be modified by staff. Only an Administrator can reopen.
                    </p>
                  </div>
                ) : (
                  <div>
                    <select
                      value={formData.status || 'NEW'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as InquiryStatus })}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                    >
                      {statusOptions.map((st) => (
                        <option key={st} value={st}>
                          {CRM_STATUS_CONFIG[st]?.label || st}
                        </option>
                      ))}
                    </select>
                    {isStaffMode && formData.status === 'CLOSED' && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                        Notice: Setting to CLOSED will permanently lock this lead for staff upon saving.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Assigned Staff Representative */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Staff Representative
                </label>
                {isStaffMode ? (
                  <div>
                    <div className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-500" />
                        {formData.assignedStaffName || inquiry.assignedStaffName || currentStaffName || 'Assigned to You'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        Admin Only
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Staff members cannot reassign leads. Contact an administrator to reassign.
                    </p>
                  </div>
                ) : (
                  <select
                    value={formData.assignedStaffId || ''}
                    onChange={(e) => {
                      console.log('🎯 [LeadEditModal] Assignment select changed:', e.target.value);
                      handleStaffChange(e.target.value);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                  >
                    <option value="">-- Unassigned (Available in Pool) --</option>
                    {staffList.map((stf) => (
                      <option key={stf.id} value={stf.id}>
                        {stf.name} ({stf.department || 'Travel Desk'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Travel & Accommodation Details */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-orange-500" />
              <span>Yatra &amp; Accommodation Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Accommodation Preference Tier
                </label>
                <select
                  value={formData.accommodationTier || '3 Star Hotel'}
                  onChange={(e) => setFormData({ ...formData, accommodationTier: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {ACCOMMODATION_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Arrival / Check-in Date
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={formData.checkInDate || ''}
                    onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Adults (12+ yrs)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.adults ?? 2}
                    onChange={(e) => setFormData({ ...formData, adults: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Children (0-11 yrs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.children ?? 0}
                    onChange={(e) => setFormData({ ...formData, children: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tour Duration
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5 Days / 4 Nights"
                  value={formData.tourDuration || ''}
                  onChange={(e) => setFormData({ ...formData, tourDuration: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pickup City / Station
                </label>
                <input
                  type="text"
                  placeholder="e.g. Haridwar Railway Station"
                  value={formData.pickupLocation || ''}
                  onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Drop City / Station
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dehradun Airport"
                  value={formData.dropoffLocation || ''}
                  onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Yatra / Stay Title
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tags / Lead Categories (Press Enter to Add)
              </label>
              <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700">
                {(formData.tags || []).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 text-xs font-semibold"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-orange-950 dark:hover:text-white font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Type tag and press Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="flex-1 min-w-[140px] bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Special Requests */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Devotee Notes &amp; Special Requests
              </label>
              <textarea
                rows={3}
                value={formData.specialRequests || ''}
                onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                placeholder="Senior citizen requirements, wheelchair, VIP darshan passes..."
                className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Section 4: Internal Follow-up Notes Log */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                <span>Follow-up History &amp; Staff Notes</span>
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                {inquiry.followUpNotes?.length || 0} notes logged
              </span>
            </h3>

            {inquiry.followUpNotes && inquiry.followUpNotes.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {inquiry.followUpNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700/60 text-xs space-y-1"
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
              <p className="text-xs text-slate-400 italic">No notes logged yet for this lead.</p>
            )}

            {onAddNote && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Type a new internal staff note..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handlePostNote();
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={handlePostNote}
                  disabled={addingNote || !newNoteText.trim()}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Log Note</span>
                </button>
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || isLocked}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition-all shadow-md shadow-orange-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
