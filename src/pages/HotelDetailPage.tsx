import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { api } from '../services/api.js';
import { Hotel, Room } from '../types.js';
import { InquiryModal } from '../components/common/InquiryModal.js';
import {
  ChevronRight,
  Star,
  MapPin,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Sparkles,
  Utensils,
  Wifi,
  Waves,
  Car,
  Clock,
  Dog,
  Users,
  Info,
  CalendarCheck,
  ArrowRight,
  X,
  Share2,
  Heart,
} from 'lucide-react';

export const HotelDetailPage: React.FC<{ hotelId: string }> = ({ hotelId }) => {
  const { navigate } = useRouter();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Parse URL search parameters for prefilling inquiry
  const searchParams = new URLSearchParams(window.location.search);
  const paramAdults = Number(searchParams.get('adults')) || 2;
  const paramChildren = Number(searchParams.get('children')) || 0;
  const paramChildAges = searchParams.get('childAges')
    ? searchParams
        .get('childAges')!
        .split(',')
        .map((n) => Number(n))
        .filter((n) => !isNaN(n))
    : [];
  const paramCheckIn = searchParams.get('checkIn') || '';

  // Lightbox & Inquiry Modal
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('Standard Plan');
  const [selectedRoomName, setSelectedRoomName] = useState<string>('');

  useEffect(() => {
    async function loadHotel() {
      setLoading(true);
      try {
        const h = await api.getHotelById(hotelId);
        setHotel(h);
      } catch (err: any) {
        setError(err.message || 'Hotel not found');
      } finally {
        setLoading(false);
      }
    }
    loadHotel();
  }, [hotelId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-pulse space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded-md"></div>
        <div className="h-10 w-96 bg-slate-200 rounded-md"></div>
        <div className="h-96 w-full bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="min-h-screen bg-[#faf8f5] py-20 px-4 text-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-[#0f294a]">Hotel Information Unavailable</h2>
          <p className="text-xs text-slate-500">{error || 'This hotel listing could not be retrieved.'}</p>
          <button
            onClick={() => navigate('/hotels')}
            className="px-5 py-2.5 bg-[#ea580c] text-white text-xs font-bold rounded-full"
          >
            Back to Hotels Directory
          </button>
        </div>
      </div>
    );
  }

  const handleOpenInquiry = (planName = 'Room Only', roomName = '') => {
    setSelectedPlan(planName);
    setSelectedRoomName(roomName ? `${roomName} (${planName})` : planName);
    setInquiryModalOpen(true);
  };

  // Prepare images for gallery (guarantee at least 5)
  const images = hotel.images.length > 0 ? hotel.images : [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
  ];

  return (
    <div id="hotel-detail-page" className="min-h-screen bg-[#faf8f5] pb-20">
      {/* 1. TOP HEADER & BREADCRUMBS */}
      <div className="bg-white border-b border-slate-200/80 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <button onClick={() => navigate('/')} className="hover:text-[#ea580c]">
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <button onClick={() => navigate('/hotels')} className="hover:text-[#ea580c]">
              Hotels
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-400 truncate">{hotel.cityName}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#0f294a] font-bold truncate max-w-xs">{hotel.name}</span>
          </nav>

          {/* Title & Ratings Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex text-amber-400">
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {hotel.starRating} Star Verified Pilgrim Stay
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f294a] tracking-tight">
                {hotel.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5">
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                  <span className="text-[#ea580c] font-black">G</span>
                  <span>{hotel.googleRating.toFixed(1)} Google Rating</span>
                  <span className="text-emerald-600 font-normal">({hotel.reviewCount} reviews)</span>
                </div>

                <div className="flex items-center gap-1 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>{hotel.address}</span>
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleOpenInquiry('General Inquiry')}
                className="px-6 py-3 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Check Availability</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. IMAGE GALLERY (Masonry Grid: 1 large hero on left, 2x2 grid on right with +X photos overlay) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 h-[380px] sm:h-[460px] rounded-3xl overflow-hidden shadow-sm">
          {/* Large Hero (Left 2 columns) */}
          <div
            onClick={() => setLightboxIndex(0)}
            className="md:col-span-2 h-full relative cursor-pointer group overflow-hidden bg-slate-100"
          >
            <img
              src={images[0]}
              alt={hotel.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>Sanctuary View</span>
            </div>
          </div>

          {/* 2x2 Grid (Right 2 columns) */}
          <div className="md:col-span-2 grid grid-cols-2 gap-3 h-full">
            {images.slice(1, 4).map((img, idx) => (
              <div
                key={idx}
                onClick={() => setLightboxIndex(idx + 1)}
                className="h-full relative cursor-pointer group overflow-hidden bg-slate-100 rounded-xl"
              >
                <img
                  src={img}
                  alt={`${hotel.name} photo ${idx + 2}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              </div>
            ))}

            {/* 4th thumbnail with dark "+X photos" overlay */}
            <div
              onClick={() => setLightboxIndex(4)}
              className="h-full relative cursor-pointer group overflow-hidden bg-slate-900 rounded-xl"
            >
              <img
                src={images[4] || images[0]}
                alt={`${hotel.name} photo 5`}
                className="w-full h-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-center p-2">
                <span className="text-xl sm:text-2xl font-black">+{Math.max(1, images.length - 4)} photos</span>
                <span className="text-[11px] text-slate-300 font-medium">View full gallery</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT: LEFT (ABOUT, AMENITIES, ROOMS & RATES) & RIGHT (STICKY SIDEBAR) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* LEFT CONTENT (2 cols) */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* About this hotel */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                  <Building2Icon className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-[#0f294a]">About this hotel</h2>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                {hotel.description}
              </p>

              {hotel.darshanType && (
                <div className="mt-4 p-4 rounded-2xl bg-orange-50/70 border border-orange-200/60 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-[#ea580c] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                      Darshan &amp; Puja Facilitation
                    </h4>
                    <p className="text-xs text-slate-700 font-medium mt-0.5">
                      {hotel.darshanType} • Dedicated desk available on-site for VIP passes, temple priest guidance, and early morning transport.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Amenities (2-column grid of amenities using Lucide icons) */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-[#0f294a]">Amenities</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hotel.amenities.map((amenity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#ea580c] shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">
                      {amenity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rooms & Rates */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0f294a]">Rooms &amp; rates</h2>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {hotel.rooms.length} room type{hotel.rooms.length > 1 ? 's' : ''} available
                </span>
              </div>

              <div className="space-y-6">
                {hotel.rooms.map((room) => (
                  <div
                    key={room.id}
                    className="border border-slate-200 rounded-2xl overflow-hidden hover:border-orange-200 transition-colors"
                  >
                    {/* Room Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-slate-50/70 border-b border-slate-100">
                      <div className="w-full sm:w-28 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-200">
                        <img
                          src={room.imageUrl}
                          alt={room.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-base text-[#0f294a]">{room.name}</h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {room.bedType || '1 King Bed'} • {room.capacity || '2 Adults'}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Free cancellation up to 48 hrs before check-in</span>
                        </div>
                      </div>
                    </div>

                    {/* Meal Plan Grid */}
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white">
                      {/* 1. Room Only */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            European Plan
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 mt-0.5">Room Only</h4>
                          <p className="text-sm font-extrabold text-[#0f294a] mt-1">
                            ₹{room.roomOnlyPrice.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-slate-500">/ night</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenInquiry('Room Only', room.name)}
                          className="w-full py-2 bg-white border border-slate-300 hover:border-orange-500 hover:text-[#ea580c] text-slate-800 text-xs font-bold rounded-lg transition-colors shadow-xs"
                        >
                          Check Availability
                        </button>
                      </div>

                      {/* 2. With Breakfast */}
                      <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/20 flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#ea580c]">
                            Bed &amp; Breakfast
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 mt-0.5">With Complimentary Breakfast</h4>
                          <p className="text-sm font-extrabold text-[#0f294a] mt-1">
                            ₹{room.breakfastPrice.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-slate-500">/ night</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenInquiry('With Breakfast', room.name)}
                          className="w-full py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                        >
                          Check Availability
                        </button>
                      </div>

                      {/* 3. Half Board */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Modified Plan
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 mt-0.5">Half Board (B’fast + Dinner)</h4>
                          <p className="text-sm font-extrabold text-[#0f294a] mt-1">
                            ₹{room.halfBoardPrice.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-slate-500">/ night</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenInquiry('Half Board', room.name)}
                          className="w-full py-2 bg-white border border-slate-300 hover:border-orange-500 hover:text-[#ea580c] text-slate-800 text-xs font-bold rounded-lg transition-colors shadow-xs"
                        >
                          Check Availability
                        </button>
                      </div>

                      {/* 4. Full Board */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            American Plan
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 mt-0.5">Full Board (All Meals)</h4>
                          <p className="text-sm font-extrabold text-[#0f294a] mt-1">
                            ₹{room.fullBoardPrice.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-slate-500">/ night</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenInquiry('Full Board', room.name)}
                          className="w-full py-2 bg-white border border-slate-300 hover:border-orange-500 hover:text-[#ea580c] text-slate-800 text-xs font-bold rounded-lg transition-colors shadow-xs"
                        >
                          Check Availability
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT STICKY SIDEBAR */}
          <div className="space-y-6">
            
            {/* Pricing Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-lg sticky top-24 space-y-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Best Available Rate
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-[#0f294a]">
                    ₹{hotel.basePrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ night + taxes</span>
                </div>
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  ✓ Verified pilgrim rates with complimentary puja kit
                </p>
              </div>

              {/* Selected Dates & Guests Pill */}
              {(paramAdults || paramCheckIn) && (
                <div className="p-3 bg-orange-50/70 border border-orange-200/60 rounded-2xl space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[#0f294a] font-bold">
                    <span>Selected Pilgrims</span>
                    <span className="text-[#ea580c] text-[11px]">
                      {paramAdults} Adult{paramAdults > 1 ? 's' : ''}
                      {paramChildren > 0 ? `, ${paramChildren} ${paramChildren === 1 ? 'Child' : 'Children'}` : ''}
                    </span>
                  </div>
                  {paramChildAges.length > 0 && (
                    <p className="text-[11px] text-gray-500">
                      Child Ages: {paramChildAges.map((a) => (a === 0 ? 'Under 1' : a)).join(', ')}
                    </p>
                  )}
                  {paramCheckIn && (
                    <p className="text-[11px] text-gray-500 font-medium">
                      Check-in: <span className="font-semibold text-slate-700">{paramCheckIn}</span>
                    </p>
                  )}
                </div>
              )}

              <button
                id="sidebar-check-avail-btn"
                onClick={() => handleOpenInquiry('Standard Stay')}
                className="w-full py-4 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
              >
                <CalendarCheck className="w-5 h-5" />
                <span>Check Availability</span>
              </button>

              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                  <span>Instant WhatsApp travel desk confirmation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-orange-500" />
                  <span>Pure vegetarian culinary dining on premise</span>
                </div>
              </div>

              {/* Good to know Card (Structured details) */}
              <div className="mt-6 pt-6 border-t border-slate-200 space-y-4 text-xs">
                <h3 className="font-bold text-sm text-[#0f294a] flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-orange-600" />
                  <span>Good to know</span>
                </h3>

                <div className="space-y-3 text-slate-700">
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">Check-in / Check-out</span>
                      <p className="text-slate-500">Check-in: 12:00 PM • Check-out: 11:00 AM (Early check-in for morning Aarti on request)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Car className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">Parking &amp; Valet</span>
                      <p className="text-slate-500">Free secure on-site parking for pilgrim coaches and private vehicles.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Utensils className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">Breakfast &amp; Wholesome Meals</span>
                      <p className="text-slate-500">Pure vegetarian buffet with wholesome food items and special fasting platters.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">Children &amp; Senior Policies</span>
                      <p className="text-slate-500">Children under 6 stay free with existing bedding. Wheelchair accessible rooms on ground floors.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Dog className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">Pet Policy</span>
                      <p className="text-slate-500">Pets not allowed within sanctum premises.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl">
            <img
              src={images[lightboxIndex]}
              alt="Lightbox View"
              className="max-h-[80vh] w-auto mx-auto object-contain"
            />
            <div className="flex justify-center gap-2 mt-4">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`w-3 h-3 rounded-full ${lightboxIndex === i ? 'bg-orange-500' : 'bg-slate-600'}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inquiry Modal */}
      <InquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        title={hotel.name}
        type="HOTEL"
        referenceId={hotel.id}
        defaultPlan={selectedRoomName || selectedPlan}
        price={hotel.basePrice}
        defaultAdults={paramAdults}
        defaultChildren={paramChildren}
        defaultChildAges={paramChildAges}
        defaultCheckInDate={paramCheckIn}
      />
    </div>
  );
};

function Building2Icon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  );
}
