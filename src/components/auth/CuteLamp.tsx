import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { motion, useAnimation } from 'motion/react';

export interface CuteLampRef {
  pull: () => void;
}

interface CuteLampProps {
  isOn: boolean;
  onToggle: () => void;
  className?: string;
  size?: 'md' | 'lg';
}

// Gentle synthetic lamp click sound using Web Audio API
export function playLampClickSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1050, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.045);
  } catch {
    // Audio is progressive enhancement
  }
}

export const CuteLamp = forwardRef<CuteLampRef, CuteLampProps>(({
  isOn,
  onToggle,
  className = '',
  size = 'lg',
}, ref) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const cordControls = useAnimation();
  const shadeControls = useAnimation();

  // Natural blinking effect (only blinks when awake)
  useEffect(() => {
    if (!isOn) return;
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, [isOn]);

  const handlePullCord = async () => {
    if (isPulling) return;
    setIsPulling(true);
    playLampClickSound();

    // Trigger subtle shade reactive tilt
    shadeControls.start({
      rotate: [0, 4, -2.5, 1, 0],
      transition: { duration: 0.45, ease: 'easeOut' },
    });

    // Animate cord pull down and spring bounce back
    await cordControls.start({
      y: 36,
      transition: { duration: 0.12, ease: 'easeOut' },
    });
    await cordControls.start({
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 650,
        damping: 14,
        mass: 0.6,
      },
    });

    onToggle();
    setIsPulling(false);
  };

  // Expose pull() to parent via ref
  useImperativeHandle(ref, () => ({
    pull: handlePullCord,
  }));

  const scale = size === 'lg' ? 'scale-100' : 'scale-90';

  return (
    <div
      className={`relative select-none flex flex-col items-center justify-start ${scale} ${className}`}
      style={{ width: 300, height: 380 }}
    >
      {/* 1. RADIANT CONE OF LIGHT WHEN LAMP IS ON (dim/invisible when off) */}
      <motion.div
        initial={false}
        animate={{
          opacity: isOn ? 1 : 0,
          scale: isOn ? 1 : 0.85,
        }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="pointer-events-none absolute top-[148px] -left-16 -right-16 h-[390px] z-0 overflow-hidden"
      >
        <div
          className="w-full h-full"
          style={{
            clipPath: 'polygon(32% 0%, 68% 0%, 100% 100%, 0% 100%)',
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(254, 240, 138, 0.7) 0%, rgba(251, 191, 36, 0.35) 40%, rgba(245, 158, 11, 0.1) 72%, transparent 95%)',
            filter: 'blur(6px)',
          }}
        />
      </motion.div>

      {/* Extra ambient glow behind the shade (ZERO when off) */}
      <motion.div
        initial={false}
        animate={{
          opacity: isOn ? 0.9 : 0,
          scale: isOn ? 1.15 : 0.6,
        }}
        transition={{ duration: 0.35 }}
        className="pointer-events-none absolute top-[70px] w-56 h-56 rounded-full bg-amber-400/35 blur-2xl z-0"
      />

      {/* Floor desk illumination pool (ZERO when off) */}
      <motion.div
        initial={false}
        animate={{
          opacity: isOn ? 0.8 : 0,
          scale: isOn ? 1 : 0.5,
        }}
        transition={{ duration: 0.35 }}
        className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 w-[340px] h-[55px] rounded-[100%] bg-amber-400/30 blur-xl z-0"
      />

      {/* 2. LAMP STAND & BASE SVG */}
      <svg
        className="absolute top-0 w-[300px] h-[360px] overflow-visible pointer-events-none z-10"
        viewBox="0 0 300 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Desk Base Oval */}
        <ellipse
          cx="150"
          cy="342"
          rx="54"
          ry="14"
          className={isOn ? 'fill-slate-300' : 'fill-slate-800'}
          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.4))"
        />
        <ellipse
          cx="150"
          cy="339"
          rx="48"
          ry="10"
          className={isOn ? 'fill-amber-600/80' : 'fill-slate-700'}
        />
        <ellipse
          cx="150"
          cy="338"
          rx="24"
          ry="5"
          className={isOn ? 'fill-amber-400' : 'fill-slate-600'}
        />

        {/* Stem pole rising from base */}
        <path
          d="M 150 338 L 150 190"
          stroke={isOn ? '#d97706' : '#475569'}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 149 338 L 149 190"
          stroke={isOn ? '#fbbf24' : '#64748b'}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Curved neck joining to lampshade top */}
        <path
          d="M 150 190 C 150 130, 150 100, 150 75"
          stroke={isOn ? '#d97706' : '#475569'}
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Finial knob at top */}
        <circle
          cx="150"
          cy="70"
          r="8"
          className={isOn ? 'fill-amber-500 stroke-amber-300' : 'fill-slate-700 stroke-slate-600'}
          strokeWidth="2"
        />
      </svg>

      {/* 3. CUTE ANIMATED LAMPSHADE */}
      <motion.div
        animate={shadeControls}
        onClick={handlePullCord}
        className="relative z-20 top-[65px] flex flex-col items-center cursor-pointer group"
        title="Click lampshade or pull cord to switch light"
      >
        <div className="relative w-[180px] h-[120px] flex items-center justify-center transition-transform group-hover:scale-[1.02]">
          <svg
            viewBox="0 0 180 120"
            className="w-full h-full overflow-visible"
            filter={
              isOn
                ? 'drop-shadow(0 10px 25px rgba(245, 158, 11, 0.45))'
                : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))'
            }
          >
            <defs>
              {/* Warm lit gradient */}
              <linearGradient id="lampLitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#fde047" />
                <stop offset="85%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>

              {/* Unlit sleeping dark gradient */}
              <linearGradient id="lampDarkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              {/* Inner bulb glow */}
              <radialGradient id="bulbGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="70%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#f59e0b" />
              </radialGradient>
            </defs>

            {/* Trapezoid Lampshade shape */}
            <path
              d="M 50 16 L 130 16 C 136 16, 140 20, 142 26 L 168 96 C 170 102, 166 108, 158 108 L 22 108 C 14 108, 10 102, 12 96 L 38 26 C 40 20, 44 16, 50 16 Z"
              fill={isOn ? 'url(#lampLitGrad)' : 'url(#lampDarkGrad)'}
              stroke={isOn ? '#f59e0b' : '#475569'}
              strokeWidth="3"
            />

            {/* Top Collar Rim */}
            <ellipse
              cx="90"
              cy="16"
              rx="42"
              ry="7"
              fill={isOn ? '#fbbf24' : '#475569'}
              stroke={isOn ? '#d97706' : '#334155'}
              strokeWidth="2"
            />

            {/* Bottom Scallop Trim / Rim */}
            <ellipse
              cx="90"
              cy="108"
              rx="70"
              ry="11"
              fill={isOn ? '#d97706' : '#1e293b'}
              stroke={isOn ? '#b45309' : '#0f172a'}
              strokeWidth="2"
            />

            {/* Inner Bulb Peek from bottom */}
            {isOn && (
              <ellipse
                cx="90"
                cy="106"
                rx="28"
                ry="8"
                fill="url(#bulbGlow)"
                filter="drop-shadow(0 0 10px #fde047)"
              />
            )}
          </svg>

          {/* CUTE EXPRESSIVE FACE ON THE SHADE */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 pointer-events-none">
            {/* Eyes & Blushing Cheeks Row */}
            <div className="flex items-center gap-7">
              {/* Left Eye & Cheek */}
              <div className="flex flex-col items-center">
                {isOn ? (
                  isBlinking ? (
                    <div className="w-4 h-1 bg-amber-950 rounded-full my-1.5" />
                  ) : (
                    <div className="relative w-4 h-4 rounded-full bg-amber-950 flex items-start justify-start p-0.5 shadow-xs">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      <div className="absolute bottom-0.5 right-0.5 w-0.8 h-0.8 bg-white rounded-full opacity-80" />
                    </div>
                  )
                ) : (
                  // Sleeping cute curved eye (◠)
                  <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                    <path
                      d="M 2 8 C 5 2, 13 2, 16 8"
                      stroke="#94a3b8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {/* Soft Rosy Blush Cheek */}
                <div
                  className={`w-3.5 h-2 rounded-full mt-1 ${
                    isOn ? 'bg-rose-400/65' : 'bg-rose-400/20'
                  } blur-[0.5px]`}
                />
              </div>

              {/* Right Eye & Cheek */}
              <div className="flex flex-col items-center">
                {isOn ? (
                  isBlinking ? (
                    <div className="w-4 h-1 bg-amber-950 rounded-full my-1.5" />
                  ) : (
                    <div className="relative w-4 h-4 rounded-full bg-amber-950 flex items-start justify-start p-0.5 shadow-xs">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      <div className="absolute bottom-0.5 right-0.5 w-0.8 h-0.8 bg-white rounded-full opacity-80" />
                    </div>
                  )
                ) : (
                  // Sleeping cute curved eye (◠)
                  <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                    <path
                      d="M 2 8 C 5 2, 13 2, 16 8"
                      stroke="#94a3b8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {/* Soft Rosy Blush Cheek */}
                <div
                  className={`w-3.5 h-2 rounded-full mt-1 ${
                    isOn ? 'bg-rose-400/65' : 'bg-rose-400/20'
                  } blur-[0.5px]`}
                />
              </div>
            </div>

            {/* Cheerful Smile */}
            <div className="mt-1">
              {isOn ? (
                // Bright happy curved smile with tiny tongue
                <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                  <path
                    d="M 4 3 C 7 11, 15 11, 18 3"
                    stroke="#451a03"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 8 7 C 9 10, 13 10, 14 7 Z"
                    fill="#f43f5e"
                    opacity="0.8"
                  />
                </svg>
              ) : (
                // Peaceful sleeping smile
                <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
                  <path
                    d="M 4 3 C 6 7, 12 7, 14 3"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. FIXED MOUNTING EYELET UNDER LAMPSHADE RIM */}
      <div
        className="absolute z-25 top-[170px] pointer-events-none"
        style={{ left: 212 }}
      >
        <div className="w-3 h-2 -ml-1.5 rounded-t-sm bg-amber-500 border border-amber-700 shadow-xs" />
      </div>

      {/* 5. INTERACTIVE HANGING PULL CORD & METALLIC BEAD CHAIN */}
      <div
        className="absolute z-30 top-[172px] flex flex-col items-center"
        style={{ left: 194 }}
      >
        <motion.div
          animate={cordControls}
          drag="y"
          dragConstraints={{ top: 0, bottom: 48 }}
          dragElastic={0.35}
          onDragEnd={(_, info) => {
            if (info.offset.y > 15) {
              handlePullCord();
            } else {
              cordControls.start({
                y: 0,
                transition: { type: 'spring', stiffness: 500, damping: 15 },
              });
            }
          }}
          onClick={handlePullCord}
          whileHover={{ scale: 1.05 }}
          className="relative cursor-grab active:cursor-grabbing select-none group flex flex-col items-center p-1 -m-1"
          title={isOn ? 'Click or pull cord to turn off lamp' : 'Click or pull cord to turn on lamp & reveal login'}
        >
          {/* Glowing beacon aura around knob when off */}
          {!isOn && (
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="absolute top-[72px] left-[5px] w-8 h-8 rounded-full bg-amber-400/35 blur-sm pointer-events-none"
            />
          )}

          {/* SVG Pull Chain & Brass Bell Knob */}
          <svg
            width="38"
            height="116"
            viewBox="0 0 38 116"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="overflow-visible"
          >
            <defs>
              <linearGradient id="brassChainGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="35%" stopColor="#fbbf24" />
                <stop offset="70%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>

              <linearGradient id="brassKnobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="25%" stopColor="#fbbf24" />
                <stop offset="70%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>
            </defs>

            {/* Central wire link */}
            <line x1="19" y1="2" x2="19" y2="74" stroke="#d97706" strokeWidth="1.2" />

            {/* 9 Metallic Beads along the hanging cord */}
            {[8, 15, 22, 29, 36, 43, 50, 57, 64].map((cy, idx) => (
              <g key={idx}>
                <circle
                  cx="19"
                  cy={cy}
                  r="3.2"
                  fill="url(#brassChainGrad)"
                  stroke="#78350f"
                  strokeWidth="0.6"
                  filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
                />
                {/* Metallic glint reflection */}
                <circle cx="18" cy={cy - 1} r="0.9" fill="#ffffff" opacity="0.9" />
              </g>
            ))}

            {/* Connector Collar */}
            <rect
              x="16.5"
              y="70"
              width="5"
              height="4"
              rx="1.2"
              fill="url(#brassChainGrad)"
              stroke="#78350f"
              strokeWidth="0.6"
            />

            {/* Solid Brass Teardrop Pull Knob */}
            <path
              d="M 16.5 74 C 16.5 74, 11 87, 11 93 C 11 98.5, 14.5 102, 19 102 C 23.5 102, 27 98.5, 27 93 C 27 87, 21.5 74, 21.5 74 Z"
              fill="url(#brassKnobGrad)"
              stroke="#92400e"
              strokeWidth="1.2"
              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.6))"
            />

            {/* Specular gloss highlight curve on bell */}
            <path
              d="M 15 79 C 13.5 85, 13.5 93, 16 97"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* Metallic Bottom Pull Ring */}
            <circle
              cx="19"
              cy="106"
              r="4.2"
              fill="none"
              stroke="url(#brassChainGrad)"
              strokeWidth="2.2"
              filter="drop-shadow(0 2px 3px rgba(0,0,0,0.5))"
            />
          </svg>

          {/* Floating Pull Hint Badge (Positioned safely to the right, never overlaps the cord) */}
          <div className="absolute left-[36px] top-[74px] whitespace-nowrap pointer-events-none">
            <div
              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-lg border transition-all ${
                isOn
                  ? 'bg-amber-500/90 text-amber-950 border-amber-300 shadow-amber-500/30'
                  : 'bg-amber-400 text-amber-950 border-amber-200 shadow-amber-400/40 animate-bounce'
              }`}
            >
              <span>{isOn ? 'Pull to Off' : 'Pull Cord'}</span>
              <span className="text-xs font-black">⇣</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 6. SOFT DESK CONTACT SHADOW */}
      <div
        className={`absolute bottom-3 w-44 h-5 rounded-full blur-sm transition-all duration-300 ${
          isOn ? 'bg-amber-950/20' : 'bg-black/60'
        }`}
      />
    </div>
  );
});

CuteLamp.displayName = 'CuteLamp';
