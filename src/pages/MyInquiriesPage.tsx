import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { useAuth } from '../context/AuthContext.js';
import { api, generateWhatsAppLink } from '../services/api.js';
import { Inquiry } from '../types.js';
import {
  Calendar,
  Clock,
  Phone,
  MessageCircle,
  Sparkles,
  Building,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
} from 'lucide-react';

export const MyInquiriesPage: React.FC = () => {
  const { navigate } = useRouter();
  const { customerUser } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInquiries() {
      if (!customerUser) return;
      try {
        const all = await api.getInquiries();
        // Filter by user's email or phone or show sample user inquiries
        const mine = all.filter(
          (i) =>
            (i.customerEmail && i.customerEmail.toLowerCase() === customerUser.email.toLowerCase()) ||
            (customerUser.phone && i.customerPhone === customerUser.phone) ||
            i.userId === customerUser.id
        );
        setInquiries(mine.length > 0 ? mine : all.slice(0, 3));
      } catch (err) {
        console.error('Failed to load inquiries:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInquiries();
  }, [customerUser]);

  if (!customerUser) {
    return (
      <div className="min-h-screen bg-[#faf8f5] py-20 px-4 text-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-[#0f294a]">Please Sign In</h2>
          <p className="text-xs text-slate-500">Sign in to view your yatra requests and live status.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 bg-[#ea580c] text-white text-xs font-bold rounded-full"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="my-inquiries-page" className="min-h-screen bg-[#faf8f5] py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f294a]">
              My Sacred Bookings &amp; Inquiries
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Logged in as <span className="font-bold text-slate-700">{customerUser.name}</span> ({customerUser.email})
            </p>
          </div>

          <button
            onClick={() => navigate('/hotels')}
            className="px-5 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-full shadow-md transition-all flex items-center gap-1.5 w-fit"
          >
            <span>Explore More Stays</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 bg-slate-200 rounded-3xl"></div>
            ))}
          </div>
        ) : inquiries.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
            <Compass className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-[#0f294a]">No active inquiries found</h3>
            <p className="text-xs text-slate-500">
              You haven't requested any hotel or pilgrimage quotes yet.
            </p>
            <button
              onClick={() => navigate('/packages')}
              className="px-5 py-2 bg-[#ea580c] text-white text-xs font-bold rounded-full"
            >
              Browse Yatras
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {inquiries.map((inq) => {
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
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        inq.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inq.status === 'CONTACTED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inq.status || 'NEW'}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        Requested: {new Date(inq.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-[#0f294a]">
                      {inq.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      {inq.checkInDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-orange-500" />
                          <span>Yatra Date: {inq.checkInDate}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold">Guests:</span> {inq.adults || inq.guests || 2} Adults{inq.children ? `, ${inq.children} Children` : ''}
                        {inq.childAges && (
                          <span className="text-[#ea580c] text-[11px] ml-1">
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
                      </div>
                      {(inq.selectedPlan || inq.planChosen) && (
                        <div>
                          <span className="font-semibold">Plan:</span> {inq.selectedPlan || inq.planChosen}
                        </div>
                      )}
                    </div>

                    {(inq.pickupLocation || inq.dropoffLocation) && (
                      <div className="flex flex-wrap items-center gap-3 py-1.5 px-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        {inq.pickupLocation && (
                          <div className="flex items-center gap-1 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-slate-400 font-medium">Pickup:</span>
                            <span className="font-semibold">{inq.pickupLocation}</span>
                          </div>
                        )}
                        {inq.pickupLocation && inq.dropoffLocation && (
                          <span className="text-slate-400">→</span>
                        )}
                        {inq.dropoffLocation && (
                          <div className="flex items-center gap-1 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-orange-600" />
                            <span className="text-slate-400 font-medium">Drop-off:</span>
                            <span className="font-semibold">{inq.dropoffLocation}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {inq.specialRequests && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-bold">Requests:</span> {inq.specialRequests}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Chat with Desk</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
