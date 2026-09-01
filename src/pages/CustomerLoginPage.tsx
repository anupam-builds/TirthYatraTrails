import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { useAuth } from '../context/AuthContext.js';
import { Mail, Lock, Sparkles, ArrowRight, UserCheck, CheckCircle2 } from 'lucide-react';
import { GoogleSignInButton, AuthOrDivider } from '../components/GoogleSignInButton.js';

export const CustomerLoginPage: React.FC = () => {
  const { navigate } = useRouter();
  const { loginCustomer } = useAuth();
  const [email, setEmail] = useState('rohan.sharma@example.com');
  const [password, setPassword] = useState('User@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginCustomer(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = () => {
    navigate('/');
  };

  const handleGoogleError = (msg: string) => {
    setError(msg);
  };

  return (
    <div id="customer-login-page" className="min-h-screen bg-[#faf8f5] py-16 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-orange-100 shadow-xl space-y-5">
        
        {/* Brand Logo Header */}
        <div className="text-center space-y-2">
          <div
            onClick={() => navigate('/')}
            className="inline-block cursor-pointer"
          >
            <img
              src="/WhatsApp Image 2026-08-27 at 5.12.29 PM.jpeg"
              onError={(e) => {
                (e.target as HTMLElement).setAttribute('src', '/logo.svg');
              }}
              alt="TirthYatraTrails"
              className="h-12 w-auto mx-auto object-contain"
            />
          </div>
          <h2 className="text-2xl font-extrabold text-[#0f294a] tracking-tight">
            Pilgrim Sign In
          </h2>
          <p className="text-xs text-slate-500">
            Access your sacred bookings, darshan itineraries &amp; quotes
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Continue with Google Button */}
        <div>
          <GoogleSignInButton
            text="Continue with Google"
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            isSubmitting={loading}
          />
        </div>

        <AuthOrDivider label="OR WITH EMAIL" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-sm rounded-full shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Credentials Helper */}
        <div className="p-3.5 bg-orange-50/70 border border-orange-200/60 rounded-2xl text-xs text-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#ea580c]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sample Pilgrim Account:</span>
          </div>
          <p className="text-[11px] text-slate-600">Email: <code className="font-bold">rohan.sharma@example.com</code></p>
          <p className="text-[11px] text-slate-600">Password: <code className="font-bold">User@123</code></p>
        </div>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Don't have an account? </span>
          <button
            onClick={() => navigate('/register')}
            className="font-bold text-[#ea580c] hover:underline"
          >
            Register Now
          </button>
        </div>
      </div>
    </div>
  );
};
