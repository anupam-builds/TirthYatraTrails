import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useRouter } from '../../context/RouterContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { api, generateWhatsAppLink } from '../../services/api.js';
import { Inquiry, StaffMember } from '../../types.js';
import {
  getNotificationSettings,
  saveNotificationSettings,
  playNotificationTone,
  subscribeToNewInquiries,
  NotificationSettings,
  NotificationTone,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../../services/soundNotification.js';
import { StaffLoginPage } from './StaffLoginPage.js';
import {
  Users,
  MessageSquare,
  Search,
  Phone,
  Mail,
  Calendar,
  MessageCircle,
  Clock,
  Filter,
  MapPin,
  Lock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Shield,
  ShieldCheck,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
  Plus,
  Bell,
  Sparkles,
  Info,
  Ban,
  Sliders,
  Play,
  RotateCcw,
  Check,
  Settings,
} from 'lucide-react';

export const StaffPortalPage: React.FC = () => {
  const { staffUser, isStaffAuthenticated, isStaffLoading, logoutStaff } = useAuth();
  const { navigate } = useRouter();
  const { theme, isDark, setTheme, toggleTheme } = useTheme();

  const [activePortalTab, setActivePortalTab] = useState<'LEADS' | 'SETTINGS'>('LEADS');
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedFilter, setAssignedFilter] = useState<'MY' | 'UNASSIGNED' | 'ALL'>('MY');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Follow-up notes accordion & input state
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [submittingNote, setSubmittingNote] = useState<Record<string, boolean>>({});

  // Blocked account alert modal
  const [blockedAlertMessage, setBlockedAlertMessage] = useState<string | null>(null);

  // Audio Notification Settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(getNotificationSettings());
  const knownInquiryIdsRef = useRef<Set<string>>(new Set());

  const toneOptions: { id: NotificationTone; name: string; desc: string; icon: string }[] = [
    {
      id: 'classic_chime',
      name: 'Classic Chime',
      desc: 'Ascending 4-note harmonic major chime. Crisp, clean, and executive.',
      icon: '🎵',
    },
    {
      id: 'soft_bell',
      name: 'Soft Bell',
      desc: 'Resonant bronze hospitality bell with gentle, warm acoustics.',
      icon: '🛎️',
    },
    {
      id: 'digital_beep',
      name: 'Digital Beep',
      desc: 'Modern dual-pulse electronic alert. High-tech and prompt.',
      icon: '⚡',
    },
    {
      id: 'temple_gong',
      name: 'Temple Shankh / Gong',
      desc: 'Sacred conch horn invocation & deep bronze gong resonance. Auspicious and resonant.',
      icon: '🐚',
    },
    {
      id: 'temple_ghanti',
      name: 'Temple Ghanti (Brass Bell)',
      desc: 'Bright, multi-harmonic metallic ringing tone mimicking traditional temple brass bells.',
      icon: '🔔',
    },
    {
      id: 'sacred_om',
      name: 'Sacred Om Resonance',
      desc: 'Deep 136.1Hz meditative cosmic drone with rich harmonic overtones & chanting vowel formants.',
      icon: '🕉️',
    },
  ];

  // Real-time session monitoring heartbeat
  useEffect(() => {
    if (!isStaffAuthenticated || !staffUser) return;

    const checkInterval = setInterval(async () => {
      try {
        const check = await api.checkStaffSession();
        if (!check?.ok || check.staff?.isBlocked || !check.staff?.isActive) {
          const reason = check?.staff?.blockedReason || 'Access revoked by Administrator';
          setBlockedAlertMessage(`Your staff access has been revoked: "${reason}". Session terminated.`);
          setTimeout(() => {
            logoutStaff();
            navigate('/staff/login');
          }, 3500);
        }
      } catch (err: any) {
        if (
          err.message &&
          (err.message.includes('Blocked') ||
            err.message.includes('revoked') ||
            err.message.includes('403') ||
            err.message.includes('revocation'))
        ) {
          setBlockedAlertMessage(err.message || 'Access Revoked: Account blocked by administrator.');
          setTimeout(() => {
            logoutStaff();
            navigate('/staff/login');
          }, 3500);
        }
      }
    }, 12000);

    return () => clearInterval(checkInterval);
  }, [isStaffAuthenticated, staffUser, logoutStaff, navigate]);

  // Subscribe to real-time leads
  useEffect(() => {
    loadInquiries();

    const unsub = subscribeToNewInquiries((newInquiry) => {
      setInquiries((prev) => [newInquiry, ...prev.filter((i) => i.id !== newInquiry.id)]);
      
      // Trigger sound if active
      if (notificationSettings.soundEnabled && !knownInquiryIdsRef.current.has(newInquiry.id)) {
        knownInquiryIdsRef.current.add(newInquiry.id);
        playNotificationTone(notificationSettings.selectedTone, notificationSettings.volume);
      }
    });

    return () => {
      unsub();
    };
  }, []);

  async function loadInquiries() {
    setLoading(true);
    try {
      const list = await api.getInquiries();
      setInquiries(list);
      list.forEach((i) => knownInquiryIdsRef.current.add(i.id));
    } catch (err: any) {
      if (err.message && (err.message.includes('Blocked') || err.message.includes('revoked'))) {
        setBlockedAlertMessage(err.message);
        setTimeout(() => {
          logoutStaff();
          navigate('/staff/login');
        }, 3000);
        return;
      }
      console.error('Failed to load inquiries for staff:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle staff status update (Restricted to CONTACTED or CLOSED)
  const handleStaffStatusChange = async (inquiry: Inquiry, newStatus: 'CONTACTED' | 'CLOSED') => {
    if (!staffUser) return;

    if (inquiry.isLockedForStaff || inquiry.status === 'CLOSED') {
      alert('This inquiry is CLOSED and locked for staff. Only an Administrator can reopen it.');
      return;
    }

    if (newStatus === 'CLOSED') {
      const confirmClose = window.confirm(
        'Warning: Marking this inquiry as CLOSED will permanently lock this lead for staff. Only an Admin can reopen it. Do you wish to proceed?'
      );
      if (!confirmClose) return;
    }

    try {
      const updated = await api.updateInquiryStatusByStaff(inquiry.id, newStatus, {
        id: staffUser.id,
        name: staffUser.name,
      });

      setInquiries((prev) => prev.map((i) => (i.id === inquiry.id ? updated : i)));
    } catch (err: any) {
      if (err.message && (err.message.includes('Blocked') || err.message.includes('revoked'))) {
        setBlockedAlertMessage(err.message);
        setTimeout(() => {
          logoutStaff();
          navigate('/staff/login');
        }, 3000);
        return;
      }
      alert(err.message || 'Failed to update status');
    }
  };

  // Handle adding follow-up note
  const handleAddNote = async (inquiryId: string) => {
    const text = (noteInputs[inquiryId] || '').trim();
    if (!text || !staffUser) return;

    setSubmittingNote((prev) => ({ ...prev, [inquiryId]: true }));
    try {
      const updated = await api.addInquiryNote(inquiryId, {
        authorName: staffUser.name,
        authorRole: 'STAFF',
        authorId: staffUser.id,
        text,
      });

      setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? updated : i)));
      setNoteInputs((prev) => ({ ...prev, [inquiryId]: '' }));
    } catch (err: any) {
      if (err.message && (err.message.includes('Blocked') || err.message.includes('revoked'))) {
        setBlockedAlertMessage(err.message);
        setTimeout(() => {
          logoutStaff();
          navigate('/staff/login');
        }, 3000);
        return;
      }
      alert(err.message || 'Failed to save note');
    } finally {
      setSubmittingNote((prev) => ({ ...prev, [inquiryId]: false }));
    }
  };

  const handleToggleSound = (enabled: boolean) => {
    const updated = saveNotificationSettings({ soundEnabled: enabled });
    setNotificationSettings(updated);
    if (enabled) {
      playNotificationTone(updated.selectedTone, updated.volume);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleToneChange = (tone: NotificationTone) => {
    const updated = saveNotificationSettings({ selectedTone: tone });
    setNotificationSettings(updated);
    playNotificationTone(tone, updated.volume);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleVolumeChange = (vol: number) => {
    const updated = saveNotificationSettings({ volume: vol });
    setNotificationSettings(updated);
  };

  const handleTestSound = (toneToTest?: NotificationTone) => {
    setIsPlayingTest(true);
    const tone = toneToTest || notificationSettings.selectedTone;
    playNotificationTone(tone, notificationSettings.volume);
    setTimeout(() => {
      setIsPlayingTest(false);
    }, 2200);
  };

  const handleResetSettings = () => {
    const defaults = saveNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    setNotificationSettings(defaults);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const toggleSound = () => {
    handleToggleSound(!notificationSettings.soundEnabled);
  };

  // If loading session
  if (isStaffLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#071322] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading Staff Portal...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, render Staff Login Page
  if (!isStaffAuthenticated || !staffUser) {
    return <StaffLoginPage />;
  }

  // Filter inquiries
  const filteredInquiries = inquiries.filter((inq) => {
    // Assigned filter
    if (assignedFilter === 'MY') {
      const isMyLead = inq.assignedStaffId === staffUser.id || inq.assignedStaffName === staffUser.name;
      if (!isMyLead) return false;
    } else if (assignedFilter === 'UNASSIGNED') {
      if (inq.assignedStaffId) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL' && inq.status !== statusFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = inq.customerName.toLowerCase().includes(q);
      const matchPhone = inq.customerPhone.toLowerCase().includes(q);
      const matchTitle = inq.title.toLowerCase().includes(q);
      const matchEmail = (inq.customerEmail || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchTitle && !matchEmail) return false;
    }

    return true;
  });

  // Calculate metrics
  const myAssignedCount = inquiries.filter(
    (i) => i.assignedStaffId === staffUser.id || i.assignedStaffName === staffUser.name
  ).length;
  const unassignedCount = inquiries.filter((i) => !i.assignedStaffId).length;
  const myContactedCount = inquiries.filter(
    (i) =>
      (i.assignedStaffId === staffUser.id || i.assignedStaffName === staffUser.name) &&
      i.status === 'CONTACTED'
  ).length;
  const myClosedCount = inquiries.filter(
    (i) =>
      (i.assignedStaffId === staffUser.id || i.assignedStaffName === staffUser.name) &&
      i.status === 'CLOSED'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071322] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      {/* 1. TOP STAFF OPERATIONS HEADER */}
      <header className="h-16 bg-white/90 dark:bg-[#0a192f]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 dark:border-slate-700 p-0.5 aspect-square flex items-center justify-center shrink-0">
            <img
              src="/logo.svg"
              alt="TirthYatraTrails.in Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-slate-900 dark:text-white font-serif tracking-tight">
                TirthYatraTrails
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800">
                Staff Desk
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Pilgrim Operations &amp; Lead Management Portal
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Sound Alert Toggle */}
          <button
            onClick={toggleSound}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              notificationSettings.soundEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
            title={notificationSettings.soundEnabled ? 'Temple Chime Alerts Active' : 'Chime Alerts Muted'}
          >
            {notificationSettings.soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Chimes ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Muted</span>
              </>
            )}
          </button>

          {/* Settings & Alerts Quick Switch */}
          <button
            id="staff-header-settings-btn"
            onClick={() => setActivePortalTab(activePortalTab === 'SETTINGS' ? 'LEADS' : 'SETTINGS')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activePortalTab === 'SETTINGS'
                ? 'bg-orange-600 text-white border-orange-700 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
            title="Personal Settings & Alerts"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings &amp; Alerts</span>
          </button>

          {/* Staff Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-orange-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {staffUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{staffUser.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{staffUser.designation}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              logoutStaff();
              navigate('/staff/login');
            }}
            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-300 rounded-xl transition-colors border border-red-200 dark:border-transparent cursor-pointer"
            title="Sign out of Staff Portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN STAFF WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs: Leads vs Settings & Alerts */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              id="staff-tab-leads-btn"
              onClick={() => setActivePortalTab('LEADS')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activePortalTab === 'LEADS'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-white dark:bg-[#0a192f] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Pilgrim Inquiries &amp; Leads</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activePortalTab === 'LEADS'
                    ? 'bg-orange-700/80 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {inquiries.length}
              </span>
            </button>

            <button
              id="staff-tab-settings-btn"
              onClick={() => setActivePortalTab('SETTINGS')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activePortalTab === 'SETTINGS'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-white dark:bg-[#0a192f] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Settings &amp; Alerts</span>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400">
                Theme / Chimes
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {activePortalTab === 'SETTINGS' ? (
              <button
                onClick={() => setActivePortalTab('LEADS')}
                className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                ← Return to Leads Workspace
              </button>
            ) : (
              <span className="text-[11px]">
                Desk Audio:{' '}
                <strong
                  className={
                    notificationSettings.soundEnabled
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500'
                  }
                >
                  {notificationSettings.soundEnabled ? 'Active' : 'Muted'}
                </strong>
              </span>
            )}
          </div>
        </div>

        {activePortalTab === 'SETTINGS' ? (
          /* ===================== DEDICATED SETTINGS & ALERTS PANEL ===================== */
          <div id="staff-settings-panel" className="space-y-8 max-w-4xl mx-auto pb-12 animate-in fade-in duration-150">
            {/* Header & Save Confirmation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 rounded-lg">
                    <Sliders className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Staff Desk Customization
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-serif">
                  Settings &amp; Alerts Panel
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Customize your visual display theme (Light &amp; Dark mode) and configure real-time audio chime alerts for incoming devotee requests.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="staff-reset-settings-btn"
                  onClick={handleResetSettings}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Reset theme and sound alerts to standard defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
                <button
                  id="staff-done-settings-btn"
                  onClick={() => setActivePortalTab('LEADS')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-colors cursor-pointer shadow-xs"
                >
                  Done &amp; Return
                </button>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-500/80 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200 shadow-md animate-in fade-in slide-in-from-top-2 duration-150">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs font-bold">
                  Preferences saved and synced to your browser session.
                </div>
              </div>
            )}

            {/* ================= SECTION 1: LIGHT & DARK THEME SWITCHER ================= */}
            <div className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-serif">
                      Display Theme Preference
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Switch between clean high-contrast Light mode and eye-safe Deep Slate Dark mode. Settings are persisted automatically with localStorage.
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                  Current: {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>

              {/* Theme Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Mode Option */}
                <div
                  id="staff-theme-light-card"
                  onClick={() => {
                    setTheme('light');
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 2000);
                  }}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                    !isDark
                      ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-950/20 shadow-sm ring-2 ring-orange-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                        <Sun className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">Light Mode</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Clean, daytime high-contrast presentation</p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        !isDark
                          ? 'border-orange-600 bg-orange-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {!isDark && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Visual Preview Box */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1.5 pointer-events-none">
                    <div className="flex items-center justify-between">
                      <div className="h-2 w-16 bg-orange-500 rounded-full" />
                      <div className="h-2 w-8 bg-slate-200 rounded-full" />
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full" />
                    <div className="h-2 w-3/4 bg-slate-100 rounded-full" />
                  </div>
                </div>

                {/* Dark Mode Option */}
                <div
                  id="staff-theme-dark-card"
                  onClick={() => {
                    setTheme('dark');
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 2000);
                  }}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                    isDark
                      ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-950/20 shadow-sm ring-2 ring-orange-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Moon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">Dark Mode</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Deep Slate, eye-safe for evening operations</p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isDark
                          ? 'border-orange-600 bg-orange-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isDark && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Visual Preview Box */}
                  <div className="p-3 bg-[#071322] border border-slate-800 rounded-xl shadow-xs space-y-1.5 pointer-events-none">
                    <div className="flex items-center justify-between">
                      <div className="h-2 w-16 bg-orange-500 rounded-full" />
                      <div className="h-2 w-8 bg-slate-800 rounded-full" />
                    </div>
                    <div className="h-2 w-full bg-slate-800/80 rounded-full" />
                    <div className="h-2 w-3/4 bg-slate-800/80 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* ================= SECTION 2: NOTIFICATION SOUND PREFERENCES ================= */}
            <div className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      <Bell className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-serif">
                      Devotee Inquiry Sound Alerts
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Play acoustic chime alerts whenever new pilgrim inquiries, darshan bookings, or travel packages are requested.
                  </p>
                </div>

                {/* Master Toggle */}
                <button
                  id="staff-toggle-sound-master"
                  onClick={() => handleToggleSound(!notificationSettings.soundEnabled)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 border ${
                    notificationSettings.soundEnabled
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {notificationSettings.soundEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      <span>Sound Alerts: ACTIVE</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Sound Alerts: MUTED</span>
                    </>
                  )}
                </button>
              </div>

              {/* Volume Control & Test Sound Preview Button */}
              <div className="bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Alert Volume Level</span>
                    </span>
                    <span className="font-mono text-xs font-extrabold text-orange-600 dark:text-orange-400">
                      {Math.round(notificationSettings.volume * 100)}%
                    </span>
                  </div>
                  <input
                    id="staff-volume-slider"
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={notificationSettings.volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    disabled={!notificationSettings.soundEnabled}
                    className="w-full accent-orange-500 cursor-pointer disabled:opacity-40"
                  />
                </div>

                {/* Test Sound Button */}
                <button
                  id="staff-test-sound-btn"
                  onClick={() => handleTestSound()}
                  disabled={!notificationSettings.soundEnabled || isPlayingTest}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-[#0a192f] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 shrink-0 shadow-xs cursor-pointer disabled:opacity-40"
                  title="Synthesize and preview selected tone"
                >
                  {isPlayingTest ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-orange-600 dark:text-orange-400 font-bold">Playing Tone...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                      <span>Test Sound Preview</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tone Selection Grid (All 6 options) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Select Notification Tone
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Click any tone to preview &amp; select
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {toneOptions.map((tone) => {
                    const isSelected = notificationSettings.selectedTone === tone.id;
                    return (
                      <div
                        key={tone.id}
                        id={`staff-tone-${tone.id}`}
                        onClick={() => handleToneChange(tone.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-xs ring-1 ring-orange-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30'
                        } ${!notificationSettings.soundEnabled ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl shrink-0 mt-0.5">{tone.icon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900 dark:text-white text-xs">
                                  {tone.name}
                                </p>
                                {isSelected && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-orange-600 text-white">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                {tone.desc}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'border-orange-600 bg-orange-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Individual Tone Preview Button */}
                        <div className="flex items-center justify-end pt-1 border-t border-slate-100 dark:border-slate-800/60">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToneChange(tone.id);
                              handleTestSound(tone.id);
                            }}
                            disabled={!notificationSettings.soundEnabled}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors disabled:opacity-40"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Preview Tone</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ===================== EXISTING LEADS WORKSPACE ===================== */
          <>
            {/* Welcome & Workflow Rules Banner */}
            <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 dark:border-orange-500/30 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white font-serif">
                  Namaste, {staffUser.name} 🙏
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Welcome to the Pilgrim Care &amp; Yatra Desk. Review devotee requests, update status to{' '}
                  <span className="font-bold text-blue-600 dark:text-blue-400">CONTACTED</span> or{' '}
                  <span className="font-bold text-slate-700 dark:text-slate-300">CLOSED</span>, and log follow-up notes.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs bg-white dark:bg-[#0a192f] border border-orange-500/30 px-3.5 py-2 rounded-2xl shadow-xs shrink-0">
                <Lock className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">Workflow Rule:</strong> Closed leads lock permanently for staff. Only Admins can reopen.
                </span>
              </div>
            </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assigned To Me
            </p>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
              {myAssignedCount}
            </p>
          </div>

          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Unassigned Leads
            </p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {unassignedCount}
            </p>
          </div>

          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              My Contacted Leads
            </p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {myContactedCount}
            </p>
          </div>

          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              My Closed Leads
            </p>
            <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
              {myClosedCount}
            </p>
          </div>
        </div>

        {/* Lead Assignment Tabs & Filters */}
        <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
          {/* Assignment Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#081220] p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setAssignedFilter('MY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                assignedFilter === 'MY'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Assigned Leads ({myAssignedCount})
            </button>

            <button
              onClick={() => setAssignedFilter('UNASSIGNED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                assignedFilter === 'UNASSIGNED'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Unassigned / New ({unassignedCount})
            </button>

            <button
              onClick={() => setAssignedFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                assignedFilter === 'ALL'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Travel Leads ({inquiries.length})
            </button>
          </div>

          {/* Status filter chips & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              {['ALL', 'NEW', 'CONTACTED', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                      : 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search pilgrim name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 w-56 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Inquiries Feed (matching admin lead card format) */}
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-slate-200 dark:bg-slate-800/50 rounded-3xl" />
            ))}
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-12 rounded-3xl text-center space-y-3 shadow-xs">
            <MessageSquare className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No inquiries found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchQuery
                ? 'Try clearing your search query.'
                : assignedFilter === 'MY'
                ? 'You do not have any inquiries assigned yet. Switch to "Unassigned / New" or "All Travel Leads".'
                : 'All pilgrim inquiries have been addressed.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInquiries.map((inq) => {
              const waLink = generateWhatsAppLink({
                title: inq.title,
                type: inq.type,
                name: inq.customerName,
                checkIn: inq.checkInDate,
                adults: inq.adults,
                children: inq.children,
                plan: inq.selectedPlan,
                notes: inq.specialRequests,
              });

              const isLocked = inq.isLockedForStaff || inq.status === 'CLOSED';
              const isNotesOpen = expandedNotes[inq.id] || false;
              const notesCount = inq.followUpNotes?.length || 0;

              return (
                <div
                  key={inq.id}
                  className={`bg-white dark:bg-[#0d1d33] border rounded-3xl p-5 transition-all shadow-xs space-y-4 ${
                    isLocked
                      ? 'border-slate-300 dark:border-slate-700/80 bg-slate-50/50 dark:bg-[#0a172a]'
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {/* Top row: Date, Status Badges & Assigned Staff */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          inq.status === 'NEW'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                            : inq.status === 'CONTACTED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                            : inq.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {inq.status}
                      </span>

                      {/* Locked for staff indicator */}
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800">
                          <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                          <span>Closed &amp; Locked for Staff</span>
                        </span>
                      )}

                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Received: {new Date(inq.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Assigned staff tag */}
                    <div className="text-[11px] flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <span>Assigned Staff:</span>
                      {inq.assignedStaffName ? (
                        <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-2 py-0.5 rounded-md">
                          {inq.assignedStaffName}
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-400 dark:text-slate-500 italic">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle row: Pilgrim Details & Inquiry Details */}
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    {/* Left: Pilgrim and travel details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {inq.customerName}
                        </h3>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                          Inquiry For: {inq.title} ({inq.type})
                        </span>
                      </div>

                      {/* Contacts & Dates */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <a
                            href={`tel:${inq.customerPhone}`}
                            className="font-mono text-slate-900 dark:text-white font-bold hover:underline"
                          >
                            {inq.customerPhone}
                          </a>
                        </div>

                        {inq.customerEmail && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <a
                              href={`mailto:${inq.customerEmail}`}
                              className="text-slate-600 dark:text-slate-300 hover:underline"
                            >
                              {inq.customerEmail}
                            </a>
                          </div>
                        )}

                        {inq.checkInDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            <span>Yatra Date: {inq.checkInDate}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {inq.adults || inq.guests || 2} Adults
                            {inq.children ? `, ${inq.children} Children` : ''}
                          </span>
                        </div>
                      </div>

                      {inq.selectedPlan && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="text-slate-600 dark:text-slate-400 font-bold">Selected Plan:</span>{' '}
                          {inq.selectedPlan}
                        </div>
                      )}

                      {(inq.pickupLocation || inq.dropoffLocation) && (
                        <div className="flex flex-wrap items-center gap-3 py-1 px-3 bg-slate-50 dark:bg-[#081220] rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                          {inq.pickupLocation && (
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Pickup:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{inq.pickupLocation}</span>
                            </div>
                          )}
                          {inq.pickupLocation && inq.dropoffLocation && (
                            <span className="text-slate-400 dark:text-slate-600">→</span>
                          )}
                          {inq.dropoffLocation && (
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Drop-off:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{inq.dropoffLocation}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {inq.specialRequests && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-orange-600 dark:text-orange-400">Special Notes:</span>{' '}
                          {inq.specialRequests}
                        </div>
                      )}
                    </div>

                    {/* Right: Staff Status Dropdown & WhatsApp Action */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      {/* RESTRICTED STATUS WORKFLOW RULES */}
                      {isLocked ? (
                        <div
                          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 cursor-not-allowed"
                          title="Closed & Locked for Staff. Only an Admin can reopen this inquiry."
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold">Status: CLOSED (Locked)</span>
                        </div>
                      ) : (
                        <select
                          value={inq.status === 'CLOSED' ? 'CLOSED' : 'CONTACTED'}
                          onChange={(e) => handleStaffStatusChange(inq, e.target.value as 'CONTACTED' | 'CLOSED')}
                          className="bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                        >
                          <option value="CONTACTED">Mark as: CONTACTED</option>
                          <option value="CLOSED">Mark as: CLOSED (Lock Lead)</option>
                        </select>
                      )}

                      {/* QUICK WHATSAPP BUTTON with pre-filled greeting */}
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                        title="Chat with devotee on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp Devotee</span>
                      </a>
                    </div>
                  </div>

                  {/* Follow-up Notes Toggle & Thread */}
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <button
                      onClick={() =>
                        setExpandedNotes((prev) => ({ ...prev, [inq.id]: !prev[inq.id] }))
                      }
                      className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                      <span>Follow-up Notes &amp; Action History ({notesCount})</span>
                      {isNotesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isNotesOpen && (
                      <div className="mt-3 space-y-3 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl animate-in fade-in duration-150">
                        {/* Note history */}
                        {inq.followUpNotes && inq.followUpNotes.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {inq.followUpNotes.map((note) => (
                              <div
                                key={note.id}
                                className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/60 p-2.5 rounded-xl text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {note.authorName}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                        note.authorRole === 'ADMIN'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                      }`}
                                    >
                                      {note.authorRole}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(note.createdAt).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                  {note.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No notes recorded yet. Add the first follow-up note below.</p>
                        )}

                        {/* Add Note Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Add follow-up update (e.g., 'Called customer, sending package itinerary on WhatsApp')..."
                            value={noteInputs[inq.id] || ''}
                            onChange={(e) =>
                              setNoteInputs((prev) => ({ ...prev, [inq.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddNote(inq.id);
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-white dark:bg-[#0d1d33] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <button
                            onClick={() => handleAddNote(inq.id)}
                            disabled={submittingNote[inq.id] || !(noteInputs[inq.id] || '').trim()}
                            className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Post</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </main>

      {/* Blocked / Access Revoked Full-Screen Dialog */}
      {blockedAlertMessage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a192f] border-2 border-red-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Ban className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white font-serif">
                Access Revoked / Account Blocked
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {blockedAlertMessage}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                Your credentials have been suspended by an administrator. You are being redirected to the staff login portal.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  logoutStaff();
                  navigate('/staff/login');
                }}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 cursor-pointer"
              >
                Acknowledge &amp; Return to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
