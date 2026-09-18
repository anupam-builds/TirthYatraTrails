import { City, Hotel, Package, Inquiry, User, AuthResponse, Review, StaffMember, CompanionProfile, CompanionConnection, CompanionSearchFilters } from '../types.js';
import { supabase } from '../lib/supabase.js';
import { localStore } from './localStore.js';
import { broadcastNewInquiry, broadcastInquiryUpdated } from './soundNotification.js';

export const api = {
  // Authentication
  async login(email: string, password: string, portal: 'customer' | 'admin' = 'customer'): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
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
      const { data, error } = await supabase.from('staff_members').select('*').eq('email', email).maybeSingle();
      if (error || !data || data.password !== password) throw new Error('Invalid staff credentials.');
      if (data.is_blocked || !data.is_active) throw new Error(`Access Blocked: ${data.blocked_reason || 'Revoked'}`);
      
      // Update session activity for live multi-admin tracking
      await supabase.from('staff_sessions').upsert({
        staff_id: data.id,
        ip_address: '122.161.48.12',
        device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser',
        last_active: new Date().toISOString(),
      }, { onConflict: 'staff_id' });

      const { password: _, ...safeStaff } = data;
      const mapped: StaffMember = { ...safeStaff, isBlocked: safeStaff.is_blocked, isActive: safeStaff.is_active };
      return { user: mapped, token: btoa(JSON.stringify(mapped)) };
    } catch (err: any) {
      if (err.message?.includes('Access Blocked')) throw err;
      return localStore.loginStaff(email, password);
    }
  },

  async logoutStaff(staffId?: string): Promise<void> {
    if (staffId) {
      try {
        await supabase.from('staff_sessions').delete().eq('staff_id', staffId);
      } catch {}
      localStore.logoutStaff(staffId);
    }
  },

  async checkStaffSession(): Promise<{ ok: boolean; staff: StaffMember }> {
    const token = localStorage.getItem('tyt_staff_token');
    if (!token) throw new Error('No staff token');
    const parsed = JSON.parse(atob(token));
    const { data } = await supabase.from('staff_members').select('*').eq('id', parsed.id).maybeSingle();
    if (!data) throw new Error('Staff account not found');
    if (data.is_blocked || !data.is_active) throw new Error('Account Blocked');
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
  async googleDirectLogin(payload: { email: string; name?: string; image?: string; sub?: string }) {
    const mockUser: User = { id: payload.sub || `usr-google-${Date.now()}`, name: payload.name || 'Devotee', email: payload.email, role: 'USER', createdAt: new Date().toISOString() };
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
    const { data } = await supabase.from('hotels').select('*').eq('id', id).maybeSingle();
    return data || localStore.getHotelById(id)!;
  },

  async getPackages(category?: string, query?: string): Promise<Package[]> {
    const { data } = await supabase.from('packages').select('*');
    return data && data.length ? data : localStore.getPackages(category, query);
  },

  async getPackageById(id: string): Promise<Package> {
    const { data } = await supabase.from('packages').select('*').eq('id', id).maybeSingle();
    return data || localStore.getPackageById(id)!;
  },

  // Inquiries
  async submitInquiry(inquiryData: Partial<Inquiry>): Promise<Inquiry> {
    try {
      const payload = {
        title: inquiryData.title,
        type: inquiryData.type,
        full_name: (inquiryData as any).fullName || (inquiryData as any).full_name,
        phone: inquiryData.phone,
        email: inquiryData.email,
        check_in_date: (inquiryData as any).checkInDate || (inquiryData as any).check_in_date,
        guests: inquiryData.guests,
        adults: inquiryData.adults,
        children: inquiryData.children,
        child_ages: (inquiryData as any).childAges || (inquiryData as any).child_ages,
        plan: inquiryData.plan,
        special_requests: (inquiryData as any).specialRequests || (inquiryData as any).special_requests,
        pickup_location: (inquiryData as any).pickupLocation || (inquiryData as any).pickup_location,
        dropoff_location: (inquiryData as any).dropoffLocation || (inquiryData as any).dropoff_location,
        user_id: (inquiryData as any).userId || (inquiryData as any).user_id,
        status: inquiryData.status || 'NEW',
        assigned_staff_id: (inquiryData as any).assignedStaffId,
        assigned_staff_name: (inquiryData as any).assignedStaffName,
        is_locked_for_staff: Boolean((inquiryData as any).isLockedForStaff),
      };
      const { data, error } = await supabase.from('inquiries').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      const mapped = mapInquiryRow(data);
      broadcastNewInquiry(mapped);
      return mapped;
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
      if (data && data.length) return data.map(mapInquiryRow);
      return localStore.getInquiries(userId);
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
      const payload: Record<string, any> = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.assignedStaffId !== undefined) payload.assigned_staff_id = updates.assignedStaffId;
      if (updates.assignedStaffName !== undefined) payload.assigned_staff_name = updates.assignedStaffName;
      if ((updates as any).isLockedForStaff !== undefined) payload.is_locked_for_staff = (updates as any).isLockedForStaff;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.specialRequests !== undefined) payload.special_requests = updates.specialRequests;
      if (updates.title !== undefined) payload.title = updates.title;

      const { data, error } = await supabase.from('inquiries').update(payload).eq('id', id).select().maybeSingle();
      if (error || !data) throw new Error(error?.message || 'Update failed');
      const mapped = mapInquiryRow(data);
      localStore.updateInquiry(id, mapped);
      broadcastInquiryUpdated(mapped, { newStatus: mapped.status, staffName: mapped.assignedStaffName });
      return mapped;
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
    return this.updateInquiry(id, {
      status,
      assignedStaffId: staff.id,
      assignedStaffName: staff.name,
      isLockedForStaff: status === 'CLOSED',
    }, true);
  },

  async adminUnlockInquiry(id: string, newStatus: Inquiry['status'] = 'CONTACTED') {
    return this.updateInquiry(id, { status: newStatus, isLockedForStaff: false });
  },

  async addInquiryNote(id: string, noteData: any) {
    try {
      const list = await this.getInquiries();
      const target = list.find(i => i.id === id);
      const notes = [...(target?.notes || []), { id: `note-${Date.now()}`, ...noteData, createdAt: new Date().toISOString() }];
      return await this.updateInquiry(id, { notes } as any);
    } catch {
      return localStore.addInquiryNote(id, noteData);
    }
  },

  async assignInquiryStaff(id: string, staffId: string, staffName: string) {
    return this.updateInquiry(id, { assignedStaffId: staffId, assignedStaffName: staffName });
  },

  // Staff Mgmt & Live Session Monitor via Supabase
  async getStaffMembers(): Promise<StaffMember[]> {
    const { data } = await supabase.from('staff_members').select('*');
    return data && data.length ? data.map(mapStaffRow) : localStore.getStaffMembers();
  },
  async createStaffMember(staff: Partial<StaffMember>) {
    const payload = {
      id: staff.id || `stf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: staff.name,
      email: staff.email,
      password: staff.password || 'Tirth@123',
      role: staff.role || 'STAFF',
      department: (staff as any).department || 'Operations',
      is_active: (staff as any).isActive !== false,
      is_blocked: Boolean((staff as any).isBlocked),
    };
    const { data } = await supabase.from('staff_members').insert([payload]).select().maybeSingle();
    const mapped = data ? mapStaffRow(data) : localStore.createStaffMember(staff);
    localStore.createStaffMember(mapped);
    return mapped;
  },
  async updateStaffMember(id: string, staff: Partial<StaffMember>) {
    const payload: Record<string, any> = {};
    if (staff.name !== undefined) payload.name = staff.name;
    if (staff.email !== undefined) payload.email = staff.email;
    if (staff.password !== undefined) payload.password = staff.password;
    if (staff.role !== undefined) payload.role = staff.role;
    if ((staff as any).department !== undefined) payload.department = (staff as any).department;
    if ((staff as any).isActive !== undefined) payload.is_active = (staff as any).isActive;
    if ((staff as any).isBlocked !== undefined) payload.is_blocked = (staff as any).isBlocked;

    const { data } = await supabase.from('staff_members').update(payload).eq('id', id).select().maybeSingle();
    const mapped = data ? mapStaffRow(data) : localStore.updateStaffMember(id, staff);
    localStore.updateStaffMember(id, mapped);
    return mapped;
  },
  async toggleStaffStatus(id: string) {
    const list = await this.getStaffMembers();
    const target = list.find(s => s.id === id);
    return this.updateStaffMember(id, { isActive: !target?.isActive } as any);
  },
  async blockStaffMember(id: string, isBlocked: boolean, reason?: string) {
    return this.updateStaffMember(id, { isBlocked, blockedReason: reason, isActive: !isBlocked } as any);
  },
  async getStaffSessions() {
    try {
      const { data, error } = await supabase.from('staff_sessions').select('*');
      if (error || !data || data.length === 0) return localStore.getStaffSessionMonitor();
      const sessions = data.map((row: any) => ({
        staffId: row.staff_id,
        ip: row.ip_address,
        device: row.device,
        lastActive: row.last_active,
        isOnline: new Date().getTime() - new Date(row.last_active).getTime() < 15 * 60 * 1000,
      }));
      return { activeCount: sessions.filter((s: any) => s.isOnline).length, sessions };
    } catch {
      return localStore.getStaffSessionMonitor();
    }
  },
  async getStaffLogs() { return localStore.getStaffLogs(); },
  async resetStaffPassword(id: string, newPassword: string) { return this.updateStaffMember(id, { password: newPassword }); },
  async deleteStaffMember(id: string) {
    await supabase.from('staff_members').delete().eq('id', id);
    localStore.deleteStaffMember(id);
    return true;
  },

  async uploadImage(base64OrDataUrl: string) { return base64OrDataUrl; },

  // Admin Hotels/Packages/Cities/Reviews fallbacks
  async createHotel(hotel: Partial<Hotel>) { const { data } = await supabase.from('hotels').insert([hotel]).select().maybeSingle(); return data || localStore.createHotel(hotel); },
  async updateHotel(id: string, hotel: Partial<Hotel>) { const { data } = await supabase.from('hotels').update(hotel).eq('id', id).select().maybeSingle(); return data || localStore.updateHotel(id, hotel); },
  async deleteHotel(id: string) { await supabase.from('hotels').delete().eq('id', id); localStore.deleteHotel(id); return true; },

  async createPackage(pkg: Partial<Package>) { const { data } = await supabase.from('packages').insert([pkg]).select().maybeSingle(); return data || localStore.createPackage(pkg); },
  async updatePackage(id: string, pkg: Partial<Package>) { const { data } = await supabase.from('packages').update(pkg).eq('id', id).select().maybeSingle(); return data || localStore.updatePackage(id, pkg); },
  async deletePackage(id: string) { await supabase.from('packages').delete().eq('id', id); localStore.deletePackage(id); return true; },

  async createCity(city: Partial<City>) { const { data } = await supabase.from('cities').insert([city]).select().maybeSingle(); return data || localStore.createCity(city); },
  async updateCity(id: string, city: Partial<City>) { const { data } = await supabase.from('cities').update(city).eq('id', id).select().maybeSingle(); return data || localStore.updateCity(id, city); },
  async deleteCity(id: string) { await supabase.from('cities').delete().eq('id', id); localStore.deleteCity(id); return true; },

  async getReviews(featuredOnly = false) {
    let q = supabase.from('reviews').select('*');
    if (featuredOnly) q = q.eq('featured', true);
    const { data } = await q;
    return data && data.length ? data : localStore.getReviews(featuredOnly);
  },
  async getAdminReviews() { return this.getReviews(false); },
  async createReview(rev: Partial<Review>) { const { data } = await supabase.from('reviews').insert([rev]).select().maybeSingle(); return data || localStore.createReview(rev); },
  async updateReview(id: string, rev: Partial<Review>) { const { data } = await supabase.from('reviews').update(rev).eq('id', id).select().maybeSingle(); return data || localStore.updateReview(id, rev); },
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

export function mapInquiryRow(row: any): Inquiry {
  if (!row) return {} as Inquiry;
  const customerName = row.customer_name || row.customerName || row.full_name || row.fullName || 'Pilgrim Devotee';
  const customerEmail = row.customer_email || row.customerEmail || row.email || '';
  const phone = row.phone || row.customer_phone || row.customerPhone || row.whatsapp_number || row.whatsappNumber || '';
  return {
    id: String(row.id),
    leadId: row.lead_id || row.leadId,
    userId: row.user_id || row.userId,
    type: row.type || 'PACKAGE',
    referenceId: row.reference_id || row.referenceId || row.id || '',
    referenceName: row.reference_name || row.referenceName || row.title || 'Pilgrimage Booking',
    title: row.title || 'Pilgrimage Inquiry',
    fullName: row.full_name || row.fullName || customerName,
    customerName: customerName,
    email: customerEmail,
    customerEmail: customerEmail,
    whatsappNumber: row.whatsapp_number || row.whatsappNumber || phone,
    customerPhone: phone,
    phone: phone,
    userCity: row.user_city || row.userCity,
    checkInDate: row.check_in_date || row.checkInDate || new Date().toISOString().split('T')[0],
    guests: Number(row.guests ?? 1),
    adults: Number(row.adults ?? 1),
    children: Number(row.children ?? 0),
    childAges: row.child_ages || row.childAges,
    planChosen: row.plan_chosen || row.planChosen || row.plan || row.selected_plan || row.selectedPlan,
    selectedPlan: row.selected_plan || row.selectedPlan || row.plan_chosen || row.planChosen || row.plan,
    plan: row.plan || row.selected_plan || row.selectedPlan || row.plan_chosen || row.planChosen,
    accommodationTier: row.accommodation_tier || row.accommodationTier,
    pickupLocation: row.pickup_location || row.pickupLocation,
    dropoffLocation: row.dropoff_location || row.dropoffLocation,
    specialRequests: row.special_requests || row.specialRequests,
    status: row.status || 'NEW',
    isResolved: Boolean(row.is_resolved ?? row.isResolved ?? (row.status === 'CLOSED' || row.status === 'CONFIRMED')),
    assignedStaffId: row.assigned_staff_id || row.assignedStaffId || undefined,
    assignedStaffName: row.assigned_staff_name || row.assignedStaffName || undefined,
    isLockedForStaff: Boolean(row.is_locked_for_staff ?? row.isLockedForStaff),
    closedAt: row.closed_at || row.closedAt,
    closedBy: row.closed_by || row.closedBy,
    isDeleted: Boolean(row.is_deleted ?? row.isDeleted),
    deletedAt: row.deleted_at || row.deletedAt,
    deletedBy: row.deleted_by || row.deletedBy,
    notes: typeof row.notes === 'string' ? row.notes : (Array.isArray(row.notes) ? row.notes.map((n: any) => n.text || JSON.stringify(n)).join('\n') : ''),
    followUpNotes: Array.isArray(row.follow_up_notes) ? row.follow_up_notes : (Array.isArray(row.followUpNotes) ? row.followUpNotes : (Array.isArray(row.notes) ? row.notes : [])),
    customerRating: row.customer_rating || row.customerRating,
    tags: row.tags || [],
    tourDuration: row.tour_duration || row.tourDuration,
    companionMatchingOptIn: Boolean(row.companion_matching_opt_in ?? row.companionMatchingOptIn),
    companionPilgrimType: row.companion_pilgrim_type || row.companionPilgrimType,
    companionNotes: row.companion_notes || row.companionNotes,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt,
  };
}

function mapStaffRow(row: any): StaffMember {
  return {
    ...row,
    isBlocked: row.is_blocked ?? row.isBlocked,
    blockedReason: row.blocked_reason ?? row.blockedReason,
    isActive: row.is_active ?? row.isActive,
    lastActiveAt: row.last_active_at ?? row.lastActiveAt,
    currentIp: row.current_ip ?? row.currentIp,
    currentDevice: row.current_device ?? row.currentDevice,
  };
}

export function generateWhatsAppLink(details: any) {
  const travelDeskNumber = '919876543210';
  const text = encodeURIComponent(`Namaste TirthYatraTrails! Inquiry for ${details.title || 'Pilgrimage'}`);
  return `https://wa.me/${travelDeskNumber}?text=${text}`;
}