import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, StaffMember } from '../types.js';
import { api } from '../services/api.js';

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

  // Restore Admin Session
  useEffect(() => {
    async function initAdmin() {
      try {
        const stored = await api.getMe('tyt_admin_token');
        if (stored && stored.role === 'ADMIN') {
          setAdminUser(stored);
        } else {
          setAdminUser(null);
        }
      } catch {
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
            } else {
              localStorage.removeItem('tyt_staff_token');
              setStaffUser(null);
            }
          } catch {
            const decoded = JSON.parse(atob(token));
            if (decoded && (decoded.role === 'STAFF' || decoded.role === 'ADMIN') && !decoded.isBlocked && decoded.isActive !== false) {
              setStaffUser(decoded);
            } else {
              localStorage.removeItem('tyt_staff_token');
              setStaffUser(null);
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

  // Admin Login
  const loginAdmin = async (email: string, pass: string) => {
    const res = await api.login(email, pass, 'admin');
    if (res.user.role !== 'ADMIN') {
      throw new Error('Access denied: Account does not have administrator privileges.');
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
  };

  // Staff Logout
  const logoutStaff = () => {
    if (staffUser?.id) {
      api.logoutStaff(staffUser.id).catch(() => {});
    }
    localStorage.removeItem('tyt_staff_token');
    setStaffUser(null);
  };

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
