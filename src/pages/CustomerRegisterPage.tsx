import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { useAuth } from '../context/AuthContext.js';
import { Mail, Lock, User, Phone, ArrowRight, Sparkles } from 'lucide-react';
import { GoogleSignInButton, AuthOrDivider } from '../components/GoogleSignInButton.js';

export const CustomerRegisterPage: React.FC = () => {
  const { navigate } = useRouter();
  const { registerCustomer } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await registerCustomer(name, email, password, phone);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check details.');
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
    <div id="customer-register-page" className="min-h-screen bg-[#faf8f5] py-16 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-orange-100 shadow-xl space-y-5">
        
        <div className="text-center space-y-2">
          <div onClick={() => navigate('/')} className="inline-block cursor-pointer">
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
            Create Pilgrim Account
          </h2>
          <p className="text-xs text-slate-500">
            Join thousands of pilgrims experiencing sacred ease and VIP darshan
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Continue with Google */}
        <div>
          <GoogleSignInButton
            text="Continue with Google"
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            isSubmitting={loading}
          />
        </div>

        <AuthOrDivider label="OR REGISTER WITH EMAIL" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohan Sharma"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rohan@example.com"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-sm rounded-full shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Creating Account...' : 'Register'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Already registered? </span>
          <button
            onClick={() => navigate('/login')}
            className="font-bold text-[#ea580c] hover:underline"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
