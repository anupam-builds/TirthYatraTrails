import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { api } from '../services/api.js';
import { City, Hotel, Package, Review } from '../types.js';
import { HeroSearchBar } from '../components/common/HeroSearchBar.js';
import {
  MapPin,
  Calendar,
  Search,
  ChevronRight,
  ChevronLeft,
  Star,
  Sparkles,
  ShieldCheck,
  Building2,
  Compass,
  ArrowRight,
  Award,
  HeartHandshake,
  MessageCircle,
  CheckCircle2,
  ExternalLink,
  X,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { navigate } = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [c, h, p, r] = await Promise.all([
          api.getCities(),
          api.getHotels(),
          api.getPackages(),
          api.getReviews(true),
        ]);
        setCities(c);
        setHotels(h);
        setPackages(p);
        setReviews(r);
      } catch (err) {
        console.error('Failed loading homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();

    // Dynamically synchronize stay count & inventory when hotels change in Admin Panel
    const handleHotelChange = () => {
      api.getHotels()
        .then((freshHotels) => {
          if (Array.isArray(freshHotels)) {
            setHotels(freshHotels);
          }
        })
        .catch((err) => console.warn('Failed refreshing hotels on homepage:', err));

      api.getCities()
        .then((freshCities) => {
          if (Array.isArray(freshCities)) {
            setCities(freshCities);
          }
        })
        .catch((err) => console.warn('Failed refreshing cities on homepage:', err));
    };

    window.addEventListener('tirth-hotel-changed', handleHotelChange);
    window.addEventListener('storage', handleHotelChange);
    window.addEventListener('focus', handleHotelChange);

    return () => {
      window.removeEventListener('tirth-hotel-changed', handleHotelChange);
      window.removeEventListener('storage', handleHotelChange);
      window.removeEventListener('focus', handleHotelChange);
    };
  }, []);

  const handlePrevReview = () => {
    if (reviews.length === 0) return;
    setCurrentReviewIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const handleNextReview = () => {
    if (reviews.length === 0) return;
    setCurrentReviewIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  };

  const activeReview = reviews[currentReviewIndex] || null;

  return (
    <div id="home-page" className="min-h-screen bg-[#fdfbf7]">
      
      {/* ================================================================ */}
      {/* A. HERO SECTION                                                 */}
      {/* ================================================================ */}
      <section className="bg-[#0f294a] text-white pt-16 pb-20 sm:pt-20 sm:pb-24 px-4 sm:px-8 relative">
        <div className="max-w-4xl mx-auto text-center relative z-10 w-full space-y-6">
          
          {/* Top Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider bg-white/10 border border-white/20 text-orange-300 uppercase shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>VERIFIED SACRED TEMPLE ACCOMMODATIONS</span>
          </div>

          {/* Prominently Centered TirthYatraTrails.in Circular Brand Emblem */}
          <div className="flex justify-center pt-1 pb-2">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-white shadow-2xl shadow-black/30 border border-white/40 p-2 sm:p-3 flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-105 aspect-square">
              <img
                src="/logo.svg"
                alt="TirthYatraTrails.in - Divine Journeys, Memorable Experiences"
                className="w-full h-full aspect-square object-contain scale-110"
              />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight font-serif">
            Find a hotel steps from your <span className="text-[#ea580c]">darshan</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Devoted retreats offering temple tours, spiritual consultations, prayer group access, and wellness rituals
          </p>

          {/* Multi-Field Search Bar */}
          <div className="pt-2 max-w-5xl mx-auto w-full text-left relative z-30">
            <HeroSearchBar
              cities={cities}
              showPopularChips={true}
            />
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              id="hero-explore-hotels-btn"
              onClick={() => navigate('/hotels')}
              className="w-full sm:w-auto bg-[#ea580c] hover:bg-[#d44e0a] text-white px-8 py-3.5 rounded-full font-bold text-sm shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Building2 className="w-4 h-4" />
              <span>Search &amp; Book Hotels</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            <button
              id="hero-explore-packages-btn"
              onClick={() => navigate('/packages')}
              className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white border border-white/20 px-8 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Compass className="w-4 h-4 text-orange-400" />
              <span>Explore Yatra Packages</span>
            </button>
          </div>

        </div>
      </section>

      {/* ================================================================ */}
      {/* B. TOP-SELLING PACKAGES                                          */}
      {/* ================================================================ */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f294a] tracking-tight">
              Top-selling <span className="italic text-blue-600 font-serif">packages</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Curated spiritual journeys with luxury transfers, VIP darshan passes, and wholesome pilgrim dining.
            </p>
          </div>
          <button
            id="view-all-packages-link"
            onClick={() => navigate('/packages')}
            className="text-xs font-bold text-[#ea580c] hover:text-[#d44e0a] uppercase flex items-center gap-1 shrink-0"
          >
            <span>Explore All Yatras</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Package Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.slice(0, 3).map((pkg, idx) => (
            <div
              key={pkg.id}
              id={`package-card-${pkg.id}`}
              onClick={() => navigate(`/package/${pkg.id}`)}
              className="group relative h-96 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between p-5 bg-[#0f294a]"
            >
              {/* Background Image */}
              <img
                src={pkg.imageUrl}
                alt={pkg.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* Dark Gradient Overlay at Bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

              {/* Top Badges */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="bg-[#0f294a]/90 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/10 shadow-xs">
                  {pkg.bookedRank || (idx === 0 ? '★ #1 booked' : '★ Most Popular')}
                </span>
                <span className="bg-white/95 text-[#0f294a] text-[11px] font-extrabold px-3 py-1 rounded-full shadow-xs">
                  {pkg.duration}
                </span>
              </div>

              {/* Bottom Card Content */}
              <div className="relative z-10 space-y-3">
                <div>
                  <div className="flex items-center gap-1 text-orange-300 text-xs font-bold mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{pkg.location}</span>
                  </div>
                  <h3 className="font-extrabold text-lg text-white group-hover:text-orange-300 transition-colors line-clamp-2 leading-snug">
                    {pkg.title}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/20">
                  <div>
                    <span className="text-[10px] text-gray-300 block font-medium">Starting price</span>
                    <span className="text-lg font-black text-white">
                      ₹{pkg.startingPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <button
                    id={`btn-view-package-${pkg.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/package/${pkg.id}`);
                    }}
                    className="bg-[#ea580c] hover:bg-[#d44e0a] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================ */}
      {/* C. TOP-RATED STAYS (NO AGGREGATOR MARGIN)                        */}
      {/* ================================================================ */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f294a] tracking-tight">
              Top-rated stays, <span className="italic text-blue-600 font-serif">no aggregator margin</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Direct holy dham rates, spotless premises, morning temple transfers, and dedicated pilgrim hospitality.
            </p>
          </div>
          <a
            href="/hotels"
            id="view-all-hotels-link"
            onClick={(e) => {
              e.preventDefault();
              navigate('/hotels');
            }}
            className="text-xs font-bold text-[#ea580c] hover:text-[#d44e0a] uppercase flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
          >
            <span>VIEW ALL ({hotels.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 4 Hotel Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {hotels.slice(0, 4).map((hotel) => (
            <div
              key={hotel.id}
              id={`hotel-card-${hotel.id}`}
              className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Hotel Image Container */}
                <div className="h-44 rounded-xl overflow-hidden mb-3 relative bg-gray-100">
                  <img
                    src={hotel.images[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'}
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Top-left Google Rating Pill */}
                  <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm text-xs font-bold text-slate-800">
                    <span className="text-[#ea580c] font-black">G</span>
                    <span>{hotel.googleRating.toFixed(1)} ★</span>
                  </div>

                  {hotel.distanceToTemple && (
                    <div className="absolute bottom-2 left-2 right-2 bg-[#0f294a]/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-white text-[10px] font-medium flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                      <span className="truncate">{hotel.distanceToTemple}</span>
                    </div>
                  )}
                </div>

                {/* Location Pin + City */}
                <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 uppercase tracking-tight mb-1">
                  <MapPin className="w-3 h-3 text-[#ea580c]" />
                  <span>{hotel.cityName}</span>
                </div>

                {/* Bold Hotel Name */}
                <h3 className="font-bold text-sm text-[#0f294a] mb-2 line-clamp-1 group-hover:text-[#ea580c] transition-colors">
                  {hotel.name}
                </h3>

                {/* Amenities */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {hotel.amenities.slice(0, 2).map((amenity, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 mt-2">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">from / night</span>
                  <span className="font-extrabold text-base text-[#0f294a]">
                    ₹{hotel.basePrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <button
                  id={`btn-view-hotel-${hotel.id}`}
                  onClick={() => navigate(`/hotel/${hotel.id}`)}
                  className="bg-[#ea580c] hover:bg-[#d44e0a] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                >
                  View →
                </button>
              </div>

            </div>
          ))}
        </div>
      </section>

      {/* ================================================================ */}
      {/* D. FEATURED TRAVELLER STORIES (DYNAMIC REVIEWS CAROUSEL)         */}
      {/* ================================================================ */}
      <section className="bg-[#0f294a] text-white py-16 px-4 sm:px-6 lg:px-8 my-8 relative">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">
              IN THEIR OWN WORDS
            </p>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Featured <span className="italic text-sky-400 font-serif">traveller</span> stories
            </h2>
            <div className="inline-flex items-center gap-2 mt-3 bg-white/10 px-4 py-1 rounded-full border border-white/20 text-xs font-semibold text-orange-200">
              <span className="text-amber-400">★★★★★</span>
              <span>5.0 on Google • Verified Pilgrim Testimonials</span>
            </div>
          </div>

          {/* Large Split 50/50 Card with Carousel Controls */}
          {activeReview ? (
            <div className="relative">
              <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-white/10 grid grid-cols-1 md:grid-cols-2 text-[#0f294a]">
                
                {/* Left Side: Temple Image */}
                <div className="relative h-72 md:h-full min-h-[320px] bg-slate-900">
                  <img
                    src={activeReview.destinationImage}
                    alt={activeReview.authorLocation}
                    className="w-full h-full object-cover transition-all duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs font-bold bg-[#0f294a]/85 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/15">
                    <span className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span className="truncate">{activeReview.authorLocation}</span>
                    </span>
                    {activeReview.googleReviewUrl && (
                      <a
                        href={activeReview.googleReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-300 hover:text-white flex items-center gap-1 shrink-0 text-[11px] font-semibold underline ml-2"
                      >
                        <span>Google Map</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Right Side: White Background Testimonial */}
                <div className="p-6 sm:p-10 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      {/* Star Rating Display */}
                      <div className="flex items-center gap-1 text-amber-400 text-base">
                        {Array.from({ length: Math.floor(activeReview.rating || 5) }).map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                        <span className="text-xs font-black text-slate-800 ml-1">
                          {activeReview.rating.toFixed(1)}
                        </span>
                      </div>
                      
                      {activeReview.isVerified && (
                        <span className="text-xs font-extrabold bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          <span>Verified Google review</span>
                        </span>
                      )}
                    </div>

                    <blockquote className="text-sm sm:text-base text-gray-700 font-serif leading-relaxed italic">
                      “{activeReview.reviewText}”
                    </blockquote>
                  </div>

                  {/* User Profile Row & Carousel Controls */}
                  <div className="flex flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 w-full">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-[#ea580c] text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
                        {activeReview.authorInitials || activeReview.authorName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-[#0f294a] truncate">
                          {activeReview.authorName}
                        </h4>
                        <p className="text-xs text-gray-400 truncate">
                          {activeReview.authorLocation} • Verified Devotee
                        </p>
                      </div>
                    </div>

                    {/* Carousel Nav Buttons */}
                    {reviews.length > 1 && (
                      <div className="flex flex-row items-center gap-3 shrink-0">
                        <button
                          id="btn-prev-review"
                          onClick={handlePrevReview}
                          aria-label="Previous review"
                          className="p-2 rounded-xl bg-slate-100 hover:bg-orange-100 hover:text-[#ea580c] text-slate-700 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="whitespace-nowrap shrink-0 text-sm font-medium text-slate-500 px-1 select-none">
                          {currentReviewIndex + 1} / {reviews.length}
                        </span>
                        <button
                          id="btn-next-review"
                          onClick={handleNextReview}
                          aria-label="Next review"
                          className="p-2 rounded-xl bg-slate-100 hover:bg-orange-100 hover:text-[#ea580c] text-slate-700 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-3xl p-12 text-center text-slate-300">
              <p className="text-sm">Spiritual reviews loading...</p>
            </div>
          )}

        </div>
      </section>

      {/* ================================================================ */}
      {/* E. CALL TO ACTION BANNER (PRE-FOOTER)                             */}
      {/* ================================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16">
        <div className="rounded-3xl bg-[#0f294a] text-white p-8 sm:p-14 relative overflow-hidden shadow-2xl border border-[#163b66]">
          
          {/* Subtle Wave Graphic Texture */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div className="max-w-xl space-y-2">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Ready for your own <span className="italic text-sky-300 font-serif">memorable journey</span>?
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
                Tell us where — we'll plan the rest. No fee to ask.
              </p>
            </div>

            <a
              id="cta-whatsapp-message-btn"
              href="https://wa.me/919876543210?text=Namaste%20TirthYatraTrails%2C%20I%20am%20ready%20to%20plan%20our%20sacred%20pilgrimage"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#ea580c] hover:bg-[#d44e0a] text-white px-8 py-4 rounded-2xl font-extrabold text-sm shadow-xl hover:shadow-orange-500/30 transition-all flex items-center gap-2.5 shrink-0 active:scale-95"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>Message us</span>
            </a>
          </div>

        </div>
      </section>

    </div>
  );
};
