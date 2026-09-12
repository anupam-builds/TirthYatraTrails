import React, { useState } from 'react';
import { useRouter } from '../../context/RouterContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, Building2 } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { navigate } = useRouter();
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState('admin@tirthyatratrails.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginAdmin(email, password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Unauthorized: Admin access privileges required.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="admin-login-page" className="min-h-screen bg-[#071322] flex items-center justify-center p-4">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#0f294a]/50 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-md w-full bg-[#0d1d33] border border-slate-700/60 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white shadow-2xl p-2.5 flex items-center justify-center mx-auto border border-white/20 aspect-square">
            <img
              src="/logo.svg"
              alt="TirthYatraTrails.in Logo"
              className="w-full h-full aspect-square object-contain"
            />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight font-serif">
            Enterprise Admin Portal
          </h2>
          <p className="text-xs text-slate-400">
            TirthYatraTrails Travel Desk &amp; Inventory Operations
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-900/30 border border-red-500/50 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Admin Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tirthyatratrails.com"
                className="w-full pl-10 pr-3 py-2.5 bg-[#081220] border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 bg-[#081220] border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating Desk...' : 'Access Enterprise Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Credentials Box */}
        <div className="p-3.5 bg-slate-800/60 border border-slate-700 rounded-2xl text-xs text-slate-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-orange-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Master Enterprise Credentials:</span>
          </div>
          <p className="text-[11px] text-slate-400">Email: <code className="text-white font-bold">admin@tirthyatratrails.com</code></p>
          <p className="text-[11px] text-slate-400">Password: <code className="text-white font-bold">Admin@123</code></p>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-orange-400 transition-colors"
          >
            ← Return to Customer Website
          </button>
        </div>
      </div>
    </div>
  );
};
