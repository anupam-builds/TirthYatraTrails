import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { useRouter } from '../../context/RouterContext.js';
import { api, generateWhatsAppLink } from '../../services/api.js';
import { City, Hotel, Package, Inquiry } from '../../types.js';
import {
  MessageSquare,
  Building,
  Compass,
  MapPin,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { navigate } = useRouter();
  const [stats, setStats] = useState({
    hotelsCount: 0,
    packagesCount: 0,
    citiesCount: 0,
    inquiriesCount: 0,
    newInquiries: 0,
  });
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [c, h, p, inq] = await Promise.all([
          api.getCities(),
          api.getHotels(),
          api.getPackages(),
          api.getInquiries(),
        ]);
        setCities(c);
        setRecentInquiries(inq.slice(0, 5));
        setStats({
          hotelsCount: h.length,
          packagesCount: p.length,
          citiesCount: c.length,
          inquiriesCount: inq.length,
          newInquiries: inq.filter((i) => i.status === 'NEW').length,
        });
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const handleUpdateStatus = async (id: string, status: Inquiry['status']) => {
    try {
      await api.updateInquiryStatus(id, status);
      setRecentInquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout activeTab="dashboard">
      <div className="space-y-8 max-w-7xl mx-auto">
        
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-serif">
              Travel Desk Command Center
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live overview of incoming pilgrim inquiries, room inventory &amp; yatra bookings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/inquiries')}
              className="px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Manage All Leads ({stats.inquiriesCount})</span>
            </button>
          </div>
        </div>

        {/* 1. KPI METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Inquiries */}
          <div className="bg-[#0d1d33] border border-slate-700/70 p-5 rounded-3xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Leads</span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.inquiriesCount}</span>
              <span className="text-xs font-bold text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded-full">
                {stats.newInquiries} New
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Direct WhatsApp and Web submissions</p>
          </div>

          {/* Active Hotels */}
          <div className="bg-[#0d1d33] border border-slate-700/70 p-5 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Stays</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Building className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.hotelsCount}</span>
              <span className="text-xs text-emerald-400 font-semibold">100% Verified</span>
            </div>
            <p className="text-[11px] text-slate-400">Across sacred temple clusters</p>
          </div>

          {/* Available Packages */}
          <div className="bg-[#0d1d33] border border-slate-700/70 p-5 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Yatra Packages</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Compass className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.packagesCount}</span>
              <span className="text-xs text-purple-300 font-semibold">All-Inclusive</span>
            </div>
            <p className="text-[11px] text-slate-400">Char Dham, Varanasi, Ayodhya</p>
          </div>

          {/* Sacred Cities Covered */}
          <div className="bg-[#0d1d33] border border-slate-700/70 p-5 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Holy Destinations</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <MapPin className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.citiesCount}</span>
              <span className="text-xs text-emerald-400 font-semibold">National Hubs</span>
            </div>
            <p className="text-[11px] text-slate-400">With ground coordination desks</p>
          </div>
        </div>

        {/* 2. RECENT TRAVEL DESK LEADS TABLE */}
        <div className="bg-[#0d1d33] border border-slate-700/70 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-400" />
                <span>Recent Travel Desk Inquiries &amp; WhatsApp Submissions</span>
              </h2>
              <p className="text-xs text-slate-400">Direct bookings requiring desk follow-up</p>
            </div>
            <button
              onClick={() => navigate('/admin/inquiries')}
              className="text-xs font-bold text-orange-400 hover:underline flex items-center gap-1"
            >
              <span>View All Leads</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3">Pilgrim Name</th>
                  <th className="pb-3 px-3">Contact</th>
                  <th className="pb-3 px-3">Inquiry For</th>
                  <th className="pb-3 px-3">Plan / Dates</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Desk Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentInquiries.map((inq) => {
                  const waLink = generateWhatsAppLink({
                    title: inq.title,
                    type: inq.type,
                    name: inq.customerName,
                    checkIn: inq.checkInDate,
                    adults: inq.adults,
                    children: inq.children,
                    plan: inq.selectedPlan,
                    notes: inq.specialRequests,
                    pickupLocation: inq.pickupLocation,
                    dropoffLocation: inq.dropoffLocation,
                  });

                  return (
                    <tr key={inq.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-3 text-slate-400">
                        {new Date(inq.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-white">
                        {inq.customerName}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="text-slate-300 font-mono">{inq.customerPhone}</div>
                        <div className="text-slate-500 text-[10px] truncate max-w-[140px]">{inq.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-200 truncate max-w-[160px]">
                        <div>{inq.title}</div>
                        {(inq.pickupLocation || inq.dropoffLocation) && (
                          <div className="text-[10px] text-orange-400/90 truncate">
                            {inq.pickupLocation && <span>📍 {inq.pickupLocation}</span>}
                            {inq.pickupLocation && inq.dropoffLocation && <span> → </span>}
                            {inq.dropoffLocation && <span>🏁 {inq.dropoffLocation}</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-400">
                        <div>{inq.selectedPlan || 'Standard'}</div>
                        <div className="text-[10px] text-slate-500">{inq.checkInDate || 'Flexible'} • {inq.adults} Adults</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <select
                          value={inq.status}
                          onChange={(e) => handleUpdateStatus(inq.id, e.target.value as any)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                            inq.status === 'NEW'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                              : inq.status === 'CONTACTED'
                              ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                              : inq.status === 'CONFIRMED'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <option value="NEW">NEW</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. QUICK SHORTCUTS & TOP PILGRIM CITIES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0d1d33] border border-slate-700/70 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Quick Inventory Shortcuts</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => navigate('/admin/hotels')}
                className="p-4 rounded-2xl bg-[#081220] border border-slate-700 hover:border-orange-500 text-left transition-colors space-y-1"
              >
                <Building className="w-5 h-5 text-orange-400" />
                <p className="text-xs font-bold text-white">Add New Hotel</p>
                <p className="text-[10px] text-slate-400">Publish temple stay</p>
              </button>

              <button
                onClick={() => navigate('/admin/packages')}
                className="p-4 rounded-2xl bg-[#081220] border border-slate-700 hover:border-orange-500 text-left transition-colors space-y-1"
              >
                <Compass className="w-5 h-5 text-orange-400" />
                <p className="text-xs font-bold text-white">Create Yatra Package</p>
                <p className="text-[10px] text-slate-400">Char Dham, Ayodhya</p>
              </button>

              <button
                onClick={() => navigate('/admin/reviews')}
                className="p-4 rounded-2xl bg-[#081220] border border-slate-700 hover:border-orange-500 text-left transition-colors space-y-1"
              >
                <MessageSquare className="w-5 h-5 text-orange-400" />
                <p className="text-xs font-bold text-white">Traveller Stories</p>
                <p className="text-[10px] text-slate-400">Manage Google Reviews</p>
              </button>
            </div>
          </div>

          <div className="bg-[#0d1d33] border border-slate-700/70 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-400" />
              <span>Destination Coverage Snapshot</span>
            </h3>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {cities.map((city) => (
                <div
                  key={city.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#081220] border border-slate-800 text-xs"
                >
                  <span className="font-bold text-slate-200">{city.name}</span>
                  <span className="text-[11px] font-semibold text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded-md">
                    {city.hotelCount} Stays Listed
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};
