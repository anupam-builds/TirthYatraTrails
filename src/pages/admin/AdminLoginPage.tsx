import React, { useState, useRef } from 'react';
import { useRouter } from '../../context/RouterContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { CuteLamp, CuteLampRef } from '../../components/auth/CuteLamp.js';
import { BaseInput } from '../../components/FormField.js';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  ArrowRight,
  KeyRound,
  ExternalLink,
  Users,
  ShieldCheck,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { navigate } = useRouter();
  const { loginAdminWithOtp, sendAdminOtp } = useAuth();
  const lampRef = useRef<CuteLampRef>(null);

  // Requirement: Lamp starts sleeping / OFF on initial page load
  const [isLampOn, setIsLampOn] = useState(false);

  // Auth flow step: 'email' -> 'otp'
  const [authStep, setAuthStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('anupamsaxena.dev@gmail.com');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleToggleLamp = () => {
    setIsLampOn((prev) => !prev);
  };

  // Step 1: Send Passwordless OTP / Magic Link
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await sendAdminOtp(email.trim());
      setInfoMessage(res.message || `Verification code sent to ${email.trim()}`);
      setAuthStep('otp');
      setResendCooldown(30);

      // Start countdown for resend
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Unauthorized: Admin privileges required.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Assert Strict Admin Role
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await loginAdminWithOtp(email.trim(), otp.trim());
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Unauthorized: Admin privileges required.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await sendAdminOtp(email.trim());
      setInfoMessage(res.message || `New code sent to ${email.trim()}`);
      setResendCooldown(30);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch new OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="admin-login-page"
      className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 transition-colors duration-500 relative overflow-hidden font-sans ${
        isLampOn
          ? 'bg-gradient-to-br from-[#fbf8f2] via-[#fefbf6] to-[#faeedb] text-slate-800'
          : 'bg-gradient-to-br from-[#040a14] via-[#071424] to-[#050c18] text-slate-100'
      }`}
    >
      {/* Ambient background glow (strictly visible when lamp is ON) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          isLampOn ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(circle at 35% 45%, rgba(251, 191, 36, 0.28) 0%, rgba(245, 158, 11, 0.1) 45%, transparent 72%)',
        }}
      />

      {/* Top Bar Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10 py-2">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-md p-1 flex items-center justify-center shrink-0 border border-amber-300/40 aspect-square group-hover:scale-105 transition-transform">
            <img
              src="https://i.postimg.cc/Sxqk00xZ/Tirth-Yatra-Trails-Logo.png"
              alt="TirthYatraTrails.in Logo"
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span
              className={`font-extrabold text-sm tracking-wide font-serif block ${
                isLampOn ? 'text-slate-900' : 'text-white'
              }`}
            >
              TirthYatraTrails
            </span>
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider block">
              Enterprise Admin Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-1 transition-colors ${
              isLampOn
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>Public Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <span className={isLampOn ? 'text-slate-300' : 'text-slate-700'}>|</span>
          <button
            onClick={() => navigate('/staff/login')}
            className="text-orange-600 dark:text-orange-400 hover:underline font-bold flex items-center gap-1 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Portal</span>
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
        <motion.div layout className="flex flex-col items-center shrink-0">
          <CuteLamp ref={lampRef} isOn={isLampOn} onToggle={handleToggleLamp} size="lg" />
        </motion.div>

        {/* LOGIN FORM (Smoothly reveals when cord is pulled / lamp is on) */}
        <AnimatePresence mode="wait">
          {isLampOn && (
            <motion.div
              key="active-admin-login-card"
              initial={{ opacity: 0, x: 45, scale: 0.94, filter: 'blur(8px)' }}
              animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 40, scale: 0.94, filter: 'blur(8px)' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md rounded-3xl p-6 sm:p-8 bg-white/95 border border-amber-200/90 shadow-[0_25px_60px_-15px_rgba(245,158,11,0.25)] text-slate-800 space-y-6 relative z-10"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full p-2 flex items-center justify-center mx-auto border border-amber-200 aspect-square shadow-md bg-white">
                  <img
                    src="https://i.postimg.cc/Sxqk00xZ/Tirth-Yatra-Trails-Logo.png"
                    alt="TirthYatraTrails.in Logo"
                    className="w-full h-full aspect-square object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-semibold text-[11px] bg-emerald-50 border border-emerald-200/70 rounded-full px-3 py-0.5 w-fit mx-auto">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Passwordless OTP • Strict Role Guard</span>
                </div>
                <h1 className="text-2xl font-black font-serif tracking-tight text-slate-900">
                  Enterprise Admin Portal
                </h1>
                <p className="text-xs text-slate-600">
                  TirthYatraTrails Travel Desk &amp; Inventory Operations
                </p>
              </div>

              {/* Status / Error feedback */}
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {infoMessage && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {/* STEP 1: Enter Admin Work Email for Passwordless Dispatch */}
              {authStep === 'email' ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label
                      htmlFor="admin-login-email"
                      className="block text-xs font-bold uppercase tracking-wider mb-1 text-slate-700"
                    >
                      Admin Work Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <BaseInput
                        id="admin-login-email"
                        name="admin-login-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@tirthyatratrails.com"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                      A one-time verification code or secure sign-in link will be dispatched to your registered administrator address.
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Quick Fill:</span>
                      <button
                        type="button"
                        onClick={() => setEmail('anupamsaxena.dev@gmail.com')}
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                          email === 'anupamsaxena.dev@gmail.com'
                            ? 'bg-orange-100 text-orange-700 font-bold border border-orange-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Root Admin (Anupam)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmail('admin@tirthyatratrails.com')}
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                          email === 'admin@tirthyatratrails.com'
                            ? 'bg-orange-100 text-orange-700 font-bold border border-orange-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Secondary Admin
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{loading ? 'Dispatching OTP Code...' : 'Send Verification Code'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* STEP 2: Enter 6-digit OTP code & verify role */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="admin-login-otp"
                        className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        6-Digit Admin Passcode
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthStep('email');
                          setError('');
                        }}
                        className="text-[11px] text-orange-600 hover:underline cursor-pointer"
                      >
                        Change email
                      </button>
                    </div>

                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <BaseInput
                        id="admin-login-otp"
                        name="admin-login-otp"
                        type="text"
                        maxLength={8}
                        autoFocus
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.trim())}
                        placeholder="e.g. 123456"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl text-center tracking-[0.3em] font-mono text-base font-bold bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                      <span>Email: <strong className="text-slate-700">{email}</strong></span>
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendCooldown > 0 || loading}
                        className="text-orange-600 hover:text-orange-700 disabled:text-slate-400 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !otp.trim()}
                    className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{loading ? 'Verifying Admin Role...' : 'Authorize & Enter Portal'}</span>
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                </form>
              )}

              <div className="pt-2 border-t border-slate-200 text-center">
                <button
                  onClick={() => navigate('/')}
                  className="text-xs text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  ← Return to Customer Website
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>

      {/* Footer */}
      <footer
        className={`text-center text-xs z-10 py-2 ${
          isLampOn ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        &copy; {new Date().getFullYear()} TirthYatraTrails • Sacred Pilgrim Travel Operations System
      </footer>
    </div>
  );
};
