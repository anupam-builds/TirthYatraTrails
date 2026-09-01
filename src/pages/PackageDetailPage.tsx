import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { api } from '../services/api.js';
import { Package } from '../types.js';
import { InquiryModal } from '../components/common/InquiryModal.js';
import {
  ChevronRight,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
  Sparkles,
  Calendar,
  Users,
  Compass,
  CheckCircle2,
  AlertCircle,
  Car,
  Building,
  HeartHandshake,
  MessageCircle,
  FileText,
  HelpCircle,
} from 'lucide-react';

export const PackageDetailPage: React.FC<{ packageId: string }> = ({ packageId }) => {
  const { navigate } = useRouter();
  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  useEffect(() => {
    async function loadPackage() {
      setLoading(true);
      try {
        const p = await api.getPackageById(packageId);
        setPkg(p);
      } catch (err: any) {
        setError(err.message || 'Package not found');
      } finally {
        setLoading(false);
      }
    }
    loadPackage();
  }, [packageId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] py-12 px-4 max-w-7xl mx-auto animate-pulse space-y-6">
        <div className="h-80 w-full bg-slate-200 rounded-3xl"></div>
        <div className="h-12 w-full bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen bg-[#faf8f5] py-20 px-4 text-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-[#0f294a]">Pilgrimage Package Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'This yatra itinerary could not be located.'}</p>
          <button
            onClick={() => navigate('/packages')}
            className="px-5 py-2.5 bg-[#ea580c] text-white text-xs font-bold rounded-full"
          >
            Explore All Packages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="package-detail-page" className="min-h-screen bg-[#faf8f5] pb-24">
      {/* 1. HERO SECTION (Full-width scenic background image with dark gradient overlay, Title & badges bottom-left) */}
      <section className="relative h-[420px] sm:h-[500px] w-full bg-[#0f294a] overflow-hidden">
        <img
          src={pkg.imageUrl}
          alt={pkg.title}
          className="w-full h-full object-cover object-center"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f294a] via-[#0f294a]/60 to-black/30" />

        {/* Top Breadcrumb Nav */}
        <div className="absolute top-6 left-0 right-0 z-10 px-4 sm:px-8 max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-xs text-white/80 font-medium bg-black/30 backdrop-blur-md px-4 py-2 rounded-full w-fit">
            <button onClick={() => navigate('/')} className="hover:text-orange-400">Home</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <button onClick={() => navigate('/packages')} className="hover:text-orange-400">Packages</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-orange-400 truncate max-w-xs">{pkg.title}</span>
          </nav>
        </div>

        {/* Bottom Left Content */}
        <div className="absolute bottom-8 left-0 right-0 px-4 sm:px-8 max-w-7xl mx-auto z-10">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#ea580c] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{pkg.duration}</span>
              </span>

              {pkg.bookedRank && (
                <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                  {pkg.bookedRank}
                </span>
              )}

              <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                {pkg.category} Yatra
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight font-serif">
              {pkg.title}
            </h1>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-200">
              <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
              <span>{pkg.location}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. QUICK INFO BAR (Row below hero showing Duration, Package Type, Experience level, Hotels, Transfers) */}
      <section className="bg-white border-b border-slate-200/80 shadow-xs sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-xs">
            
            {/* Duration */}
            <div className="pt-2 sm:pt-0 sm:px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Duration
              </span>
              <span className="font-extrabold text-[#0f294a] text-sm">
                {pkg.duration}
              </span>
            </div>

            {/* Package Type */}
            <div className="pt-2 sm:pt-0 sm:px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Package Type
              </span>
              <span className="font-bold text-slate-700">
                {pkg.packageType || 'All-Inclusive Guided'}
              </span>
            </div>

            {/* Experience Level */}
            <div className="pt-2 sm:pt-0 sm:px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Experience Level
              </span>
              <span className="font-bold text-slate-700">
                {pkg.experienceLevel || 'Comfortable • Senior Friendly'}
              </span>
            </div>

            {/* Hotels Level */}
            <div className="pt-2 sm:pt-0 sm:px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Stays &amp; Meals
              </span>
              <span className="font-bold text-slate-700">
                {pkg.hotelsLevel || '3 & 4 Star Deluxe Stays'}
              </span>
            </div>

            {/* Transfers */}
            <div className="pt-2 sm:pt-0 sm:px-3 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Transfers
              </span>
              <span className="font-bold text-slate-700">
                {pkg.transfers || 'Private AC Vehicle / Helicopter'}
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT: LEFT (ABOUT, HIGHLIGHTS, CANCELLATION, ITINERARY) & RIGHT (STICKY SIDEBAR) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* LEFT CONTENT (2 Columns) */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* ABOUT THIS TRIP -> Overview */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                  <Compass className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c] block">
                    ABOUT THIS TRIP
                  </span>
                  <h2 className="text-xl font-extrabold text-[#0f294a]">Sacred Overview</h2>
                </div>
              </div>

              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line pt-2">
                {pkg.overview}
              </p>
            </div>

            {/* WHAT TO EXPECT -> Highlights (Bullet points) */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c] block">
                    WHAT TO EXPECT
                  </span>
                  <h2 className="text-xl font-extrabold text-[#0f294a]">Trip Highlights &amp; Inclusions</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {pkg.highlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/60"
                  >
                    <div className="p-1 rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                      {highlight}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* DAY-BY-DAY SACRED ITINERARY */}
            {pkg.itinerary && pkg.itinerary.length > 0 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                    <Calendar className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c] block">
                      SACRED SCHEDULE
                    </span>
                    <h2 className="text-xl font-extrabold text-[#0f294a]">Day-by-Day Detailed Itinerary</h2>
                  </div>
                </div>

                <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-orange-200">
                  {pkg.itinerary.map((item) => (
                    <div key={item.day} className="relative pl-10">
                      <div className="absolute left-1.5 top-1 w-6 h-6 rounded-full bg-[#0f294a] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
                        {item.day}
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-1">
                        <h4 className="font-bold text-sm text-[#0f294a]">Day {item.day}: {item.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CANCELLATION AND REFUND POLICY */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c] block">
                    TRANSPARENT TERMS
                  </span>
                  <h2 className="text-xl font-extrabold text-[#0f294a]">Cancellation &amp; Refund Policy</h2>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900 space-y-2 leading-relaxed">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="font-medium">{pkg.cancellationPolicy}</p>
                </div>
                <p className="text-[11px] text-amber-800/80 pl-6">
                  * Helicopter and VIP darshan slots are non-transferable per shrine board guidelines. Free date amendment is permissible up to 14 days prior to departure.
                </p>
              </div>
            </div>

          </div>

          {/* RIGHT STICKY SIDEBAR */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xl sticky top-32 space-y-5">
              
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  All-Inclusive Starting Price
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#0f294a]">
                    ₹{pkg.startingPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ person</span>
                </div>
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  ✓ Includes verified stays, AC coach, meals &amp; VIP assistance
                </p>
              </div>

              {/* Brief Summary of Itinerary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
                <h4 className="font-bold text-[#0f294a]">Yatra Quick Summary</h4>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Duration:</span>
                    <span className="font-bold text-slate-800">{pkg.duration}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Category:</span>
                    <span className="font-bold text-slate-800">{pkg.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Meals:</span>
                    <span className="font-bold text-slate-800">100% Pure Sattvic</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Medical:</span>
                    <span className="font-bold text-slate-800">Oxygen &amp; Doctor on Call</span>
                  </div>
                </div>
              </div>

              {/* Prominent Orange "Get Instant Quote" Button */}
              <button
                id="get-instant-quote-btn"
                onClick={() => setInquiryModalOpen(true)}
                className="w-full py-4 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-sm shadow-xl shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Get Instant Quote &amp; Custom Plan</span>
              </button>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>Direct connection with Senior Pilgrimage Officer</span>
                </div>
                <div className="flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>Customizable for senior citizen comfort</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Inquiry & WhatsApp modal */}
      <InquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        title={pkg.title}
        type="PACKAGE"
        referenceId={pkg.id}
        price={pkg.startingPrice}
      />
    </div>
  );
};
