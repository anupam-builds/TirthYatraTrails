import React, { useState } from 'react';
import { useRouter } from '../../context/RouterContext.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  PhoneCall,
  User as UserIcon,
  LogOut,
  CalendarCheck,
  Menu,
  X,
  Compass,
  Building2,
  Plane,
  HeartHandshake,
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
            <span>100% Sattvic &amp; Senior Friendly</span>
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
            <div className="w-8 h-8 bg-[#ea580c] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
              T
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[#0f294a]">TirthYatraTrails</span>
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

          {/* Right Action / Customer Auth */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="relative">
                <button
                  id="nav-user-dropdown-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:border-orange-300 text-[#0f294a] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-[#ea580c] text-white flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left leading-tight">
                    <span className="block text-[10px] text-gray-400 font-semibold">My Account</span>
                    <span className="block max-w-[110px] truncate text-xs font-bold text-[#0f294a]">{user.name}</span>
                  </div>
                </button>

                {userDropdownOpen && (
                  <div
                    id="nav-user-dropdown-menu"
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Account Active</p>
                      <p className="text-sm font-bold text-[#0f294a] truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>

                    <button
                      id="nav-my-inquiries-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate('/my-inquiries');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0f294a] hover:bg-orange-50 hover:text-[#ea580c] transition-colors"
                    >
                      <CalendarCheck className="w-3.5 h-3.5 text-orange-500" />
                      <span>My Bookings &amp; Quotes</span>
                    </button>

                    <button
                      id="nav-customer-logout-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logoutCustomer();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4 text-sm font-bold">
                <button
                  id="nav-customer-login-btn"
                  onClick={() => navigate('/login')}
                  className="text-xs font-bold text-[#0f294a] hover:text-[#ea580c] transition-colors"
                >
                  Login
                </button>
                <button
                  id="nav-customer-register-btn"
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 bg-[#ea580c] hover:bg-[#d44e0a] text-white rounded-lg shadow-sm shadow-orange-200 text-xs font-bold transition-all"
                >
                  Register
                </button>
              </div>
            )}
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

          {user ? (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/my-inquiries');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0f294a] hover:bg-orange-50"
              >
                <CalendarCheck className="w-5 h-5 text-orange-500" />
                <span>My Bookings &amp; Inquiries</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logoutCustomer();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out ({user.name})</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full py-2.5 text-center font-semibold text-[#0f294a] border border-slate-200 rounded-xl"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/register');
                }}
                className="w-full py-2.5 text-center font-semibold bg-[#ea580c] text-white rounded-xl shadow-md"
              >
                Register
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
