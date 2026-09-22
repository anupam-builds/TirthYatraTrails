import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { api } from '../services/api.js';
import { Package } from '../types.js';
import { BaseInput, BaseSelect } from '../components/FormField.js';
import { useDynamicPackageCategories } from '../components/PackagesView.js';
import {
  Compass,
  MapPin,
  Clock,
  Sparkles,
  Search,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'All Packages',
  'Pilgrimage',
  'Char Dham',
  'Varanasi Ayodhya',
  'South India',
  'Jyotirlinga',
];

export const PackagesPage: React.FC = () => {
  const { navigate } = useRouter();
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState('All Packages');
  const [searchQuery, setSearchQuery] = useState('');
  const [durationFilter, setDurationFilter] = useState('all');
  const [budgetFilter, setBudgetFilter] = useState('all');

  useEffect(() => {
    async function loadPackages() {
      setLoading(true);
      try {
        // Fetch all packages to enable client-side superset filtering across categories and tags
        const list = await api.getPackages();
        setAllPackages(list);
      } catch (err) {
        console.error('Failed to load packages:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPackages();

    const handlePackageRefresh = () => {
      api.getPackages().then((list) => setAllPackages(list)).catch(() => {});
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('tirth-package-changed', handlePackageRefresh);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('tirth-package-changed', handlePackageRefresh);
      }
    };
  }, []);

  // Dynamic Category Pills: Derive available category tabs dynamically from unique values in allPackages + custom saved categories
  const dynamicCategories = useDynamicPackageCategories(allPackages);

  // Superset Filter: When 'All Packages' (or 'All' / empty / null) is selected,
  // return the full unfiltered array across categories.
  const filteredPackages = useMemo(() => {
    return allPackages.filter((pkg) => {
      // 1. Category / Tag Superset Filter
      const isAllCategory =
        !activeCategory ||
        activeCategory === 'All Packages' ||
        activeCategory === 'All';

      if (!isAllCategory) {
        const catLower = activeCategory.toLowerCase().trim();
        const pkgCat = (pkg.category || '').toLowerCase();
        const pkgType = (pkg.packageType || '').toLowerCase();
        const pkgTitle = (pkg.title || '').toLowerCase();
        const pkgOverview = (pkg.overview || '').toLowerCase();
        const pkgLocation = (pkg.location || '').toLowerCase();

        // Check if category, packageType, title, location, or overview matches the selected category filter
        const matchesCategory =
          pkgCat.includes(catLower) ||
          pkgType.includes(catLower) ||
          pkgTitle.includes(catLower) ||
          pkgLocation.includes(catLower) ||
          pkgOverview.includes(catLower);

        if (!matchesCategory) {
          return false;
        }
      }

      // 2. Search Query Filter
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (pkg.title || '').toLowerCase().includes(q);
        const locMatch = (pkg.location || '').toLowerCase().includes(q);
        const catMatch = (pkg.category || '').toLowerCase().includes(q);
        const overviewMatch = (pkg.overview || '').toLowerCase().includes(q);
        if (!titleMatch && !locMatch && !catMatch && !overviewMatch) {
          return false;
        }
      }

      // 3. Duration Filter
      if (durationFilter === 'short' && !pkg.duration.includes('4') && !pkg.duration.includes('5')) {
        return false;
      }
      if (durationFilter === 'long' && !pkg.duration.includes('8') && !pkg.duration.includes('9') && !pkg.duration.includes('10')) {
        return false;
      }

      // 4. Budget Filter
      if (budgetFilter === 'budget' && pkg.startingPrice > 20000) return false;
      if (budgetFilter === 'premium' && pkg.startingPrice <= 20000) return false;

      return true;
    });
  }, [allPackages, activeCategory, searchQuery, durationFilter, budgetFilter]);

  return (
    <div id="packages-directory-page" className="min-h-screen bg-[#faf8f5] pb-20">
      {/* 1. HERO HEADER */}
      <section className="bg-[#0f294a] text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-6xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-400/30 text-orange-300 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-orange-400" />
            <span>Sacred Himalayan &amp; Temple Expeditions</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-serif text-white">
            Curated Pilgrimage &amp; Sacred <span className="text-orange-400">Yatras</span>
          </h1>

          <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed">
            All-inclusive spiritual journeys crafted with VIP temple passes, helicopter logistics, dedicated Pandits, and deluxe verified stays.
          </p>

          {/* Search bar inside hero */}
          <div className="pt-4 max-w-xl mx-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <BaseInput
                id="packages-hero-search-input"
                name="packages-hero-search-input"
                type="text"
                placeholder="Search by destination (e.g. Kedarnath, Ayodhya, Tirupati)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-[#0f294a] pl-11 pr-4 py-3 rounded-full text-sm font-medium shadow-lg border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY TABS & FILTER DROPDOWNS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-[#ea580c] text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-700 hover:bg-orange-50 hover:text-[#ea580c]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Filter Dropdowns (Destination, Duration, Budget) */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Duration */}
            <BaseSelect
              id="packages-duration-filter"
              name="packages-duration-filter"
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">Any Duration</option>
              <option value="short">Short Yatra (3-5 Days)</option>
              <option value="long">Grand Circuit (6-10 Days)</option>
            </BaseSelect>

            {/* Budget */}
            <BaseSelect
              id="packages-budget-filter"
              name="packages-budget-filter"
              value={budgetFilter}
              onChange={(e) => setBudgetFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">Any Budget</option>
              <option value="budget">Under ₹20,000</option>
              <option value="premium">₹20,000 &amp; Above</option>
            </BaseSelect>
          </div>
        </div>
      </div>

      {/* 3. GRID OF PACKAGE CARDS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#0f294a]">
              Available Pilgrimages ({filteredPackages.length})
            </h2>
            <p className="text-xs text-slate-500">Government recognized, all-inclusive packages</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 bg-slate-200 rounded-3xl"></div>
            ))}
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto">
            <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#0f294a]">No packages match your search</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Try resetting your category or budget filters.
            </p>
            <button
              onClick={() => {
                setActiveCategory('All Packages');
                setSearchQuery('');
                setDurationFilter('all');
                setBudgetFilter('all');
              }}
              className="px-5 py-2.5 bg-[#ea580c] text-white text-xs font-bold rounded-full"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                id={`package-card-${pkg.id}`}
                className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-2xl transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  {/* Image & Duration Badge */}
                  <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                    <img
                      src={pkg.imageUrl}
                      alt={pkg.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Top Duration Badge */}
                    <div className="absolute top-3 left-3 bg-[#0f294a]/95 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                      <Clock className="w-3.5 h-3.5 text-orange-400" />
                      <span>{pkg.duration}</span>
                    </div>

                    {/* Booked Rank badge */}
                    {pkg.bookedRank && (
                      <div className="absolute top-3 right-3 bg-orange-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md">
                        {pkg.bookedRank}
                      </div>
                    )}

                    {/* Location bottom overlay */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="flex items-center gap-1 text-xs font-semibold text-orange-300 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{pkg.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-6 space-y-4">
                    <h3 className="font-extrabold text-lg text-[#0f294a] group-hover:text-[#ea580c] transition-colors leading-snug line-clamp-2">
                      {pkg.title}
                    </h3>

                    <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">
                      {pkg.overview}
                    </p>

                    {/* Highlights bullets preview */}
                    <div className="space-y-1.5 pt-1">
                      {pkg.highlights.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Starting Price & Orange View Button */}
                <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Starting Price
                    </span>
                    <span className="text-xl font-extrabold text-[#0f294a]">
                      ₹{pkg.startingPrice.toLocaleString('en-IN')}{' '}
                      <span className="text-xs font-normal text-slate-500">/ person</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/enquire?packageId=${pkg.id}`)}
                      className="px-3.5 py-2.5 rounded-full border border-orange-500 text-orange-600 hover:bg-orange-50 text-xs font-bold transition-all cursor-pointer"
                    >
                      Enquire
                    </button>
                    <button
                      onClick={() => navigate(`/package/${pkg.id}`)}
                      className="px-4 py-2.5 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold shadow-md hover:shadow-orange-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom Yatra Inquiry Callout Banner */}
        <div className="mt-14 bg-gradient-to-r from-[#0f294a] to-[#163860] rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-white/10">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
              CUSTOM SPIRITUAL CIRCUITS
            </span>
            <h3 className="text-2xl font-extrabold font-serif">
              Looking for a custom pilgrimage or group darshan?
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              We design tailor-made yatras for families, seniors, and spiritual sanghams with private vehicles, VIP darshan passes, and verified pure-veg stays.
            </p>
          </div>
          <button
            onClick={() => navigate('/enquire')}
            className="shrink-0 px-8 py-4 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-sm shadow-xl shadow-orange-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <span>Plan Custom Yatra</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
