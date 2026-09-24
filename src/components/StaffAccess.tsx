import React, { useState, useEffect, useCallback } from 'react';
import { api, mapStaffRow, computeStaffLeadMetrics, mapInquiryRow, matchLeadId, mergeUpdatedLeadFields } from '../services/api.js';
import { localStore } from '../services/localStore.js';
import { supabase } from '../lib/supabase.js';
import { StaffMember, StaffActivityLog, StaffSessionMonitor, Inquiry } from '../types.js';
import { useRouter } from '../context/RouterContext.js';
import { BaseInput, BaseSelect } from './FormField.js';
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
  Crown,
  Calendar,
} from 'lucide-react';

export const StaffAccess: React.FC = () => {
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
  const [inquiriesList, setInquiriesList] = useState<Inquiry[]>([]);

  // Realtime handler for live lead & inquiry updates from Supabase
  const handleInquiryRealtime = useCallback((payload: any) => {
    const eventType = payload.eventType || payload.event;
    if (eventType === 'DELETE') {
      const delId = String(payload.old?.id || '');
      if (delId) {
        setInquiriesList((prev) => prev.filter((i) => String(i.id) !== delId));
      }
      return;
    }

    const rawRow = payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old;
    if (!rawRow || !rawRow.id) return;

    if (eventType === 'INSERT') {
      const mapped = mapInquiryRow(rawRow);
      setInquiriesList((prev) => {
        const exists = prev.some((i) => matchLeadId(i, mapped.id));
        if (exists) return prev;
        return [mapped, ...prev];
      });
    } else if (eventType === 'UPDATE') {
      setInquiriesList((prev) => {
        const exists = prev.some((i) => matchLeadId(i, rawRow.id));
        if (!exists) {
          const mapped = mapInquiryRow(rawRow);
          return [mapped, ...prev];
        }
        return prev.map((i) => (matchLeadId(i, rawRow.id) ? mergeUpdatedLeadFields(i, rawRow) : i));
      });
    }
  }, []);

  useEffect(() => {
    loadAllStaffData();

    // Live staff presence event listener
    const handlePresence = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.staffId) return;
      setStaffList((prev) =>
        prev.map((s) =>
          String(s.id) === String(detail.staffId)
            ? {
                ...s,
                isOnline: detail.isOnline,
                isCurrentlyLoggedIn: detail.isOnline,
                lastSeen: detail.lastSeen,
              }
            : s
        )
      );
    };
    window.addEventListener('tirth-staff-presence-changed', handlePresence);

    // Cross-portal unified roster change listener
    const handleRosterSync = () => {
      loadAllStaffData();
    };
    window.addEventListener('tirth-staff-roster-changed', handleRosterSync);
    window.addEventListener('tirth-allowlist-changed', handleRosterSync);

    // Instant local event listeners for lead mutations dispatched by Travel Desk CRM
    const handleLeadEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const leadItem: Inquiry | undefined = detail.lead || detail.inquiry;
      if (leadItem && leadItem.id) {
        setInquiriesList((prev) => {
          const exists = prev.some((i) => matchLeadId(i, leadItem.id));
          if (exists) {
            return prev.map((i) => (matchLeadId(i, leadItem.id) ? { ...i, ...leadItem } : i));
          }
          return [leadItem, ...prev];
        });
      } else if (detail.leadId || detail.id) {
        const targetId = String(detail.leadId || detail.id);
        setInquiriesList((prev) =>
          prev.map((i) => {
            if (matchLeadId(i, targetId)) {
              return {
                ...i,
                ...(detail.status ? { status: String(detail.status).toUpperCase() } : {}),
                ...(detail.staffId !== undefined
                  ? { assignedStaffId: detail.staffId, assigned_staff_id: detail.staffId }
                  : {}),
                ...(detail.staffName !== undefined
                  ? { assignedStaffName: detail.staffName, assigned_staff_name: detail.staffName }
                  : {}),
              };
            }
            return i;
          })
        );
      }
    };
    window.addEventListener('tirth-lead-changed', handleLeadEvent);
    window.addEventListener('tirth-inquiry-changed', handleLeadEvent);

    // Supabase Realtime channel for live presence on profiles, staff_members, staff_sessions,
    // and live inquiry/lead mutations for immediate metrics reactivity
    const channel = supabase
      .channel('schema-db-changes-staff-component')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_members' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new;
            if (!newRow?.id) return;
            setStaffList((prev) => {
              if (
                prev.some(
                  (s) =>
                    String(s.id) === String(newRow.id) ||
                    (s.email && s.email.toLowerCase() === (newRow.email || '').toLowerCase())
                )
              ) {
                return prev;
              }
              return [...prev, mapStaffRow(newRow)];
            });
          } else if (payload.eventType === 'UPDATE') {
            const staffRow = payload.new;
            if (!staffRow?.id) return;
            setStaffList((prev) =>
              prev.map((s) => {
                if (
                  String(s.id) === String(staffRow.id) ||
                  (s.email && staffRow.email && s.email.toLowerCase() === staffRow.email.toLowerCase())
                ) {
                  const isOnline = Boolean(
                    staffRow.is_online !== undefined
                      ? staffRow.is_online
                      : staffRow.is_currently_logged_in !== undefined
                      ? staffRow.is_currently_logged_in
                      : s.isOnline
                  );
                  const lastSeen = staffRow.last_seen || staffRow.last_active_at || s.lastSeen;
                  return {
                    ...s,
                    name: staffRow.name || s.name,
                    email: staffRow.email || s.email,
                    designation: staffRow.department || staffRow.designation || s.designation,
                    role: staffRow.role || s.role,
                    isOnline,
                    isCurrentlyLoggedIn: isOnline,
                    isActive: staffRow.is_active !== undefined ? Boolean(staffRow.is_active) : s.isActive,
                    isBlocked: staffRow.is_blocked !== undefined ? Boolean(staffRow.is_blocked) : s.isBlocked,
                    blockedReason:
                      staffRow.blocked_reason !== undefined ? staffRow.blocked_reason : s.blockedReason,
                    lastSeen,
                    lastActiveAt: staffRow.last_active_at || lastSeen,
                  };
                }
                return s;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old;
            if (oldRow?.id) {
              setStaffList((prev) => prev.filter((s) => String(s.id) !== String(oldRow.id)));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload: any) => {
          const profile = payload.new;
          if (!profile?.id) return;
          setStaffList((prev) =>
            prev.map((s) => {
              if (
                String(s.id) === String(profile.id) ||
                (s.email && profile.email && s.email.toLowerCase() === profile.email.toLowerCase())
              ) {
                const isOnline = Boolean(profile.is_online ?? profile.is_currently_logged_in ?? s.isOnline);
                const lastSeen = profile.last_seen || profile.last_active_at || s.lastSeen;
                return {
                  ...s,
                  isOnline,
                  isCurrentlyLoggedIn: isOnline,
                  lastSeen,
                  lastActiveAt: lastSeen,
                };
              }
              return s;
            })
          );
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_sessions' },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            const oldSession = payload.old;
            if (oldSession?.staff_id) {
              setStaffList((prev) =>
                prev.map((s) =>
                  String(s.id) === String(oldSession.staff_id)
                    ? { ...s, isOnline: false, isCurrentlyLoggedIn: false }
                    : s
                )
              );
            }
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newSession = payload.new;
            if (newSession?.staff_id) {
              setStaffList((prev) =>
                prev.map((s) =>
                  String(s.id) === String(newSession.staff_id)
                    ? {
                        ...s,
                        isOnline: true,
                        isCurrentlyLoggedIn: true,
                        lastActiveAt: newSession.last_active || new Date().toISOString(),
                      }
                    : s
                )
              );
            }
          }
        }
      )
      // Leads and Inquiries live mutation hooks for immediate staff card reactivity
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inquiries' },
        handleInquiryRealtime
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        handleInquiryRealtime
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'travel_desk_leads' },
        handleInquiryRealtime
      )
      .subscribe();

    return () => {
      window.removeEventListener('tirth-staff-presence-changed', handlePresence);
      window.removeEventListener('tirth-staff-roster-changed', handleRosterSync);
      window.removeEventListener('tirth-allowlist-changed', handleRosterSync);
      window.removeEventListener('tirth-lead-changed', handleLeadEvent);
      window.removeEventListener('tirth-inquiry-changed', handleLeadEvent);
      supabase.removeChannel(channel);
    };
  }, [handleInquiryRealtime]);

  // Dynamically keep staff metrics responsive to lead & activity log changes
  useEffect(() => {
    if (staffList.length === 0) return;
    setStaffList((prev) =>
      prev.map((s) => {
        const m = computeStaffLeadMetrics(s, inquiriesList, activityLogs);
        if (
          s.assignedLeadsCount === m.assignedLeadsCount &&
          s.contactedCount === m.contactedCount &&
          s.closedCount === m.closedCount &&
          s.notesCount === m.notesCount
        ) {
          return s;
        }
        return {
          ...s,
          ...m,
        };
      })
    );
  }, [inquiriesList, activityLogs]);

  async function loadAllStaffData() {
    setLoading(true);
    try {
      const [members, sessions, logs, inqs] = await Promise.all([
        api.getStaffMembers(),
        api.getStaffSessions().catch(() => null),
        api.getStaffLogs().catch(() => []),
        api.getInquiries().catch(() => []),
      ]);
      setInquiriesList(inqs);
      setActivityLogs(logs);
      if (sessions) setSessionMonitor(sessions);
      const computed = members.map((m) => {
        const metrics = computeStaffLeadMetrics(m, inqs, logs);
        return {
          ...m,
          ...metrics,
        };
      });
      setStaffList(computed);
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
      canViewInquiries: staff.permissions?.canViewInquiries ?? true,
      canUpdateStatus: staff.permissions?.canUpdateStatus ?? true,
      canAddNotes: staff.permissions?.canAddNotes ?? true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openBlockModal = (staff: StaffMember, block: boolean) => {
    if (block && staff.email.toLowerCase() === 'anupamsaxena.dev@gmail.com') {
      alert('Security Alert: The Root Enterprise Administrator (anupamsaxena.dev@gmail.com) cannot be blocked or revoked.');
      return;
    }
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
    if (staff.email.toLowerCase() === 'anupamsaxena.dev@gmail.com') {
      alert('Security Alert: The Root Enterprise Administrator (anupamsaxena.dev@gmail.com) cannot be deleted.');
      setDeleteConfirmStaff(null);
      return;
    }
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
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchEmail = (s.email || '').toLowerCase().includes(q);
      const matchDesig = (s.designation || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchDesig;
    }
    return true;
  });

  const totalActive = staffList.filter((s) => s.isActive && !s.isBlocked).length;
  const totalBlocked = staffList.filter((s) => s.isBlocked).length;
  const currentlyOnline = staffList.filter((s) => (s.isCurrentlyLoggedIn || s.isOnline) && !s.isBlocked).length;
  const totalLeadsHandled = staffList.reduce((acc, s) => {
    const m = computeStaffLeadMetrics(s, inquiriesList, activityLogs);
    return acc + (m.contactedCount || s.contactedCount || 0) + (m.closedCount || s.closedCount || 0);
  }, 0);

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
            {currentlyOnline > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>🟢 {currentlyOnline} Staff Active Now</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>0 Staff Active Now</span>
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

      {/* Overview Stats Bar: 4 Core Metrics */}
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
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
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
          <Laptop className="w-3.5 h-3.5" />
          <span>Active Session Monitor</span>
          {currentlyOnline > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
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
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 p-3.5 rounded-2xl shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <BaseInput
                id="search-staff-input"
                name="search_staff"
                type="search"
                autoComplete="off"
                aria-label="Search staff by name, email, or designation"
                placeholder="Search staff by name, email, or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-[#081220] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                Filter:
              </span>
              <button
                onClick={() => setFilterRole('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterRole === 'ALL'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                All ({staffList.length})
              </button>
              <button
                onClick={() => setFilterRole('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterRole === 'ACTIVE'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Active ({totalActive})
              </button>
              <button
                onClick={() => setFilterRole('BLOCKED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  filterRole === 'BLOCKED'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Blocked ({totalBlocked})
              </button>
            </div>
          </div>

          {/* Staff Roster Grid */}
          {loading ? (
            <div className="p-12 text-center bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 rounded-3xl">
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Loading staff directory and permission matrices...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 rounded-3xl">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No staff members match the current filter.
              </p>
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Staff Account</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredStaff.map((staff) => {
                const isOnline = staff.isCurrentlyLoggedIn || staff.isOnline;
                const metrics = computeStaffLeadMetrics(staff, inquiriesList, activityLogs);
                const assignedCount = metrics.assignedLeadsCount;
                const contactedCount = metrics.contactedCount;
                const closedCount = metrics.closedCount;
                const notesCount = metrics.notesCount;

                return (
                  <div
                    key={staff.id}
                    className={`bg-white dark:bg-[#0d1d33] border rounded-3xl p-5 shadow-xs transition-all relative overflow-hidden flex flex-col justify-between ${
                      staff.isBlocked
                        ? 'border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10'
                        : isOnline
                        ? 'border-emerald-300 dark:border-emerald-800/80 shadow-emerald-500/5'
                        : 'border-slate-200 dark:border-slate-700/80'
                    }`}
                  >
                    {/* Top Identity Row */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Avatar Circle with Online Beacon */}
                          <div className="relative shrink-0">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm ${
                                staff.isBlocked
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                  : staff.role === 'ADMIN'
                                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-orange-600/20'
                                  : 'bg-gradient-to-br from-orange-500 to-amber-600 text-white'
                              }`}
                            >
                              {(staff.name || staff.email || 'Staff')
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()}
                            </div>
                            <span
                              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#0d1d33] transition-colors duration-300 ${
                                staff.isBlocked
                                  ? 'bg-red-500'
                                  : isOnline
                                  ? 'bg-emerald-500 ring-2 ring-emerald-400/40 animate-pulse'
                                  : 'bg-slate-400'
                              }`}
                              title={
                                staff.isBlocked
                                  ? 'Access Blocked'
                                  : isOnline
                                  ? 'Online Now (Active on Staff Portal)'
                                  : 'Offline'
                              }
                            />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                {staff.name || (staff.email ? staff.email.split('@')[0] : 'Staff Member')}
                              </h3>

                              {/* Role Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  staff.role === 'ADMIN'
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60'
                                    : 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-300 border border-orange-300/60'
                                }`}
                              >
                                {staff.role}
                              </span>

                              {/* Live Online Badge */}
                              {isOnline && !staff.isBlocked && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Online</span>
                                </span>
                              )}

                              {/* Status Badge */}
                              {staff.isBlocked ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800">
                                  <Ban className="w-2.5 h-2.5" />
                                  <span>Revoked / Blocked</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Active &amp; Permitted</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {staff.designation || 'Pilgrim Operations Specialist'}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-1 font-mono">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {staff.email}
                              </span>
                              {staff.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {staff.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Top Actions: Edit / Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEditModal(staff)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(staff)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                            title="Delete Staff Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Block reason notice if blocked */}
                      {staff.isBlocked && staff.blockedReason && (
                        <div className="mt-3 p-2.5 rounded-xl bg-red-100/60 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-[11px] text-red-800 dark:text-red-300">
                          <span className="font-bold">Block Note:</span> {staff.blockedReason}
                        </div>
                      )}

                      {/* Workflow Metrics Badges - Real-time Reactive Aggregation */}
                      <div className="grid grid-cols-4 gap-2 mt-4 p-2.5 bg-slate-50 dark:bg-[#081220] rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                        <div title={`${assignedCount} lead(s) assigned to ${staff.name}`}>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned</p>
                          <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">
                            {assignedCount}
                          </p>
                        </div>
                        <div title={`${contactedCount} lead(s) contacted / quotation sent`}>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Contacted</p>
                          <p className="text-xs font-black text-blue-600 dark:text-blue-400 mt-0.5">
                            {contactedCount}
                          </p>
                        </div>
                        <div title={`${closedCount} lead(s) closed / confirmed`}>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Closed</p>
                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {closedCount}
                          </p>
                        </div>
                        <div title={`${notesCount} follow-up note(s) logged`}>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Notes</p>
                          <p className="text-xs font-black text-orange-600 dark:text-orange-400 mt-0.5">
                            {notesCount}
                          </p>
                        </div>
                      </div>

                      {/* Capabilities Matrix */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="font-bold text-slate-400 uppercase tracking-wider mr-1">
                          Perms:
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold ${
                            (staff.permissions?.canViewInquiries ?? true)
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 line-through'
                          }`}
                        >
                          View Leads
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold ${
                            (staff.permissions?.canUpdateStatus ?? true)
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 line-through'
                          }`}
                        >
                          Update Status
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold ${
                            (staff.permissions?.canAddNotes ?? true)
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 line-through'
                          }`}
                        >
                          Add Notes
                        </span>
                      </div>
                    </div>

                    {/* Bottom Operational Controls Row */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isOnline ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Session active on {staff.lastLoginDevice || (staff as any).currentDevice || 'Staff Portal'}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span>
                              Last active:{' '}
                              {staff.lastActiveAt || staff.lastSeen
                                ? new Date(staff.lastActiveAt || staff.lastSeen!).toLocaleString('en-IN', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })
                                : 'Offline'}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Reset Password Button */}
                        <button
                          onClick={() => openPasswordReset(staff)}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Reset Staff Password"
                        >
                          <KeyRound className="w-3 h-3 text-orange-500" />
                          <span>Reset Pwd</span>
                        </button>

                        {/* Instant Block / Unblock Toggle Button */}
                        <button
                          onClick={() => openBlockModal(staff, !staff.isBlocked)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                            staff.isBlocked
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900'
                          }`}
                        >
                          {staff.isBlocked ? (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>Restore Access</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-3 h-3" />
                              <span>Revoke / Block</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== VIEW 2: ACTIVE SESSION MONITOR ===================== */}
      {activeView === 'SESSIONS' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-orange-500" />
                  <span>Real-Time Staff Active Sessions &amp; Security State</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Continuously monitors active JWT authentications and concurrent pilgrim desk sessions.
                </p>
              </div>

              <button
                onClick={handleRefresh}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#081220] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
                <span>Poll Live Sessions</span>
              </button>
            </div>

            {/* Session Monitor Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-[#081220] border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  <tr>
                    <th className="p-3">Staff Identity</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Login IP / Device</th>
                    <th className="p-3">Last Active</th>
                    <th className="p-3 text-right">Instant Revoke</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {staffList.map((staff) => {
                    const isOnline = staff.isCurrentlyLoggedIn || staff.isOnline;
                    return (
                      <tr
                        key={staff.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${
                          staff.isBlocked ? 'bg-red-50/30 dark:bg-red-950/20' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                staff.isBlocked
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                  : isOnline
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {(staff.name || staff.email || 'S')
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .substring(0, 2)}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 dark:text-white">
                                {staff.name || (staff.email ? staff.email.split('@')[0] : 'Staff Member')}
                              </p>
                              <p className="text-[11px] font-mono text-slate-400">{staff.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                          {staff.designation}
                        </td>
                        <td className="p-3">
                          {staff.isBlocked ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                              BLOCKED
                            </span>
                          ) : isOnline ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ONLINE NOW
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              OFFLINE
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          <div>{staff.lastLoginDevice || 'Standard Web Browser'}</div>
                          <div className="text-slate-400">{staff.lastLoginIp || '127.0.0.1'}</div>
                        </td>
                        <td className="p-3 text-[11px]">
                          {staff.lastActiveAt
                            ? new Date(staff.lastActiveAt).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : 'N/A'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openBlockModal(staff, !staff.isBlocked)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              staff.isBlocked
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-red-600 hover:bg-red-500 text-white'
                            }`}
                          >
                            {staff.isBlocked ? 'Restore Access' : 'Terminate Session'}
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

      {/* ===================== VIEW 3: AUDIT & ACTIVITY TRAIL ===================== */}
      {activeView === 'LOGS' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <span>Staff Activity &amp; Workflow Audit Trail</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Immutable record of lead updates, follow-up calls logged, and operational actions performed.
                </p>
              </div>

              {/* Staff filter dropdown for logs */}
              <div className="flex items-center gap-2">
                <label htmlFor="filter-staff-log-select" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Filter Staff:
                </label>
                <BaseSelect
                  id="filter-staff-log-select"
                  name="filter_staff_log"
                  aria-label="Filter Staff Logs"
                  value={selectedStaffLogFilter}
                  onChange={(e) => setSelectedStaffLogFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="ALL">All Staff Members ({activityLogs.length})</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.email}
                    </option>
                  ))}
                </BaseSelect>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-[#081220] rounded-2xl border border-slate-200 dark:border-slate-800">
                <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  No activity logs recorded for the selected filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-[#081220] border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Staff Member</th>
                      <th className="p-3">Action Type</th>
                      <th className="p-3">Workflow Detail / Inquiry</th>
                      <th className="p-3">Origin IP / Device</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          <div>{log.staffName}</div>
                          <div className="text-[10px] font-mono font-normal text-slate-400">
                            {log.staffEmail}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              log.action === 'LOGIN'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : log.action === 'LOGOUT'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : log.action === 'UPDATE_STATUS'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : log.action === 'ADD_NOTE'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {log.description}
                          {log.inquiryId && (
                            <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              Ref: {log.inquiryId}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-400">
                          <div>{log.ipAddress || '127.0.0.1'}</div>
                          <div>{log.device || 'Chrome / Web'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                  <label htmlFor="staff-form-name-input" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Staff Name *
                  </label>
                  <BaseInput
                    id="staff-form-name-input"
                    name="staff-form-name-input"
                    type="text"
                    required
                    placeholder="e.g., Anjali Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="staff-form-designation-input" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Role / Designation
                  </label>
                  <BaseInput
                    id="staff-form-designation-input"
                    name="staff-form-designation-input"
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
                  <label htmlFor="staff-form-email-input" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Staff Email ID *
                  </label>
                  <BaseInput
                    id="staff-form-email-input"
                    name="staff-form-email-input"
                    type="email"
                    required
                    placeholder="staff@tirthyatra.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="staff-form-phone-input" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Phone / WhatsApp
                  </label>
                  <BaseInput
                    id="staff-form-phone-input"
                    name="staff-form-phone-input"
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
                <label htmlFor="staff-form-password-input" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {editingStaff ? 'New Password (leave empty to keep current)' : 'Staff Password *'}
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <BaseInput
                    id="staff-form-password-input"
                    name="staff-form-password-input"
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
                  <label htmlFor="staff-perm-view-inquiries-check" className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <BaseInput
                      id="staff-perm-view-inquiries-check"
                      name="staff-perm-view-inquiries-check"
                      type="checkbox"
                      checked={formData.canViewInquiries}
                      onChange={(e) => setFormData({ ...formData, canViewInquiries: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <span className="font-medium">Can View Customer Inquiries &amp; Pilgrim Leads</span>
                  </label>

                  <label htmlFor="staff-perm-update-status-check" className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <BaseInput
                      id="staff-perm-update-status-check"
                      name="staff-perm-update-status-check"
                      type="checkbox"
                      checked={formData.canUpdateStatus}
                      onChange={(e) => setFormData({ ...formData, canUpdateStatus: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <span className="font-medium">
                      Can Update Lead Status (Restricted to Contacted / Closed)
                    </span>
                  </label>

                  <label htmlFor="staff-perm-add-notes-check" className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <BaseInput
                      id="staff-perm-add-notes-check"
                      name="staff-perm-add-notes-check"
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
                  <label htmlFor="staff-block-reason-select" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reason for Blocking / Revoking Access:
                  </label>
                  <BaseSelect
                    id="staff-block-reason-select"
                    name="staff-block-reason-select"
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
                  </BaseSelect>

                  <BaseInput
                    id="staff-block-reason-custom-input"
                    name="staff-block-reason-custom-input"
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
              <label htmlFor="staff-reset-new-password-input" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                New Password (minimum 6 characters)
              </label>
              <div className="relative">
                <BaseInput
                  id="staff-reset-new-password-input"
                  name="staff-reset-new-password-input"
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
  );
};

export default StaffAccess;
