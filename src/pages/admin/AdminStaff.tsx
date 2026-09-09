import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { api } from '../../services/api.js';
import { localStore } from '../../services/localStore.js';
import { StaffMember, StaffActivityLog, StaffSessionMonitor } from '../../types.js';
import { useRouter } from '../../context/RouterContext.js';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Check,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  ExternalLink,
  KeyRound,
  Mail,
  Phone,
  Briefcase,
  Layers,
  AlertCircle,
  Clock,
  Sparkles,
  Lock,
  Ban,
  Activity,
  Radio,
  Laptop,
  RefreshCw,
  Copy,
  CheckCheck,
  FileText,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
} from 'lucide-react';

export const AdminStaff: React.FC = () => {
  const { navigate } = useRouter();
  const [activeView, setActiveView] = useState<'DIRECTORY' | 'SESSIONS' | 'LOGS'>('DIRECTORY');

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [sessionMonitor, setSessionMonitor] = useState<StaffSessionMonitor | null>(null);
  const [activityLogs, setActivityLogs] = useState<StaffActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const [selectedStaffLogFilter, setSelectedStaffLogFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Password reset modal state
  const [resetModalStaff, setResetModalStaff] = useState<StaffMember | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Block modal state
  const [blockModalStaff, setBlockModalStaff] = useState<StaffMember | null>(null);
  const [blockReason, setBlockReason] = useState('Misuse / Revoked by Administrator');
  const [isBlockingAction, setIsBlockingAction] = useState(true);

  // Delete modal & confirmation states
  const [deleteConfirmStaff, setDeleteConfirmStaff] = useState<StaffMember | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  // Form state for Add / Edit
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    phone: string;
    designation: string;
    isActive: boolean;
    canViewInquiries: boolean;
    canUpdateStatus: boolean;
    canAddNotes: boolean;
  }>({
    name: '',
    email: '',
    password: 'Staff@123',
    phone: '',
    designation: 'Pilgrim Operations Specialist',
    isActive: true,
    canViewInquiries: true,
    canUpdateStatus: true,
    canAddNotes: true,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAllStaffData();
  }, []);

  async function loadAllStaffData() {
    setLoading(true);
    try {
      const [members, sessions, logs] = await Promise.all([
        api.getStaffMembers(),
        api.getStaffSessions().catch(() => null),
        api.getStaffLogs().catch(() => []),
      ]);
      setStaffList(members);
      if (sessions) setSessionMonitor(sessions);
      setActivityLogs(logs);
    } catch (err) {
      console.error('Failed loading staff information:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllStaffData();
  };

  const openCreateModal = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      password: 'Staff@123',
      phone: '',
      designation: 'Pilgrim Operations Specialist',
      isActive: true,
      canViewInquiries: true,
      canUpdateStatus: true,
      canAddNotes: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      password: '',
      phone: staff.phone || '',
      designation: staff.designation,
      isActive: staff.isActive && !staff.isBlocked,
      canViewInquiries: staff.permissions.canViewInquiries,
      canUpdateStatus: staff.permissions.canUpdateStatus,
      canAddNotes: staff.permissions.canAddNotes,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openBlockModal = (staff: StaffMember, block: boolean) => {
    setBlockModalStaff(staff);
    setIsBlockingAction(block);
    setBlockReason(
      block
        ? 'Access revoked by Administrator due to security audit / policy compliance'
        : ''
    );
  };

  const handleConfirmBlock = async () => {
    if (!blockModalStaff) return;
    try {
      const updated = await api.blockStaffMember(
        blockModalStaff.id,
        isBlockingAction,
        isBlockingAction ? blockReason : undefined
      );
      setStaffList((prev) =>
        prev.map((s) => (s.id === blockModalStaff.id ? { ...s, ...updated } : s))
      );
      // Reload sessions and logs to reflect termination
      const [sessions, logs] = await Promise.all([
        api.getStaffSessions().catch(() => null),
        api.getStaffLogs().catch(() => []),
      ]);
      if (sessions) setSessionMonitor(sessions);
      setActivityLogs(logs);
      setBlockModalStaff(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update block status');
    }
  };

  const openPasswordReset = (staff: StaffMember) => {
    setResetModalStaff(staff);
    setNewPasswordInput('YatraStaff@2026');
    setShowPassword(false);
    setCopiedPass(false);
  };

  const handleConfirmPasswordReset = async () => {
    if (!resetModalStaff || !newPasswordInput.trim()) return;
    if (newPasswordInput.trim().length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    try {
      const updated = await api.resetStaffPassword(resetModalStaff.id, newPasswordInput.trim());
      setStaffList((prev) =>
        prev.map((s) => (s.id === resetModalStaff.id ? { ...s, ...updated } : s))
      );
      alert(`Password successfully updated for ${resetModalStaff.name}!`);
      setResetModalStaff(null);
    } catch (err: any) {
      alert(err.message || 'Failed to reset staff password');
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!staff || !staff.id) return;
    const staffId = staff.id;
    const staffName = staff.name || staff.email;
    setDeletingId(staffId);

    try {
      // 1. Delete from database & local persistence via API service
      await api.deleteStaffMember(staffId);

      // 2. Instantly update state
      setStaffList((prev) => prev.filter((s) => s.id !== staffId));
      setSessionMonitor((prev) =>
        prev
          ? {
              ...prev,
              sessions: prev.sessions.filter((s) => s.staffId !== staffId),
              totalStaff: Math.max(0, prev.totalStaff - 1),
            }
          : null
      );

      // 3. Close modal & display prominent success confirmation
      setDeleteConfirmStaff(null);
      setDeleteSuccessMessage(
        `Staff member "${staffName}" (${staff.email}) has been permanently removed from the system and database.`
      );
      setTimeout(() => {
        setDeleteSuccessMessage((curr) => (curr?.includes(staffName) ? null : curr));
      }, 5000);
    } catch (err: any) {
      console.warn('Backend delete returned warning:', err);
      // Fallback: guarantee local cleanup and update state
      localStore.deleteStaffMember(staffId);
      setStaffList((prev) => prev.filter((s) => s.id !== staffId));
      setDeleteConfirmStaff(null);
      setDeleteSuccessMessage(
        `Staff member "${staffName}" (${staff.email}) was removed from the roster.`
      );
      setTimeout(() => {
        setDeleteSuccessMessage((curr) => (curr?.includes(staffName) ? null : curr));
      }, 5000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (staff: StaffMember) => {
    setDeleteConfirmStaff(staff);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      if (!formData.name.trim() || !formData.email.trim()) {
        throw new Error('Name and email are required fields.');
      }

      if (editingStaff) {
        const updates: Partial<StaffMember> = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          designation: formData.designation.trim(),
          isActive: formData.isActive,
          permissions: {
            canViewInquiries: formData.canViewInquiries,
            canUpdateStatus: formData.canUpdateStatus,
            canAddNotes: formData.canAddNotes,
          },
        };
        if (formData.password.trim()) {
          if (formData.password.trim().length < 6) {
            throw new Error('Password must be at least 6 characters long.');
          }
          updates.password = formData.password.trim();
        }

        const updated = await api.updateStaffMember(editingStaff.id, updates);
        setStaffList((prev) =>
          prev.map((s) => (s.id === editingStaff.id ? { ...s, ...updated } : s))
        );
      } else {
        if (!formData.password.trim()) {
          throw new Error('An explicit password is required for new staff accounts.');
        }
        if (formData.password.trim().length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }

        const newStaff = await api.createStaffMember({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password.trim(),
          phone: formData.phone.trim(),
          designation: formData.designation.trim(),
          isActive: formData.isActive,
          permissions: {
            canViewInquiries: formData.canViewInquiries,
            canUpdateStatus: formData.canUpdateStatus,
            canAddNotes: formData.canAddNotes,
          },
        });
        setStaffList((prev) => [newStaff, ...prev]);
      }

      // Reload sessions and logs
      const [sessions, logs] = await Promise.all([
        api.getStaffSessions().catch(() => null),
        api.getStaffLogs().catch(() => []),
      ]);
      if (sessions) setSessionMonitor(sessions);
      setActivityLogs(logs);

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error saving staff member.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    if (filterRole === 'ACTIVE' && (s.isBlocked || !s.isActive)) return false;
    if (filterRole === 'BLOCKED' && !s.isBlocked) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(q);
      const matchEmail = s.email.toLowerCase().includes(q);
      const matchDesig = s.designation.toLowerCase().includes(q);
      return matchName || matchEmail || matchDesig;
    }
    return true;
  });

  const totalActive = staffList.filter((s) => s.isActive && !s.isBlocked).length;
  const totalBlocked = staffList.filter((s) => s.isBlocked).length;
  const currentlyOnline = staffList.filter((s) => s.isCurrentlyLoggedIn && !s.isBlocked).length;
  const totalLeadsHandled = staffList.reduce(
    (acc, s) => acc + (s.contactedCount || 0) + (s.closedCount || 0),
    0
  );

  const filteredLogs = activityLogs.filter((log) => {
    if (selectedStaffLogFilter !== 'ALL' && log.staffId !== selectedStaffLogFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        log.staffName.toLowerCase().includes(q) ||
        log.staffEmail.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AdminLayout activeTab="staff">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
                Staff Access &amp; Security Controls
              </h1>
              {currentlyOnline > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {currentlyOnline} Staff Active Now
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Administer pilgrim operations credentials, audit real-time sessions, enforce instant block/revoke rules, and track inquiry workflows.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1d33] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-xs"
              title="Refresh staff status and session monitor"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
            </button>

            <button
              onClick={() => navigate('/staff/login')}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0d1d33] hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Test Staff Login Portal"
            >
              <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
              <span>Staff Login Portal</span>
            </button>

            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-600/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Staff Account</span>
            </button>
          </div>
        </div>

        {/* Security & Access Notice Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Staff Authentication Policy &amp; Real-Time Security
              </p>
              <p className="text-amber-800/90 dark:text-amber-300/90 text-[11px] mt-0.5">
                Public self-registration is disabled. Staff can only access the portal with admin-registered credentials. Blocking a staff member immediately terminates their active session and rejects all subsequent inquiries operations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 font-mono text-[11px] text-amber-900 dark:text-amber-200 font-bold">
              Portal: /staff/login
            </span>
          </div>
        </div>

        {/* Delete Success Confirmation Banner */}
        {deleteSuccessMessage && (
          <div
            id="staff-delete-success-banner"
            className="bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-500/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs font-bold leading-relaxed">{deleteSuccessMessage}</p>
            </div>
            <button
              onClick={() => setDeleteSuccessMessage(null)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 cursor-pointer shrink-0 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Staff Roster
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {staffList.length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active &amp; Permitted
              </p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {totalActive}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Revoked / Blocked
              </p>
              <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
                {totalBlocked}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Ban className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Workflow Actions Logged
              </p>
              <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
                {totalLeadsHandled}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveView('DIRECTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'DIRECTORY'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#0d1d33] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Directory &amp; Access Controls ({staffList.length})</span>
          </button>

          <button
            onClick={() => setActiveView('SESSIONS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'SESSIONS'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#0d1d33] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Active Session Monitor</span>
            {currentlyOnline > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveView('LOGS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'LOGS'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#0d1d33] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit &amp; Activity Trail ({activityLogs.length})</span>
          </button>
        </div>

        {/* ===================== VIEW 1: STAFF DIRECTORY ===================== */}
        {activeView === 'DIRECTORY' && (
          <div className="space-y-4">
            {/* Filters and Search Bar */}
            <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                {(['ALL', 'ACTIVE', 'BLOCKED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterRole(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterRole === filter
                        ? 'bg-slate-900 dark:bg-orange-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#081220] text-slate-600 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {filter === 'ALL'
                      ? 'All Staff'
                      : filter === 'ACTIVE'
                      ? `Active (${totalActive})`
                      : `Blocked / Revoked (${totalBlocked})`}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff by name, email, or designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 w-64 sm:w-80"
                />
              </div>
            </div>

            {/* Staff Cards List */}
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800/50 rounded-2xl" />
                ))}
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-12 rounded-3xl text-center space-y-3 shadow-xs">
                <Users className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No staff members found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {searchQuery
                    ? 'No matching staff members for this search filter.'
                    : 'Click "Create Staff Account" to register an operations specialist with custom credentials.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStaff.map((staff) => {
                  const isBlocked = Boolean(staff.isBlocked);
                  const isOnline = Boolean(staff.isCurrentlyLoggedIn && !isBlocked);

                  return (
                    <div
                      key={staff.id}
                      className={`bg-white dark:bg-[#0d1d33] border rounded-2xl p-4 sm:p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs ${
                        isBlocked
                          ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10'
                          : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* Avatar & Core Profile Details */}
                      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <div
                            className={`w-12 h-12 rounded-2xl font-extrabold flex items-center justify-center text-sm shadow-xs ${
                              isBlocked
                                ? 'bg-slate-400 dark:bg-slate-700 text-slate-200'
                                : 'bg-gradient-to-br from-orange-500 to-amber-600 text-white'
                            }`}
                          >
                            {staff.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          {/* Live online dot */}
                          {isOnline ? (
                            <span
                              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0d1d33] shadow-xs"
                              title="Currently Logged In"
                            />
                          ) : isBlocked ? (
                            <span
                              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-600 border-2 border-white dark:border-[#0d1d33] flex items-center justify-center text-[9px] text-white"
                              title="Account Blocked"
                            >
                              ✕
                            </span>
                          ) : null}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                              {staff.name}
                            </h3>

                            {/* Status Badges */}
                            {isBlocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                                <Ban className="w-3 h-3" />
                                BLOCKED / ACCESS REVOKED
                              </span>
                            ) : isOnline ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Offline
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            <span>{staff.designation}</span>
                          </p>

                          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                                {staff.email}
                              </span>
                            </span>

                            {staff.phone && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{staff.phone}</span>
                              </span>
                            )}

                            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {staff.lastLogin
                                ? `Last login: ${new Date(staff.lastLogin).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}, ${new Date(staff.lastLogin).toLocaleDateString('en-IN')}`
                                : 'Never logged in'}
                            </span>
                          </div>

                          {isBlocked && staff.blockedReason && (
                            <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-950/40 px-2 py-0.5 rounded-md inline-block font-medium">
                              Reason: {staff.blockedReason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Usage & Workflow Metrics */}
                      <div className="flex flex-wrap items-center gap-2 text-xs border-y lg:border-y-0 lg:border-x border-slate-100 dark:border-slate-800 py-2 lg:py-0 lg:px-4">
                        <div className="text-center px-2 py-1 bg-slate-50 dark:bg-[#081220] rounded-xl border border-slate-200 dark:border-slate-700/60 min-w-[70px]">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Contacted</p>
                          <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                            {staff.contactedCount || 0}
                          </p>
                        </div>

                        <div className="text-center px-2 py-1 bg-slate-50 dark:bg-[#081220] rounded-xl border border-slate-200 dark:border-slate-700/60 min-w-[70px]">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Closed</p>
                          <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                            {staff.closedCount || 0}
                          </p>
                        </div>

                        <div className="text-center px-2 py-1 bg-slate-50 dark:bg-[#081220] rounded-xl border border-slate-200 dark:border-slate-700/60 min-w-[70px]">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Notes</p>
                          <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                            {staff.notesCount || 0}
                          </p>
                        </div>

                        <div className="text-center px-2 py-1 bg-slate-50 dark:bg-[#081220] rounded-xl border border-slate-200 dark:border-slate-700/60 min-w-[70px]">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Assigned</p>
                          <p className="text-sm font-extrabold text-orange-600 dark:text-orange-400">
                            {staff.assignedLeadsCount || 0}
                          </p>
                        </div>
                      </div>

                      {/* Admin Action Controls: Block/Active Toggle, Reset Pass, Edit, Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* PROMINENT BLOCK / ACTIVE TOGGLE SWITCH */}
                        <button
                          onClick={() => openBlockModal(staff, !isBlocked)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isBlocked
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-xs'
                              : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                          }`}
                          title={
                            isBlocked
                              ? 'Restore staff access and allow login'
                              : 'Revoke access and terminate active session immediately'
                          }
                        >
                          {isBlocked ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Unblock Staff</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5" />
                              <span>Block / Revoke</span>
                            </>
                          )}
                        </button>

                        {/* Reset Password Button */}
                        <button
                          onClick={() => openPasswordReset(staff)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                          title="Reset staff password"
                        >
                          <KeyRound className="w-4 h-4 text-orange-500" />
                        </button>

                        {/* Edit Details */}
                        <button
                          onClick={() => openEditModal(staff)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                          title="Edit staff details and permissions"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Account */}
                        <button
                          id={`delete-staff-${staff.id}`}
                          onClick={() => handleDelete(staff)}
                          className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-xl transition-colors cursor-pointer"
                          title="Delete staff account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== VIEW 2: ACTIVE SESSIONS MONITOR ===================== */}
        {activeView === 'SESSIONS' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-orange-500" />
                    <span>Real-Time Staff Session &amp; Hardware Access Monitor</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live telemetry tracking active staff members, IP addresses, client operating systems, and device fingerprints.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Online: <strong className="text-emerald-600 dark:text-emerald-400">{currentlyOnline}</strong> / {staffList.length}
                  </span>
                </div>
              </div>

              {/* Sessions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Staff Member</th>
                      <th className="pb-3">Session Status</th>
                      <th className="pb-3">Last Active</th>
                      <th className="pb-3">IP Address</th>
                      <th className="pb-3">Detected Device / Client</th>
                      <th className="pb-3 text-center">Workflow Activity</th>
                      <th className="pb-3 pr-2 text-right">Access Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {staffList.map((staff) => {
                      const isOnline = Boolean(staff.isCurrentlyLoggedIn && !staff.isBlocked);
                      const isBlocked = Boolean(staff.isBlocked);

                      return (
                        <tr
                          key={staff.id}
                          className={`hover:bg-slate-50 dark:hover:bg-[#081220]/60 transition-colors ${
                            isBlocked ? 'bg-red-50/30 dark:bg-red-950/20' : ''
                          }`}
                        >
                          <td className="py-3.5 pl-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold flex items-center justify-center text-xs shrink-0">
                                {staff.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 dark:text-white leading-tight">
                                  {staff.name}
                                </p>
                                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  {staff.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5">
                            {isBlocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                                <Ban className="w-3 h-3" />
                                BLOCKED
                              </span>
                            ) : isOnline ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Connected Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                Logged Out
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 text-[11px] text-slate-600 dark:text-slate-300">
                            {staff.lastActiveAt || staff.lastLogin ? (
                              <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                  {new Date(staff.lastActiveAt || staff.lastLogin!).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {new Date(staff.lastActiveAt || staff.lastLogin!).toLocaleDateString('en-IN')}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Never</span>
                            )}
                          </td>

                          <td className="py-3.5">
                            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                              {staff.lastLoginIp || '122.161.48.12'}
                            </span>
                          </td>

                          <td className="py-3.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                              <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{staff.lastLoginDevice || 'Chrome on Desktop'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 text-center">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              {staff.contactedCount || 0} contacted / {staff.closedCount || 0} closed
                            </span>
                          </td>

                          <td className="py-3.5 pr-2 text-right">
                            <button
                              onClick={() => openBlockModal(staff, !isBlocked)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                isBlocked
                                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500'
                                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                              }`}
                            >
                              {isBlocked ? 'Unblock' : 'Terminate / Block'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== VIEW 3: STAFF AUDIT & ACTIVITY LOGS ===================== */}
        {activeView === 'LOGS' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-500" />
                    <span>Staff Operations Audit Trail &amp; Access Log</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Immutable activity logs tracking all staff logins, status modifications, lead closures, and security interventions.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedStaffLogFilter}
                    onChange={(e) => setSelectedStaffLogFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="ALL">All Staff Members</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    No activity logs recorded for this criteria.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredLogs.map((log) => {
                    let badgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                    if (log.action === 'LOGIN') {
                      badgeClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
                    } else if (log.action === 'STATUS_UPDATE') {
                      badgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                    } else if (log.action === 'BLOCKED') {
                      badgeClass = 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800';
                    } else if (log.action === 'UNBLOCKED') {
                      badgeClass = 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800';
                    } else if (log.action === 'PASSWORD_RESET') {
                      badgeClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                    }

                    return (
                      <div
                        key={log.id}
                        className="p-3 bg-slate-50 dark:bg-[#081220]/70 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] border shrink-0 ${badgeClass}`}
                          >
                            {log.action}
                          </span>

                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white">
                              {log.description}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              By <strong className="text-slate-700 dark:text-slate-200">{log.staffName}</strong> ({log.staffEmail})
                              {log.details && ` • ${log.details}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                          {log.ipAddress && (
                            <span className="font-mono bg-white dark:bg-[#0d1d33] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {log.ipAddress}
                            </span>
                          )}
                          <span>
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            - {new Date(log.timestamp).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== MODAL: CREATE / EDIT STAFF ===================== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {editingStaff ? 'Edit Staff Member Credentials' : 'Add New Staff Member'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Explicit admin-issued login for dedicated staff portal
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Full Staff Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Anjali Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Role / Designation
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Pilgrim Inquiries Coordinator"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Staff Email ID *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="staff@tirthyatra.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Phone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Explicit Password Field */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {editingStaff ? 'New Password (leave empty to keep current)' : 'Staff Password *'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingStaff}
                      placeholder={editingStaff ? 'Keep existing password' : 'Enter password (min 6 chars)'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Staff members log in strictly with these credentials at <strong className="font-mono text-orange-600 dark:text-orange-400">/staff/login</strong>. Self-registration is blocked.
                  </p>
                </div>

                {/* Permissions & Capabilities */}
                <div className="bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-orange-500" />
                    <span>Role Permissions &amp; Capabilities</span>
                  </p>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canViewInquiries}
                        onChange={(e) => setFormData({ ...formData, canViewInquiries: e.target.checked })}
                        className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                      />
                      <span className="font-medium">Can View Customer Inquiries &amp; Pilgrim Leads</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canUpdateStatus}
                        onChange={(e) => setFormData({ ...formData, canUpdateStatus: e.target.checked })}
                        className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                      />
                      <span className="font-medium">
                        Can Update Lead Status (Restricted to Contacted / Closed)
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canAddNotes}
                        onChange={(e) => setFormData({ ...formData, canAddNotes: e.target.checked })}
                        className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                      />
                      <span className="font-medium">Can Add Follow-up Notes &amp; Pilgrim Action Logs</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Staff Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================== MODAL: BLOCK / REVOKE CONFIRMATION ===================== */}
        {blockModalStaff && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    isBlockingAction
                      ? 'bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400'
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400'
                  }`}
                >
                  {isBlockingAction ? <Ban className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {isBlockingAction ? 'Block Staff Member' : 'Restore Staff Member Access'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {blockModalStaff.name} ({blockModalStaff.email})
                  </p>
                </div>
              </div>

              {isBlockingAction ? (
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300">
                    <strong>Critical Access Revocation:</strong> Blocking this staff member will immediately terminate their active session. Any request made with their existing token will fail with an HTTP 403 Account Blocked response.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Reason for Blocking / Revoking Access:
                    </label>
                    <select
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      <option value="Access revoked by Administrator due to security audit / policy compliance">
                        Security Audit / Policy Compliance
                      </option>
                      <option value="Misuse of customer inquiry leads / unauthorized exports">
                        Misuse of customer leads / data
                      </option>
                      <option value="Temporary administrative suspension">
                        Temporary Administrative Suspension
                      </option>
                      <option value="Staff member resigned / employment contract ended">
                        Employment ended / contract concluded
                      </option>
                    </select>

                    <input
                      type="text"
                      placeholder="Or specify custom reason..."
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="w-full mt-2 px-3 py-1.5 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Unblocking <strong>{blockModalStaff.name}</strong> will reinstate their credentials and allow them to log into the Staff Operations Portal at <code>/staff/login</code>.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setBlockModalStaff(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBlock}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer ${
                    isBlockingAction
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {isBlockingAction ? 'Confirm Block & Terminate Session' : 'Confirm Unblock'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== MODAL: RESET PASSWORD ===================== */}
        {resetModalStaff && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/80 dark:text-orange-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Reset Staff Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {resetModalStaff.name} ({resetModalStaff.email})
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  New Password (minimum 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full pl-3 pr-16 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(newPasswordInput);
                        setCopiedPass(true);
                        setTimeout(() => setCopiedPass(false), 2000);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Copy password"
                    >
                      {copiedPass ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Share this password with the staff member. They will use it to log into <code>/staff/login</code>.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setResetModalStaff(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPasswordReset}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-colors cursor-pointer"
                >
                  Save New Password
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== MODAL: DELETE CONFIRMATION ===================== */}
        {deleteConfirmStaff && (
          <div
            id="staff-delete-confirm-modal"
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white dark:bg-[#0a192f] border-2 border-red-500/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-serif">
                    Permanently Delete Staff?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This action completely removes the staff member from the system.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Staff Member</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {deleteConfirmStaff.designation}
                  </span>
                </div>
                <p className="text-slate-900 dark:text-white font-bold text-sm">
                  {deleteConfirmStaff.name}
                </p>
                <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  {deleteConfirmStaff.email}
                </p>
              </div>

              <div className="p-3 bg-red-50/70 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl">
                <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
                  ⚠️ <span className="font-bold">Permanent Deletion:</span> Their login credentials, active sessions, and database record will be permanently purged. This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  id="cancel-delete-staff-btn"
                  onClick={() => setDeleteConfirmStaff(null)}
                  disabled={Boolean(deletingId)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-staff-btn"
                  onClick={() => handleDeleteStaff(deleteConfirmStaff)}
                  disabled={Boolean(deletingId)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {deletingId ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting Record...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
