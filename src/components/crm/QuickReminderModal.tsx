import React, { useState, useEffect } from 'react';
import { Inquiry } from '../../types.js';
import { getLeadId, formatLeadId, getLeadReminderStatus, generateCustomerWhatsAppLink } from '../../utils/crmUtils.js';
import { Bell, Clock, Calendar, MessageCircle, X, Check, Trash2, Sparkles } from 'lucide-react';

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

interface QuickReminderModalProps {
  lead: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Inquiry>) => Promise<void>;
  isStaffMode?: boolean;
}

export const QuickReminderModal: React.FC<QuickReminderModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSave,
  isStaffMode = false,
}) => {
  const [reminderAt, setReminderAt] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      const rawInq = lead as any;
      const meta = rawInq.metadata || {};
      const remTs = lead.reminder_at || lead.reminderAt || meta.reminder_at;
      const remNote = lead.reminder_note || lead.reminderNote || meta.reminder_note || '';

      setReminderAt(toDatetimeLocal(remTs));
      setReminderNote(remNote);
      setErrorMsg(null);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const rawInq = lead as any;
  const leadDisplayId = rawInq.leadId && /^TTT\d{8}$/i.test(rawInq.leadId) ? rawInq.leadId : formatLeadId(lead.id);
  const customerName = lead.customerName || lead.fullName || 'Pilgrim Devotee';
  const customerPhone = (lead as any).whatsapp_number || lead.phone || lead.customerPhone || '';
  const currentReminderTs = lead.reminder_at || lead.reminderAt || (lead as any).metadata?.reminder_at;
  const currentStatus = currentReminderTs ? getLeadReminderStatus(currentReminderTs) : null;

  const handleApplyPreset = (minutes?: number, isTomorrow10AM?: boolean, inDays?: number) => {
    const d = new Date();
    if (isTomorrow10AM) {
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
    } else if (inDays) {
      d.setDate(d.getDate() + inDays);
      d.setHours(11, 0, 0, 0);
    } else if (minutes) {
      d.setMinutes(d.getMinutes() + minutes);
    }
    setReminderAt(toDatetimeLocal(d.toISOString()));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderAt) {
      setErrorMsg('Please select a reminder date and time.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      const isoTime = new Date(reminderAt).toISOString();
      const cleanNote = reminderNote.trim() || undefined;

      await onSave(lead.id, {
        reminder_at: isoTime,
        reminderAt: isoTime,
        reminder_note: cleanNote,
        reminderNote: cleanNote,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update reminder on database');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      await onSave(lead.id, {
        reminder_at: null as any,
        reminderAt: null as any,
        reminder_note: null as any,
        reminderNote: null as any,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to clear reminder on database');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const waData = generateCustomerWhatsAppLink(lead);
    if (waData?.url) {
      window.open(waData.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-[#0c192c] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-6 flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
              <Bell className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight font-serif flex items-center gap-2">
                <span>Set Follow-up Reminder</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 font-sans font-bold border border-white/30">
                  {isStaffMode ? 'Staff Desk' : 'Admin'}
                </span>
              </h3>
              <p className="text-xs text-orange-100">
                Audio chime &amp; visual banner will trigger when reminder arrives.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-black/10 hover:bg-black/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lead Summary Info */}
        <div className="px-6 py-3 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">{customerName}</span>
              <span className="font-mono text-[11px] font-black text-orange-600 dark:text-orange-400">
                {leadDisplayId}
              </span>
            </div>
            {customerPhone && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {customerPhone}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {customerPhone && (
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {currentStatus && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Current Status:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                currentStatus.isOverdue
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse'
                  : currentStatus.isDue
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
              }`}>
                {currentStatus.label}
              </span>
            </div>
          )}

          {/* Date & Time Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reminder Date &amp; Time <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-orange-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="datetime-local"
                required
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
              Quick Scheduling Presets:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset(15)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                +15 Mins
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(60)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                +1 Hour
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(240)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                +4 Hours
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(undefined, true)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Tomorrow 10 AM
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(undefined, false, 2)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                In 2 Days
              </button>
            </div>
          </div>

          {/* Reminder Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reminder Note / Follow-up Action <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Call regarding VIP Darshan pass, Share payment link"
              value={reminderNote}
              onChange={(e) => setReminderNote(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              {currentReminderTs && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleClear}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Reminder</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Reminder'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
