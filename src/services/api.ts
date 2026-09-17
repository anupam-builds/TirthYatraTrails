import { City, Hotel, Package, Inquiry, User, AuthResponse, Review, StaffMember, CompanionProfile, CompanionConnection, CompanionSearchFilters } from '../types.js';
import { supabase } from '../lib/supabase.js';
import { localStore } from './localStore.js';
import { broadcastNewInquiry, broadcastInquiryUpdated } from './soundNotification.js';

export const api = {
  // Authentication
  async login(email: string, password: string, portal: 'customer' | 'admin' = 'customer'): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
      if (error || !data || data.password !== password) throw new Error('Invalid email or password.');
      if (portal === 'admin' && data.role !== 'ADMIN') throw new Error('Access Denied. Admin privileges required.');
      const { password: _, ...safeUser } = data;
      return { user: safeUser as User, token: btoa(JSON.stringify(safeUser)) };
    } catch {
      return localStore.login(email, password, portal);
    }
  },

  async loginStaff(email: string, password: string): Promise<{ user: StaffMember; token: string }> {
    try {
      const { data, error } = await supabase.from('staff_members').select('*').eq('email', email).single();
      if (error || !data || data.password !== password) throw new Error('Invalid staff credentials.');
      if (data.is_blocked || !data.is_active) throw new Error(`Access Blocked: ${data.blocked_reason || 'Revoked'}`);
      const { password: _, ...safeStaff } = data;
      const mapped: StaffMember = { ...safeStaff, isBlocked: safeStaff.is_blocked, isActive: safeStaff.is_active };
      return { user: mapped, token: btoa(JSON.stringify(mapped)) };
    } catch (err: any) {
      if (err.message?.includes('Access Blocked')) throw err;
      return localStore.loginStaff(email, password);
    }
  },

  async logoutStaff(_staffId?: string): Promise<void> {},

  async checkStaffSession(): Promise<{ ok: boolean; staff: StaffMember }> {
    const token = localStorage.getItem('tyt_staff_token');
    if (!token) throw new Error('No staff token');
    const parsed = JSON.parse(atob(token));
    const { data } = await supabase.from('staff_members').select('*').eq('id', parsed.id).single();
    if (data?.is_blocked || !data?.is_active) throw new Error('Account Blocked');
    return { ok: true, staff: { ...data, isBlocked: data.is_blocked, isActive: data.is_active } };
  },

  async register(name: string, email: string, password: string, phone?: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.from('users').insert([{ name, email, password, phone, role: 'USER' }]).select().single();
      if (error) throw new Error(error.message);
      return { user: data as User, token: btoa(JSON.stringify(data)) };
    } catch {
      return localStore.register(name, email, password, phone);
    }
  },

  async getGoogleAuthUrl() { return { url: '', isConfigured: false }; },
  async googleDirectLogin(payload: { email: string; name?: string; image?: string }) {
    const mockUser: User = { id: `usr-google-${Date.now()}`, name: payload.name || 'Devotee', email: payload.email, role: 'USER', createdAt: new Date().toISOString() };
    return { user: mockUser, token: btoa(JSON.stringify(mockUser)) };
  },
  async getMe(tokenKey = 'tyt_auth_token') {
    const token = localStorage.getItem(tokenKey);
    return token ? JSON.parse(atob(token)) : null;
  },

  // Public & Admin Data via Supabase
  async getCities(): Promise<City[]> {
    const { data } = await supabase.from('cities').select('*');
    return data && data.length ? data : localStore.getCities();
  },

  async getHotels(cityId?: string, query?: string): Promise<Hotel[]> {
    const { data } = await supabase.from('hotels').select('*');
    let list = data && data.length ? data : localStore.getHotels(cityId, query);
    if (cityId) list = list.filter((h: any) => h.city_id === cityId || h.cityId === cityId);
    return list;
  },

  async getHotelById(id: string): Promise<Hotel> {
    const { data } = await supabase.from('hotels').select('*').eq('id', id).single();
    return data || localStore.getHotelById(id)!;
  },

  async getPackages(category?: string, query?: string): Promise<Package[]> {
    const { data } = await supabase.from('packages').select('*');
    return data && data.length ? data : localStore.getPackages(category, query);
  },

  async getPackageById(id: string): Promise<Package> {
    const { data } = await supabase.from('packages').select('*').eq('id', id).single();
    return data || localStore.getPackageById(id)!;
  },

  // Inquiries
  async submitInquiry(inquiryData: Partial<Inquiry>): Promise<Inquiry> {
    try {
      const { data, error } = await supabase.from('inquiries').insert([inquiryData]).select().single();
      if (error) throw new Error(error.message);
      broadcastNewInquiry(data);
      return data;
    } catch {
      const fb = localStore.submitInquiry(inquiryData);
      broadcastNewInquiry(fb);
      return fb;
    }
  },

  async getInquiries(userId?: string): Promise<Inquiry[]> {
    try {
      let q = supabase.from('inquiries').select('*').order('created_at', { ascending: false });
      if (userId) q = q.eq('user_id', userId);
      const { data } = await q;
      return data && data.length ? data : localStore.getInquiries(userId);
    } catch {
      return localStore.getInquiries(userId);
    }
  },

  async getMyInquiries(userId: string) { return this.getInquiries(userId); },
  async getAdminInquiries() { return this.getInquiries(); },

  async updateInquiryStatus(id: string, status: Inquiry['status']): Promise<Inquiry> {
    return this.updateInquiry(id, { status });
  },

  async updateInquiry(id: string, updates: Partial<Inquiry>, _asStaff = false): Promise<Inquiry> {
    try {
      const { data, error } = await supabase.from('inquiries').update(updates).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      broadcastInquiryUpdated(data, { newStatus: data.status });
      return data;
    } catch {
      const updated = localStore.updateInquiry(id, updates);
      broadcastInquiryUpdated(updated, { newStatus: updated.status });
      return updated;
    }
  },

  async toggleInquiryStatus(id: string): Promise<Inquiry> {
    const list = await this.getInquiries();
    const curr = list.find((i) => i.id === id);
    const next = curr?.status === 'NEW' ? 'CONTACTED' : curr?.status === 'CONTACTED' ? 'CLOSED' : 'NEW';
    return this.updateInquiry(id, { status: next });
  },

  async deleteInquiry(id: string): Promise<boolean> {
    await supabase.from('inquiries').delete().eq('id', id);
    return localStore.deleteInquiry(id);
  },

  async getDeletedInquiries() { return localStore.getDeletedInquiries(); },
  async restoreInquiry(id: string, sId?: string, sName?: string) { return localStore.restoreInquiry(id, sId, sName); },
  async permanentlyDeleteInquiry(id: string) { return localStore.permanentlyDeleteInquiry(id); },
  async emptyTrash() { return localStore.emptyTrash(); },

  async updateInquiryStatusByStaff(id: string, status: 'NEW' | 'CONTACTED' | 'CLOSED', staff: { id: string; name: string }) {
    return this.updateInquiry(id, { status, assignedStaffId: staff.id, assignedStaffName: staff.name });
  },

  async adminUnlockInquiry(id: string, newStatus: Inquiry['status'] = 'CONTACTED') {
    return this.updateInquiry(id, { status: newStatus, isLockedForStaff: false });
  },

  async addInquiryNote(id: string, noteData: any) {
    const list = await this.getInquiries();
    const target = list.find(i => i.id === id);
    const notes = [...(target?.notes || []), { id: `note-${Date.now()}`, ...noteData, createdAt: new Date().toISOString() }];
    return this.updateInquiry(id, { notes } as any);
  },

  async assignInquiryStaff(id: string, staffId: string, staffName: string) {
    return this.updateInquiry(id, { assignedStaffId: staffId, assignedStaffName: staffName });
  },

  // Staff Mgmt
  async getStaffMembers(): Promise<StaffMember[]> {
    const { data } = await supabase.from('staff_members').select('*');
    return data && data.length ? data : localStore.getStaffMembers();
  },
  async createStaffMember(staff: Partial<StaffMember>) {
    const { data } = await supabase.from('staff_members').insert([staff]).select().single();
    return data || localStore.createStaffMember(staff);
  },
  async updateStaffMember(id: string, staff: Partial<StaffMember>) {
    const { data } = await supabase.from('staff_members').update(staff).eq('id', id).select().single();
    return data || localStore.updateStaffMember(id, staff);
  },
  async toggleStaffStatus(id: string) {
    const list = await this.getStaffMembers();
    const target = list.find(s => s.id === id);
    return this.updateStaffMember(id, { isActive: !target?.isActive });
  },
  async blockStaffMember(id: string, isBlocked: boolean, reason?: string) {
    return this.updateStaffMember(id, { isBlocked, blockedReason: reason, isActive: !isBlocked });
  },
  async getStaffSessions() { return localStore.getStaffSessionMonitor(); },
  async getStaffLogs() { return localStore.getStaffLogs(); },
  async resetStaffPassword(id: string, newPassword: string) { return this.updateStaffMember(id, { password: newPassword }); },
  async deleteStaffMember(id: string) {
    await supabase.from('staff_members').delete().eq('id', id);
    localStore.deleteStaffMember(id);
    return true;
  },

  async uploadImage(base64OrDataUrl: string) { return base64OrDataUrl; },

  // Admin Hotels/Packages/Cities/Reviews fallbacks
  async createHotel(hotel: Partial<Hotel>) { const { data } = await supabase.from('hotels').insert([hotel]).select().single(); return data || localStore.createHotel(hotel); },
  async updateHotel(id: string, hotel: Partial<Hotel>) { const { data } = await supabase.from('hotels').update(hotel).eq('id', id).select().single(); return data || localStore.updateHotel(id, hotel); },
  async deleteHotel(id: string) { await supabase.from('hotels').delete().eq('id', id); localStore.deleteHotel(id); return true; },

  async createPackage(pkg: Partial<Package>) { const { data } = await supabase.from('packages').insert([pkg]).select().single(); return data || localStore.createPackage(pkg); },
  async updatePackage(id: string, pkg: Partial<Package>) { const { data } = await supabase.from('packages').update(pkg).eq('id', id).select().single(); return data || localStore.updatePackage(id, pkg); },
  async deletePackage(id: string) { await supabase.from('packages').delete().eq('id', id); localStore.deletePackage(id); return true; },

  async createCity(city: Partial<City>) { const { data } = await supabase.from('cities').insert([city]).select().single(); return data || localStore.createCity(city); },
  async updateCity(id: string, city: Partial<City>) { const { data } = await supabase.from('cities').update(city).eq('id', id).select().single(); return data || localStore.updateCity(id, city); },
  async deleteCity(id: string) { await supabase.from('cities').delete().eq('id', id); localStore.deleteCity(id); return true; },

  async getReviews(featuredOnly = false) {
    let q = supabase.from('reviews').select('*');
    if (featuredOnly) q = q.eq('featured', true);
    const { data } = await q;
    return data && data.length ? data : localStore.getReviews(featuredOnly);
  },
  async getAdminReviews() { return this.getReviews(false); },
  async createReview(rev: Partial<Review>) { const { data } = await supabase.from('reviews').insert([rev]).select().single(); return data || localStore.createReview(rev); },
  async updateReview(id: string, rev: Partial<Review>) { const { data } = await supabase.from('reviews').update(rev).eq('id', id).select().single(); return data || localStore.updateReview(id, rev); },
  async toggleReviewFeatured(id: string) { const list = await this.getReviews(); const t = list.find(r => r.id === id); return this.updateReview(id, { featured: !t?.featured }); },
  async deleteReview(id: string) { await supabase.from('reviews').delete().eq('id', id); localStore.deleteReview(id); return true; },

  async getCompanions() { return localStore.getCompanions(); },
  async getCompanionById(id: string) { return localStore.getCompanionById(id); },
  async createCompanion(p: any) { return localStore.createCompanion(p); },
  async updateCompanion(id: string, p: any) { return localStore.updateCompanion(id, p); },
  async deleteCompanion(id: string) { return localStore.deleteCompanion(id); },
  async createCompanionConnection(c: any) { return localStore.createCompanionConnection(c); },
  async getCompanionConnections(pid?: string) { return localStore.getCompanionConnections(pid); },
  async updateCompanionConnectionStatus(cid: string, status: any) { return localStore.updateCompanionConnectionStatus(cid, status); },
  async getCompanionProfiles() { return this.getCompanions(); },
  async createCompanionProfile(p: any) { return this.createCompanion(p); },
  async resetData() { localStore.resetData(); },
};

export function generateWhatsAppLink(details: any) {
  const travelDeskNumber = '919876543210';
  const text = encodeURIComponent(`Namaste TirthYatraTrails! Inquiry for ${details.title || 'Pilgrimage'}`);
  return `https://wa.me/${travelDeskNumber}?text=${text}`;
}