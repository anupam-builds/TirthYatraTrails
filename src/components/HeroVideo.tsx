import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Building2,
  Quote,
} from 'lucide-react';

export interface HeroVideoProps {
  onExploreYatras?: () => void;
  onExploreHotels?: () => void;
  videoUrl?: string;
  posterUrl?: string;
  whatsappPhone?: string;
  className?: string;
}

const DEFAULT_POSTER =
  'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=2070&q=85';
const DEFAULT_VIDEO = '/videos/lanterns.mp4';

export const HeroVideo: React.FC<HeroVideoProps> = ({
  onExploreYatras,
  onExploreHotels,
  videoUrl = DEFAULT_VIDEO,
  posterUrl = DEFAULT_POSTER,
  whatsappPhone = '+91 98765 43210',
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Auto-attempt playback with muted loop to respect mobile autoplay policies
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setVideoLoaded(true);
        })
        .catch(() => {
          // Autoplay restricted or low-power mode: poster will show
        });
    }
  }, [videoUrl]);

  // Clean formatted phone for WhatsApp direct URI
  const cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone || '919876543210'}?text=${encodeURIComponent(
    'Namaste TirthYatraTrails, I would like to enquire about upcoming holy yatra packages and temple darshan.'
  )}`;

  return (
    <section
      id="hero-video-section"
      className={`relative w-full min-h-[85vh] lg:h-[85vh] lg:min-h-[640px] max-h-[980px] overflow-hidden bg-slate-950 select-none text-white ${className}`}
      style={{ contentVisibility: 'auto' }}
    >
      {/* 1. Static Fallback Poster or Clean Slate-950 Canvas (Prevents CLS & renders smoothly before video loads) */}
      <img
        src={posterUrl}
        alt="Sacred Holy Dham and Ganges Ghats"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          videoLoaded && !hasError ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        loading="eager"
        fetchPriority="high"
      />

      {/* 2. Full-bleed Atmospheric Video pointing to /videos/lanterns.mp4 */}
      {!hasError && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          poster={posterUrl}
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setHasError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 pointer-events-none ${
            videoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <source src={videoUrl || '/videos/lanterns.mp4'} type="video/mp4" />
        </video>
      )}

      {/* 3. Dark Gradient Scrim Overlays for High-Contrast Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/30 pointer-events-none z-1" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent pointer-events-none z-1" />

      {/* 4. Lower-Third Content Container */}
      <div className="relative z-10 w-full h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-10 sm:pb-14 lg:pb-16 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-end">

          {/* Left/Center Main Column */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-5">
            
            {/* Eyebrow Pill + Brand Seal */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white shadow-xl border border-white/40 p-1 flex items-center justify-center shrink-0">
                <img
                  src="https://i.postimg.cc/Sxqk00xZ/Tirth-Yatra-Trails-Logo.png"
                  alt="TirthYatraTrails.in"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider bg-white/10 backdrop-blur-md border border-white/20 text-orange-300 uppercase shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>VERIFIED SACRED TEMPLE ACCOMMODATIONS &amp; YATRAS</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.12] font-serif drop-shadow-md">
              Your Sacred Journey,{' '}
              <span className="text-orange-400">Divine</span> &amp;{' '}
              <span className="text-amber-200">Seamless</span>.
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-slate-200 max-w-2xl font-normal leading-relaxed drop-shadow-xs">
              From Varanasi's ethereal Ganges Aarti to the silent peaks of Kedarnath, we craft dignified, luxury spiritual experiences. You bring the devotion, we handle every earthly detail.
            </p>

            {/* Lower-Third Primary CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <button
                type="button"
                id="hero-explore-yatras-cta"
                onClick={onExploreYatras}
                className="bg-[#ea580c] hover:bg-[#d44e0a] text-white px-7 py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-white" />
                <span>Explore Yatras</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>

              <a
                id="hero-whatsapp-quick-connect-cta"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 px-6 py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2.5 active:scale-95"
              >
                <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                <span>WhatsApp Quick Connect</span>
              </a>

              {onExploreHotels && (
                <button
                  type="button"
                  id="hero-explore-hotels-cta"
                  onClick={onExploreHotels}
                  className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/25 px-5 py-3.5 rounded-2xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-orange-300" />
                  <span>Search Hotels</span>
                </button>
              )}
            </div>

            {/* Pilgrim Assurance Strip */}
            <div className="flex items-center gap-4 text-[11px] sm:text-xs text-slate-300 pt-1 font-medium flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Direct Holy Dham Rates
              </span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                VIP Darshan Passes
              </span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                24x7 Yatra Assistance
              </span>
            </div>

          </div>

          {/* Lower-Right Quadrant Floating Semi-Transparent Dark-Glass Card */}
          <div className="lg:col-span-4 flex lg:justify-end">
            <div
              id="hero-philosophy-quote-card"
              className="w-full max-w-sm bg-slate-900/65 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all hover:bg-slate-900/75 hover:border-white/25"
            >
              {/* Subtle gold accent edge */}
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-orange-400 to-amber-500" />

              <div className="pl-3 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400/90 mb-1">
                  <Quote className="w-4 h-4 fill-amber-400/20" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300/80">Spiritual Wisdom</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200/95 italic font-serif leading-relaxed">
                  &ldquo;Journey not just with feet, but with faith. We ensure every step is blessed with peace of mind.&rdquo;
                </p>
                <p className="text-[11px] font-semibold text-orange-300 tracking-wide pt-0.5">
                  &ndash; TirthYatraTrails Philosophy
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
