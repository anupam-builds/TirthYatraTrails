import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { api, generateWhatsAppLink } from '../../services/api.js';
import { Inquiry, StaffMember } from '../../types.js';
import { subscribeToNewInquiries } from '../../services/soundNotification.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  MessageSquare,
  Search,
  Phone,
  Mail,
  Calendar,
  Users,
  MessageCircle,
  Trash2,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Lock,
  Unlock,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';

export const AdminInquiries: React.FC = () => {
  const { adminUser } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Follow-up notes state
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [submittingNote, setSubmittingNote] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadInquiries();
    loadStaff();

    // Auto prepend new incoming leads live without manual refresh
    const unsub = subscribeToNewInquiries((newInquiry) => {
      setInquiries((prev) => [newInquiry, ...prev.filter((i) => i.id !== newInquiry.id)]);
    });

    return () => {
      unsub();
    };
  }, []);

  async function loadStaff() {
    try {
      const list = await api.getStaffMembers();
      setStaffList(list);
    } catch (err) {
      console.error('Failed loading staff for assignment:', err);
    }
  }

  async function loadInquiries() {
    setLoading(true);
    try {
      const list = await api.getInquiries();
      setInquiries(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (id: string, status: Inquiry['status']) => {
    try {
      const updated = await api.updateInquiryStatus(id, status);
      setInquiries((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      alert('Failed updating status');
    }
  };

  const handleAssignStaff = async (inquiryId: string, staffId: string) => {
    try {
      const staffMember = staffList.find((s) => s.id === staffId);
      const staffName = staffMember ? staffMember.name : '';
      const updated = await api.assignInquiryStaff(inquiryId, staffId, staffName);
      setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? updated : i)));
    } catch (err: any) {
      alert(err.message || 'Failed assigning staff');
    }
  };

  const handleUnlockInquiry = async (inquiryId: string) => {
    if (window.confirm('Reopen and unlock this lead for staff operations? Status will be reset to CONTACTED.')) {
      try {
        const updated = await api.adminUnlockInquiry(inquiryId, 'CONTACTED');
        setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? updated : i)));
      } catch (err: any) {
        alert(err.message || 'Failed to unlock inquiry');
      }
    }
  };

  const handleAddNote = async (inquiryId: string) => {
    const text = (noteInputs[inquiryId] || '').trim();
    if (!text) return;

    setSubmittingNote((prev) => ({ ...prev, [inquiryId]: true }));
    try {
      const updated = await api.addInquiryNote(inquiryId, {
        authorName: adminUser?.name || 'Administrator',
        authorRole: 'ADMIN',
        authorId: adminUser?.id || 'admin',
        text,
      });

      setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? updated : i)));
      setNoteInputs((prev) => ({ ...prev, [inquiryId]: '' }));
    } catch (err: any) {
      alert(err.message || 'Failed to post note');
    } finally {
      setSubmittingNote((prev) => ({ ...prev, [inquiryId]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this inquiry record from travel desk?')) {
      try {
        await api.deleteInquiry(id);
        setInquiries((prev) => prev.filter((i) => i.id !== id));
      } catch (err) {
        alert('Failed to delete inquiry');
      }
    }
  };

  const filteredInquiries = inquiries.filter((inq) => {
    if (statusFilter !== 'ALL' && inq.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = inq.customerName.toLowerCase().includes(q);
      const matchPhone = inq.customerPhone.toLowerCase().includes(q);
      const matchTitle = inq.title.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchTitle) return false;
    }
    return true;
  });

  return (
    <AdminLayout activeTab="inquiries">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-serif">
              <MessageSquare className="w-6 h-6 text-orange-500 dark:text-orange-400" />
              <span>Travel Desk Leads &amp; Direct WhatsApp Inquiries</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time feed of pilgrim requests, staff assignments, status workflow &amp; dev notes.
            </p>
          </div>

          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl shadow-xs">
            Total Leads: <span className="text-orange-600 dark:text-orange-400 font-extrabold">{inquiries.length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto">
            {['ALL', 'NEW', 'CONTACTED', 'CONFIRMED', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#081220] text-slate-600 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                }`}
              >
                {st} {st === 'NEW' && inquiries.filter((i) => i.status === 'NEW').length > 0 && `(${inquiries.filter((i) => i.status === 'NEW').length})`}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search pilgrim name / phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 w-60"
            />
          </div>
        </div>

        {/* Inquiries List */}
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800/50 rounded-2xl"></div>
            ))}
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 p-12 rounded-3xl text-center space-y-2 shadow-xs">
            <MessageSquare className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No inquiries found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">All pilgrim leads have been resolved or filtered out.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInquiries.map((inq) => {
              const waLink = generateWhatsAppLink({
                title: inq.title,
                type: inq.type,
                name: inq.customerName,
                checkIn: inq.checkInDate,
                adults: inq.adults,
                children: inq.children,
                plan: inq.selectedPlan,
                notes: inq.specialRequests,
              });

              const isLocked = inq.isLockedForStaff || inq.status === 'CLOSED';
              const isNotesOpen = expandedNotes[inq.id] || false;
              const notesCount = inq.followUpNotes?.length || 0;

              return (
                <div
                  key={inq.id}
                  className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 rounded-3xl p-5 hover:border-slate-300 dark:hover:border-slate-600 transition-all space-y-4 shadow-xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    {/* Left info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          inq.status === 'NEW'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                            : inq.status === 'CONTACTED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                            : inq.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}>
                          {inq.status}
                        </span>

                        {isLocked && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800">
                            <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                            <span>Locked for Staff</span>
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Received: {new Date(inq.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {inq.customerName}
                        </h3>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                          Interested in: {inq.title} ({inq.type})
                        </span>
                      </div>

                      {/* Contacts & Dates */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-slate-900 dark:text-white font-bold">{inq.customerPhone}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-300">{inq.customerEmail}</span>
                        </div>
                        {inq.checkInDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            <span>Yatra Date: {inq.checkInDate}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {inq.adults || inq.guests || 2} Adults
                            {inq.children ? `, ${inq.children} Children` : ''}
                            {inq.childAges && (
                              <span className="text-orange-600 dark:text-orange-400 text-[11px] ml-1">
                                (Ages:{' '}
                                {(Array.isArray(inq.childAges)
                                  ? inq.childAges
                                  : (() => {
                                      try {
                                         return JSON.parse(inq.childAges);
                                      } catch {
                                         return inq.childAges;
                                      }
                                    })()
                                )
                                  .map((a: any) => (a === 0 ? 'Under 1' : a))
                                  .join(', ')}
                                )
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {inq.selectedPlan && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="text-slate-600 dark:text-slate-500 font-bold">Selected Plan:</span> {inq.selectedPlan}
                        </div>
                      )}

                      {(inq.pickupLocation || inq.dropoffLocation) && (
                        <div className="flex flex-wrap items-center gap-3 py-1.5 px-3 bg-slate-50 dark:bg-[#081220] rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                          {inq.pickupLocation && (
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Pickup:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{inq.pickupLocation}</span>
                            </div>
                          )}
                          {inq.pickupLocation && inq.dropoffLocation && (
                            <span className="text-slate-400 dark:text-slate-600">→</span>
                          )}
                          {inq.dropoffLocation && (
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Drop-off:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{inq.dropoffLocation}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {inq.specialRequests && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-orange-600 dark:text-orange-400">Special Notes:</span> {inq.specialRequests}
                        </div>
                      )}
                    </div>

                    {/* Right actions: Staff Assign, Status, Unlock, WhatsApp, Delete */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      {/* Staff Assignment Dropdown */}
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1">
                        <UserCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <select
                          value={inq.assignedStaffId || ''}
                          onChange={(e) => handleAssignStaff(inq.id, e.target.value)}
                          className="bg-transparent text-xs text-slate-900 dark:text-white font-medium focus:outline-none cursor-pointer"
                        >
                          <option value="">Assign: Unassigned</option>
                          {staffList.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              Assign: {staff.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status Dropdown */}
                      <select
                        value={inq.status}
                        onChange={(e) => handleUpdateStatus(inq.id, e.target.value as any)}
                        className="bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                      >
                        <option value="NEW">Status: NEW</option>
                        <option value="CONTACTED">Status: CONTACTED</option>
                        <option value="CONFIRMED">Status: CONFIRMED</option>
                        <option value="CLOSED">Status: CLOSED</option>
                      </select>

                      {/* Admin Unlock Lead Button (shown when closed or locked) */}
                      {isLocked && (
                        <button
                          onClick={() => handleUnlockInquiry(inq.id)}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                          title="Reopen and unlock lead for staff operations"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Unlock Lead</span>
                        </button>
                      )}

                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        onClick={() => handleDelete(inq.id)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/60 dark:hover:bg-red-900 dark:text-red-300 rounded-xl transition-colors cursor-pointer"
                        title="Delete lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Follow-up Notes & Staff Activity Thread */}
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <button
                      onClick={() =>
                        setExpandedNotes((prev) => ({ ...prev, [inq.id]: !prev[inq.id] }))
                      }
                      className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                      <span>Follow-up Notes &amp; Staff History ({notesCount})</span>
                      {isNotesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isNotesOpen && (
                      <div className="mt-3 space-y-3 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl animate-in fade-in duration-150">
                        {/* Notes list */}
                        {inq.followUpNotes && inq.followUpNotes.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {inq.followUpNotes.map((note) => (
                              <div
                                key={note.id}
                                className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/60 p-2.5 rounded-xl text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {note.authorName}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                        note.authorRole === 'ADMIN'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                      }`}
                                    >
                                      {note.authorRole}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(note.createdAt).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                  {note.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No notes recorded yet.</p>
                        )}

                        {/* Add Note Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Add admin follow-up instruction or devotee update..."
                            value={noteInputs[inq.id] || ''}
                            onChange={(e) =>
                              setNoteInputs((prev) => ({ ...prev, [inq.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddNote(inq.id);
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-white dark:bg-[#0d1d33] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <button
                            onClick={() => handleAddNote(inq.id)}
                            disabled={submittingNote[inq.id] || !(noteInputs[inq.id] || '').trim()}
                            className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Post Note</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
