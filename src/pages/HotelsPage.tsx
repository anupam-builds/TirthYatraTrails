import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { api } from '../services/api.js';
import { City, Hotel } from '../types.js';
import { GuestsRoomsPopover } from '../components/common/GuestsRoomsPopover.js';
import {
  MapPin,
  Calendar,
  Users,
  Search,
  ChevronRight,
  Star,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Minus,
  Plus,
  Check,
  Building,
} from 'lucide-react';

export const HotelsPage: React.FC = () => {
  const { path, navigate } = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  // Parse URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const initialCityId = searchParams.get('cityId') || '';
  const initialQuery = searchParams.get('query') || '';
  const initialChildAges = searchParams.get('childAges')
    ? searchParams
        .get('childAges')!
        .split(',')
        .map((val) => Number(val))
        .filter((n) => !isNaN(n))
    : [];

  const [selectedCityId, setSelectedCityId] = useState<string>(initialCityId);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number>(30000);
  const [onlyTopRated, setOnlyTopRated] = useState<boolean>(false);

  // Dates & Guests
  const [checkIn, setCheckIn] = useState<string>(searchParams.get('checkIn') || '2026-09-15');
  const [checkOut, setCheckOut] = useState<string>(searchParams.get('checkOut') || '2026-09-18');
  const [adults, setAdults] = useState<number>(Number(searchParams.get('adults')) || 2);
  const [childAges, setChildAges] = useState<number[]>(initialChildAges);
  const [rooms, setRooms] = useState<number>(Number(searchParams.get('rooms')) || 1);

  const [showGuestsPopover, setShowGuestsPopover] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [cList, hList] = await Promise.all([
          api.getCities(),
          api.getHotels(selectedCityId, searchQuery),
        ]);
        setCities(cList);
        setHotels(hList);
      } catch (err) {
        console.error('Failed to load hotels:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const handleHotelChange = () => {
      loadData();
    };
    window.addEventListener('tirth-hotel-changed', handleHotelChange);
    window.addEventListener('storage', handleHotelChange);

    return () => {
      window.removeEventListener('tirth-hotel-changed', handleHotelChange);
      window.removeEventListener('storage', handleHotelChange);
    };
  }, [selectedCityId, searchQuery]);

  const filteredHotels = hotels.filter((hotel) => {
    if (selectedRating && hotel.starRating < selectedRating) return false;
    if (hotel.basePrice > priceMax) return false;
    if (onlyTopRated && !hotel.isTopRated) return false;
    return true;
  });

  const selectedCityName = cities.find((c) => c.id === selectedCityId)?.name || 'Select City or Temple';

  return (
    <div id="hotels-directory-page" className="min-h-screen bg-[#faf8f5]">
      {/* 1. HERO SEARCH SECTION (Dark Blue Banner with "Find a hotel steps from your darshan") */}
      <section className="bg-[#0f294a] text-white pt-10 pb-20 px-4 sm:px-6 lg:px-8 relative z-40">
        <div className="max-w-6xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-400/30 text-orange-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Verified Sacred Temple Accommodations</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-serif text-white">
            Find a hotel steps from your <span className="text-orange-400">darshan</span>
          </h1>

          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            Devoted retreats offering temple tours, spiritual consultations, prayer group access, and wellness rituals.
          </p>

          {/* Floating Pill-Shaped Search Bar */}
          <div className="pt-4">
            <div className="bg-white text-[#0f294a] rounded-3xl sm:rounded-full p-2.5 sm:p-3 shadow-2xl border border-orange-200/50 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-left relative">
              
              {/* City/Area */}
              <div className="relative w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-slate-100 px-4 py-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  City / Area
                </label>
                <div
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                  className="flex items-center justify-between cursor-pointer py-1"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
                    <span className="text-sm font-bold text-[#0f294a] truncate">
                      {selectedCityName}
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform ${showCityDropdown ? 'rotate-90' : ''}`} />
                </div>

                {showCityDropdown && (
                  <div className="absolute top-full left-0 mt-2 z-50 bg-white shadow-xl border border-slate-100 w-72 sm:w-80 rounded-2xl p-2 max-h-72 overflow-y-auto animate-in fade-in duration-150">
                    <div
                      onClick={() => {
                        setSelectedCityId('');
                        setShowCityDropdown(false);
                      }}
                      className="p-2.5 rounded-xl hover:bg-orange-50 cursor-pointer text-xs font-bold text-slate-700 flex items-center justify-between"
                    >
                      <span>All Sacred Cities</span>
                      <span className="text-[10px] text-slate-400">All India</span>
                    </div>
                    {cities.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCityId(c.id);
                          setShowCityDropdown(false);
                        }}
                        className="p-2.5 rounded-xl hover:bg-orange-50 cursor-pointer flex items-center justify-between border-t border-slate-50"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#0f294a]">{c.name}</p>
                          <p className="text-[10px] text-slate-500">{c.popularFor || c.state}</p>
                        </div>
                        <span className="text-[11px] font-semibold bg-orange-100 text-[#ea580c] px-2 py-0.5 rounded-full">
                          {c.hotelCount} {c.hotelCount === 1 ? 'stay' : 'stays'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-slate-100 px-4 py-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Dates
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="bg-transparent border-0 p-0 text-xs font-bold focus:ring-0 focus:outline-none w-24"
                    />
                    <span className="text-slate-400">→</span>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="bg-transparent border-0 p-0 text-xs font-bold focus:ring-0 focus:outline-none w-24"
                    />
                  </div>
                </div>
              </div>

              {/* Guests/Rooms */}
              <div className="relative w-full sm:w-1/3 px-4 py-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Guests &amp; Rooms
                </label>
                <GuestsRoomsPopover
                  adults={adults}
                  onAdultsChange={setAdults}
                  childAges={childAges}
                  onChildAgesChange={setChildAges}
                  rooms={rooms}
                  onRoomsChange={setRooms}
                  isOpen={showGuestsPopover}
                  onToggle={() => setShowGuestsPopover(!showGuestsPopover)}
                  onClose={() => setShowGuestsPopover(false)}
                />
              </div>

              {/* Search Button */}
              <button
                id="hotels-search-btn"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (selectedCityId) params.append('cityId', selectedCityId);
                  params.append('adults', adults.toString());
                  params.append('children', childAges.length.toString());
                  if (childAges.length > 0) {
                    params.append('childAges', childAges.join(','));
                  }
                  params.append('rooms', rooms.toString());
                  if (checkIn) params.append('checkIn', checkIn);
                  if (checkOut) params.append('checkOut', checkOut);
                  navigate(`/hotels?${params.toString()}`);
                }}
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold flex items-center justify-center gap-2 shadow-md transition-all text-sm shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CITIES WE KNOW INSIDE OUT (Horizontal Scrolling Row of Vertical City Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#0f294a]">Cities we know inside out</h2>
          {selectedCityId && (
            <button
              onClick={() => setSelectedCityId('')}
              className="text-xs font-bold text-[#ea580c] hover:underline"
            >
              Clear City Filter
            </button>
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-orange-200">
          {cities.map((city) => (
            <div
              key={city.id}
              onClick={() => setSelectedCityId(selectedCityId === city.id ? '' : city.id)}
              className={`flex-none w-48 sm:w-56 rounded-2xl overflow-hidden cursor-pointer snap-start transition-all duration-200 border relative group ${
                selectedCityId === city.id
                  ? 'ring-3 ring-orange-500 border-transparent shadow-lg scale-[1.02]'
                  : 'border-slate-200 hover:shadow-md'
              }`}
            >
              <div className="h-60 w-full relative overflow-hidden bg-slate-100">
                <img
                  src={city.imageUrl}
                  alt={city.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f294a] via-[#0f294a]/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-1">
                    {city.hotelCount} {city.hotelCount === 1 ? 'Stay' : 'Stays'}
                  </span>
                  <h3 className="font-bold text-base leading-tight text-white">{city.name}</h3>
                  <p className="text-[11px] text-slate-200 truncate mt-0.5 opacity-90">
                    {city.popularFor || city.state}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FILTER BAR & HAND-PICKED STAYS GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
        {/* Quick Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-2">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters:
            </span>

            {/* Star Ratings */}
            {[5, 4, 3].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedRating(selectedRating === star ? null : star)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedRating === star
                    ? 'bg-[#0f294a] text-white border-[#0f294a]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {star}★ Stays
              </button>
            ))}

            <button
              onClick={() => setOnlyTopRated(!onlyTopRated)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                onlyTopRated
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              Top Rated Near Temple
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search hotel name or ghat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-full focus:ring-2 focus:ring-orange-500 focus:outline-none w-48 sm:w-60"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {filteredHotels.length} Stays
            </span>
          </div>
        </div>

        {/* Hand-Picked Stays Grid */}
        <div className="mb-4">
          <h2 className="text-2xl font-extrabold text-[#0f294a] tracking-tight">Hand-picked stays</h2>
          <p className="text-xs text-slate-500">
            Showing verified accommodations with distance to sacred sanctum
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
        ) : filteredHotels.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto">
            <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#0f294a]">No stays found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Try adjusting your city filter or search query.
            </p>
            <button
              onClick={() => {
                setSelectedCityId('');
                setSearchQuery('');
                setSelectedRating(null);
                setOnlyTopRated(false);
              }}
              className="px-4 py-2 bg-[#ea580c] text-white text-xs font-bold rounded-full"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHotels.map((hotel) => (
              <div
                key={hotel.id}
                id={`hotel-item-${hotel.id}`}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  {/* Image & Google Rating Badge */}
                  <div className="relative h-52 w-full overflow-hidden bg-slate-100">
                    <img
                      src={hotel.images[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'}
                      alt={hotel.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Top-left Google rating badge */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <span className="text-[#ea580c] font-black">G</span>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{hotel.googleRating.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({hotel.reviewCount})</span>
                    </div>

                    {hotel.distanceToTemple && (
                      <div className="absolute bottom-3 left-3 bg-[#0f294a]/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[11px] font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                        <span className="truncate max-w-[210px]">{hotel.distanceToTemple}</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                      <span>{hotel.cityName}</span>
                      <span>•</span>
                      <div className="flex text-amber-400">
                        {Array.from({ length: hotel.starRating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>

                    <h3 className="font-extrabold text-lg text-[#0f294a] group-hover:text-[#ea580c] transition-colors leading-snug line-clamp-2">
                      {hotel.name}
                    </h3>

                    {/* Amenity Pill Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {hotel.amenities.slice(0, 3).map((amenity, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/60 text-[11px] font-medium text-slate-600 truncate max-w-[220px]"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer: Price & Orange "View →" Button */}
                <div className="px-5 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Starting from</p>
                    <p className="text-lg font-extrabold text-[#0f294a]">
                      ₹{hotel.basePrice.toLocaleString('en-IN')}{' '}
                      <span className="text-xs font-normal text-slate-500">/ night</span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (checkIn) params.append('checkIn', checkIn);
                      if (checkOut) params.append('checkOut', checkOut);
                      params.append('adults', adults.toString());
                      params.append('children', childAges.length.toString());
                      if (childAges.length > 0) {
                        params.append('childAges', childAges.join(','));
                      }
                      params.append('rooms', rooms.toString());
                      navigate(`/hotel/${hotel.id}?${params.toString()}`);
                    }}
                    className="px-4 py-2 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. EVERY CITY WE COVER (Multi-column list at bottom) */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#0f294a]">Every city we cover</h2>
          <p className="text-xs text-slate-500 mt-0.5">Explore sacred pilgrim accommodations across India</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-y-4 gap-x-6 text-xs">
          {cities.map((city) => (
            <div
              key={city.id}
              onClick={() => {
                setSelectedCityId(city.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer hover:text-[#ea580c] transition-colors group flex items-baseline justify-between"
            >
              <span className="font-semibold text-slate-700 group-hover:text-[#ea580c] truncate">
                {city.name}
              </span>
              <span className="text-slate-400 text-[10px] ml-1">({city.hotelCount})</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
