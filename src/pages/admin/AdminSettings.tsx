import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { useTheme } from '../../context/ThemeContext.js';
import {
  Bell,
  Volume2,
  VolumeX,
  Play,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  Phone,
  ShieldCheck,
  Radio,
  Sliders,
  Clock,
  Info,
  CheckCircle2,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import {
  getNotificationSettings,
  saveNotificationSettings,
  playNotificationTone,
  NotificationTone,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../../services/soundNotification.js';

export const AdminSettings: React.FC = () => {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState(getNotificationSettings());
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deskPhone, setDeskPhone] = useState('+91 98765 43210');
  const [agencyName, setAgencyName] = useState('TirthYatraTrails Central Operations Desk');
  const [refreshRate, setRefreshRate] = useState('6');

  useEffect(() => {
    // Load persisted agency settings if any
    const savedDesk = localStorage.getItem('tyt_agency_phone');
    if (savedDesk) setDeskPhone(savedDesk);
    const savedAgency = localStorage.getItem('tyt_agency_name');
    if (savedAgency) setAgencyName(savedAgency);
  }, []);

  const handleToggleSound = (enabled: boolean) => {
    const updated = saveNotificationSettings({ soundEnabled: enabled });
    setSettings(updated);
    if (enabled) {
      // Play brief test when turning on
      playNotificationTone(updated.selectedTone, updated.volume);
    }
  };

  const handleToneChange = (tone: NotificationTone) => {
    const updated = saveNotificationSettings({ selectedTone: tone });
    setSettings(updated);
    // Auto preview the newly selected tone
    playNotificationTone(tone, updated.volume);
  };

  const handleVolumeChange = (vol: number) => {
    const updated = saveNotificationSettings({ volume: vol });
    setSettings(updated);
  };

  const handleTestSound = () => {
    setIsPlayingTest(true);
    playNotificationTone(settings.selectedTone, settings.volume);
    setTimeout(() => {
      setIsPlayingTest(false);
    }, 2200);
  };

  const handleSaveAll = () => {
    saveNotificationSettings(settings);
    localStorage.setItem('tyt_agency_phone', deskPhone);
    localStorage.setItem('tyt_agency_name', agencyName);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    const defaults = saveNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    setSettings(defaults);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const toneOptions: { id: NotificationTone; name: string; desc: string; icon: string }[] = [
    {
      id: 'classic_chime',
      name: 'Classic Chime',
      desc: 'Ascending 4-note harmonic chime. Elegant, crisp, and executive.',
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
      desc: 'Sacred conch horn invocation & deep bronze gong resonance. Rich, bold, and auspicious.',
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

  return (
    <AdminLayout activeTab="settings">
      <div className="space-y-8 max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 rounded-lg">
                <Sliders className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                System Preferences
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-serif">
              Operations &amp; Display Settings
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure light/dark themes, audio notifications for incoming bookings, and travel desk contact parameters.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Preferences</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Save Confirmation Toast */}
        {saveSuccess && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Preferences Successfully Saved</p>
              <p className="text-emerald-700 dark:text-emerald-400/80 text-[11px]">
                Your appearance theme, notification sounds, and operations configuration are saved and persisted.
              </p>
            </div>
          </div>
        )}

        {/* 1. THEME & DISPLAY APPEARANCE SECTION */}
        <section className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs transition-colors">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-orange-500 dark:text-amber-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Admin Interface Appearance
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select your preferred visual theme for the Travel Desk Admin Panel. Automatically persisted in local storage.
              </p>
            </div>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Current: {isDark ? 'Dark Ops Mode' : 'Light Mode'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Light Mode Card */}
            <div
              id="theme-option-light"
              onClick={() => setTheme('light')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                !isDark
                  ? 'bg-orange-50/60 border-orange-500 shadow-md ring-2 ring-orange-500/20'
                  : 'bg-slate-50 dark:bg-[#0f233f]/60 hover:bg-slate-100 dark:hover:bg-[#0f233f] border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daylight Clean Mode</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">High contrast white &amp; slate for brightly lit desks</p>
                  </div>
                </div>
                {!isDark && (
                  <span className="p-1.5 rounded-full bg-orange-500 text-white">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <div className="h-2 flex-1 rounded bg-slate-300 dark:bg-slate-600" />
                <div className="h-2 w-8 rounded bg-emerald-400" />
              </div>
            </div>

            {/* Dark Mode Card */}
            <div
              id="theme-option-dark"
              onClick={() => setTheme('dark')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                isDark
                  ? 'bg-orange-500/10 border-orange-500 shadow-md ring-2 ring-orange-500/20'
                  : 'bg-slate-50 dark:bg-[#0f233f]/60 hover:bg-slate-100 dark:hover:bg-[#0f233f] border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dark Operations Mode</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Deep navy obsidian theme tailored for low-light night shifts</p>
                  </div>
                </div>
                {isDark && (
                  <span className="p-1.5 rounded-full bg-orange-500 text-white">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <div className="h-12 rounded-xl bg-[#071322] border border-slate-800 p-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <div className="h-2 flex-1 rounded bg-slate-700" />
                <div className="h-2 w-8 rounded bg-emerald-500" />
              </div>
            </div>
          </div>
        </section>

        {/* 2. NOTIFICATIONS & SOUND ALERTS SECTION */}
        <section className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs transition-colors">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Real-Time Inquiry Sound Notifications
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Plays an immediate synthesized audio chime whenever a devotee submits a hotel booking or yatra package lead.
              </p>
            </div>

            {/* Master Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs font-bold hidden sm:inline ${settings.soundEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {settings.soundEnabled ? 'Alerts ON' : 'Alerts OFF'}
              </span>
              <button
                type="button"
                onClick={() => handleToggleSound(!settings.soundEnabled)}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.soundEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                title={settings.soundEnabled ? 'Disable sound alerts' : 'Enable sound alerts'}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                    settings.soundEnabled ? 'translate-x-7 text-emerald-600' : 'translate-x-0 text-slate-400'
                  }`}
                >
                  {settings.soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tone Selector & Preview */}
            <div className="md:col-span-2 space-y-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Notification Tone Selection
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {toneOptions.map((tone) => {
                  const isSelected = settings.selectedTone === tone.id;
                  return (
                    <div
                      key={tone.id}
                      id={`tone-option-${tone.id}`}
                      onClick={() => handleToneChange(tone.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-orange-500/10 border-orange-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-orange-500/30'
                          : 'bg-slate-50 dark:bg-[#0f233f]/60 hover:bg-slate-100 dark:hover:bg-[#0f233f] border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{tone.icon}</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{tone.name}</span>
                        </div>
                        {isSelected && (
                          <span className="p-1 rounded-full bg-orange-500 text-white shadow-xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {tone.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Tone Dropdown Menu Alternative */}
              <div className="pt-2">
                <label htmlFor="tone-dropdown-select" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Or select tone from dropdown list:
                </label>
                <div className="relative">
                  <select
                    id="tone-dropdown-select"
                    value={settings.selectedTone}
                    onChange={(e) => handleToneChange(e.target.value as NotificationTone)}
                    className="w-full bg-slate-50 dark:bg-[#0f233f] border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none cursor-pointer"
                  >
                    {toneOptions.map((tone) => (
                      <option key={tone.id} value={tone.id} className="bg-white dark:bg-[#0a192f] text-slate-900 dark:text-white">
                        {tone.name} — {tone.desc}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-3 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Test & Volume Column */}
            <div className="bg-slate-50 dark:bg-[#0f233f]/70 border border-slate-200 dark:border-slate-700/70 rounded-2xl p-5 space-y-5 flex flex-col justify-between shadow-xs">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                  <span>Audio Preview &amp; Volume</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Synthesized directly in HTML5 Web Audio without external assets.
                </p>

                {/* Volume Slider */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Volume Level</span>
                    <span className="text-orange-600 dark:text-orange-400 font-bold">{Math.round(settings.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={settings.volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                </div>
              </div>

              {/* Test Alert Button */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleTestSound}
                  disabled={isPlayingTest}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isPlayingTest
                      ? 'bg-amber-500 text-slate-950 scale-[0.98]'
                      : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30 hover:border-orange-500/50'
                  }`}
                >
                  <Play className={`w-3.5 h-3.5 ${isPlayingTest ? 'animate-spin' : ''}`} />
                  <span>{isPlayingTest ? 'Playing Preview...' : 'Test Alert Sound'}</span>
                </button>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                  Plays tone: {toneOptions.find((t) => t.id === settings.selectedTone)?.name}
                </p>
              </div>

            </div>
          </div>

          {/* Info note */}
          <div className="p-3.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
            <Info className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-300">How real-time alerts work: </span>
              Audio triggers seamlessly across open browser tabs via BroadcastChannel &amp; active background lead verification. Ensure your device audio or tab volume is unmuted.
            </div>
          </div>
        </section>

        {/* 3. TRAVEL DESK OPERATIONS SECTION */}
        <section className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs transition-colors">
          <div className="border-b border-slate-200 dark:border-slate-800/80 pb-5">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Travel Desk Operational Details
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              General contact parameters pre-populated into devotee confirmation messages and travel desk routing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Central WhatsApp Helpline
              </label>
              <input
                type="text"
                value={deskPhone}
                onChange={(e) => setDeskPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-50 dark:bg-[#0f233f] border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Used to generate direct WhatsApp chat links for incoming leads.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Agency / Operations Center Name
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="TirthYatraTrails Central Operations Desk"
                className="w-full bg-slate-50 dark:bg-[#0f233f] border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Included in dispatch signatures and admin headers.
              </p>
            </div>
          </div>
        </section>

      </div>
    </AdminLayout>
  );
};
