import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { api, generateWhatsAppLink } from '../../services/api.js';
import { Inquiry } from '../../types.js';
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
} from 'lucide-react';

export const AdminInquiries: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadInquiries();
  }, []);

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
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-orange-400" />
              <span>Travel Desk Leads &amp; Direct WhatsApp Inquiries</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time feed of pilgrim accommodation and yatra requests.
            </p>
          </div>

          <div className="text-xs font-bold text-slate-300 bg-[#0d1d33] border border-slate-700 px-4 py-2 rounded-xl">
            Total Leads: <span className="text-orange-400 font-extrabold">{inquiries.length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#0d1d33] border border-slate-700 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {['ALL', 'NEW', 'CONTACTED', 'CONFIRMED', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  statusFilter === st
                    ? 'bg-[#ea580c] text-white shadow-md'
                    : 'bg-[#081220] text-slate-400 hover:text-white border border-slate-700'
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
              className="pl-8 pr-3 py-1.5 bg-[#081220] border border-slate-700 text-white text-xs rounded-xl focus:outline-none w-60"
            />
          </div>
        </div>

        {/* Inquiries List */}
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-800/50 rounded-2xl"></div>
            ))}
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="bg-[#0d1d33] border border-slate-700 p-12 rounded-3xl text-center space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No inquiries found</h3>
            <p className="text-xs text-slate-400">All pilgrim leads have been resolved or filtered out.</p>
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

              return (
                <div
                  key={inq.id}
                  className="bg-[#0d1d33] border border-slate-700/80 rounded-3xl p-5 hover:border-slate-600 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  {/* Left info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        inq.status === 'NEW'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                          : inq.status === 'CONTACTED'
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                          : inq.status === 'CONFIRMED'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {inq.status}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Received: {new Date(inq.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                      <h3 className="text-base font-extrabold text-white">
                        {inq.customerName}
                      </h3>
                      <span className="text-xs text-orange-400 font-semibold">
                        Interested in: {inq.title} ({inq.type})
                      </span>
                    </div>

                    {/* Contacts & Dates */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-white font-bold">{inq.customerPhone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-300">{inq.customerEmail}</span>
                      </div>
                      {inq.checkInDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-orange-400" />
                          <span>Yatra Date: {inq.checkInDate}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {inq.adults || inq.guests || 2} Adults
                          {inq.children ? `, ${inq.children} Children` : ''}
                          {inq.childAges && (
                            <span className="text-orange-400 text-[11px] ml-1">
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
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-500 font-bold">Selected Plan:</span> {inq.selectedPlan}
                      </div>
                    )}

                    {inq.specialRequests && (
                      <div className="p-3 rounded-xl bg-[#081220] border border-slate-800 text-xs text-slate-300">
                        <span className="font-bold text-orange-400">Special Notes:</span> {inq.specialRequests}
                      </div>
                    )}
                  </div>

                  {/* Right actions */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <select
                      value={inq.status}
                      onChange={(e) => handleUpdateStatus(inq.id, e.target.value as any)}
                      className="bg-[#081220] border border-slate-700 text-xs text-white rounded-xl px-3 py-2 font-bold focus:outline-none"
                    >
                      <option value="NEW">Status: NEW</option>
                      <option value="CONTACTED">Status: CONTACTED</option>
                      <option value="CONFIRMED">Status: CONFIRMED</option>
                      <option value="CLOSED">Status: CLOSED</option>
                    </select>

                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp Pilgrim</span>
                    </a>

                    <button
                      onClick={() => handleDelete(inq.id)}
                      className="p-2 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl transition-colors"
                      title="Delete lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
