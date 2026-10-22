import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../../context/RouterContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { api } from '../../services/api.js';
import { supabase } from '../../lib/supabase.js';
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
  KeyRound,
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
  Menu,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  ArrowRight,
  Sun,
  Moon,
  AlertTriangle,
} from 'lucide-react';

import { AdminLoginPage } from './AdminLoginPage.js';
import { useAdminPresence } from '../../hooks/useAdminPresence.js';
import { ADMIN_ROUTES } from '../../constants/routes.js';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'hotels' | 'packages' | 'inquiries' | 'staff' | 'access' | 'admins' | 'cities' | 'users' | 'reviews' | 'settings';
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab }) => {
  const { navigate } = useRouter();
  const { adminUser, logoutAdmin, isAdminAuthenticated, isAdminLoading } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  // Collapsible / Hover Expansion state for Slim Navigation Rail
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_sidebar_pinned') === 'true';
    }
    return false;
  });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const isExpanded = isPinned || isHovered;

  const handleTogglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_sidebar_pinned', String(next));
      }
      return next;
    });
  };

  // Safety Confirmation Dialog for Logout
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    if (!showLogoutModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoggingOut) {
        setShowLogoutModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutModal, isLoggingOut]);

  // Execute confirmed logout
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut().catch(() => {});
    } finally {
      logoutAdmin();
      setIsLoggingOut(false);
      setShowLogoutModal(false);
      navigate(ADMIN_ROUTES.login);
    }
  };

  // Route change / mount re-verification of admin privileges
  useEffect(() => {
    if (!isAdminLoading && adminUser) {
      api.verifyAdminSession(adminUser).then((isValid) => {
        if (!isValid) {
          console.warn('[AdminLayout] Security Guard: Unauthorized admin access. Revoking session.');
          logoutAdmin();
          navigate(ADMIN_ROUTES.login);
        }
      }).catch(() => {});
    }
  }, [activeTab, adminUser, isAdminLoading, logoutAdmin, navigate]);

  // Sync admin presence on Supabase Realtime channel 'online-admins'
  useAdminPresence();
  
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
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', path: ADMIN_ROUTES.dashboard, icon: LayoutDashboard },
    { id: 'inquiries', label: 'Travel Desk Leads', shortLabel: 'Leads', path: ADMIN_ROUTES.inquiries, icon: MessageSquare },
    { id: 'hotels', label: 'Hotels Inventory', shortLabel: 'Hotels', path: ADMIN_ROUTES.hotels, icon: Building },
    { id: 'packages', label: 'Yatra Packages', shortLabel: 'Packages', path: ADMIN_ROUTES.packages, icon: Compass },
    { id: 'cities', label: 'Cities & Hubs', shortLabel: 'Cities', path: ADMIN_ROUTES.cities, icon: MapPin },
    { id: 'reviews', label: 'Traveller Stories', shortLabel: 'Stories', path: ADMIN_ROUTES.reviews, icon: Quote },
    { id: 'staff', label: 'Staff Directory', shortLabel: 'Staff', path: ADMIN_ROUTES.staff, icon: Users },
    { id: 'admins', label: 'Admin Access', shortLabel: 'Admins', path: ADMIN_ROUTES.admins, icon: ShieldCheck },
    { id: 'settings', label: 'Settings & Alerts', shortLabel: 'Settings', path: ADMIN_ROUTES.settings, icon: Settings },
  ];

  return (
    <div className={`min-h-screen ${theme} bg-slate-50 dark:bg-[#071322] text-slate-900 dark:text-slate-100 transition-colors duration-150`}>
      {/* 1. DESKTOP SLIM ICON RAIL & COLLAPSIBLE SIDEBAR (>= md) */}
      <aside
        onMouseEnter={() => !isPinned && setIsHovered(true)}
        onMouseLeave={() => !isPinned && setIsHovered(false)}
        className={`hidden md:flex fixed top-0 bottom-0 left-0 z-40 bg-white dark:bg-[#0a192f] border-r border-slate-200 dark:border-slate-800/80 flex-col justify-between transition-all duration-200 ease-in-out ${
          isExpanded ? 'w-64 shadow-2xl' : 'w-20 shadow-xs'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Top Brand Header */}
          <div className={`shrink-0 border-b border-slate-200 dark:border-slate-800 transition-all ${
            isExpanded ? 'p-4' : 'py-4 px-2'
          }`}>
            {isExpanded ? (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate(ADMIN_ROUTES.dashboard)}
                  className="flex items-center gap-3 text-left min-w-0 flex-1 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-slate-200 dark:border-slate-700/80 p-1 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <img
                      src="https://i.postimg.cc/Sxqk00xZ/Tirth-Yatra-Trails-Logo.png"
                      alt="TirthYatraTrails Logo"
                      className="w-8 h-8 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                      TirthYatraTrails
                    </h1>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-orange-600 dark:text-orange-400">
                      Admin Operations
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleTogglePin}
                  title={isPinned ? 'Unpin sidebar (auto-collapse to slim rail)' : 'Pin sidebar expanded'}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                >
                  {isPinned ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => navigate(ADMIN_ROUTES.dashboard)}
                  title="TirthYatraTrails Admin Dashboard"
                  aria-label="TirthYatraTrails Admin Dashboard"
                  className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-slate-200 dark:border-slate-700/80 p-1 flex items-center justify-center hover:scale-105 hover:border-orange-500/60 transition-all cursor-pointer group"
                >
                  <img
                    src="https://i.postimg.cc/Sxqk00xZ/Tirth-Yatra-Trails-Logo.png"
                    alt="TirthYatraTrails Logo"
                    className="w-9 h-9 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </button>
              </div>
            )}
          </div>

          {/* Navigation Items (Scrollable if viewport height constrained) */}
          <nav className={`flex-1 overflow-y-auto no-scrollbar py-3 transition-all ${
            isExpanded ? 'px-3 space-y-1.5' : 'px-2 space-y-1'
          }`}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'admins' && (activeTab as string) === 'access');

              return (
                <div key={item.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`w-full transition-all cursor-pointer ${
                      isExpanded
                        ? `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold ${
                            isActive
                              ? 'bg-[#ea580c] text-white shadow-lg shadow-orange-600/30'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
                          }`
                        : `flex flex-col items-center justify-center py-2 px-1 rounded-2xl text-[10px] font-bold tracking-tight ${
                            isActive
                              ? 'bg-[#ea580c] text-white shadow-md shadow-orange-600/30'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          }`
                    }`}
                  >
                    <Icon className={`${isExpanded ? 'w-4 h-4' : 'w-5 h-5'} shrink-0 ${!isExpanded ? 'mb-1' : ''}`} />
                    {isExpanded ? (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    ) : (
                      <span className="truncate max-w-[64px] text-center leading-tight">
                        {item.shortLabel}
                      </span>
                    )}
                  </button>

                  {/* Floating tooltip on hover (Rail Mode) */}
                  {!isExpanded && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 hidden md:block border border-slate-800">
                      <p className="font-bold">{item.label}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Profile & Footer */}
        <div className={`shrink-0 border-t border-slate-200 dark:border-slate-800 transition-all ${
          isExpanded ? 'p-3.5 space-y-3' : 'py-3 px-2 flex flex-col items-center gap-2'
        }`}>
          {isExpanded ? (
            <>
              {/* Expanded User Profile Card */}
              <div className="bg-slate-50 dark:bg-[#0f233f] p-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-bold flex items-center justify-center text-xs shrink-0">
                    {adminUser.name ? adminUser.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{adminUser.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">{adminUser.email}</p>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded uppercase shrink-0">
                  {adminUser.role}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-transparent cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Website</span>
                </button>

                <button
                  type="button"
                  id="admin-sidebar-logout-btn"
                  onClick={() => setShowLogoutModal(true)}
                  title="Logout"
                  className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 rounded-xl transition-colors border border-red-200 dark:border-red-900/50 flex items-center justify-center gap-1.5 cursor-pointer font-bold text-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>

              {/* Collapse to rail button */}
              <button
                type="button"
                onClick={handleTogglePin}
                className="w-full py-1.5 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Collapse to Slim Rail</span>
              </button>
            </>
          ) : (
            <>
              {/* Slim Rail Profile Icon */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => navigate(ADMIN_ROUTES.admins)}
                  className="w-10 h-10 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-bold flex items-center justify-center text-xs transition-colors cursor-pointer"
                  aria-label={`Admin Profile: ${adminUser.name}`}
                >
                  {adminUser.name ? adminUser.name.charAt(0).toUpperCase() : 'A'}
                </button>
                <div className="absolute left-full bottom-0 ml-2.5 p-2.5 bg-slate-900 text-white text-xs rounded-xl shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 hidden md:block border border-slate-800">
                  <p className="font-bold">{adminUser.name}</p>
                  <p className="text-[10px] text-slate-300 font-mono">{adminUser.email}</p>
                  <span className="inline-block mt-1 text-[9px] font-extrabold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded uppercase">
                    {adminUser.role}
                  </span>
                </div>
              </div>

              {/* Public Website Icon */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Customer Website"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 hidden md:block border border-slate-800">
                  Customer Website
                </div>
              </div>

              {/* Logout Icon */}
              <div className="relative group">
                <button
                  type="button"
                  id="admin-sidebar-logout-btn"
                  onClick={() => setShowLogoutModal(true)}
                  className="w-10 h-10 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 bg-red-950 text-red-100 border border-red-800 text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 hidden md:block">
                  Log Out
                </div>
              </div>

              {/* Expand Rail Icon */}
              <div className="relative group pt-1">
                <button
                  type="button"
                  onClick={handleTogglePin}
                  className="w-10 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Expand Sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 hidden md:block border border-slate-800">
                  Expand Navigation
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* 2. MOBILE TOP NAVIGATION & SLIDE DRAWER (< md) */}
      <div className="md:hidden sticky top-0 z-40 bg-white dark:bg-[#0a192f] border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={() => navigate(ADMIN_ROUTES.dashboard)}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-white shadow-xs border border-slate-200 dark:border-slate-700 p-0.5 flex items-center justify-center">
            <img
              src="https://i.postimg.cc/Sxqk00xZ/Tirth-Yatra-Trails-Logo.png"
              alt="TirthYatraTrails"
              className="w-7 h-7 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">TirthYatraTrails</h1>
            <span className="text-[9px] font-bold uppercase text-orange-600 dark:text-orange-400">Admin Operations</span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0a192f] border-t border-slate-200 dark:border-slate-800 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Navigation Menu</span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-4 space-y-1 overflow-y-auto flex-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id || (item.id === 'admins' && (activeTab as string) === 'access');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate(item.path);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#ea580c] text-white shadow-md shadow-orange-600/30'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="truncate min-w-0 pr-3">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{adminUser.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">{adminUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowLogoutModal(true);
                }}
                className="px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT AREA */}
      <main className={`flex-1 min-w-0 flex flex-col min-h-screen bg-slate-50 dark:bg-[#071322] transition-all duration-200 ease-in-out ${
        isPinned ? 'md:ml-64' : 'md:ml-20'
      }`}>
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
                onClick={() => navigate(ADMIN_ROUTES.settings)}
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

            <button
              id="admin-header-logout-btn"
              onClick={() => setShowLogoutModal(true)}
              className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60 dark:border-red-800/60 rounded-full font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              title="Logout of Admin Panel"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
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
                      navigate(ADMIN_ROUTES.inquiries);
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

      {/* SAFETY LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isLoggingOut && setShowLogoutModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#0c1e36] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-900 dark:text-slate-100 relative animate-in zoom-in-95 duration-150"
          >
            {/* Close modal X button */}
            <button
              onClick={() => !isLoggingOut && setShowLogoutModal(false)}
              disabled={isLoggingOut}
              aria-label="Close dialog"
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with warning icon badge */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900/50 inline-block mb-1">
                  Security Confirmation
                </span>
                <h3 id="logout-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  Are you sure you want to log out?
                </h3>
              </div>
            </div>

            {/* Body */}
            <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed">
                You will be signed out of the active enterprise session. To regain access to the live operations desk and administrative controls, you will need to re-authenticate with your administrator credentials.
              </p>

              {/* Active Admin Identity Badge */}
              {adminUser && (
                <div className="p-3 bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center shrink-0 text-xs">
                    {adminUser.name ? adminUser.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white truncate text-xs">
                      {adminUser.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                      {adminUser.email}
                    </p>
                  </div>
                  <span className="text-[9px] font-extrabold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-sm uppercase shrink-0">
                    {adminUser.role}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons: Cancel and Yes, Log Out */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                id="btn-cancel-logout"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-admin-logout"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoggingOut ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing Out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Yes, Log Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
