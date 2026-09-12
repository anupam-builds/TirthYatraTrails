import React, { useState } from 'react';
import { useRouter } from '../../context/RouterContext.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  PhoneCall,
  CalendarCheck,
  Menu,
  X,
  Compass,
  Building2,
  Plane,
  HeartHandshake,
  MessageCircle,
} from 'lucide-react';

export const CustomerNavbar: React.FC = () => {
  const { path, navigate } = useRouter();
  const { user, logoutCustomer } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isActive = (route: string) => {
    if (route === '/' && path === '/') return true;
    if (route !== '/' && path.startsWith(route)) return true;
    return false;
  };

  return (
    <header id="customer-header" className="sticky top-0 z-50 bg-white border-b border-gray-100 shrink-0 shadow-xs">
      {/* Top Spiritual Helpline Announcement Bar */}
      <div className="bg-[#0f294a] text-white text-[11px] py-1 px-4 sm:px-8 flex flex-wrap items-center justify-between border-b border-[#163964]">
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ea580c] animate-pulse"></span>
          <span>Jay Shree Ram • Verified Darshan &amp; Sacred Yatra Bookings Open for 2026</span>
        </div>
        <div className="hidden md:flex items-center gap-5 text-slate-300 text-[11px]">
          <a
            href="https://wa.me/919876543210?text=Namaste%20TirthYatraTrails%20Team%2C%20I%20need%20assistance%20with%20pilgrimage%20booking"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-orange-400 transition-colors"
          >
            <PhoneCall className="w-3 h-3 text-orange-400" />
            <span>24x7 Pilgrim Desk: +91 98765 43210</span>
          </a>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <HeartHandshake className="w-3 h-3 text-orange-400" />
            <span>Spiritual Care &amp; Senior Friendly</span>
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            id="nav-brand-logo"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <img
              src="/logo-navy.svg"
              alt="TirthYatraTrails.in"
              className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-serif font-extrabold text-base sm:text-lg tracking-tight leading-none text-[#0f294a]">
                Tirth<span className="text-[#ea580c]">Yatra</span>Trails<span className="text-[#ea580c] text-xs font-sans">.in</span>
              </span>
              <span className="text-[8px] font-bold tracking-widest text-[#0f294a]/75 uppercase hidden sm:block">
                DIVINE JOURNEYS, MEMORABLE EXPERIENCES
              </span>
            </div>
          </div>

          {/* Center Navigation Links: Hotels, Packages, Flights */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <button
              id="nav-link-hotels"
              onClick={() => navigate('/hotels')}
              className={`transition-colors flex items-center gap-1.5 ${
                isActive('/hotels')
                  ? 'text-[#ea580c] font-bold'
                  : 'text-[#0f294a] hover:text-[#ea580c]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Hotels</span>
            </button>

            <button
              id="nav-link-packages"
              onClick={() => navigate('/packages')}
              className={`transition-colors flex items-center gap-1.5 ${
                isActive('/packages')
                  ? 'text-[#ea580c] font-bold'
                  : 'text-[#0f294a] hover:text-[#ea580c]'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Packages</span>
            </button>

            <button
              id="nav-link-flights"
              onClick={() => navigate('/flights')}
              className={`transition-colors flex items-center gap-1.5 ${
                isActive('/flights')
                  ? 'text-[#ea580c] font-bold'
                  : 'text-[#0f294a] hover:text-[#ea580c]'
              }`}
            >
              <Plane className="w-4 h-4" />
              <span>Flights</span>
            </button>
          </nav>

          {/* Right Action / Direct Inquiry & Yatra Planning */}
          <div className="hidden md:flex items-center gap-3">
            <a
              id="nav-whatsapp-direct-btn"
              href="https://wa.me/919876543210?text=Namaste%20TirthYatraTrails%20Team%2C%20I%20would%20like%20to%20plan%20a%20pilgrimage%20yatra"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
              <span>WhatsApp Desk</span>
            </a>

            <button
              id="nav-plan-yatra-btn"
              onClick={() => navigate('/packages')}
              className="px-4 py-2 bg-[#ea580c] hover:bg-[#d44e0a] text-white rounded-xl shadow-xs text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Plan My Yatra</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-orange-50 hover:text-[#ea580c]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="md:hidden bg-white border-b border-orange-100 px-4 pt-2 pb-6 space-y-3 shadow-lg">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/flights');
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${
              isActive('/flights') ? 'bg-orange-50 text-[#ea580c]' : 'text-[#0f294a]'
            }`}
          >
            <Plane className="w-5 h-5 text-orange-500" />
            <span>Flights</span>
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/hotels');
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${
              isActive('/hotels') ? 'bg-orange-50 text-[#ea580c]' : 'text-[#0f294a]'
            }`}
          >
            <Building2 className="w-5 h-5 text-orange-500" />
            <span>Hotels</span>
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/packages');
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${
              isActive('/packages') ? 'bg-orange-50 text-[#ea580c]' : 'text-[#0f294a]'
            }`}
          >
            <Compass className="w-5 h-5 text-orange-500" />
            <span>Pilgrimage Packages</span>
          </button>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <a
              id="mobile-nav-whatsapp-btn"
              href="https://wa.me/919876543210?text=Namaste%20TirthYatraTrails%20Team%2C%20I%20would%20like%20to%20plan%20a%20pilgrimage%20yatra"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 text-center font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-xs"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span>WhatsApp Travel Desk (+91 98765 43210)</span>
            </a>
            <button
              id="mobile-nav-plan-btn"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/packages');
              }}
              className="w-full py-2.5 text-center font-bold bg-[#ea580c] text-white rounded-xl shadow-md text-xs flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Explore All Yatra Packages</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
