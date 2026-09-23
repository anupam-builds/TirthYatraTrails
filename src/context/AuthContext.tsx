import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, StaffMember } from '../types.js';
import { api } from '../services/api.js';
import { localStore } from '../services/localStore.js';
import { supabase } from '../lib/supabase.js';

interface AuthContextType {
  // Customer
  user: User | null;
  customerUser?: User | null;
  isCustomerLoading: boolean;
  isAuthenticated: boolean;
  loginCustomer: (email: string, pass: string) => Promise<void>;
  registerCustomer: (name: string, email: string, pass: string) => Promise<void>;
  loginCustomerWithGoogle: (user: User, token: string) => void;
  logoutCustomer: () => void;

  // Admin Enterprise
  adminUser: User | null;
  isAdminLoading: boolean;
  isAdminAuthenticated: boolean;
  loginAdmin: (email: string, pass: string) => Promise<void>;
  loginAdminWithOtp: (email: string, otp: string) => Promise<void>;
  sendAdminOtp: (email: string) => Promise<{ ok: boolean; message?: string }>;
  logoutAdmin: () => void;

  // Staff Portal
  staffUser: StaffMember | null;
  isStaffLoading: boolean;
  isStaffAuthenticated: boolean;
  loginStaff: (email: string, pass: string) => Promise<void>;
  logoutStaff: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isCustomerLoading, setIsCustomerLoading] = useState(true);

  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  const [staffUser, setStaffUser] = useState<StaffMember | null>(null);
  const [isStaffLoading, setIsStaffLoading] = useState(true);

  // Restore Customer Session
  useEffect(() => {
    async function initCustomer() {
      try {
        const stored = await api.getMe('tyt_auth_token');
        if (stored && stored.role === 'USER') {
          setUser(stored);
        } else if (stored && stored.role === 'ADMIN') {
          // Keep customer state clean
          setUser(stored);
        }
      } catch {
        setUser(null);
      } finally {
        setIsCustomerLoading(false);
      }
    }
    initCustomer();
  }, []);

  // Restore Admin Session with strict role re-verification
  useEffect(() => {
    async function initAdmin() {
      try {
        const stored = await api.getMe('tyt_admin_token');
        if (stored && stored.role === 'ADMIN') {
          // Strict database-backed re-assertion of admin privileges
          const isValidAdmin = await api.verifyAdminSession(stored);
          if (isValidAdmin) {
            setAdminUser(stored);
          } else {
            console.warn('[AuthContext] Admin privileges revoked or not found in database. Terminating session.');
            localStorage.removeItem('tyt_admin_token');
            setAdminUser(null);
          }
        } else {
          localStorage.removeItem('tyt_admin_token');
          setAdminUser(null);
        }
      } catch {
        localStorage.removeItem('tyt_admin_token');
        setAdminUser(null);
      } finally {
        setIsAdminLoading(false);
      }
    }
    initAdmin();
  }, []);

  // Restore Staff Session
  useEffect(() => {
    async function initStaff() {
      try {
        const token = localStorage.getItem('tyt_staff_token');
        if (token) {
          try {
            const check = await api.checkStaffSession();
            if (check?.ok && check.staff && !check.staff.isBlocked && check.staff.isActive) {
              setStaffUser(check.staff);
              api.setStaffOnlineStatus(check.staff.id, true).catch(() => {});
            } else {
              localStorage.removeItem('tyt_staff_token');
              setStaffUser(null);
            }
          } catch (err: any) {
            // If the account was blocked or revoked, instantly revoke the session and remove stored token
            if (
              err?.message?.includes('Blocked') ||
              err?.message?.includes('revoked') ||
              err?.message?.includes('not found')
            ) {
              console.warn('[AuthContext] Staff account revoked or blocked. Terminating session.');
              localStorage.removeItem('tyt_staff_token');
              setStaffUser(null);
            } else {
              // Only fallback to decoded token if it's explicitly verified as unblocked
              try {
                const decoded = JSON.parse(atob(token));
                if (
                  decoded &&
                  (decoded.role === 'STAFF' || decoded.role === 'ADMIN') &&
                  !decoded.isBlocked &&
                  decoded.isActive !== false
                ) {
                  // Re-check against localStore if available
                  const verifiedLocal = localStore.getStaffMembers().find((s) => s.id === decoded.id);
                  if (verifiedLocal && (verifiedLocal.isBlocked || !verifiedLocal.isActive)) {
                    localStorage.removeItem('tyt_staff_token');
                    setStaffUser(null);
                  } else {
                    setStaffUser(decoded);
                  }
                } else {
                  localStorage.removeItem('tyt_staff_token');
                  setStaffUser(null);
                }
              } catch {
                localStorage.removeItem('tyt_staff_token');
                setStaffUser(null);
              }
            }
          }
        } else {
          setStaffUser(null);
        }
      } catch {
        localStorage.removeItem('tyt_staff_token');
        setStaffUser(null);
      } finally {
        setIsStaffLoading(false);
      }
    }
    initStaff();
  }, []);

  // Customer Login
  const loginCustomer = async (email: string, pass: string) => {
    const res = await api.login(email, pass, 'customer');
    localStorage.setItem('tyt_auth_token', res.token);
    setUser(res.user);
  };

  // Customer Register
  const registerCustomer = async (name: string, email: string, pass: string) => {
    const res = await api.register(name, email, pass);
    localStorage.setItem('tyt_auth_token', res.token);
    setUser(res.user);
  };

  // Google OAuth Login
  const loginCustomerWithGoogle = (userRecord: User, token: string) => {
    localStorage.setItem('tyt_auth_token', token);
    setUser({
      ...userRecord,
      role: 'USER', // Ensure Customer role assignment
    });
  };

  // Customer Logout
  const logoutCustomer = () => {
    localStorage.removeItem('tyt_auth_token');
    setUser(null);
  };

  // Admin Login via Supabase signInWithPassword and admin_allowlist query
  const loginAdmin = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Supabase Auth signInWithPassword
    let authUser: any = null;
    let authError: any = null;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });
      if (error) {
        authError = error;
      } else {
        authUser = data?.user;
      }
    } catch (e: any) {
      authError = e;
    }

    // Fallback: If Supabase auth user does not exist in remote auth.users, try local/server credentials fallback
    if (!authUser) {
      try {
        const res = await api.login(cleanEmail, pass, 'admin');
        if (res?.user) {
          authUser = { email: res.user.email, id: res.user.id };
        }
      } catch {
        throw new Error(authError?.message || 'Invalid administrator credentials.');
      }
    }

    const verifiedEmail = (authUser?.email || cleanEmail).toLowerCase().trim();

    // 2. Query admin_allowlist for user.email
    const { data: allowlistData } = await supabase
      .from('admin_allowlist')
      .select('*')
      .ilike('email', verifiedEmail)
      .maybeSingle();

    // 3. If email is missing from admin_allowlist, immediately signOut, block access, and show error
    if (!allowlistData && verifiedEmail !== 'anupamsaxena.dev@gmail.com') {
      await supabase.auth.signOut().catch(() => {});
      localStorage.removeItem('tyt_admin_token');
      setAdminUser(null);
      throw new Error("Access Denied: Email not authorized by existing admin.");
    }

    // Set authenticated admin state
    const adminRecord: User = {
      id: authUser?.id || (verifiedEmail === 'anupamsaxena.dev@gmail.com' ? 'usr-root-admin' : `usr-admin-${Date.now()}`),
      name: verifiedEmail === 'anupamsaxena.dev@gmail.com' ? 'Anupam Saxena (Root Admin)' : (authUser?.user_metadata?.name || verifiedEmail.split('@')[0]),
      email: verifiedEmail,
      phone: '',
      role: 'ADMIN',
      createdAt: allowlistData?.created_at || new Date().toISOString(),
    };

    const sessionToken = btoa(JSON.stringify(adminRecord));
    localStorage.setItem('tyt_admin_token', sessionToken);
    setAdminUser(adminRecord);
  };

  // Admin Passwordless OTP Dispatcher
  const sendAdminOtp = async (email: string) => {
    return api.sendAdminOtp(email);
  };

  // Admin Passwordless OTP Verification & Strict Role Assertion
  const loginAdminWithOtp = async (email: string, otp: string) => {
    const res = await api.verifyAdminOtp(email, otp);
    if (!res?.user || res.user.role !== 'ADMIN') {
      throw new Error('Unauthorized: Admin privileges required. Your account is not authorized as an administrator.');
    }

    // Query admin_allowlist
    const cleanEmail = email.trim().toLowerCase();
    const { data: allowlistData } = await supabase
      .from('admin_allowlist')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!allowlistData && cleanEmail !== 'anupamsaxena.dev@gmail.com') {
      await supabase.auth.signOut().catch(() => {});
      localStorage.removeItem('tyt_admin_token');
      setAdminUser(null);
      throw new Error("Access Denied: Email not authorized by existing admin.");
    }

    localStorage.setItem('tyt_admin_token', res.token);
    setAdminUser(res.user);
  };

  // Admin Logout
  const logoutAdmin = () => {
    localStorage.removeItem('tyt_admin_token');
    setAdminUser(null);
  };

  // Staff Login
  const loginStaff = async (email: string, pass: string) => {
    const res = await api.loginStaff(email, pass);
    localStorage.setItem('tyt_staff_token', res.token);
    setStaffUser(res.user);
    if (res.user?.id) {
      await api.setStaffOnlineStatus(res.user.id, true).catch(() => {});
    }
  };

  // Staff Logout
  const logoutStaff = () => {
    if (staffUser?.id) {
      const staffId = staffUser.id;
      api.logoutStaff(staffId).catch(() => {});
      api.setStaffOnlineStatus(staffId, false).catch(() => {});
    }
    localStorage.removeItem('tyt_staff_token');
    setStaffUser(null);
  };

  // Presence tracking on window unload / unmount
  useEffect(() => {
    if (!staffUser?.id) return;
    const staffId = staffUser.id;
    const handleBeforeUnload = () => {
      api.setStaffOnlineStatus(staffId, false).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [staffUser?.id]);

  return (
    <AuthContext.Provider
      value={{
        user,
        customerUser: user,
        isCustomerLoading,
        isAuthenticated: !!user,
        loginCustomer,
        registerCustomer,
        loginCustomerWithGoogle,
        logoutCustomer,
        adminUser,
        isAdminLoading,
        isAdminAuthenticated: !!adminUser && adminUser.role === 'ADMIN',
        loginAdmin,
        loginAdminWithOtp,
        sendAdminOtp,
        logoutAdmin,
        staffUser,
        isStaffLoading,
        isStaffAuthenticated: !!staffUser && (staffUser.role === 'STAFF' || (staffUser as any).role === 'ADMIN'),
        loginStaff,
        logoutStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
