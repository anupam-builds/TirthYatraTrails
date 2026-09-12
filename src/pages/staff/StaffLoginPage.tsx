import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useRouter } from '../../context/RouterContext.js';
import {
  Users,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export const StaffLoginPage: React.FC = () => {
  const { loginStaff } = useAuth();
  const { navigate } = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        throw new Error('Please enter both your staff email and password.');
      }
      await loginStaff(email.trim(), password);
      navigate('/staff');
    } catch (err: any) {
      setError(err.message || 'Staff login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071526] via-[#0d223f] to-[#08182b] flex flex-col justify-between text-slate-100 px-4 py-8 relative overflow-hidden font-sans">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-full bg-white shadow-md p-0.5 flex items-center justify-center shrink-0 border border-white/30 aspect-square">
            <img
              src="/logo.svg"
              alt="TirthYatraTrails.in Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wide text-white font-serif">
              TirthYatraTrails
            </span>
            <span className="block text-[10px] text-orange-400 font-bold uppercase tracking-widest">
              Operations Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => navigate('/')}
            className="text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Public Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => navigate('/admin/login')}
            className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 transition-colors"
          >
            <span>Admin Login</span>
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto z-10 my-8">
        <div className="bg-[#0b1d36]/90 border border-slate-700/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white shadow-2xl p-2.5 flex items-center justify-center mx-auto border border-white/20 aspect-square">
              <img
                src="/logo.svg"
                alt="TirthYatraTrails.in Logo"
                className="w-full h-full aspect-square object-contain"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-serif tracking-tight">
              Staff Desk Login
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sign in to manage assigned pilgrim leads, update status, and log devotee follow-up actions.
            </p>
          </div>

          {/* Quick Demo Credentials Fillers */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick Demo Staff Accounts
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Password: Staff@123</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => fillQuickDemo('priya.sharma@tirthyatra.com', 'Staff@123')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-orange-600/30 text-slate-200 hover:text-orange-200 border border-slate-700 hover:border-orange-500/50 text-[11px] font-bold text-left transition-all"
              >
                Priya Sharma
                <span className="block text-[9px] text-slate-400 font-normal">Sr. Coordinator</span>
              </button>

              <button
                type="button"
                onClick={() => fillQuickDemo('arun.verma@tirthyatra.com', 'Staff@123')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-orange-600/30 text-slate-200 hover:text-orange-200 border border-slate-700 hover:border-orange-500/50 text-[11px] font-bold text-left transition-all"
              >
                Arun Verma
                <span className="block text-[9px] text-slate-400 font-normal">Yatra Desk</span>
              </button>

              <button
                type="button"
                onClick={() => fillQuickDemo('vikram.joshi@tirthyatra.com', 'Staff@123')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-orange-600/30 text-slate-200 hover:text-orange-200 border border-slate-700 hover:border-orange-500/50 text-[11px] font-bold text-left transition-all"
              >
                Vikram Joshi
                <span className="block text-[9px] text-slate-400 font-normal">Operations</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-2xl text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 block">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="staff.name@tirthyatra.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 block">
                  Staff Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter staff password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Staff Desk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center space-y-1.5">
            <p className="text-[11px] text-amber-400/90 font-medium">
              🔒 <strong>Strict Policy:</strong> Self-registration is disabled. Staff access credentials must be issued by an Administrator.
            </p>
            <p className="text-[11px] text-slate-400">
              Need access or credential reset? Contact your{' '}
              <button
                onClick={() => navigate('/admin/login')}
                className="text-orange-400 hover:underline font-bold"
              >
                System Administrator
              </button>
              .
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 z-10">
        &copy; {new Date().getFullYear()} TirthYatraTrails • Sacred Pilgrim Travel Operations System
      </footer>
    </div>
  );
};
