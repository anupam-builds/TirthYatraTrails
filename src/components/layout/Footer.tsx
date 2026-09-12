import React from 'react';
import { useRouter } from '../../context/RouterContext.js';
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
} from 'lucide-react';

export const CustomerFooter: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <>
      <footer id="customer-footer" className="bg-[#071526] text-white border-t border-[#122842] shrink-0 text-xs">
        {/* 4 Main Footer Columns */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            
            {/* Column 1: Brand */}
            <div className="space-y-4">
              <div
                id="footer-brand-logo"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-full bg-white shadow-md p-1 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 border border-white/20 aspect-square">
                  <img
                    src="/logo.svg"
                    alt="TirthYatraTrails.in Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-serif font-extrabold text-base tracking-tight text-white">
                    Tirth<span className="text-[#ea580c]">Yatra</span>Trails<span className="text-[#ea580c] text-xs font-sans font-bold">.in</span>
                  </span>
                  <span className="text-[8px] font-bold tracking-widest text-slate-400 uppercase">
                    DIVINE JOURNEYS, MEMORABLE EXPERIENCES
                  </span>
                </div>
              </div>
              
              <p className="text-gray-300 text-xs leading-relaxed">
                Your no-cost travel desk on WhatsApp. We curate sanctum-facing hotels, VIP darshan passes, and verified spiritual pilgrimages across India.
              </p>

              <div className="space-y-1.5 pt-1">
                <a
                  href="https://wa.me/919876543210?text=Namaste%20TirthYatraTrails%20Desk%2C%20I%20need%20assistance%20planning%20our%20pilgrimage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-orange-400 hover:text-orange-300 font-bold transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>+91 98765 43210</span>
                </a>
                <p className="text-[11px] text-gray-400">Available 24x7 for Pilgrim Inquiries</p>
              </div>

              {/* Social Icons */}
              <div className="flex items-center gap-3 pt-2">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 flex items-center justify-center transition-colors border border-white/10"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 flex items-center justify-center transition-colors border border-white/10"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 flex items-center justify-center transition-colors border border-white/10"
                  aria-label="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 flex items-center justify-center transition-colors border border-white/10"
                  aria-label="Twitter / X"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Column 2: Explore */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Explore
              </h3>
              <ul className="space-y-2 text-xs text-gray-300 font-medium">
                <li>
                  <button
                    onClick={() => navigate('/flights')}
                    className="hover:text-orange-400 transition-colors text-left"
                  >
                    Flights &amp; Airport Transfers
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/hotels')}
                    className="hover:text-orange-400 transition-colors text-left"
                  >
                    Hotels Near Sanctum
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/packages')}
                    className="hover:text-orange-400 transition-colors text-left"
                  >
                    Tour Packages &amp; Yatras
                  </button>
                </li>
                <li>
                  <a
                    href="https://wa.me/919876543210?text=Namaste%2C%20I%20would%20like%20to%20book%20a%20pilgrimage%20cab%20service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-orange-400 transition-colors block text-left"
                  >
                    Cabs &amp; Temple Shuttles
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/hotels')}
                    className="text-orange-400 hover:underline font-bold transition-colors text-left flex items-center gap-1"
                  >
                    <span>Enquire Now</span>
                    <span>→</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Company */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Company
              </h3>
              <ul className="space-y-2 text-xs text-gray-300 font-medium">
                <li>
                  <button
                    onClick={() => navigate('/')}
                    className="hover:text-orange-400 transition-colors text-left"
                  >
                    About Us
                  </button>
                </li>
                <li>
                  <a
                    href="https://wa.me/919876543210?text=Namaste%20TirthYatraTrails%20Support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-orange-400 transition-colors block text-left"
                  >
                    Contact &amp; 24x7 Help
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/packages')}
                    className="hover:text-orange-400 transition-colors text-left"
                  >
                    Pilgrimage Blog &amp; Guides
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/my-inquiries')}
                    className="hover:text-orange-400 transition-colors text-left"
                  >
                    Support &amp; Booking Status
                  </button>
                </li>
                <li>
                  <a
                    href="https://wa.me/919876543210?text=Namaste%2C%20I%20am%20interested%20in%20B2B%20Pilgrim%20Partnership"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-orange-400 transition-colors block text-left"
                  >
                    B2B Partners &amp; Travel Desks
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Legal */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Legal
              </h3>
              <ul className="space-y-2 text-xs text-gray-300 font-medium">
                <li>
                  <button
                    onClick={() => navigate('/privacy')}
                    className="hover:text-orange-400 cursor-pointer transition-colors text-left block w-full"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/terms')}
                    className="hover:text-orange-400 cursor-pointer transition-colors text-left block w-full"
                  >
                    Terms &amp; Conditions
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/refunds')}
                    className="hover:text-orange-400 cursor-pointer transition-colors text-left block w-full"
                  >
                    Refunds &amp; Cancellations
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/guarantee')}
                    className="hover:text-orange-400 cursor-pointer transition-colors text-left block w-full"
                  >
                    Spiritual Hospitality Guarantee
                  </button>
                </li>
                <li className="pt-2">
                  <button
                    id="footer-admin-desk-link"
                    onClick={() => navigate('/admin/login')}
                    className="text-orange-400 hover:text-orange-300 font-bold underline underline-offset-2 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin Desk</span>
                  </button>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-6 border-t border-[#0f2847] flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 gap-3">
            <p>© {new Date().getFullYear()} TirthYatraTrails Pvt. Ltd. All sacred rights reserved.</p>
            <div className="flex items-center gap-4 text-gray-400">
              <span>Ministry of Tourism Recognized</span>
              <span>•</span>
              <span>ISO 9001:2015 Certified</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Circle Icon Button Fixed at Bottom Right */}
      <a
        id="global-floating-whatsapp-btn"
        href="https://wa.me/919876543210?text=Namaste%20TirthYatraTrails%20Desk%2C%20I%20am%20exploring%20sacred%20pilgrimage%20options"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-2xl hover:scale-110 hover:shadow-green-500/40 transition-all duration-300 group"
        aria-label="Chat on WhatsApp with Travel Desk"
      >
        <span className="absolute -top-9 right-0 bg-[#071526] text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10">
          Need Help? Chat on WhatsApp
        </span>
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25" />
        <MessageCircle className="w-7 h-7 relative z-10 fill-current" />
      </a>
    </>
  );
};
