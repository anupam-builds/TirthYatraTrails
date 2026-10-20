import React, { useEffect, useState } from 'react';

/**
 * FlyingPilgrim component:
 * Renders a subtle, stylized, reverent flying pilgrim (Hanuman Ji / devotee)
 * that glides once gracefully across the customer landing page and app
 * on initial page load (on mount) in a fluid, continuous sweeping arc.
 *
 * Full-page overlay (fixed inset-0 pointer-events-none z-50) with unhurried 7s glide
 * and cubic-bezier(0.25, 1, 0.5, 1) easing.
 */
export const FlyingPilgrim: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Automatically unmount from the DOM once the 7.0s flight animation finishes
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 7300);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none z-50 overflow-hidden"
    >
      <style>{`
        /* Continuous sweeping arc with natural banking from top-left to bottom-right */
        @keyframes pilgrimGlideArc {
          0% {
            transform: translate3d(-140px, 8vh, 0) rotate(-4deg) scale(0.75);
            opacity: 0;
          }
          12% {
            transform: translate3d(14vw, 16vh, 0) rotate(2deg) scale(0.92);
            opacity: 0.95;
          }
          32% {
            transform: translate3d(36vw, 30vh, 0) rotate(5deg) scale(1);
            opacity: 1;
          }
          56% {
            transform: translate3d(60vw, 46vh, 0) rotate(3deg) scale(0.98);
            opacity: 1;
          }
          78% {
            transform: translate3d(80vw, 64vh, 0) rotate(-1deg) scale(0.92);
            opacity: 0.85;
          }
          92% {
            transform: translate3d(94vw, 76vh, 0) rotate(-4deg) scale(0.84);
            opacity: 0.35;
          }
          100% {
            transform: translate3d(calc(100vw + 60px), 88vh, 0) rotate(-7deg) scale(0.76);
            opacity: 0;
          }
        }

        /* Subtle vertical float and banking during flight */
        @keyframes pilgrimBankWave {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(-2deg);
          }
        }

        /* Reverent warm orange brand glow pulse */
        @keyframes pilgrimAuraGlow {
          0%, 100% {
            filter: drop-shadow(0 0 14px rgba(249, 115, 22, 0.7)) drop-shadow(0 0 28px rgba(245, 158, 11, 0.45));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(249, 115, 22, 0.9)) drop-shadow(0 0 36px rgba(251, 191, 36, 0.6));
          }
        }

        /* Gentle trailing sparkle stars */
        @keyframes sparkleFade {
          0%, 100% {
            opacity: 0.35;
            transform: scale(0.85);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }

        .pilgrim-sweeping-arc {
          animation: pilgrimGlideArc 7s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          will-change: transform, opacity;
        }

        .pilgrim-bank-container {
          animation: pilgrimBankWave 2.2s ease-in-out infinite;
          will-change: transform;
        }

        .pilgrim-aura-glow {
          animation: pilgrimAuraGlow 2.5s ease-in-out infinite;
        }

        .sparkle-trail {
          animation: sparkleFade 1.4s ease-in-out infinite alternate;
        }
      `}</style>

      {/* Sweeping Arc Motion Container */}
      <div className="absolute top-0 left-0 pilgrim-sweeping-arc">
        <div className="pilgrim-bank-container">
          <div className="relative pilgrim-aura-glow">
            {/* Stylized Indian Pilgrim / Hanuman Ji SVG Vector Illustration */}
            <svg
              viewBox="0 0 130 130"
              className="w-24 h-24 sm:w-28 sm:h-28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Divine Radiant Aura Glow */}
                <radialGradient id="divineAuraGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff7ed" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#f97316" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
                </radialGradient>

                {/* Saffron Robe / Scarf Gradient */}
                <linearGradient id="saffronFlow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="60%" stopColor="#ea580c" />
                  <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>

                {/* Gold Crown / Mukut Gradient */}
                <linearGradient id="mukutGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>

                {/* Warm Radiant Skin Tone */}
                <linearGradient id="radiantSkin" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fed7aa" />
                  <stop offset="100%" stopColor="#fba36e" />
                </linearGradient>

                {/* Pure Silk Robe */}
                <linearGradient id="sacredSilk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#fef3c7" />
                </linearGradient>
              </defs>

              {/* Radiant Divine Halo behind head */}
              <circle cx="78" cy="46" r="30" fill="url(#divineAuraGlow)" />
              <circle
                cx="78"
                cy="46"
                r="21"
                stroke="#fbbf24"
                strokeWidth="1.2"
                strokeDasharray="2 3"
                opacity="0.8"
              />

              {/* Aerodynamic Flowing Saffron Scarf (Dupatta / Uttariya) trailing behind */}
              <path
                d="M48 54 C30 46, 12 58, 2 52 C10 66, 26 64, 44 60 Z"
                fill="url(#saffronFlow)"
                opacity="0.95"
              />
              <path
                d="M52 60 C36 58, 20 72, 8 68 C18 80, 34 76, 50 66 Z"
                fill="url(#saffronFlow)"
                opacity="0.8"
              />

              {/* Graceful Flying Dhoti & Legs */}
              <path
                d="M32 68 C38 62, 54 58, 64 64 C60 70, 42 76, 32 68 Z"
                fill="url(#sacredSilk)"
                stroke="#d97706"
                strokeWidth="1"
              />
              <path
                d="M26 72 C32 68, 48 64, 56 69 C52 74, 36 78, 26 72 Z"
                fill="url(#sacredSilk)"
                stroke="#d97706"
                strokeWidth="1"
              />
              {/* Golden Anklets */}
              <rect x="29" y="68" width="3" height="4" rx="1.5" fill="#fde047" />

              {/* Torso in forward flying glide with saffron robe */}
              <path
                d="M54 52 C62 48, 72 50, 80 56 C76 66, 62 68, 54 52 Z"
                fill="#ea580c"
              />
              {/* Sacred Janeu Thread */}
              <path
                d="M60 50 Q66 58 72 65"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              {/* Golden Pearl Necklace (Mala) */}
              <path
                d="M64 52 Q72 58 74 54"
                stroke="#fde047"
                strokeWidth="1.6"
                strokeLinecap="round"
              />

              {/* Outstretched forward hand carrying a glowing golden Lotus flower */}
              <path
                d="M74 56 C84 54, 94 48, 100 44"
                stroke="url(#radiantSkin)"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              {/* Sacred Lotus */}
              <g transform="translate(98, 38) scale(0.7)">
                <path
                  d="M10 20 C6 14, 4 6, 10 0 C16 6, 14 14, 10 20 Z"
                  fill="#f43f5e"
                />
                <path
                  d="M4 17 C0 11, 2 5, 8 3 C8 9, 8 13, 4 17 Z"
                  fill="#fb7185"
                />
                <path
                  d="M16 17 C20 11, 18 5, 12 3 C12 9, 12 13, 16 17 Z"
                  fill="#fb7185"
                />
                <circle cx="10" cy="11" r="3" fill="#fde047" />
              </g>

              {/* Stabilizing Left Arm */}
              <path
                d="M52 54 C46 60, 42 66, 40 68"
                stroke="url(#radiantSkin)"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Peaceful, Cheerful Face */}
              <circle cx="78" cy="44" r="11" fill="url(#radiantSkin)" />
              {/* Friendly Gentle Smile */}
              <path
                d="M82 46 Q84 48.5 87 46"
                stroke="#7c2d12"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
              />
              {/* Serene Eye */}
              <path
                d="M81 42 Q83 40 85 42"
                stroke="#431407"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Sacred Vermillion & Sandalwood Tilak */}
              <path
                d="M82 38 L82 34 M81 35 L83 35"
                stroke="#dc2626"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <circle cx="82" cy="38" r="0.9" fill="#fde047" />

              {/* Golden Kundal Earring */}
              <circle
                cx="73"
                cy="46"
                r="2.2"
                fill="#fde047"
                stroke="#b45309"
                strokeWidth="0.5"
              />

              {/* Stylized Golden Mukut (Crown) */}
              <path
                d="M74 36 L78 27 L83 36 L81 38 L76 38 Z"
                fill="url(#mukutGold)"
                stroke="#b45309"
                strokeWidth="0.8"
              />
              <circle cx="78" cy="31" r="1.4" fill="#dc2626" />
              <path
                d="M78 26 L78 23"
                stroke="#fde047"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Trailing Stardust Sparkles */}
              <g>
                <circle
                  cx="16"
                  cy="62"
                  r="1.6"
                  fill="#fef08a"
                  className="sparkle-trail"
                />
                <circle
                  cx="24"
                  cy="50"
                  r="1.2"
                  fill="#f97316"
                  className="sparkle-trail"
                  style={{ animationDelay: '0.35s' }}
                />
                <circle
                  cx="10"
                  cy="72"
                  r="2"
                  fill="#fde047"
                  className="sparkle-trail"
                  style={{ animationDelay: '0.7s' }}
                />
                <circle
                  cx="34"
                  cy="78"
                  r="1.3"
                  fill="#ffedd5"
                  className="sparkle-trail"
                  style={{ animationDelay: '1.05s' }}
                />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
