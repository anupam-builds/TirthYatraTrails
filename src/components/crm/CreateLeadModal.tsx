import React, { useState, useEffect } from 'react';
import { Inquiry, InquiryStatus, StaffMember, Package } from '../../types.js';
import { api, mapInquiryRow } from '../../services/api.js';
import { supabase, safeSupabaseInsert } from '../../lib/supabase.js';
import { localStore } from '../../services/localStore.js';
import { broadcastNewInquiry } from '../../services/soundNotification.js';
import { BaseInput, BaseSelect, BaseTextarea } from '../FormField.js';
import {
  ADMIN_CRM_STATUS_LIST,
  STAFF_CRM_STATUS_LIST,
  CRM_STATUS_CONFIG,
} from '../../utils/crmUtils.js';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Building,
  Bell,
  MessageSquare,
  FileText,
  AlertCircle,
  CheckCircle2,
  Compass,
  Users,
  Minus,
  Plus,
} from 'lucide-react';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLead: Inquiry) => void;
  staffList?: StaffMember[];
  isStaffMode?: boolean;
  currentStaffId?: string;
  currentStaffName?: string;
}

export const CreateLeadModal: React.FC<CreateLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  staffList = [],
  isStaffMode = false,
  currentStaffId,
  currentStaffName,
}) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [userCity, setUserCity] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('custom');
  const [customDestination, setCustomDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationDays, setDurationDays] = useState<number | string>('');
  const [budget, setBudget] = useState('');
  const [accommodationTier, setAccommodationTier] = useState<string>('3 Star Standard');
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [status, setStatus] = useState<InquiryStatus>('NEW');
  const [assignedStaffId, setAssignedStaffId] = useState<string>(
    isStaffMode && currentStaffId ? currentStaffId : ''
  );
  const [reminderAt, setReminderAt] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load packages on open
  useEffect(() => {
    if (isOpen) {
      setLoadingPackages(true);
      api.getPackages()
        .then((pkgs) => {
          setPackages(pkgs || []);
          if (pkgs && pkgs.length > 0 && selectedPackageId === 'custom') {
            // Keep default or let user pick
          }
        })
        .catch(() => {})
        .finally(() => setLoadingPackages(false));

      // Reset default staff assignment
      if (isStaffMode && currentStaffId) {
        setAssignedStaffId(currentStaffId);
      }
      setAdults(2);
      setChildren(0);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, isStaffMode, currentStaffId]);

  // Auto-calculate end date when start date & duration days are entered
  useEffect(() => {
    if (startDate && durationDays && !isNaN(Number(durationDays)) && Number(durationDays) > 0) {
      try {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          const end = new Date(start);
          end.setDate(end.getDate() + Number(durationDays) - 1);
          setEndDate(end.toISOString().split('T')[0]);
        }
      } catch {}
    }
  }, [startDate, durationDays]);

  // When package changes, auto-fill duration if standard
  const handlePackageChange = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    if (pkgId === 'custom') {
      return;
    }
    const selectedPkg = packages.find((p) => String(p.id) === String(pkgId));
    if (selectedPkg) {
      if (selectedPkg.durationDays) {
        setDurationDays(selectedPkg.durationDays);
      } else if (selectedPkg.duration) {
        const match = selectedPkg.duration.match(/\d+/);
        if (match) setDurationDays(Number(match[0]));
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = fullName.trim();
    const cleanPhone = whatsappNumber.trim();
    // Automatically trim and remove any accidental whitespace around '@' or throughout the email string
    const cleanEmail = email.trim().replace(/\s+/g, '');

    if (!cleanName) {
      setErrorMsg('Please enter customer full name.');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 7) {
      setErrorMsg('Please enter a valid WhatsApp or contact phone number.');
      return;
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. devotee@example.com) or leave it empty.');
      return;
    }

    if (startDate && endDate && new Date(endDate).getTime() < new Date(startDate).getTime()) {
      setErrorMsg('Estimated Tour End Date cannot be earlier than Tour Start Date.');
      return;
    }

    // Determine Package title
    let leadTitle = 'Custom Pilgrimage Circuit';
    if (selectedPackageId !== 'custom') {
      const pkg = packages.find((p) => String(p.id) === String(selectedPackageId));
      if (pkg) leadTitle = pkg.title;
    } else if (customDestination.trim()) {
      leadTitle = `Custom: ${customDestination.trim()}`;
    }

    // Find assigned staff name
    let assignedStaffName = '';
    if (assignedStaffId) {
      if (isStaffMode && currentStaffId === assignedStaffId && currentStaffName) {
        assignedStaffName = currentStaffName;
      } else {
        const staffObj = staffList.find((s) => String(s.id) === String(assignedStaffId));
        if (staffObj) assignedStaffName = staffObj.name;
      }
    }

    setSubmitting(true);

    try {
      // 1. Generate RFC4122 v4 UUID
      const leadUuid =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });

      // 2. Compute human-readable sequential Lead ID (TTT00000001, etc.)
      let nextLeadId = 'TTT00000001';
      try {
        const existingList = localStore.getInquiries();
        let maxNum = 0;
        for (const inq of existingList) {
          const raw = inq.leadId || (inq as any).lead_id;
          if (raw) {
            const cleaned = String(raw).replace(/^(TTT|TTX)/i, '');
            const num = parseInt(cleaned, 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
        nextLeadId = `TTT${String(maxNum + 1).padStart(8, '0')}`;
      } catch {
        nextLeadId = `TTT${Date.now().toString().slice(-8)}`;
      }

      const durDaysNum =
        durationDays !== '' && !isNaN(Number(durationDays)) ? Number(durationDays) : null;
      const cleanStartDate = startDate || new Date().toISOString().split('T')[0];
      const calculatedTravelers = Math.max(1, Number(adults) + Number(children));

      // 3. Raw prospective payload matching the PostgreSQL 'leads' table schema
      const rawPayload: Record<string, any> = {
        id: leadUuid,
        lead_id: nextLeadId,
        customer_name: cleanName,
        full_name: cleanName,
        phone: cleanPhone,
        whatsapp_number: cleanPhone,
        email: cleanEmail || null,
        city: userCity.trim() || null,
        title: leadTitle,
        type: 'PACKAGE',
        status: status || 'NEW',
        check_in_date: cleanStartDate,
        start_date: cleanStartDate,
        end_date: endDate || null,
        duration_days: durDaysNum,
        budget: budget.trim() || null,
        accommodation_tier: accommodationTier || '3 Star Standard',
        hotel_tier: accommodationTier || '3 Star Standard',
        plan: accommodationTier || '3 Star Standard',
        adults: Number(adults),
        children: Number(children),
        travelers: calculatedTravelers,
        guests: calculatedTravelers,
        assigned_staff_id: assignedStaffId || null,
        assigned_staff_name: assignedStaffName || null,
        reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
        reminder_note: reminderNote.trim() || null,
        special_requests: notes.trim() || null,
        notes: notes.trim()
          ? [
              {
                id: `note-${Date.now()}`,
                text: notes.trim(),
                createdAt: new Date().toISOString(),
                authorName: assignedStaffName || currentStaffName || 'Staff Specialist',
                authorRole: isStaffMode ? 'STAFF' : 'ADMIN',
              },
            ]
          : [],
        is_locked_for_staff: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 4. Strictly whitelist columns that exist in public.leads schema and strip out undefined
      const ALLOWED_LEADS_COLUMNS = new Set([
        'id',
        'lead_id',
        'customer_name',
        'full_name',
        'phone',
        'whatsapp_number',
        'email',
        'city',
        'title',
        'type',
        'status',
        'check_in_date',
        'start_date',
        'end_date',
        'duration_days',
        'budget',
        'accommodation_tier',
        'hotel_tier',
        'plan',
        'adults',
        'children',
        'travelers',
        'guests',
        'assigned_staff_id',
        'assigned_staff_name',
        'reminder_at',
        'reminder_note',
        'special_requests',
        'notes',
        'is_locked_for_staff',
        'is_deleted',
        'created_at',
        'updated_at',
      ]);

      const cleanPayload: Record<string, any> = {};
      for (const [k, v] of Object.entries(rawPayload)) {
        if (ALLOWED_LEADS_COLUMNS.has(k) && v !== undefined && k !== 'accommodation_preference') {
          cleanPayload[k] = v;
        }
      }

      console.log('🚀 [CreateLeadModal] Direct self-healing Supabase insertion into leads table:', cleanPayload);

      // Direct self-healing insertion into Supabase leads table
      const { data, error: insertError } = await safeSupabaseInsert(
        supabase,
        'leads',
        cleanPayload
      );

      if (insertError) {
        console.error('❌ [CreateLeadModal] Direct Supabase lead insertion error:', insertError);
        setErrorMsg(`Failed to create lead: ${insertError.message} (Code: ${insertError.code || 'UNKNOWN'})`);
        setSubmitting(false);
        return;
      }

      // Non-blocking self-healing mirror into inquiries table for cross-view query tolerance
      try {
        const inqPayload = { ...cleanPayload };
        delete inqPayload.accommodation_preference;
        await safeSupabaseInsert(supabase, 'inquiries', inqPayload);
      } catch {}

      const createdRow = data && data.length > 0 ? data[0] : cleanPayload;
      const mapped = mapInquiryRow(createdRow);
      mapped.id = leadUuid;
      mapped.leadId = nextLeadId;
      mapped.lead_id = nextLeadId;
      mapped.adults = Number(adults);
      mapped.children = Number(children);
      mapped.travelers = calculatedTravelers;
      mapped.guests = calculatedTravelers;
      mapped.startDate = cleanStartDate;
      mapped.start_date = cleanStartDate;
      mapped.endDate = endDate || undefined;
      mapped.end_date = endDate || undefined;
      mapped.durationDays = durDaysNum || undefined;
      mapped.duration_days = durDaysNum || undefined;
      mapped.reminderAt = reminderAt ? new Date(reminderAt).toISOString() : undefined;
      mapped.reminder_at = reminderAt ? new Date(reminderAt).toISOString() : undefined;
      mapped.reminderNote = reminderNote.trim() || undefined;
      mapped.reminder_note = reminderNote.trim() || undefined;
      mapped.assignedStaffId = cleanPayload.assigned_staff_id || undefined;
      mapped.assigned_staff_id = cleanPayload.assigned_staff_id || null;
      mapped.assignedStaffName = cleanPayload.assigned_staff_name || undefined;
      mapped.assigned_staff_name = cleanPayload.assigned_staff_name || null;

      // Synchronize in-memory/local stores and sound notification
      try {
        localStore.submitInquiry(mapped);
        broadcastNewInquiry(mapped);
      } catch {}

      console.log('✅ [CreateLeadModal] Lead created successfully in Supabase:', mapped);
      setSuccessMsg(`Lead ${mapped.leadId || cleanPayload.lead_id} created successfully!`);

      // Immediately append new lead to UI state and close modal
      onSuccess(mapped);
      onClose();
    } catch (err: any) {
      console.error('❌ [CreateLeadModal] Unexpected exception during lead creation:', err);
      setErrorMsg(err.message || 'Failed to create lead in database. Please check connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions = isStaffMode ? STAFF_CRM_STATUS_LIST : ADMIN_CRM_STATUS_LIST;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#0c192c] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight font-serif flex items-center gap-2">
                <span>Create New CRM Lead</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 font-sans font-bold border border-white/30">
                  Manual Entry
                </span>
              </h2>
              <p className="text-xs text-orange-100 mt-0.5">
                Register customer booking inquiry, assign staff, schedule follow-ups, and generate unique TTT ID.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-black/10 hover:bg-black/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Devotee Contact Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <User className="w-4 h-4 text-orange-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                1. Devotee Contact Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <BaseInput
                    id="manual-lead-fullname"
                    name="manual-lead-fullname"
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Number / Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-500 absolute left-3 top-2.5" />
                  <BaseInput
                    id="manual-lead-phone"
                    name="manual-lead-phone"
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <BaseInput
                    id="manual-lead-email"
                    name="manual-lead-email"
                    type="email"
                    placeholder="e.g. ramesh.sharma@example.com"
                    value={email}
                    onChange={(e) => {
                      // Automatically remove any accidental whitespace (including around '@')
                      const cleaned = e.target.value.replace(/\s+/g, '');
                      setEmail(cleaned);
                    }}
                    onBlur={(e) => {
                      const trimmed = e.target.value.trim().replace(/\s+/g, '');
                      setEmail(trimmed);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Resident City / State
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-orange-500 absolute left-3 top-2.5" />
                  <BaseInput
                    id="manual-lead-city"
                    name="manual-lead-city"
                    type="text"
                    placeholder="e.g. New Delhi, Mumbai, Ahmedabad"
                    value={userCity}
                    onChange={(e) => setUserCity(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Pilgrimage Yatra & Destination */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Compass className="w-4 h-4 text-orange-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                2. Yatra Package &amp; Destination
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Interested In (Yatra Package / Sacred Circuit)
                </label>
                <BaseSelect
                  id="manual-lead-package"
                  name="manual-lead-package"
                  value={selectedPackageId}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-bold"
                >
                  <option value="custom">★ Custom Pilgrimage Circuit / Other Sacred Destination</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.title} ({pkg.duration || `${pkg.durationDays || 'Multi'} Days`})
                    </option>
                  ))}
                </BaseSelect>
              </div>

              {selectedPackageId === 'custom' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Destination / Sacred Circuit Details
                  </label>
                  <BaseInput
                    id="manual-lead-custom-dest"
                    name="manual-lead-custom-dest"
                    type="text"
                    placeholder="e.g. Kedarnath helicopter yatra, Jagannath Puri + Konark, Jyotirlinga circuit"
                    value={customDestination}
                    onChange={(e) => setCustomDestination(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tour Start Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <BaseInput
                    id="manual-lead-start-date"
                    name="manual-lead-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Tour End Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <BaseInput
                    id="manual-lead-end-date"
                    name="manual-lead-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Duration (Number of Days)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <BaseInput
                    id="manual-lead-duration"
                    name="manual-lead-duration"
                    type="number"
                    min={1}
                    max={60}
                    placeholder="e.g. 7"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Budget (INR / USD)
                </label>
                <BaseInput
                  id="manual-lead-budget"
                  name="manual-lead-budget"
                  type="text"
                  placeholder="e.g. ₹45,000 / $600 total"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            {/* Pilgrims & Travellers (Group Size) Counter UI */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#081220] border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-orange-500" />
                  <span>Pilgrims &amp; Travellers (Group Size)</span>
                </span>
                <span className="text-[11px] font-extrabold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800/80">
                  Total: {Number(adults) + Number(children)} {Number(adults) + Number(children) === 1 ? 'Pilgrim' : 'Pilgrims'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Adults counter */}
                <div className="flex items-center justify-between bg-white dark:bg-[#0d1d33] p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Adults</span>
                    <span className="text-[10px] text-slate-400">Ages 18 and above</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      id="create-lead-adults-minus"
                      onClick={() => setAdults((a) => Math.max(1, a - 1))}
                      disabled={adults <= 1}
                      className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition-colors"
                      title="Decrease Adults"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white w-5 text-center font-mono">
                      {adults}
                    </span>
                    <button
                      type="button"
                      id="create-lead-adults-plus"
                      onClick={() => setAdults((a) => a + 1)}
                      className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      title="Increase Adults"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Children counter */}
                <div className="flex items-center justify-between bg-white dark:bg-[#0d1d33] p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Children</span>
                    <span className="text-[10px] text-slate-400">Ages 0 to 17 years</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      id="create-lead-children-minus"
                      onClick={() => setChildren((c) => Math.max(0, c - 1))}
                      disabled={children <= 0}
                      className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer transition-colors"
                      title="Decrease Children"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white w-5 text-center font-mono">
                      {children}
                    </span>
                    <button
                      type="button"
                      id="create-lead-children-plus"
                      onClick={() => setChildren((c) => c + 1)}
                      className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      title="Increase Children"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Preferred Accommodation Tier (Budget Friendly vs Premium) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-orange-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  3. Preferred Accommodation Tier
                </h3>
              </div>
              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
                Selected: {accommodationTier}
              </span>
            </div>

            <div className="space-y-3">
              {/* Category 1: Budget Friendly Hotels */}
              <div>
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Budget Friendly Hotels</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: '2 Star Standard', name: '2 Star Standard', stars: '★★', badge: 'Economy / Yatri Niwas' },
                    { id: '3 Star Standard', name: '3 Star Standard', stars: '★★★', badge: 'Popular Value' },
                  ].map((tier) => {
                    const isSelected = accommodationTier === tier.id;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => setAccommodationTier(tier.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-[#081220] border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {tier.name}
                            </span>
                            <span className="text-[10px] text-amber-500 font-bold">{tier.stars}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            {tier.badge}
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category 2: Premium */}
              <div className="pt-2">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Premium</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: '3 Star Premium', name: '3 Star Premium', stars: '★★★', badge: 'Enhanced Comfort' },
                    { id: '4 Star Luxury', name: '4 Star Luxury', stars: '★★★★', badge: 'Deluxe Heritage' },
                    { id: '5 Star Heritage', name: '5 Star Heritage', stars: '★★★★★', badge: 'VIP Palace' },
                  ].map((tier) => {
                    const isSelected = accommodationTier === tier.id;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => setAccommodationTier(tier.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 ring-2 ring-purple-500/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-[#081220] border-slate-200 dark:border-slate-800 hover:border-purple-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {tier.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-amber-500 font-bold">{tier.stars}</span>
                            <span className="text-[9px] font-semibold text-purple-700 dark:text-purple-400 truncate">
                              • {tier.badge}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-purple-600 bg-purple-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 4. CRM Assignment, Status, & Reminder */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Bell className="w-4 h-4 text-orange-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                4. Workflow Status, Staff &amp; Follow-up Reminder
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lead Status
                </label>
                <BaseSelect
                  id="manual-lead-status"
                  name="manual-lead-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InquiryStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-bold"
                >
                  {statusOptions.map((st) => (
                    <option key={st} value={st}>
                      {CRM_STATUS_CONFIG[st]?.label || st} {st === 'TRIP' ? '(Booking Finalized / Ready for Travel)' : ''}
                    </option>
                  ))}
                </BaseSelect>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assign Staff Representative
                </label>
                <BaseSelect
                  id="manual-lead-staff"
                  name="manual-lead-staff"
                  value={assignedStaffId}
                  disabled={isStaffMode}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-semibold disabled:opacity-75"
                >
                  <option value="">-- Unassigned (Travel Desk Pool) --</option>
                  {staffList.map((stf) => (
                    <option key={stf.id} value={stf.id}>
                      {stf.name} ({stf.role || 'Staff'})
                    </option>
                  ))}
                </BaseSelect>
                {isStaffMode && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Direct entry assigned to your active staff desk ({currentStaffName || 'You'}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reminder Date &amp; Time (Audio/Visual Alert)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-orange-500 absolute left-3 top-2.5" />
                  <BaseInput
                    id="manual-lead-reminder-at"
                    name="manual-lead-reminder-at"
                    type="datetime-local"
                    value={reminderAt}
                    onChange={(e) => setReminderAt(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Dashboard will trigger visual alert &amp; audio chime when due.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reminder Note / Reason
                </label>
                <BaseInput
                  id="manual-lead-reminder-note"
                  name="manual-lead-reminder-note"
                  type="text"
                  placeholder="e.g. Share itinerary on WhatsApp, Darshan pass update"
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Devotee Notes / Inquiry Special Requests
                </label>
                <BaseTextarea
                  id="manual-lead-notes"
                  name="manual-lead-notes"
                  rows={2}
                  placeholder="e.g. Senior citizens traveling, pure satvik food requested, prefers morning WhatsApp call."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-98 text-white text-xs font-black shadow-md hover:shadow-orange-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Lead in Database...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Create Lead</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
