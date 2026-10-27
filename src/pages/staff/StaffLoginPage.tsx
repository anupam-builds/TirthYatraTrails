import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useRouter } from '../../context/RouterContext.js';
import { supabase, trackStaffHeartbeat } from '../../lib/supabase.js';
import { localStore } from '../../services/localStore.js';
import { CuteLamp, CuteLampRef } from '../../components/auth/CuteLamp.js';
import { BaseInput } from '../../components/FormField.js';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { StaffMember } from '../../types.js';

export const StaffLoginPage: React.FC = () => {
  const { staffUser, isStaffAuthenticated, isStaffLoading, isInitializing, setStaffSession } = useAuth();
  const { navigate } = useRouter();
  const lampRef = useRef<CuteLampRef>(null);

  // Requirement: Lamp starts sleeping / OFF on initial page load
  const [isLampOn, setIsLampOn] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Compatibility aliases
  const error = errorMessage;
  const setError = setErrorMessage;
  const loading = isLoading;
  const setLoading = setIsLoading;

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (!isStaffLoading && !isInitializing && isStaffAuthenticated && staffUser) {
      navigate('/staff');
    }
  }, [isStaffAuthenticated, staffUser, isStaffLoading, isInitializing, navigate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('reason') === 'session_expired' || searchParams.get('expired') === 'true') {
        setErrorMessage('Your staff session has expired or requires re-authentication. Please sign in again.');
        setIsLampOn(true);
      }
    }
  }, []);

  const handleToggleLamp = () => {
    setIsLampOn((prev) => !prev);
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both your staff email and password.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (authError) {
        const isEmailNotConfirmed =
          authError.message?.toLowerCase().includes('email not confirmed') ||
          (authError as any).code === 'email_not_confirmed';

        if (isEmailNotConfirmed) {
          setErrorMessage(
            'Email Not Confirmed: In your Supabase Dashboard, go to Authentication > Providers > Email and turn off "Confirm email", or go to Authentication > Users, click the three dots next to this staff user, and select "Confirm Email".'
          );
        } else {
          setErrorMessage(authError.message);
        }
        setIsLoading(false);
        return;
      }

      // Ensure session promise fully resolves & token is ready
      let activeSession = data?.session;
      if (!activeSession?.access_token) {
        try {
          const { data: freshSession } = await supabase.auth.getSession();
          if (freshSession?.session?.access_token) {
            activeSession = freshSession.session;
          }
        } catch {}
      }

      // 2. Verify Staff Table Validation:
      // After a successful Supabase Auth sign-in, check whether the user's email exists in the active staff_members table
      const authUserEmail = (activeSession?.user?.email || data?.user?.email || cleanEmail).toLowerCase().trim();

      const { data: staffMember, error: staffError } = await supabase
        .from('staff_members')
        .select('*')
        .ilike('email', authUserEmail)
        .maybeSingle();

      if (staffError) {
        console.warn('[StaffLogin] staff_members lookup warning:', staffError.message);
      }

      let verifiedStaff = staffMember;
      if (!verifiedStaff) {
        // Also check local store roster fallback
        const localMatch = localStore.getStaffMembers().find(
          (s) => s.email.toLowerCase().trim() === authUserEmail
        );
        if (localMatch) {
          verifiedStaff = localMatch as any;
        }
      }

      if (!verifiedStaff) {
        await supabase.auth.signOut().catch(() => {});
        setErrorMessage('Access Denied: No staff account found for this email address in the staff roster. Self-registration is disabled.');
        setIsLoading(false);
        return;
      }

      const isBlocked = verifiedStaff.is_blocked === true || (verifiedStaff as any).isBlocked === true;
      const isActive = verifiedStaff.is_active !== false && (verifiedStaff as any).isActive !== false;

      if (isBlocked || !isActive) {
        await supabase.auth.signOut().catch(() => {});
        const reason = verifiedStaff.blocked_reason || (verifiedStaff as any).blockedReason || 'revoked by administrator';
        setErrorMessage(`Access Denied: Staff account is inactive or blocked (${reason}). Active session terminated.`);
        setIsLoading(false);
        return;
      }

      // 3. Immediately establish authenticated staff session and ensure token is persisted
      const mappedStaff: StaffMember & { access_token?: string } = {
        id: verifiedStaff.id,
        name: verifiedStaff.name || authUserEmail.split('@')[0],
        email: authUserEmail,
        phone: verifiedStaff.phone || '',
        designation: verifiedStaff.designation || 'Staff Specialist',
        role: 'STAFF',
        isBlocked: false,
        isActive: true,
        isOnline: true,
        isCurrentlyLoggedIn: true,
        permissions: (verifiedStaff as any).permissions || {
          canViewInquiries: true,
          canUpdateStatus: true,
          canAddNotes: true,
        },
        createdAt: verifiedStaff.created_at || (verifiedStaff as any).createdAt || new Date().toISOString(),
        access_token: activeSession?.access_token,
      };

      // Synchronously persist token
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tyt_staff_token', btoa(JSON.stringify(mappedStaff)));
        localStorage.removeItem('tyt_staff_token');
      }

      if (setStaffSession) {
        setStaffSession(mappedStaff);
      }

      // Non-blocking conflict-free session and presence tracking (Zero 409 Conflicts)
      const staffId = verifiedStaff.id;
      if (staffId) {
        trackStaffHeartbeat(staffId, verifiedStaff.email).catch(() => {});
      }

      // Brief pause to allow React context state updates to commit cleanly before routing
      await new Promise((resolve) => setTimeout(resolve, 80));

      // Seamless transition to Staff Desk
      navigate('/staff');
    } catch (err: any) {
      setErrorMessage(err.message || 'Staff login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = handleStaffLogin;

  return (
    <div
      id="staff-login-page"
      className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 transition-colors duration-700 relative overflow-hidden font-sans ${
        isLampOn
          ? 'bg-neutral-950 text-slate-100'
          : 'bg-[#030712] text-slate-200'
      }`}
    >
      {/* Ambient background glow (localized warm amber glow strictly behind the lamp shade) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
          isLampOn ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(circle 600px at 30% 45%, rgba(251, 191, 36, 0.16) 0%, rgba(245, 158, 11, 0.06) 40%, rgba(15, 23, 42, 0) 70%)',
        }}
      />

      {/* Subtle desk pool surface illumination */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-48 pointer-events-none transition-opacity duration-700 ${
          isLampOn ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'linear-gradient(to top, rgba(251, 191, 36, 0.05) 0%, rgba(0, 0, 0, 0) 100%)',
        }}
      />

      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10 py-2">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-full bg-neutral-900 shadow-md p-1 flex items-center justify-center shrink-0 border border-amber-500/30 aspect-square group-hover:scale-105 transition-transform">
            <img
              src="https://i.postimg.cc/Sxqk00xZ/Tirth-Yatra-Trails-Logo.png"
              alt="TirthYatraTrails.in Logo"
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wide font-serif block text-white">
              TirthYatraTrails
            </span>
            <span className="block text-[10px] text-amber-500 font-bold uppercase tracking-widest">
              Staff Desk Operations
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 transition-colors text-slate-300 hover:text-white"
          >
            <span>Public Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Interactive Stage: Lamp + Slide-in Login Card */}
      <motion.main
        layout
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl w-full mx-auto z-10 my-auto py-8 flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-14"
      >
        {/* INTERACTIVE CUTE LAMP */}
        <motion.div layout className="flex flex-col items-center shrink-0 relative">
          <CuteLamp ref={lampRef} isOn={isLampOn} onToggle={handleToggleLamp} size="lg" />
          {!isLampOn && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-center"
            >
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-400/80 font-medium bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Pull the golden cord to turn on desk light
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* LOGIN FORM (Smoothly reveals when cord is pulled / lamp is on) */}
        <AnimatePresence mode="wait">
          {isLampOn && (
            <motion.div
              key="active-staff-login-card"
              initial={{ opacity: 0, x: 45, scale: 0.94, filter: 'blur(8px)' }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 40, scale: 0.94, filter: 'blur(8px)' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md rounded-3xl p-6 sm:p-8 bg-neutral-900/95 border border-neutral-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_35px_rgba(251,191,36,0.12)] backdrop-blur-xl text-slate-100 space-y-6 relative z-10"
            >
              <div className="text-center space-y-2">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full p-2 flex items-center justify-center mx-auto border border-amber-500/30 aspect-square shadow-md bg-neutral-950">
                  <img
                    src="https://i.postimg.cc/Sxqk00xZ/Tirth-Yatra-Trails-Logo.png"
                    alt="TirthYatraTrails.in Logo"
                    className="w-full h-full aspect-square object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h1 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white">
                  Staff Desk Login
                </h1>
                <p className="text-xs leading-relaxed text-slate-400">
                  Sign in to manage assigned pilgrim leads, update status, and log devotee follow-up actions.
                </p>
              </div>

              {errorMessage && (
                <div
                  id="staff-login-error-banner"
                  role="alert"
                  className="p-3.5 bg-red-500/15 border border-red-500/40 rounded-2xl text-xs text-red-300 flex items-start gap-2.5 shadow-md shadow-red-950/40"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="staff-login-email" className="text-xs font-bold block text-slate-300">
                    Staff Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <BaseInput
                      id="staff-login-email"
                      name="staff-login-email"
                      type="email"
                      required
                      placeholder="staff.name@tirthyatra.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs font-mono bg-neutral-950 border border-neutral-700 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="staff-login-password" className="text-xs font-bold block text-slate-300">
                    Staff Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <BaseInput
                      id="staff-login-password"
                      name="staff-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter staff password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-mono bg-neutral-950 border border-neutral-700 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Staff Desk</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-3 border-t border-neutral-800 text-center space-y-1.5">
                <p className="text-[11px] text-amber-400/90 font-medium">
                  🔒 <strong>Strict Policy:</strong> Self-registration is disabled. Staff credentials are authenticated directly by the travel desk.
                </p>
                <p className="text-[11px] text-slate-400">
                  Need access or credential reset? Contact your <strong>System Administrator</strong>.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>

      {/* Footer */}
      <footer className="text-center text-xs z-10 py-2 text-slate-500">
        &copy; {new Date().getFullYear()} TirthYatraTrails • Sacred Pilgrim Travel Operations System
      </footer>
    </div>
  );
};
