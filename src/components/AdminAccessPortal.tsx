import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { BaseInput, BaseSelect } from './FormField.js';
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Search,
  ExternalLink,
  Crown,
  Calendar,
  Layers,
  Pencil,
  UserCog,
  Globe,
} from 'lucide-react';

export interface AdminRecord {
  id: string;
  email: string;
  role: 'Super Admin' | 'Admin (Enterprise Operations)' | 'Operations Lead' | string;
  created_at: string;
  status?: string;
  name?: string;
}

export const AdminAccessPortal: React.FC = () => {
  const { adminUser } = useAuth();

  // Provisioning Form State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'Super Admin' | 'Admin (Enterprise Operations)' | 'Operations Lead'>(
    'Admin (Enterprise Operations)'
  );

  // Status & List State
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Feedback Notifications
  const [successData, setSuccessData] = useState<{
    email: string;
    password?: string;
    role: string;
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Confirmation Modal for Revoking Access
  const [revokingAdmin, setRevokingAdmin] = useState<AdminRecord | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Edit Admin Modal State
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null);
  const [editRole, setEditRole] = useState<string>('Admin (Enterprise Operations)');
  const [editStatus, setEditStatus] = useState<string>('Active & Authorized');
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch allowlist & admins
  const loadAdmins = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // 1. Try Supabase admin_allowlist query
      const { data: supaList, error: supaErr } = await supabase
        .from('admin_allowlist')
        .select('*')
        .order('created_at', { ascending: false });

      let list: AdminRecord[] = [];

      if (!supaErr && Array.isArray(supaList) && supaList.length > 0) {
        list = supaList.map((item: any) => ({
          id: item.id,
          email: item.email,
          role: normalizeRole(item.role),
          created_at: item.created_at || new Date().toISOString(),
          status: item.status || 'Active & Authorized',
          name: item.email.split('@')[0],
        }));
      } else {
        // 2. Fallback to API allowlist endpoint
        const apiList = await api.getAdminAllowlist();
        list = apiList.map((item: any) => ({
          id: item.id,
          email: item.email,
          role: normalizeRole(item.role),
          created_at: item.created_at || new Date().toISOString(),
          status: item.status || 'Active & Authorized',
          name: item.email.split('@')[0],
        }));
      }

      // Ensure root admin is always present
      if (!list.some((a) => a.email.toLowerCase() === 'anupamsaxena.dev@gmail.com')) {
        list.unshift({
          id: 'usr-root-admin',
          email: 'anupamsaxena.dev@gmail.com',
          role: 'Super Admin',
          created_at: '2026-01-01T00:00:00.000Z',
          status: 'Active & Authorized',
          name: 'Anupam Saxena',
        });
      }

      setAdmins(list);
    } catch (err: any) {
      console.warn('[AdminAccessPortal] loadAdmins fallback error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    const handleSync = () => {
      loadAdmins();
    };
    window.addEventListener('tirth-staff-roster-changed', handleSync);
    window.addEventListener('tirth-allowlist-changed', handleSync);
    return () => {
      window.removeEventListener('tirth-staff-roster-changed', handleSync);
      window.removeEventListener('tirth-allowlist-changed', handleSync);
    };
  }, []);

  const normalizeRole = (r?: string): string => {
    if (!r) return 'Admin (Enterprise Operations)';
    const clean = r.toLowerCase();
    if (clean.includes('super')) return 'Super Admin';
    if (clean.includes('lead')) return 'Operations Lead';
    if (clean.includes('admin')) return 'Admin (Enterprise Operations)';
    return r;
  };

  // Generate strong random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAdminPassword(pwd);
    setShowPassword(true);
  };

  // Form Submit Handler
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessData(null);

    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanPassword = adminPassword;

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid administrator email address.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setErrorMessage('Password must contain at least 6 characters.');
      return;
    }

    // Check if email already exists in allowlist
    const existing = admins.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      setErrorMessage(`Administrator with email "${cleanEmail}" is already provisioned.`);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Call dedicated API / Edge function endpoint for user credential creation & allowlist registration
      const result = await api.provisionAdminUser({
        admin_email: cleanEmail,
        admin_password: cleanPassword,
        role,
      });

      // 2. Also ensure Supabase Auth sync is attempted
      try {
        await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              role,
              is_admin: true,
            },
          },
        });
      } catch (authErr) {
        console.warn('[AdminAccessPortal] Supabase client signUp note:', authErr);
      }

      // 3. Update UI state with provisioned details
      setSuccessData({
        email: cleanEmail,
        password: cleanPassword,
        role,
        message: result.message || `Administrator ${cleanEmail} has been provisioned successfully!`,
      });

      // Reset form
      setAdminEmail('');
      setAdminPassword('');
      setShowPassword(false);

      // Refresh table
      await loadAdmins();

      // Dispatch synchronization events to immediately update Staff Directory
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-staff-roster-changed'));
        window.dispatchEvent(new CustomEvent('tirth-allowlist-changed'));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to provision administrator account. Please check inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Revoke Admin Access Handler
  const handleRevokeConfirm = async () => {
    if (!revokingAdmin) return;
    const clean = revokingAdmin.email.toLowerCase().trim();

    if (clean === 'anupamsaxena.dev@gmail.com') {
      setErrorMessage('Security Alert: The Root Enterprise Administrator cannot be revoked.');
      setRevokingAdmin(null);
      return;
    }

    setRevoking(true);
    try {
      await api.revokeAdminAccess(revokingAdmin.id || revokingAdmin.email);
      setRevokingAdmin(null);
      await loadAdmins();

      // Dispatch synchronization events to immediately update Staff Directory
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-staff-roster-changed'));
        window.dispatchEvent(new CustomEvent('tirth-allowlist-changed'));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to revoke administrator access.');
    } finally {
      setRevoking(false);
    }
  };

  // Copy email to clipboard
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Open Edit Profile & Role modal
  const handleStartEdit = (adm: AdminRecord) => {
    setEditingAdmin(adm);
    setEditRole(adm.role);
    setEditStatus(adm.status || 'Active & Authorized');
  };

  // Save changes to Admin profile & allowlist
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setSavingEdit(true);
    setErrorMessage('');
    try {
      await api.updateAdminAllowlistEntry(editingAdmin.id || editingAdmin.email, {
        role: editRole,
        status: editStatus,
      });

      setAdmins((prev) =>
        prev.map((a) =>
          a.id === editingAdmin.id || a.email.toLowerCase() === editingAdmin.email.toLowerCase()
            ? { ...a, role: editRole, status: editStatus }
            : a
        )
      );

      setEditingAdmin(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-allowlist-changed'));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update administrator profile.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Filtered list
  const filteredAdmins = admins.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      a.email.toLowerCase().includes(q) ||
      (a.name && a.name.toLowerCase().includes(q)) ||
      a.role.toLowerCase().includes(q)
    );
  });

  const getRoleBadgeStyle = (r: string) => {
    if (r === 'Super Admin') {
      return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    }
    if (r === 'Operations Lead') {
      return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
    }
    return 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-orange-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>Enterprise Identity & Access Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Admin Access & Credential Provisioning
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Create and manage elevated administrator accounts with full Supabase Auth and database
              allowlist enforcement. Only authorized emails can access the administration portal.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadAdmins}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Allowlist</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0a192f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Provisioned
            </p>
            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <UsersIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{admins.length}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Authorized admin accounts</p>
        </div>

        <div className="bg-white dark:bg-[#0a192f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Super Admins
            </p>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {admins.filter((a) => a.role === 'Super Admin').length}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Full root & policy rights</p>
        </div>

        <div className="bg-white dark:bg-[#0a192f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Allowlist Security
            </p>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">Enforced</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Strict RLS + Route Guard active</p>
        </div>

        <div className="bg-white dark:bg-[#0a192f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Your Session
            </p>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-2 truncate">
            {adminUser?.email || 'Active Admin'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Status: <span className="text-emerald-600 font-semibold">Authorized</span>
          </p>
        </div>
      </div>

      {/* 3. Success Notification Modal / Card */}
      {successData && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-5 rounded-2xl relative shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Administrator Account Provisioned Successfully
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                {successData.message}
              </p>
              <div className="mt-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Email: </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{successData.email}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Role: </span>
                  <span className="font-bold text-slate-900 dark:text-white">{successData.role}</span>
                </div>
                {successData.password && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Password: </span>
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold text-slate-800 dark:text-slate-200">
                      {successData.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyEmail(successData.password || '')}
                      className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setSuccessData(null)}
              className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 text-xs font-bold px-2 py-1 rounded cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 4. Error Message Alert */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 p-4 rounded-2xl flex items-center justify-between text-xs text-red-800 dark:text-red-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-red-600 font-bold hover:underline cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* 5. Main Content: Provisioning Form (Left) & Admin Directory (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* FORM: Provision New Administrator */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0a192f] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-9 h-9 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Provision New Administrator</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Creates Supabase Auth credentials and registers user in the admin allowlist
              </p>
            </div>
          </div>

          <form onSubmit={handleProvisionSubmit} className="space-y-4">
            {/* Input: admin_email */}
            <div>
              <label
                htmlFor="provision-admin-email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Admin Gmail ID or Work Email <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <BaseInput
                  id="provision-admin-email"
                  name="admin_email"
                  type="email"
                  autoComplete="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="e.g. rahul.yatra@gmail.com or operations@tirthyatratrails.in"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Enter any personal or corporate Google account (@gmail.com) or verified custom domain address.
              </p>
            </div>

            {/* Input: admin_password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="provision-admin-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Initial Password / Passcode <span className="text-orange-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate Secure</span>
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <BaseInput
                  id="provision-admin-password"
                  name="admin_password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Minimum 6 characters..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Select: Role Selection */}
            <div>
              <label
                htmlFor="provision-role-selection"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Access Role Tier <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <BaseSelect
                  id="provision-role-selection"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="Super Admin">Super Admin (Full Enterprise Privileges)</option>
                  <option value="Admin (Enterprise Operations)">
                    Admin (Enterprise Operations) - Standard Management
                  </option>
                  <option value="Operations Lead">Operations Lead - Inquiries & Logistics</option>
                </BaseSelect>
              </div>

              {/* Role description hint */}
              <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                {role === 'Super Admin' && (
                  <p>
                    <strong className="text-amber-600 dark:text-amber-400">Super Admin:</strong> Unrestricted access
                    to staff management, allowlist additions, security policies, and financial reporting.
                  </p>
                )}
                {role === 'Admin (Enterprise Operations)' && (
                  <p>
                    <strong className="text-orange-600 dark:text-orange-400">Enterprise Operations:</strong> Access
                    to manage hotels, packages, inquiries, cities, and traveller reviews.
                  </p>
                )}
                {role === 'Operations Lead' && (
                  <p>
                    <strong className="text-blue-600 dark:text-blue-400">Operations Lead:</strong> Focuses on travel
                    desk inquiries, customer communication, and daily dispatch schedules.
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="btn-provision-admin"
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Provisioning Account...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Provision Admin Credentials</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* TABLE: Active Admin Allowlist & Status */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0a192f] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Authorized Enterprise Administrators
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Accounts permitted to authenticate via <code>/admin/login</code>
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <BaseInput
                id="search-administrators-input"
                name="search_administrators"
                type="search"
                autoComplete="off"
                aria-label="Search administrators"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search administrators..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Administrators Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-2.5 px-3">Administrator</th>
                  <th className="py-2.5 px-3">Role Tier</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Provisioned</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      No matching administrators found.
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((adm) => {
                    const isRoot = adm.email.toLowerCase() === 'anupamsaxena.dev@gmail.com';
                    const initials = (adm.name || adm.email)
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={adm.id || adm.email}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Administrator info */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                              {initials}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {adm.email}
                                </span>
                                {isRoot && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                    <Crown className="w-2.5 h-2.5" />
                                    <span>Root</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">ID: {adm.id?.slice(0, 12)}...</span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(
                              adm.role
                            )}`}
                          >
                            {adm.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{adm.status || 'Active & Authorized'}</span>
                          </span>
                        </td>

                        {/* Provisioned Timestamp */}
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{new Date(adm.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Copy Email */}
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(adm.email)}
                              title="Copy Email"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              {copiedEmail === adm.email ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Edit Profile & Role */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(adm)}
                              title="Edit Admin Profile & Role"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Revoke Access Button */}
                            {isRoot ? (
                              <span
                                title="Root administrator cannot be revoked"
                                className="p-1.5 rounded-lg text-slate-300 dark:text-slate-700 cursor-not-allowed"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRevokingAdmin(adm)}
                                title="Revoke Admin Access"
                                className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Revoke Confirmation Modal */}
      {revokingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a192f] max-w-md w-full p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Revoke Administrator Access?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Are you sure you want to revoke admin privileges for:
              </p>
              <p className="font-mono text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 py-1 px-2 rounded-lg inline-block mt-1">
                {revokingAdmin.email}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2">
                This administrator will immediately be blocked from logging into the portal and any active
                sessions will be invalidated.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRevokingAdmin(null)}
                disabled={revoking}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeConfirm}
                disabled={revoking}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {revoking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{revoking ? 'Revoking...' : 'Yes, Revoke Access'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Edit Admin Profile & Role Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a192f] max-w-md w-full p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <UserCog className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Admin Profile & Role
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {editingAdmin.email}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label htmlFor="edit-role-selection" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Elevated Role Tier
                </label>
                <BaseSelect
                  id="edit-role-selection"
                  name="edit_role"
                  aria-label="Elevated Role Tier"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="Super Admin">Super Admin (Full Enterprise Privileges)</option>
                  <option value="Admin (Enterprise Operations)">
                    Admin (Enterprise Operations) - Standard Management
                  </option>
                  <option value="Operations Lead">Operations Lead - Inquiries & Logistics</option>
                </BaseSelect>
              </div>

              {/* Status Selection */}
              <div>
                <label htmlFor="edit-status-selection" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Allowlist Authorization Status
                </label>
                <BaseSelect
                  id="edit-status-selection"
                  name="edit_status"
                  aria-label="Allowlist Authorization Status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="Active & Authorized">Active & Authorized</option>
                  <option value="Suspended / Inactive">Suspended / Inactive</option>
                </BaseSelect>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Mini Users icon helper
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
