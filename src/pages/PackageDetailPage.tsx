import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { api } from '../services/api.js';
import { Package } from '../types.js';
import { InquiryModal } from '../components/common/InquiryModal.js';
import { getPackageWhatsAppUrl } from '../utils/whatsapp.js';
import {
  ChevronRight,
  MapPin,
  Clock,
  Award,
  Sparkles,
  Calendar,
  Users,
  Compass,
  CheckCircle2,
  Car,
  Building,
  MessageCircle,
  FileText,
  HelpCircle,
  Check,
  X,
  XCircle,
  ListChecks,
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

      {/* 3. MAIN CONTENT: LEFT (ABOUT, HIGHLIGHTS, INCLUSIONS/EXCLUSIONS, ITINERARY) & RIGHT (STICKY SIDEBAR) */}
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

            {/* WHAT TO EXPECT -> Trip Highlights */}
            {pkg.highlights && pkg.highlights.length > 0 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c] block">
                      WHAT TO EXPECT
                    </span>
                    <h2 className="text-xl font-extrabold text-[#0f294a]">Trip Highlights</h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {pkg.highlights.map((highlight, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60"
                    >
                      <div className="p-1 rounded-full bg-orange-100 text-[#ea580c] shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                        {highlight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WHAT'S INCLUDED & WHAT'S EXCLUDED */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                  <ListChecks className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c] block">
                    TRANSPARENT VALUE
                  </span>
                  <h2 className="text-xl font-extrabold text-[#0f294a]">What's Included &amp; Excluded</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* INCLUSIONS BOX */}
                <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                        ✓
                      </span>
                      <h3 className="font-extrabold text-sm text-emerald-950">What's Included</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                      {((pkg.inclusions && pkg.inclusions.length > 0) ? pkg.inclusions : (pkg.highlights || [])).length} Items
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {((pkg.inclusions && pkg.inclusions.length > 0)
                      ? pkg.inclusions
                      : (pkg.highlights && pkg.highlights.length > 0
                          ? pkg.highlights
                          : [
                              'VIP Darshan entry and queue assistance where permissible',
                              '3 & 4 Star verified pilgrimage hotel accommodations',
                              'Daily wholesome pure vegetarian breakfast and dinner buffet',
                              'All transfers & sightseeing by dedicated private AC vehicle',
                              'Experienced local pilgrimage coordinator & temple priest guide',
                              'All parking, toll taxes, driver allowance and fuel charges',
                            ])
                    ).map((incItem, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-800 leading-snug">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                        <span>{incItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* EXCLUSIONS BOX */}
                <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200/70 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-rose-200/60">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                        ✗
                      </span>
                      <h3 className="font-extrabold text-sm text-rose-950">What's Excluded</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900">
                      {((pkg.exclusions && pkg.exclusions.length > 0) ? pkg.exclusions : [1, 2, 3, 4, 5]).length} Items
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {((pkg.exclusions && pkg.exclusions.length > 0)
                      ? pkg.exclusions
                      : [
                          'Personal expenses, laundry, telephone calls and tips',
                          'Airfare / Train tickets to arrival city unless specifically booked',
                          'Special personal puja ceremonies or individual priest Dakshina',
                          'Any camera/video permits at monuments or shrines',
                          'Travel insurance and medical emergency expenses',
                        ]
                    ).map((excItem, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-snug">
                        <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 stroke-[2.5]" />
                        <span>{excItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* DAY-BY-DAY SACRED ITINERARY */}
            {pkg.itinerary && pkg.itinerary.length > 0 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
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
                  <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                    {pkg.itinerary.length} {pkg.itinerary.length === 1 ? 'Day' : 'Days'} Planned
                  </span>
                </div>

                <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-orange-200">
                  {pkg.itinerary.map((item, idx) => {
                    const dayNum = item.dayNumber ?? item.day ?? (idx + 1);
                    const desc = item.description || item.desc || '';
                    return (
                      <div key={item.day || item.dayNumber || idx} className="relative pl-10">
                        <div className="absolute left-1.5 top-1 w-6 h-6 rounded-full bg-[#0f294a] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                          {dayNum}
                        </div>
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/60 space-y-1.5 hover:border-orange-200 transition-colors">
                          <h4 className="font-bold text-sm text-[#0f294a]">
                            Day {dayNum}: {item.title}
                          </h4>
                          {desc && (
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                              {desc}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

              {/* Dynamic Yatra Quick Summary */}
              {(() => {
                const summaryList = (pkg.quickSummary && pkg.quickSummary.length > 0)
                  ? pkg.quickSummary
                  : [
                      { label: 'Duration', value: pkg.duration },
                      { label: 'Category', value: pkg.category },
                      { label: 'Meals', value: '100% Pure Vegetarian' },
                      { label: 'Medical', value: 'Oxygen & Doctor on Call' },
                    ];

                if (summaryList.length === 0) return null;

                return (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
                    <h4 className="font-bold text-[#0f294a] flex items-center justify-between">
                      <span>Yatra Quick Summary</span>
                      <span className="text-[10px] text-slate-400 font-normal">Package Overview</span>
                    </h4>
                    <div className="space-y-1.5 text-slate-600">
                      {summaryList.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <span className="text-slate-600 truncate">{item.label.replace(/:$/, '')}:</span>
                          <span className="font-bold text-slate-800 text-right">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Enquire on WhatsApp Dynamic Button */}
              <a
                id="whatsapp-package-enquire-btn"
                href={getPackageWhatsAppUrl(pkg.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                title={`Enquire on WhatsApp about ${pkg.title}`}
              >
                <MessageCircle className="w-4.5 h-4.5 fill-current" />
                <span>Enquire on WhatsApp</span>
              </a>

              {/* Prominent Orange "Get Instant Quote" Button */}
              <button
                id="get-instant-quote-btn"
                onClick={() => setInquiryModalOpen(true)}
                className="w-full py-3.5 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-xs shadow-xl shadow-orange-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Get Instant Quote &amp; Custom Plan</span>
              </button>

              <button
                id="full-enquiry-page-btn"
                onClick={() => navigate(`/enquire?packageId=${pkg.id}`)}
                className="w-full py-3 rounded-full border-2 border-orange-500 text-[#ea580c] hover:bg-orange-50 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Enquire Now (Detailed Form)</span>
              </button>
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
