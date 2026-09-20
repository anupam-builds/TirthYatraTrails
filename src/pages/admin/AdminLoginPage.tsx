import React, { useState, useRef } from 'react';
import { useRouter } from '../../context/RouterContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { CuteLamp, CuteLampRef } from '../../components/auth/CuteLamp.js';
import { BaseInput } from '../../components/FormField.js';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  ExternalLink,
  Users,
} from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { navigate } = useRouter();
  const { loginAdmin } = useAuth();
  const lampRef = useRef<CuteLampRef>(null);

  // Requirement: Lamp starts sleeping / OFF on initial page load
  const [isLampOn, setIsLampOn] = useState(false);

  const [email, setEmail] = useState('admin@tirthyatratrails.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleToggleLamp = () => {
    setIsLampOn((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginAdmin(email.trim(), password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Unauthorized: Admin access privileges required.');
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
                <h1 className="text-2xl font-black font-serif tracking-tight text-slate-900">
                  Enterprise Admin Portal
                </h1>
                <p className="text-xs text-slate-600">
                  TirthYatraTrails Travel Desk &amp; Inventory Operations
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="admin-login-email" className="block text-xs font-bold uppercase tracking-wider mb-1 text-slate-700">
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
                </div>

                <div>
                  <label htmlFor="admin-login-password" className="block text-xs font-bold uppercase tracking-wider mb-1 text-slate-700">
                    Master Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <BaseInput
                      id="admin-login-password"
                      name="admin-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter administrator password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-orange-500 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Authenticating Desk...' : 'Access Enterprise Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

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
