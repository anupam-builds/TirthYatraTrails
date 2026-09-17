import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useRouter } from '../../context/RouterContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { api, generateWhatsAppLink } from '../../services/api.js';
import { Inquiry, InquiryStatus, StaffMember } from '../../types.js';
import { LeadTableView } from '../../components/crm/LeadTableView.js';
import { LeadEditModal } from '../../components/crm/LeadEditModal.js';
import {
  getNotificationSettings,
  saveNotificationSettings,
  playNotificationTone,
  subscribeToNewInquiries,
  subscribeToInquiryUpdates,
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
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedInquiryForEdit, setSelectedInquiryForEdit] = useState<Inquiry | null>(null);
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

  // Staff members can view inquiries assigned explicitly OR matching name/ID fallback (case-insensitive trim check)
  const staffAssignedInquiries = useMemo(() => {
    if (!staffUser) return [];
    return inquiries.filter((inq) => {
      const matchId = Boolean(inq.assignedStaffId && inq.assignedStaffId === staffUser.id);
      const matchName = Boolean(
        inq.assignedStaffName &&
        staffUser.name &&
        inq.assignedStaffName.trim().toLowerCase() === staffUser.name.trim().toLowerCase()
      );
      // Fallback or explicit check: also allow unassigned if testing or map broader if needed, but strictly check assigned id/name
      return matchId || matchName;
    });
  }, [inquiries, staffUser]);

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

  // Subscribe to real-time leads and status updates
  useEffect(() => {
    loadInquiries();
    loadStaff();

    const unsubNew = subscribeToNewInquiries((newInquiry) => {
      setInquiries((prev) => [newInquiry, ...prev.filter((i) => i.id !== newInquiry.id)]);
      
      // Trigger sound if active
      if (notificationSettings.soundEnabled && !knownInquiryIdsRef.current.has(newInquiry.id)) {
        knownInquiryIdsRef.current.add(newInquiry.id);
        playNotificationTone(notificationSettings.selectedTone, notificationSettings.volume);
      }
    });

    const unsubUpdates = subscribeToInquiryUpdates(({ inquiry: updatedInquiry }) => {
      if (!updatedInquiry) return;
      setInquiries((prev) =>
        prev.map((item) => (item.id === updatedInquiry.id ? { ...item, ...updatedInquiry } : item))
      );
    });

    return () => {
      unsubNew();
      unsubUpdates();
    };
  }, []);

  async function loadStaff() {
    try {
      const list = await api.getStaffMembers();
      setStaffList(list);
    } catch (err) {
      console.error('Failed loading staff members:', err);
    }
  }

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

  // Handle staff status update
  const handleUpdateStatus = async (id: string, newStatus: InquiryStatus) => {
    if (!staffUser) return;
    const inquiry = inquiries.find((i) => i.id === id);
    if (inquiry && (inquiry.isLockedForStaff || inquiry.status === 'CLOSED')) {
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
      const updated = await api.updateInquiry(id, { status: newStatus }, true);
      setInquiries((prev) => prev.map((i) => (i.id === id ? updated : i)));
      if (selectedInquiryForEdit && selectedInquiryForEdit.id === id) {
        setSelectedInquiryForEdit(updated);
      }
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

  const handleAssignStaff = async (inquiryId: string, staffId: string) => {
    try {
      const selected = staffList.find((s) => s.id === staffId);
      const staffName = selected ? selected.name : '';
      const updated = await api.assignInquiryStaff(inquiryId, staffId, staffName);
      setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? updated : i)));
      if (selectedInquiryForEdit && selectedInquiryForEdit.id === inquiryId) {
        setSelectedInquiryForEdit(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed assigning staff');
    }
  };

  const handleSaveInquiryUpdates = async (id: string, updates: Partial<Inquiry>) => {
    try {
      const updated = await api.updateInquiry(id, updates, true);
      setInquiries((prev) => prev.map((i) => (i.id === id ? updated : i)));
      setSelectedInquiryForEdit(null);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update lead');
    }
  };

  // Handle staff status update (Restricted to NEW, CONTACTED, or CLOSED)
  const handleStaffStatusChange = async (inquiry: Inquiry, newStatus: 'NEW' | 'CONTACTED' | 'CLOSED') => {
    await handleUpdateStatus(inquiry.id, newStatus);
  };

  // Handle adding follow-up note
  const handleAddNote = async (inquiryId: string, noteText?: string) => {
    const text = (noteText || noteInputs[inquiryId] || '').trim();
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

  // Calculate metrics
  const myAssignedCount = staffAssignedInquiries.length;
  const myContactedCount = staffAssignedInquiries.filter((i) => i.status === 'CONTACTED').length;
  const myClosedCount = staffAssignedInquiries.filter((i) => i.status === 'CLOSED').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071322] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      {/* 1. TOP STAFF OPERATIONS HEADER */}
      <header className="h-16 bg-white/90 dark:bg-[#0a192f]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 dark:border-slate-700 p-0.5 aspect-square flex items-center justify-center shrink-0">
            <img
              src="https://i.postimg.cc/Sxqk00xZ/Tirth-Yatra-Trails-Logo.png"
              alt="TirthYatraTrails.in Logo"
              className="w-10 h-10 object-contain"
              referrerPolicy="no-referrer"
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
                {staffAssignedInquiries.length}
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
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-white dark:bg-[#0a192f] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 shrink-0 shadow-xs cursor-pointer disabled:opacity-40"
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

            {/* Comprehensive Lead Table & CRM Dashboard (Staff Mode: Explicitly Assigned Leads Only) */}
            <LeadTableView
              inquiries={staffAssignedInquiries}
              staffList={staffList}
              loading={loading}
              isAdmin={false}
              isStaffMode={true}
              currentStaffId={staffUser.id}
              currentStaffName={staffUser.name}
              onUpdateStatus={handleUpdateStatus}
              onAssignStaff={undefined}
              onEditInquiry={(inq) => setSelectedInquiryForEdit(inq)}
              onAddNote={handleAddNote}
            />

            {/* Detailed Lead Edit Modal */}
            <LeadEditModal
              inquiry={selectedInquiryForEdit}
              isOpen={Boolean(selectedInquiryForEdit)}
              onClose={() => setSelectedInquiryForEdit(null)}
              onSave={handleSaveInquiryUpdates}
              staffList={staffList}
              isStaffMode={true}
              currentStaffName={staffUser.name}
              onAddNote={handleAddNote}
            />
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