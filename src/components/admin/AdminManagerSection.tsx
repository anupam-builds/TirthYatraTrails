import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  Mail,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Users,
  Terminal,
  Clock,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface AdministratorItem {
  id: string;
  email: string;
  name: string;
  role: string;
  isRoot?: boolean;
  provisionedAt?: string;
}

interface ToastState {
  type: 'error' | 'success' | 'info';
  message: string;
  timestamp: number;
}

export const AdminManagerSection: React.FC = () => {
  const { adminUser } = useAuth();
  const [targetEmail, setTargetEmail] = useState('');
  const [targetPassword, setTargetPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [adminsList, setAdminsList] = useState<AdministratorItem[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);

  const ROOT_ADMIN_EMAIL = 'anupamsaxena.dev@gmail.com';
  const isCurrentCallerRoot = adminUser?.email?.toLowerCase().trim() === ROOT_ADMIN_EMAIL;

  // Auto-dismiss toast after 7 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load existing administrators roster
  const loadAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      const list = await api.getAdministrators();
      setAdminsList(list);
    } catch (err) {
      console.warn('[AdminManagerSection] Error loading admin roster:', err);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    const cleanEmail = targetEmail.trim().toLowerCase();
    const cleanPassword = targetPassword;

    if (!cleanEmail || !cleanPassword) {
      setToast({
        type: 'error',
        message: 'Please provide both target administrator email and password.',
        timestamp: Date.now(),
      });
      return;
    }

    if (cleanPassword.length < 6) {
      setToast({
        type: 'error',
        message: 'Password must be at least 6 characters in length.',
        timestamp: Date.now(),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // MASTER REQUIREMENT: Submit handler invokes supabase.rpc('create_sub_admin', { target_email, target_password })
      const { data, error } = await supabase.rpc('create_sub_admin', {
        target_email: cleanEmail,
        target_password: cleanPassword,
      });

      if (error) {
        // MASTER REQUIREMENT: Handle unauthorized rejections cleanly with toast notification
        const isUnauthorized =
          error.message?.includes('anupamsaxena.dev@gmail.com') ||
          error.code === 'P0001' ||
          error.details?.includes('anupamsaxena.dev@gmail.com');

        const toastMsg = isUnauthorized
          ? 'Only root admin anupamsaxena.dev@gmail.com can provision new administrators'
          : error.message || 'Only root admin anupamsaxena.dev@gmail.com can provision new administrators';

        setToast({
          type: 'error',
          message: toastMsg,
          timestamp: Date.now(),
        });
        return;
      }

      // Success feedback state
      setToast({
        type: 'success',
        message: `Secondary administrator "${cleanEmail}" provisioned successfully via Supabase Admin RPC.`,
        timestamp: Date.now(),
      });

      setTargetEmail('');
      setTargetPassword('');
      await loadAdmins();
    } catch (err: any) {
      const isUnauthorized =
        err?.message?.includes('anupamsaxena.dev@gmail.com') ||
        err?.code === 'P0001';

      const toastMsg = isUnauthorized
        ? 'Only root admin anupamsaxena.dev@gmail.com can provision new administrators'
        : err?.message || 'Only root admin anupamsaxena.dev@gmail.com can provision new administrators';

      setToast({
        type: 'error',
        message: toastMsg,
        timestamp: Date.now(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="admin-manager-section-container">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          id="admin-provisioning-toast"
          className={`flex items-start justify-between p-4 rounded-xl border shadow-lg transition-all animate-fadeIn ${
            toast.type === 'error'
              ? 'bg-rose-950/80 border-rose-600/50 text-rose-200'
              : 'bg-emerald-950/80 border-emerald-600/50 text-emerald-200'
          }`}
          role="alert"
        >
          <div className="flex items-start gap-3">
            {toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-xs uppercase font-bold tracking-wider opacity-75">
                {toast.type === 'error' ? 'Security Guard Rejection' : 'RPC Provisioning Complete'}
              </p>
              <p className="text-sm font-medium mt-0.5">{toast.message}</p>
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            aria-label="Close notification"
            id="dismiss-admin-toast-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Provisioning Card */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        {/* Subtle decorative background accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-800 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
                Secondary Administrator Provisioning
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  Supabase RPC
                </span>
              </h2>
              <p className="text-sm text-neutral-400">
                Server-enforced administrative credential gate backed by PostgreSQL RPC{' '}
                <code className="text-xs bg-neutral-800 px-1.5 py-0.5 rounded text-amber-400 font-mono">
                  create_sub_admin
                </code>
              </p>
            </div>
          </div>

          {/* Caller Identity Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs">
            <Shield className={`w-4 h-4 ${isCurrentCallerRoot ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div className="text-left">
              <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Active Session</span>
              <span className="font-mono text-neutral-200">
                {adminUser?.email || 'Authenticated Admin'}
              </span>
            </div>
            {isCurrentCallerRoot ? (
              <span className="ml-2 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/40">
                ROOT ADMIN
              </span>
            ) : (
              <span className="ml-2 px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-medium text-[10px]">
                SECONDARY
              </span>
            )}
          </div>
        </div>

        {/* Security Advisory Pill */}
        {!isCurrentCallerRoot && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-start gap-3 text-amber-200 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong className="font-semibold text-amber-300">Root Gating Active:</strong> Only the primary
              root administrator (<span className="font-mono underline">{ROOT_ADMIN_EMAIL}</span>) is permitted to
              provision new administrators into the Supabase authentication layer. Submissions from other accounts
              will be rejected by the server-side RPC guard.
            </p>
          </div>
        )}

        {/* Provisioning Form */}
        <form onSubmit={handleProvisionSubmit} className="space-y-5" id="admin-provision-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Input: New Admin Email */}
            <div className="space-y-2">
              <label
                htmlFor="new-admin-email"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-300"
              >
                New Admin Email <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="new-admin-email"
                  name="target_email"
                  type="email"
                  required
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="e.g. ops.admin@tirthyatratrails.com"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-neutral-100 text-sm placeholder:text-neutral-500 transition-colors disabled:opacity-50"
                />
              </div>
              <p className="text-[11px] text-neutral-500">
                Must be an active corporate or operator email for administrative access.
              </p>
            </div>

            {/* Input: New Admin Password */}
            <div className="space-y-2">
              <label
                htmlFor="new-admin-password"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-300"
              >
                New Admin Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new-admin-password"
                  name="target_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={targetPassword}
                  onChange={(e) => setTargetPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-neutral-100 text-sm placeholder:text-neutral-500 transition-colors disabled:opacity-50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-200"
                  tabIndex={-1}
                  id="toggle-admin-password-visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-neutral-500">
                Encrypted via Blowfish / bcrypt upon ingestion into Supabase Auth.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Terminal className="w-4 h-4 text-neutral-500" />
              <span>RPC Target: <span className="font-mono text-neutral-300">public.create_sub_admin()</span></span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              id="submit-provision-admin-button"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Invoking RPC...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Provision Sub-Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Administrators Directory */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-neutral-100">
              Active Administrator Roster
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
              {adminsList.length} Accounts
            </span>
          </div>

          <button
            onClick={loadAdmins}
            disabled={isLoadingAdmins}
            id="refresh-admin-roster-button"
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-amber-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-neutral-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAdmins ? 'animate-spin' : ''}`} />
            <span>Sync Roster</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/60 text-neutral-400 uppercase tracking-wider font-semibold border-b border-neutral-800">
              <tr>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Role & Privilege</th>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Auth Channel</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {adminsList.map((admin) => (
                <tr key={admin.id} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          admin.isRoot
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {admin.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-200">{admin.name || admin.email.split('@')[0]}</div>
                        <div className="font-mono text-[11px] text-neutral-400">{admin.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[11px]">
                      {admin.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {admin.isRoot ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                        <Sparkles className="w-3.5 h-3.5" />
                        Root Superadmin
                      </span>
                    ) : (
                      <span className="text-neutral-400">
                        Secondary Admin
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <Key className="w-3 h-3 text-neutral-500" />
                      Supabase Auth / OTP
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
