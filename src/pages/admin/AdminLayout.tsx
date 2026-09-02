import React from 'react';
import { useRouter } from '../../context/RouterContext.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  LayoutDashboard,
  Building,
  Compass,
  MessageSquare,
  MapPin,
  Users,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Bell,
  Sparkles,
  Quote,
  Star,
} from 'lucide-react';

import { AdminLoginPage } from './AdminLoginPage.js';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'hotels' | 'packages' | 'inquiries' | 'cities' | 'users' | 'reviews';
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab }) => {
  const { navigate } = useRouter();
  const { adminUser, logoutAdmin, isAdminAuthenticated, isAdminLoading } = useAuth();

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-[#071322] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Verifying Admin Session...</p>
        </div>
      </div>
    );
  }

  // If not authenticated as Admin, show AdminLoginPage directly
  if (!isAdminAuthenticated || !adminUser) {
    return <AdminLoginPage />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { id: 'inquiries', label: 'Travel Desk Leads', path: '/admin/inquiries', icon: MessageSquare },
    { id: 'hotels', label: 'Hotels Inventory', path: '/admin/hotels', icon: Building },
    { id: 'packages', label: 'Yatra Packages', path: '/admin/packages', icon: Compass },
    { id: 'cities', label: 'Cities & Hubs', path: '/admin/cities', icon: MapPin },
    { id: 'reviews', label: 'Traveller Stories', path: '/admin/reviews', icon: Quote },
  ];

  return (
    <div className="min-h-screen bg-[#071322] text-slate-100 flex flex-col md:flex-row">
      {/* 1. SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#0a192f] border-r border-slate-800/80 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-wide">
                TirthYatraTrails
              </h1>
              <span className="text-[10px] font-bold tracking-wider uppercase text-orange-400 bg-orange-900/30 px-1.5 py-0.5 rounded">
                Admin Operations
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#ea580c] text-white shadow-lg shadow-orange-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info & Actions */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="bg-[#0f233f] p-3 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{adminUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{adminUser.email}</p>
            </div>
            <span className="text-[9px] font-extrabold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-sm uppercase">
              {adminUser.role}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public View</span>
            </button>

            <button
              onClick={() => {
                logoutAdmin();
                navigate('/admin/login');
              }}
              title="Sign Out"
              className="p-2 bg-red-900/30 hover:bg-red-900/60 text-red-300 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen bg-[#071322]">
        {/* Top Operations Header */}
        <header className="h-16 bg-[#0a192f]/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-300">
              Live Operations Desk • All Systems Operational
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-2 text-slate-400 font-mono">
              <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-3.5 py-1.5 bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 border border-orange-500/30 rounded-full font-bold flex items-center gap-1.5 transition-colors"
            >
              <span>Customer Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 lg:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
