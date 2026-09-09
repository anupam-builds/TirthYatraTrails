import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../../context/RouterContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { api } from '../../services/api.js';
import { Inquiry } from '../../types.js';
import {
  getNotificationSettings,
  saveNotificationSettings,
  playNotificationTone,
  subscribeToNewInquiries,
  NotificationSettings,
} from '../../services/soundNotification.js';
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
  Settings,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';

import { AdminLoginPage } from './AdminLoginPage.js';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'hotels' | 'packages' | 'inquiries' | 'staff' | 'cities' | 'users' | 'reviews' | 'settings';
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab }) => {
  const { navigate } = useRouter();
  const { adminUser, logoutAdmin, isAdminAuthenticated, isAdminLoading } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  
  // Real-time Sound & Alert state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [activeAlert, setActiveAlert] = useState<{ inquiry: Inquiry; timestamp: number } | null>(null);
  const knownInquiryIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  // Sync settings when modified anywhere in the window
  useEffect(() => {
    const handleSettingsChanged = (e: Event) => {
      const custom = e as CustomEvent<NotificationSettings>;
      if (custom.detail) {
        setNotificationSettings(custom.detail);
      }
    };
    window.addEventListener('tirthyatra_notification_settings_changed', handleSettingsChanged);
    return () => {
      window.removeEventListener('tirthyatra_notification_settings_changed', handleSettingsChanged);
    };
  }, []);

  // Handle triggering sound and showing toast
  const triggerInquiryAlert = (inquiry: Inquiry, timestamp: number = Date.now()) => {
    if (!inquiry || !inquiry.id) return;
    if (knownInquiryIdsRef.current.has(inquiry.id)) return;
    
    knownInquiryIdsRef.current.add(inquiry.id);

    // Read fresh settings from storage
    const currentSettings = getNotificationSettings();
    if (currentSettings.soundEnabled) {
      playNotificationTone(currentSettings.selectedTone, currentSettings.volume);
    }

    setActiveAlert({ inquiry, timestamp });

    // Auto dismiss toast after duration
    const dismissTimer = setTimeout(() => {
      setActiveAlert((prev) => (prev?.inquiry.id === inquiry.id ? null : prev));
    }, (currentSettings.autoDismissSeconds || 8) * 1000);

    return () => clearTimeout(dismissTimer);
  };

  // 1. Subscribe to instant event broadcast (same tab & cross-tab BroadcastChannel / storage)
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const unsubscribe = subscribeToNewInquiries((inquiry, timestamp) => {
      triggerInquiryAlert(inquiry, timestamp);
    });

    return () => {
      unsubscribe();
    };
  }, [isAdminAuthenticated]);

  // 2. Initial load of existing inquiries + periodic polling (6s) for cross-device / server updates
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    let isMounted = true;

    async function checkInquiries() {
      try {
        const list = await api.getInquiries();
        if (!isMounted) return;

        if (isInitialLoadRef.current) {
          // On first render, seed known IDs so past inquiries don't trigger sound on page reload
          list.forEach((inq) => knownInquiryIdsRef.current.add(inq.id));
          isInitialLoadRef.current = false;
        } else {
          // Find any inquiry not yet known
          for (const inq of list) {
            if (!knownInquiryIdsRef.current.has(inq.id)) {
              triggerInquiryAlert(inq);
              break; // Trigger alert for newest
            }
          }
        }
      } catch (err) {
        // Silent catch for network/poll
      }
    }

    checkInquiries();
    const pollInterval = setInterval(checkInquiries, 6000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isAdminAuthenticated]);

  const toggleSoundQuick = () => {
    const updated = saveNotificationSettings({ soundEnabled: !notificationSettings.soundEnabled });
    setNotificationSettings(updated);
    if (updated.soundEnabled) {
      playNotificationTone(updated.selectedTone, updated.volume);
    }
  };

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#071322] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verifying Admin Session...</p>
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
    { id: 'staff', label: 'Staff & Access', path: '/admin/staff', icon: Users },
    { id: 'hotels', label: 'Hotels Inventory', path: '/admin/hotels', icon: Building },
    { id: 'packages', label: 'Yatra Packages', path: '/admin/packages', icon: Compass },
    { id: 'cities', label: 'Cities & Hubs', path: '/admin/cities', icon: MapPin },
    { id: 'reviews', label: 'Traveller Stories', path: '/admin/reviews', icon: Quote },
    { id: 'settings', label: 'Settings & Alerts', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className={`min-h-screen ${theme} bg-slate-50 dark:bg-[#071322] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-150`}>
      {/* 1. SIDEBAR */}
      <aside className="w-full md:w-64 bg-white dark:bg-[#0a192f] border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between shrink-0 shadow-xs transition-colors duration-150">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-500 dark:text-orange-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wide">
                TirthYatraTrails
              </h1>
              <span className="text-[10px] font-bold tracking-wider uppercase text-orange-600 bg-orange-50 border border-orange-200 dark:border-none dark:text-orange-400 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">
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
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="bg-slate-50 dark:bg-[#0f233f] p-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between shadow-xs">
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{adminUser.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{adminUser.email}</p>
            </div>
            <span className="text-[9px] font-extrabold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-sm uppercase">
              {adminUser.role}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-transparent"
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
              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/60 dark:text-red-300 rounded-xl transition-colors border border-red-200 dark:border-transparent"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen bg-slate-50 dark:bg-[#071322] transition-colors duration-150">
        {/* Top Operations Header */}
        <header className="h-16 bg-white/90 dark:bg-[#0a192f]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs transition-colors duration-150">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden sm:inline">
              Live Operations Desk • All Systems Operational
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 sm:hidden">
              Live Desk
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            {/* Prominent Light / Dark Mode Toggle Button */}
            <button
              id="admin-theme-toggle"
              onClick={toggleTheme}
              className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                isDark
                  ? 'bg-slate-800/90 border-slate-700 text-amber-300 hover:bg-slate-700 hover:text-amber-200'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Light and Dark Mode"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden md:inline">Dark Mode</span>
                </>
              )}
            </button>

            {/* Quick Sound Alert Toggle & Settings Link */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleSoundQuick}
                className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  notificationSettings.soundEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title={notificationSettings.soundEnabled ? 'Sound Alerts: Active (Click to mute)' : 'Sound Alerts: Muted (Click to unmute)'}
              >
                {notificationSettings.soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">Sound ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span className="hidden sm:inline">Muted</span>
                  </>
                )}
              </button>

              <button
                onClick={() => navigate('/admin/settings')}
                className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Notification & Tone Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>

            <button
              onClick={() => navigate('/')}
              className="px-3.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 dark:bg-orange-600/20 dark:text-orange-400 dark:hover:bg-orange-600/30 dark:border-orange-500/30 rounded-full font-bold flex items-center gap-1.5 transition-colors"
            >
              <span className="hidden sm:inline">Customer Website</span>
              <span className="sm:hidden">Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Real-time Floating Inquiry Alert Toast */}
        {activeAlert && (
          <div className="fixed top-20 right-6 z-50 max-w-md w-full bg-white dark:bg-[#0f294a] border-2 border-orange-500/80 rounded-2xl shadow-2xl p-4 text-slate-900 dark:text-white animate-in slide-in-from-top-4 fade-in duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="p-2.5 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl shrink-0">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-500/30">
                    New Booking Lead!
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Just now</span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                  {activeAlert.inquiry.customerName || activeAlert.inquiry.fullName || 'New Devotee'}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                  {activeAlert.inquiry.title || activeAlert.inquiry.referenceName || 'Yatra Booking Inquiry'}
                </p>

                {(activeAlert.inquiry.pickupLocation || activeAlert.inquiry.dropoffLocation) && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                    📍 {activeAlert.inquiry.pickupLocation || 'Origin'} → {activeAlert.inquiry.dropoffLocation || 'Destination'}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => {
                      setActiveAlert(null);
                      navigate('/admin/inquiries');
                    }}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <span>View Lead Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setActiveAlert(null)}
                    className="px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <button
                onClick={() => setActiveAlert(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 lg:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
