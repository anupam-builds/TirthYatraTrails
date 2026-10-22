import React, { useState } from 'react';
import { Inquiry } from '../../types.js';
import { formatCrmTimestamp } from '../../utils/crmUtils.js';
import { X, Send, MessageSquare, Clock, Lock, Sparkles } from 'lucide-react';

interface LeadNotesModalProps {
  lead: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  isStaffMode?: boolean;
  onAddNote?: (id: string, text: string) => Promise<void>;
  currentStaffName?: string;
}

export const LeadNotesModal: React.FC<LeadNotesModalProps> = ({
  lead,
  isOpen,
  onClose,
  isStaffMode = false,
  onAddNote,
}) => {
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !lead) return null;

  const isLocked = Boolean(lead.isLockedForStaff || lead.status === 'CLOSED');
  const notes = lead.followUpNotes || [];
  const seqLeadId = (lead as any).leadId || (lead as any).lead_id || lead.id;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = noteText.trim();
    if (!text || !onAddNote) return;

    setIsSubmitting(true);
    try {
      await onAddNote(lead.id, text);
      setNoteText('');
    } catch (err: any) {
      alert(err.message || 'Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#0c1a2e] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-[#081220]/60">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Lead Notes &amp; Activity Log</span>
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                    {seqLeadId}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Customer: <span className="font-bold text-slate-700 dark:text-slate-300">{lead.customerName || lead.fullName || 'Pilgrim'}</span>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notes Timeline Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3 min-h-[160px] max-h-[380px]">
          {lead.specialRequests && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Special Pilgrim Request
              </span>
              <p className="text-amber-900 dark:text-amber-200 italic font-medium">
                "{lead.specialRequests}"
              </p>
            </div>
          )}

          {notes.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No Internal Notes Yet
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Keep track of calls, WhatsApp discussions, devotee preferences, and custom quotations below.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {note.authorName} <span className="font-normal text-slate-400">({note.authorRole})</span>
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 font-medium">
                      {formatCrmTimestamp(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#081220]/40">
          {isStaffMode && isLocked ? (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-500 shrink-0" />
              <span>This lead is closed and locked. Logging new notes is disabled for staff.</span>
            </div>
          ) : onAddNote ? (
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log internal note (e.g. Sent hotel quotation, called devotee)..."
                disabled={isSubmitting}
                className="flex-1 px-3.5 py-2.5 bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white placeholder:text-slate-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSubmitting || !noteText.trim()}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Posting...' : 'Log Note'}</span>
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
};
