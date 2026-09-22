import React, { useRef, useEffect } from 'react';
import { Sun, Sparkles } from 'lucide-react';

export interface SunriseWisdomSectionProps {
  className?: string;
  videoUrl?: string;
}

export const SunriseWisdomSection: React.FC<SunriseWisdomSectionProps> = ({
  className = '',
  videoUrl = '/videos/sunrise.mp4',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, [videoUrl]);

  return (
    <section
      id="sunrise-wisdom-section"
      className={`h-[65vh] md:h-[75vh] relative w-full overflow-hidden flex items-center justify-center my-16 rounded-3xl mx-auto max-w-[1400px] bg-slate-950 shadow-2xl border border-amber-500/20 px-4 sm:px-6 lg:px-8 text-white select-none ${className}`}
    >
      {/* Background HTML5 video targeting /videos/sunrise.mp4 */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none opacity-85"
      >
        <source src={videoUrl} type="video/mp4" />
        <source src="/videos/Sunrise.mp4" type="video/mp4" />
      </video>

      {/* Deep rich dark radial/amber vignette overlays for contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-0 bg-radial from-transparent via-slate-950/30 to-slate-950/80 pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-slate-950/70 pointer-events-none z-10" />

      {/* Center-aligned ethereal editorial quote layout */}
      <div className="relative z-20 max-w-3xl text-center px-4 py-8 flex flex-col items-center">
        {/* Overline badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 backdrop-blur-md border border-amber-400/30 text-amber-300 text-xs font-bold tracking-widest uppercase mb-6 shadow-lg shadow-amber-950/40">
          <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>☀️ SACRED USHAKAAL • THE SILENT DAWN</span>
        </div>

        {/* Display headline (serif font) */}
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-serif font-extrabold text-white tracking-tight leading-[1.2] drop-shadow-xl mb-6 max-w-2xl">
          &ldquo;From dark of night to sacred dawn &mdash; faith illuminates every mile.&rdquo;
        </h2>

        {/* Sub-quote / Philosophy pill */}
        <div className="inline-block bg-slate-900/70 backdrop-blur-md border border-white/15 rounded-2xl px-6 py-4 shadow-xl max-w-xl mx-auto mb-5">
          <p className="text-sm sm:text-base text-slate-200 font-serif italic leading-relaxed">
            &ldquo;Journey not just with feet, but with faith. We ensure every step is blessed with peace of mind.&rdquo;
          </p>
        </div>

        {/* Subtle minimal bottom attribution */}
        <div className="flex items-center gap-2 text-xs font-medium text-amber-300/90 tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>&mdash; TirthYatraTrails Sacred Desk</span>
        </div>
      </div>
    </section>
  );
};
export default SunriseWisdomSection;
