import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Mail,
  Trash2,
  Copy,
  Check,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  Sparkles,
  Lock,
  ExternalLink,
} from 'lucide-react';

export interface AdminAllowlistEntry {
  id: string;
  email: string;
  role: string;
  created_at: string;
  isRoot?: boolean;
}

const ROOT_ADMIN_EMAIL = 'anupamsaxena.dev@gmail.com';

export const StaffAccess: React.FC = () => {
  const { adminUser } = useAuth();
  const [allowlist, setAllowlist] = useState<AdminAllowlistEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('admin');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auto-dismiss feedback after 6 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Fetch live allowlist entries from Supabase table admin_allowlist
  const fetchAllowlist = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_allowlist')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      if (data && Array.isArray(data)) {
        // Ensure root admin is present
        const mapped: AdminAllowlistEntry[] = data.map((item: any) => ({
          id: item.id || `allow-${item.email}`,
          email: item.email,
          role: item.role || 'admin',
          created_at: item.created_at || new Date().toISOString(),
          isRoot: item.email?.toLowerCase().trim() === ROOT_ADMIN_EMAIL,
        }));

        // Guarantee root admin is listed
        if (!mapped.some((e) => e.email.toLowerCase() === ROOT_ADMIN_EMAIL)) {
          mapped.unshift({
            id: 'root-admin-001',
            email: ROOT_ADMIN_EMAIL,
            role: 'admin',
            created_at: '2026-01-01T00:00:00.000Z',
            isRoot: true,
          });
        }

        setAllowlist(mapped);
      }
    } catch (err: any) {
      console.warn('[StaffAccess] Error querying admin_allowlist:', err);
      // Fallback roster
      setAllowlist([
        {
          id: 'root-admin-001',
          email: ROOT_ADMIN_EMAIL,
          role: 'admin',
          created_at: '2026-01-01T00:00:00.000Z',
          isRoot: true,
        },
        {
          id: 'admin-002',
          email: 'admin@tirthyatratrails.com',
          role: 'admin',
          created_at: '2026-02-15T00:00:00.000Z',
          isRoot: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllowlist();
  }, []);

  // Form handler: Add new admin email to admin_allowlist
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setFeedback({ type: 'error', message: 'Please enter a valid administrator email.' });
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFeedback({ type: 'error', message: 'Please enter a well-formed email address.' });
      return;
    }

    // Check if already in allowlist
    const existing = allowlist.some((entry) => entry.email.toLowerCase() === cleanEmail);
    if (existing) {
      setFeedback({
        type: 'error',
        message: `Administrator '${cleanEmail}' is already authorized in the allowlist.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('admin_allowlist')
        .insert([{ email: cleanEmail, role: newRole }])
        .select('*');

      if (error) {
        throw error;
      }

      setFeedback({
        type: 'success',
        message: `Successfully provisioned access for '${cleanEmail}'. They are now authorized to sign in.`,
      });
      setNewEmail('');
      setNewRole('admin');
      await fetchAllowlist();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to add administrator to allowlist. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Revoke/Delete an entry from admin_allowlist
  const handleRemoveEntry = async (entry: AdminAllowlistEntry) => {
    if (entry.isRoot || entry.email.toLowerCase() === ROOT_ADMIN_EMAIL) {
      setFeedback({
        type: 'error',
        message: 'The primary root administrator cannot be removed from the allowlist.',
      });
      return;
    }

    const confirmRemove = window.confirm(
      `Are you sure you want to revoke admin access for "${entry.email}"? They will be immediately blocked from the admin portal.`
    );
    if (!confirmRemove) return;

    setDeletingId(entry.id);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from('admin_allowlist')
        .delete()
        .eq('email', entry.email);

      if (error) {
        throw error;
      }

      setFeedback({
        type: 'success',
        message: `Access revoked for ${entry.email}.`,
      });
      await fetchAllowlist();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || `Failed to revoke access for ${entry.email}.`,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredAllowlist = allowlist.filter((entry) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      entry.email.toLowerCase().includes(q) ||
      entry.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Operational Context */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-300/40 dark:border-amber-700/50 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-600/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black font-serif text-slate-900 dark:text-white">
                  Admin Allowlist &amp; Access Controls
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60">
                  RLS Enforced
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Authorized administrators in <code className="px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-800 font-mono text-[11px] text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-slate-700">admin_allowlist</code> can access the Enterprise Operations Desk. Unauthorized accounts are automatically signed out and denied entrance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={fetchAllowlist}
              disabled={loading}
              className="px-3 py-1.5 bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-orange-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Roster</span>
            </button>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-amber-200/50 dark:border-amber-800/40">
          <div className="bg-white/80 dark:bg-[#0d1d33]/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
              Total Authorized Admins
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
              {allowlist.length}
            </span>
          </div>

          <div className="bg-white/80 dark:bg-[#0d1d33]/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
              Root Administrator
            </span>
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 truncate mt-1 block">
              {ROOT_ADMIN_EMAIL}
            </span>
          </div>

          <div className="bg-white/80 dark:bg-[#0d1d33]/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
              Authentication Guard
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Route Guard
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Toast / Alert */}
      {feedback && (
        <div
          id="admin-allowlist-feedback"
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/60 border-red-300 text-red-800 dark:text-red-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <p className="leading-relaxed">{feedback.message}</p>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: Add New Administrator Form */}
      <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <UserPlus className="w-4 h-4 text-orange-600" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Authorize New Administrator
          </h3>
        </div>

        <form onSubmit={handleAddEmail} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-7">
              <label
                htmlFor="new-admin-email"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Admin Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="new-admin-email"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. operations@tirthyatratrails.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="new-admin-role"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Assigned Role
              </label>
              <select
                id="new-admin-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors cursor-pointer"
              >
                <option value="admin">Admin (Enterprise Operations)</option>
                <option value="super_admin">Super Admin</option>
                <option value="ops_admin">Operations Lead</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                id="btn-add-admin-allowlist"
                type="submit"
                disabled={submitting || !newEmail.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{submitting ? 'Adding...' : 'Add to Allowlist'}</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Adding this email inserts an entry into the Supabase <code className="font-mono text-orange-600 dark:text-orange-400">admin_allowlist</code> table. When this user authenticates, the login guard will grant immediate dashboard access.
          </p>
        </form>
      </div>

      {/* SECTION 2: Live Provisioned Admin List */}
      <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Provisioned Admin Allowlist ({allowlist.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search admin emails..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Allowlist Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/80 text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-3">Administrator</th>
                <th className="py-3 px-3">Role / Status</th>
                <th className="py-3 px-3">Date Added</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAllowlist.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No administrators found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAllowlist.map((entry) => {
                  const isCurrentRoot = entry.isRoot || entry.email.toLowerCase() === ROOT_ADMIN_EMAIL;
                  return (
                    <tr
                      key={entry.id || entry.email}
                      className="hover:bg-slate-50 dark:hover:bg-[#0a1628] transition-colors"
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                            isCurrentRoot
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200'
                          }`}>
                            {entry.email[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {entry.email}
                              </span>
                              {isCurrentRoot && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300/80 flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>Root Admin</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              ID: {entry.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                          isCurrentRoot
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/40'
                            : 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-400/40'
                        }`}>
                          <Shield className="w-3 h-3" />
                          <span>{entry.role}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                        {new Date(entry.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopyEmail(entry.email, entry.id)}
                            title="Copy email address"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-orange-600 transition-colors cursor-pointer"
                          >
                            {copiedId === entry.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {!isCurrentRoot && (
                            <button
                              onClick={() => handleRemoveEntry(entry)}
                              disabled={deletingId === entry.id}
                              title="Revoke Administrator Access"
                              className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer disabled:opacity-50"
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
  );
};

export default StaffAccess;
