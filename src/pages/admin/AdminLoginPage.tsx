import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { CuteLamp, CuteLampRef } from '../../components/auth/CuteLamp.js';
import { BaseInput } from '../../components/FormField.js';
import { ADMIN_ROUTES } from '../../constants/routes.js';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Users,
  Globe,
} from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { navigate } = useRouter();
  const { loginAdmin, adminUser, isAdminAuthenticated } = useAuth();
  const lampRef = useRef<CuteLampRef>(null);

  // Lamp starts ON by default so the login desk and card are immediately available
  const [isLampOn, setIsLampOn] = useState(true);

  // Direct Email & Password authentication credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Immediate seamless redirection if admin is already authenticated, or show session expired alert
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('reason') === 'session_expired' || searchParams.get('expired') === 'true') {
        setError('Your session has expired or requires re-authentication. Please sign in again.');
      }
    }
    if (isAdminAuthenticated && adminUser) {
      navigate(ADMIN_ROUTES.dashboard);
    }
  }, [isAdminAuthenticated, adminUser, navigate]);

  const handleToggleLamp = () => {
    setIsLampOn((prev) => !prev);
  };

  // Direct Email & Password Sign-In handler (No OTP, No Magic Links)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setError('Please enter your administrator work email.');
      return;
    }

    if (!cleanPassword) {
      setError('Please enter your administrator password.');
      return;
    }

    setLoading(true);
    try {
      // Direct email/password authentication via Supabase Auth signInWithPassword & allowlist enforcement
      await loginAdmin(cleanEmail, cleanPassword);
      setInfoMessage('Authentication successful. Redirecting to Enterprise Dashboard...');
      navigate(ADMIN_ROUTES.dashboard);
    } catch (err: any) {
      console.error('[AdminLoginPage] Login failed:', err);
      const msg = err?.message || '';
      if (msg.includes('Access Denied')) {
        setError(msg);
      } else if (
        msg.includes('Invalid') ||
        msg.includes('credentials') ||
        msg.includes('password') ||
        msg.includes('user not found')
      ) {
        setError('Incorrect email address or password. Please verify your credentials and try again.');
      } else {
        setError(msg || 'Authentication failed. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="admin-login-page"
      className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 transition-colors duration-700 relative overflow-hidden font-sans ${
        isLampOn
          ? 'bg-neutral-950 text-neutral-100'
          : 'bg-[#080b11] text-neutral-200'
      }`}
    >
      {/* Ambient background glow originating strictly from behind the lamp shade */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ease-out ${
          isLampOn ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="w-full h-full hidden md:block"
          style={{
            background:
              'radial-gradient(ellipse 750px 520px at 30% 42%, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.05) 42%, transparent 75%)',
          }}
        />
        <div
          className="w-full h-full block md:hidden"
          style={{
            background:
              'radial-gradient(ellipse 550px 450px at 50% 26%, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.05) 45%, transparent 75%)',
          }}
        />
      </div>

      {/* Subtle desk surface warm bounce illumination */}
      <div
        className={`absolute bottom-0 inset-x-0 h-72 pointer-events-none transition-opacity duration-700 ease-out ${
          isLampOn ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(ellipse 1000px 200px at 50% 100%, rgba(251, 191, 36, 0.07) 0%, rgba(245, 158, 11, 0.02) 50%, transparent 80%)',
        }}
      />

      {/* Top Bar Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10 py-2">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-full bg-neutral-900 shadow-md p-1 flex items-center justify-center shrink-0 border border-amber-400/30 aspect-square group-hover:scale-105 transition-transform">
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
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">
              Enterprise Admin Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <span>Public Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <span className="text-neutral-700">|</span>
          <button
            onClick={() => navigate('/staff/login')}
            className="text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Portal</span>
          </button>
        </div>
      </header>

      {/* Main Interactive Stage: Lamp + Login Card */}
      <motion.main
        layout
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl w-full mx-auto z-10 my-auto py-8 flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-14"
      >
        {/* INTERACTIVE CUTE LAMP */}
        <motion.div layout className="flex flex-col items-center shrink-0">
          <CuteLamp ref={lampRef} isOn={isLampOn} onToggle={handleToggleLamp} size="lg" />
          {!isLampOn ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex flex-col items-center text-center space-y-1.5 select-none"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs font-semibold shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Desk Lamp Off</span>
              </div>
              <p className="text-xs font-medium text-neutral-400 text-center max-w-[250px] leading-relaxed">
                Pull the golden cord to switch on the desk lamp
              </p>
            </motion.div>
          ) : (
            <div className="mt-3 text-center">
              <span className="text-[11px] text-amber-400/80 font-medium">
                Click cord to toggle ambient light
              </span>
            </div>
          )}
        </motion.div>

        {/* LOGIN FORM */}
        <AnimatePresence mode="wait">
          {isLampOn && (
            <motion.div
              key="active-admin-login-card"
              initial={{ opacity: 0, x: 35, scale: 0.96, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 30, scale: 0.96, filter: 'blur(6px)' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md rounded-3xl p-6 sm:p-8 bg-neutral-900/95 border border-neutral-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(251,191,36,0.08)] text-neutral-100 space-y-5 relative z-10 backdrop-blur-xl"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full p-2 flex items-center justify-center mx-auto border border-amber-500/30 shadow-md bg-neutral-950 aspect-square">
                  <img
                    src="https://i.postimg.cc/Sxqk00xZ/Tirth-Yatra-Trails-Logo.png"
                    alt="TirthYatraTrails.in Logo"
                    className="w-full h-full aspect-square object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex items-center justify-center gap-1.5 text-emerald-300 font-semibold text-[11px] bg-emerald-950/70 border border-emerald-700/60 rounded-full px-3 py-0.5 w-fit mx-auto">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Secure Administrator Authentication</span>
                </div>
                <h1 className="text-2xl font-black font-serif tracking-tight text-white">
                  Admin Sign In
                </h1>
                <p className="text-xs text-neutral-400">
                  Enter your email address and password to access the portal
                </p>
              </div>

              {/* Status / Error feedback */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs font-semibold flex items-start gap-2.5 animate-shake">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {infoMessage && (
                <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-800/70 text-amber-200 text-xs font-medium flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {/* Security & Domain Notice */}
              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/50 text-blue-200 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-medium">
                  <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Domain: <strong className="font-semibold text-blue-100">tirthyatratrails.in</strong></span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-900/60 text-blue-200 border border-blue-700/50 px-1.5 py-0.5 rounded">
                  Supabase Auth
                </span>
              </div>

              {/* DIRECT EMAIL AND PASSWORD FORM */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* 1. Email Address Field */}
                <div>
                  <label
                    htmlFor="admin-email-input"
                    className="block text-xs font-bold uppercase tracking-wider mb-1 text-neutral-200"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <BaseInput
                      id="admin-email-input"
                      name="admin_email"
                      type="email"
                      required
                      autoFocus
                      autoComplete="username"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="admin@tirthyatratrails.in"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* 2. Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="admin-password-input"
                      className="block text-xs font-bold uppercase tracking-wider text-neutral-200"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <BaseInput
                      id="admin-password-input"
                      name="admin_password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Enter administrator password..."
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Straightforward Login Button */}
                <button
                  id="btn-admin-login"
                  type="submit"
                  disabled={loading || !email.trim() || !password.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-[#ea580c] to-[#d97706] hover:from-[#c2410c] hover:to-[#b45309] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-950/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t border-neutral-800 text-center">
                <button
                  onClick={() => navigate('/')}
                  className="text-xs text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  ← Return to Customer Website
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>

      {/* Footer */}
      <footer className="text-center text-xs z-10 py-2 text-neutral-500">
        &copy; {new Date().getFullYear()} TirthYatraTrails • Sacred Pilgrim Travel Operations System
      </footer>
    </div>
  );
};

export default AdminLoginPage;
