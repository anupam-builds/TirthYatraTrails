import React, { useState, useEffect, useRef } from 'react';
import { Inquiry } from '../../types.js';
import { playReminderChime } from '../../services/soundNotification.js';
import { getLeadId, formatLeadId, generateCustomerWhatsAppLink, getLeadReminderStatus } from '../../utils/crmUtils.js';
import { Bell, AlertTriangle, Clock, MessageCircle, X, ChevronRight, Check, RotateCcw } from 'lucide-react';

interface ReminderAlertBannerProps {
  inquiries: Inquiry[];
  onEditInquiry?: (inquiry: Inquiry) => void;
  onUpdateInquiry?: (id: string, updates: Partial<Inquiry>) => Promise<void>;
  isStaffMode?: boolean;
  currentStaffId?: string;
  currentStaffName?: string;
}

export const ReminderAlertBanner: React.FC<ReminderAlertBannerProps> = ({
  inquiries,
  onEditInquiry,
  onUpdateInquiry,
  isStaffMode = false,
  currentStaffId,
  currentStaffName,
}) => {
  const [dismissedLeadIds, setDismissedLeadIds] = useState<Set<string>>(new Set());
  const [activeDueLeads, setActiveDueLeads] = useState<Inquiry[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const alertedIdsRef = useRef<Map<string, number>>(new Map()); // id -> last alert timestamp

  // Scan for due reminders every 10 seconds
  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      const dueList: Inquiry[] = [];

      for (const inq of inquiries) {
        if (!inq || inq.isDeleted || inq.status === 'CLOSED') continue;

        // In staff mode, only alert for inquiries assigned to this staff member
        if (isStaffMode && currentStaffId) {
          const rawStaff = (inq as any).assigned_staff_id || inq.assignedStaffId || '';
          if (rawStaff && String(rawStaff) !== String(currentStaffId)) {
            continue;
          }
        }

        const reminderTimestamp = inq.reminder_at || (inq as any).reminderAt || inq.metadata?.reminder_at;
        if (!reminderTimestamp) continue;

        const targetTime = new Date(reminderTimestamp).getTime();
        if (isNaN(targetTime)) continue;

        // Reminder is due if targetTime <= now + 30 seconds
        if (targetTime <= now + 30000) {
          const exactId = String(inq.id);
          dueList.push(inq);

          // Check if we should play audio chime
          // Only play if not alerted in the last 3 minutes for this specific lead
          const lastAlerted = alertedIdsRef.current.get(exactId) || 0;
          if (now - lastAlerted > 3 * 60 * 1000) {
            alertedIdsRef.current.set(exactId, now);
            try {
              playReminderChime(0.85);
            } catch (err) {
              console.warn('Audio chime playback failed:', err);
            }
          }
        }
      }

      // Filter out dismissed leads
      const unDismissed = dueList.filter((i) => !dismissedLeadIds.has(String(i.id)));
      setActiveDueLeads(unDismissed);

      if (currentLeadIndex >= unDismissed.length && unDismissed.length > 0) {
        setCurrentLeadIndex(0);
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 12000);
    return () => clearInterval(interval);
  }, [inquiries, dismissedLeadIds, isStaffMode, currentStaffId, currentLeadIndex]);

  if (activeDueLeads.length === 0) return null;

  const currentLead = activeDueLeads[currentLeadIndex] || activeDueLeads[0];
  if (!currentLead) return null;

  const leadDisplayId = (currentLead as any).leadId && /^TTT\d{8}$/i.test((currentLead as any).leadId)
    ? (currentLead as any).leadId
    : formatLeadId(currentLead.id);

  const customerName = currentLead.customerName || currentLead.fullName || 'Pilgrim Devotee';
  const reminderNote = currentLead.reminder_note || (currentLead as any).reminderNote || currentLead.metadata?.reminder_note || currentLead.title || 'Follow-up consultation';
  const reminderTime = currentLead.reminder_at || (currentLead as any).reminderAt || currentLead.metadata?.reminder_at;
  const statusInfo = getLeadReminderStatus(reminderTime);

  const handleDismiss = (id: string) => {
    setDismissedLeadIds((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      return next;
    });
  };

  const handleSnooze = async (inq: Inquiry, minutes: number = 15) => {
    const newDate = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    if (onUpdateInquiry) {
      await onUpdateInquiry(inq.id, {
        reminder_at: newDate,
        reminderAt: newDate,
      });
    }
    handleDismiss(inq.id);
  };

  const handleMarkComplete = async (inq: Inquiry) => {
    if (onUpdateInquiry) {
      await onUpdateInquiry(inq.id, {
        reminder_at: undefined,
        reminderAt: undefined,
        reminder_note: undefined,
        reminderNote: undefined,
      });
    }
    handleDismiss(inq.id);
  };

  const handleOpenWhatsApp = () => {
    const waData = generateCustomerWhatsAppLink(currentLead, currentStaffName);
    if (!waData) {
      alert(`No valid phone or WhatsApp number is on record for ${customerName}.`);
      return;
    }
    window.open(waData.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-amber-600 to-orange-600 p-0.5 shadow-lg animate-in slide-in-from-top-3 duration-300">
      <div className="bg-white dark:bg-[#0c1829] rounded-[14px] p-3.5 sm:p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Indicator & Content */}
          <div className="flex items-start gap-3">
            <div className="relative shrink-0 mt-0.5">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800 shadow-inner">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-600 ring-2 ring-white dark:ring-[#0c1829] animate-ping" />
            </div>

            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  Follow-up Reminder Due
                </span>
                <span className="font-mono text-xs font-black text-orange-600 dark:text-orange-400">
                  {leadDisplayId}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  • {customerName}
                </span>
                {activeDueLeads.length > 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {currentLeadIndex + 1} of {activeDueLeads.length} reminders
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-rose-700 dark:text-rose-300">
                  {statusInfo.label || 'Due now!'}
                </span>
                <span className="text-slate-400">•</span>
                <span className="italic font-medium">"{reminderNote}"</span>
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2 justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
            {/* Direct WhatsApp */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Devotee</span>
            </button>

            {/* View / Edit Modal */}
            {onEditInquiry && (
              <button
                type="button"
                onClick={() => onEditInquiry(currentLead)}
                className="px-3 py-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/70 hover:bg-orange-200 dark:hover:bg-orange-900 text-orange-800 dark:text-orange-300 text-xs font-bold border border-orange-200 dark:border-orange-800 transition-colors cursor-pointer"
              >
                <span>View &amp; Edit</span>
              </button>
            )}

            {/* Snooze 15m */}
            <button
              type="button"
              onClick={() => handleSnooze(currentLead, 15)}
              title="Snooze reminder for 15 minutes"
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Snooze (15m)</span>
            </button>

            {/* Mark Completed */}
            <button
              type="button"
              onClick={() => handleMarkComplete(currentLead)}
              title="Mark reminder completed"
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 hover:text-emerald-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3 text-emerald-500" />
              <span>Done</span>
            </button>

            {/* Next Reminder (if multiple) */}
            {activeDueLeads.length > 1 && (
              <button
                type="button"
                onClick={() => setCurrentLeadIndex((prev) => (prev + 1) % activeDueLeads.length)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Next reminder"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Dismiss */}
            <button
              type="button"
              onClick={() => handleDismiss(currentLead.id)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
