import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Calendar, Users, Hotel, Sparkles, MessageCircle, Bell, Clock, Edit3, Check, RotateCcw } from 'lucide-react';
import { formatLeadId } from '../utils/formatters.js';
import { parseAccommodationTier, getLeadReminderStatus } from '../utils/crmUtils.js';
import { updateLeadOrInquiryStatus } from '../services/api.js';

function toDatetimeLocal(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

interface LeadDetailsModalProps {
  lead: any | null;
  onClose: () => void;
  onUpdateLead?: (id: string, updates: any) => Promise<void>;
  onEditLead?: (lead: any) => void;
}

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ lead, onClose, onUpdateLead, onEditLead }) => {
  const [currentLead, setCurrentLead] = useState<any>(lead);
  const [isEditingReminder, setIsEditingReminder] = useState(false);
  const [reminderAtInput, setReminderAtInput] = useState('');
  const [reminderNoteInput, setReminderNoteInput] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderSuccessMsg, setReminderSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setCurrentLead(lead);
    if (lead) {
      const meta = lead.metadata || {};
      const remTs = lead.reminder_at || lead.reminderAt || meta.reminder_at;
      const remNote = lead.reminder_note || lead.reminderNote || meta.reminder_note || '';
      setReminderAtInput(toDatetimeLocal(remTs));
      setReminderNoteInput(remNote);
      setIsEditingReminder(false);
      setReminderSuccessMsg(null);
    }
  }, [lead]);

  if (!currentLead) return null;
  const meta = currentLead.metadata || {};

  const fullName = lead.full_name || lead.name || lead.fullName || lead.customerName || 'N/A';
  const whatsappNum = lead.whatsapp_number || lead.phone || lead.metadata?.whatsapp_number || lead.metadata?.phone || lead.whatsappNumber || lead.customerPhone || meta.whatsapp_number || meta.phone || '';
  const email = lead.email || lead.customerEmail || 'N/A';
  const residentStateCity = meta.resident_state || lead.resident_state || lead.city || lead.userCity || 'N/A';

  const packageInterest = meta.package_interest || lead.package_name || lead.packageName || lead.title || 'N/A';
  const startDate = meta.start_date || lead.start_date || lead.checkInDate || lead.arrival_date || 'Flexible / TBD';
  const endDate = meta.end_date || lead.end_date || lead.endDate || 'Flexible / TBD';
  const durationDays = lead.duration_days ?? lead.durationDays ?? meta.duration_days ?? (lead.duration ? parseInt(lead.duration) : null);
  const duration = durationDays ? `${durationDays} Days` : (meta.duration || lead.duration || 'Standard Itinerary');
  const budget = lead.budget || meta.budget || 'Not specified';
  const adults = meta.adults ?? lead.adults ?? 1;
  const children = meta.children ?? lead.children ?? 0;
  const pickupCity = meta.pickup_city || lead.pickup_city || lead.pickupLocation || 'N/A';
  const dropCity = meta.drop_city || lead.drop_city || lead.dropoffLocation || 'Same as pickup';

  const accommodationTier = meta.accommodation_tier || lead.accommodation_tier || lead.accommodationTier || lead.plan || lead.selectedPlan || '3 Star Premium';
  const specialRequests = meta.special_requests || lead.special_requests || lead.specialRequests || lead.message || 'No special requests specified.';

  const leadDisplayId = lead.leadId && /^TTT\d{8}$/i.test(lead.leadId) ? lead.leadId : formatLeadId(lead.id);

  const handleOpenWhatsApp = () => {
    const rawPhone = whatsappNum.replace(/\D/g, '');
    if (!rawPhone) return;
    const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = `Namaste ${fullName}, regarding your sacred pilgrimage inquiry (${leadDisplayId}) with Tirth Yatra. How may our pilgrimage desk assist you today?`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div
      id="lead-details-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="lead-details-drawer"
        className="w-full max-w-lg h-full bg-slate-900 text-slate-100 p-6 overflow-y-auto shadow-2xl border-l border-slate-800 flex flex-col justify-between"
      >
        <div>
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <h3 className="text-lg font-extrabold text-orange-400">Yatra Lead Details</h3>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Reference ID: {leadDisplayId}</p>
            </div>
            <button
              id="close-lead-details-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5 mt-6 text-sm">
            {/* 1. Contact Details */}
            <section className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs uppercase tracking-wider text-orange-300/90 font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-400" />
                  <span>1. Contact Details</span>
                </h4>
                {whatsappNum && (
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Full Name:</span>
                  <span className="font-bold text-white text-sm">{fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> WhatsApp / Phone:
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">{whatsappNum || 'No phone'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email:
                  </span>
                  <span className="text-slate-200 truncate max-w-[220px]">{email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Resident City/State:
                  </span>
                  <span className="text-slate-200 font-medium">{residentStateCity}</span>
                </div>
              </div>
            </section>

            {/* 2. Trip Details */}
            <section className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 shadow-xs">
              <h4 className="text-xs uppercase tracking-wider text-orange-300/90 font-bold mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                <span>2. Pilgrimage Trip Details</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Package / Sacred Circuit:</span>
                  <p className="font-bold text-orange-200 text-sm">{packageInterest}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block">Start Date:</span>
                    <span className="text-white font-semibold">{startDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estimated End Date:</span>
                    <span className="text-white font-semibold">{endDate}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block">Duration (Days):</span>
                    <span className="inline-flex items-center gap-1 font-bold text-orange-300">
                      <span className="px-2 py-0.5 rounded bg-orange-950/80 border border-orange-500/40 text-orange-300 text-xs">
                        {duration}
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estimated Budget:</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs">
                        {budget}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Group Size:
                  </span>
                  <span className="text-slate-100 font-bold">
                    {adults} Adult{adults === 1 ? '' : 's'} • {children} Child{children === 1 ? '' : 'ren'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Pickup &amp; Drop:</span>
                  <span className="text-slate-200 text-right">
                    <span className="font-semibold text-white">{pickupCity}</span> → <span>{dropCity}</span>
                  </span>
                </div>
              </div>
            </section>

            {/* 3. Accommodation & Rituals */}
            <section className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 shadow-xs">
              <h4 className="text-xs uppercase tracking-wider text-orange-300/90 font-bold mb-3 flex items-center gap-1.5">
                <Hotel className="w-3.5 h-3.5 text-orange-400" />
                <span>3. Accommodation &amp; Special Requests</span>
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Accommodation Tier:</span>
                  {(() => {
                    const accomInfo = parseAccommodationTier(accommodationTier);
                    const isBudget = accomInfo.category === 'Budget Hotels';
                    return (
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          isBudget
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                            : 'bg-purple-950/80 border-purple-500/50 text-purple-300'
                        }`}>
                          {isBudget ? 'Budget Hotel' : 'Premium'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-100 font-extrabold text-[11px]">
                          <span className="text-amber-400 font-bold">{accomInfo.starString}</span>
                          <span>{accomInfo.name}</span>
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <span className="text-slate-400 block text-xs mb-1.5">Rituals / Notes (Dietary, Senior Citizen, Puja):</span>
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-slate-300 text-xs leading-relaxed italic">
                    "{specialRequests}"
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Workflow Status & Interactive Follow-up Reminder */}
            <section className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase tracking-wider text-orange-300/90 font-bold flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-orange-400" />
                  <span>4. Workflow Status &amp; Follow-up Reminder</span>
                </h4>
                {onEditLead && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditLead(currentLead);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-400 hover:text-orange-300 hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Full Editor</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Current Status:</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                    (currentLead.status === 'TRIP' || currentLead.status === 'Trip')
                      ? 'bg-purple-950/90 text-purple-300 border-purple-800'
                      : currentLead.status === 'CONFIRMED'
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                      : currentLead.status === 'CONTACTED'
                      ? 'bg-blue-950/90 text-blue-300 border-blue-800'
                      : currentLead.status === 'CLOSED'
                      ? 'bg-slate-800 text-slate-300 border-slate-700'
                      : 'bg-amber-950/90 text-amber-300 border-amber-800'
                  }`}>
                    {currentLead.status || 'NEW'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assigned Representative:</span>
                  <span className="text-slate-200 font-semibold">
                    {currentLead.assignedStaffName || currentLead.assigned_staff_name || 'Unassigned (General Pool)'}
                  </span>
                </div>

                {/* Reminder Alert Badge & Management */}
                <div className="pt-2 border-t border-slate-700/50 space-y-2">
                  {(() => {
                    const reminderTs = currentLead.reminder_at || currentLead.reminderAt || meta.reminder_at;
                    const remStatus = reminderTs ? getLeadReminderStatus(reminderTs) : null;
                    const remNote = currentLead.reminder_note || currentLead.reminderNote || meta.reminder_note;

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-orange-400" /> Reminder Status:
                          </span>
                          {remStatus ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              remStatus.isOverdue
                                ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                                : remStatus.isDue
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-purple-950 text-purple-300 border border-purple-800'
                            }`}>
                              {remStatus.label}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">No reminder scheduled</span>
                          )}
                        </div>

                        {remNote && !isEditingReminder && (
                          <p className="text-[11px] text-slate-300 italic bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                            "{remNote}"
                          </p>
                        )}

                        {reminderSuccessMsg && (
                          <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in duration-200">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{reminderSuccessMsg}</span>
                          </div>
                        )}

                        {/* Interactive Reminder Form */}
                        {!isEditingReminder ? (
                          <div className="pt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsEditingReminder(true)}
                              className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              <span>{reminderTs ? 'Reschedule / Edit Reminder' : '+ Set Follow-up Reminder'}</span>
                            </button>
                            {reminderTs && (
                              <button
                                type="button"
                                disabled={savingReminder}
                                onClick={async () => {
                                  try {
                                    setSavingReminder(true);
                                    const updates = {
                                      reminder_at: null,
                                      reminderAt: null,
                                      reminder_note: null,
                                      reminderNote: null,
                                    };
                                    if (onUpdateLead) {
                                      await onUpdateLead(currentLead.id, updates);
                                    } else {
                                      await updateLeadOrInquiryStatus({ id: currentLead.id, ...updates });
                                    }
                                    setCurrentLead((prev: any) => ({
                                      ...prev,
                                      reminder_at: null,
                                      reminderAt: null,
                                      reminder_note: null,
                                      reminderNote: null,
                                      metadata: { ...(prev.metadata || {}), reminder_at: null, reminder_note: null },
                                    }));
                                    setReminderAtInput('');
                                    setReminderNoteInput('');
                                    setReminderSuccessMsg('Reminder cleared successfully');
                                    setTimeout(() => setReminderSuccessMsg(null), 3500);
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to clear reminder');
                                  } finally {
                                    setSavingReminder(false);
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60 font-semibold transition-all cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="pt-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                Reminder Date &amp; Time
                              </label>
                              <input
                                type="datetime-local"
                                value={reminderAtInput}
                                onChange={(e) => setReminderAtInput(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                Reminder Note / Action
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Share finalized itinerary on WhatsApp"
                                value={reminderNoteInput}
                                onChange={(e) => setReminderNoteInput(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>

                            {/* Quick Presets */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] text-slate-400 font-medium mr-1">Presets:</span>
                              {[
                                { label: '+15m', offsetMin: 15 },
                                { label: '+1h', offsetMin: 60 },
                                { label: '+4h', offsetMin: 240 },
                                { label: 'Tomorrow 10 AM', isTomorrow: true },
                              ].map((pr, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    const d = new Date();
                                    if (pr.isTomorrow) {
                                      d.setDate(d.getDate() + 1);
                                      d.setHours(10, 0, 0, 0);
                                    } else if (pr.offsetMin) {
                                      d.setMinutes(d.getMinutes() + pr.offsetMin);
                                    }
                                    setReminderAtInput(toDatetimeLocal(d.toISOString()));
                                  }}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                                >
                                  {pr.label}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => setIsEditingReminder(false)}
                                className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={savingReminder}
                                onClick={async () => {
                                  try {
                                    setSavingReminder(true);
                                    const isoTime = reminderAtInput ? new Date(reminderAtInput).toISOString() : null;
                                    const noteVal = reminderNoteInput.trim() || null;
                                    const updates = {
                                      reminder_at: isoTime,
                                      reminderAt: isoTime,
                                      reminder_note: noteVal,
                                      reminderNote: noteVal,
                                    };
                                    if (onUpdateLead) {
                                      await onUpdateLead(currentLead.id, updates);
                                    } else {
                                      await updateLeadOrInquiryStatus({ id: currentLead.id, ...updates });
                                    }
                                    setCurrentLead((prev: any) => ({
                                      ...prev,
                                      reminder_at: isoTime,
                                      reminderAt: isoTime,
                                      reminder_note: noteVal,
                                      reminderNote: noteVal,
                                      metadata: { ...(prev.metadata || {}), reminder_at: isoTime, reminder_note: noteVal },
                                    }));
                                    setIsEditingReminder(false);
                                    setReminderSuccessMsg(isoTime ? 'Reminder scheduled successfully' : 'Reminder cleared');
                                    setTimeout(() => setReminderSuccessMsg(null), 3500);
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to save reminder');
                                  } finally {
                                    setSavingReminder(false);
                                  }
                                }}
                                className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{savingReminder ? 'Saving...' : 'Save Reminder'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onEditLead && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditLead(currentLead);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                <span>Edit Full Lead</span>
              </button>
            )}
          </div>
          <button
            id="close-lead-drawer-footer-btn"
            onClick={onClose}
            className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
