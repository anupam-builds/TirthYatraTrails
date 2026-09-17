import { City, Hotel, Package, Inquiry, User, AuthResponse, Review, StaffMember, InquiryNote, StaffActivityLog, StaffSessionMonitor, CompanionProfile, CompanionConnection, CompanionSearchFilters } from '../types.js';
import { supabase } from '../lib/supabase.js';
import { localStore } from './localStore.js';
import { broadcastNewInquiry, broadcastInquiryUpdated } from './soundNotification.js';

function parseDeviceDetails(userAgent?: string): string {
  if (!userAgent) return 'Desktop Browser';
  let browser = 'Browser';
  let os = 'Unknown OS';

  if (userAgent.includes('Edg/')) browser = 'Edge';
  else if (userAgent.includes('Chrome/')) browser = 'Chrome';
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) browser = 'Safari';
  else if (userAgent.includes('Firefox/')) browser = 'Firefox';

  if (userAgent.includes('Windows')) os = 'Windows 11/10';
  else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('iPhone')) os = 'iPhone iOS';
  else if (userAgent.includes('iPad')) os = 'iPadOS';
  else if (userAgent.includes('Android')) os = 'Android Device';
  else if (userAgent.includes('Linux')) os = 'Linux OS';

  return `${browser} on ${os}`;
}

export const api = {
  // Authentication
  async login(email: string, password: string, portal: 'customer' | 'admin' = 'customer'): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      if (error || !data) throw new Error('Invalid email or password.');
      if (data.password && data.password !== password) throw new Error('Invalid email or password.');
      if (portal === 'admin' && data.role !== 'ADMIN') throw new Error('Access Denied. Admin privileges required.');
      const { password: _, ...safeUser } = data;
      const token = btoa(JSON.stringify(safeUser));
      return { user: safeUser as User, token };
    } catch (err: any) {
      console.warn('Supabase login fallback to localStore:', err.message);
      return localStore.login(email, password, portal);
    }
  },

  async loginStaff(email: string, password: string): Promise<{ user: StaffMember; token: string }> {
    try {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('email', email)
        .single();
      if (error || !data) throw new Error('No staff account found with this email.');
      if (data.password && data.password !== password) throw new Error('Invalid staff credentials.');
      if (data.is_blocked || !data.is_active) {
        throw new Error(`Access Blocked: ${data.blocked_reason || 'Account revoked by administrator.'}`);
      }
      const clientIp = '122.161.48.12';
      const deviceStr = typeof navigator !== 'undefined' ? parseDeviceDetails(navigator.userAgent) : 'Desktop Browser';
      await supabase.from('staff_sessions').upsert({
        staff_id: data.id,
        ip_address: clientIp,
        device: deviceStr,
        last_active: new Date().toISOString(),
      }, { onConflict: 'staff_id' });

      const { password: _, ...safeStaff } = data;
      const mappedStaff: StaffMember = {
        ...safeStaff,
        isBlocked: safeStaff.is_blocked,
        blockedReason: safeStaff.blocked_reason,
        isActive: safeStaff.is_active,
        lastActiveAt: safeStaff.last_active_at,
        currentIp: safeStaff.current_ip,
        currentDevice: safeStaff.current_device,
      };
      const token = btoa(JSON.stringify(mappedStaff));
      return { user: mappedStaff, token };
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('Access Blocked') ||
          err.message.includes('Invalid staff') ||
          err.message.includes('No staff account') ||
          err.message.includes('revoked'))
      ) {
        throw err;
      }
      console.warn('Supabase staff login fallback to localStore:', err.message);
      return localStore.loginStaff(email, password);
    }
  },

  async logoutStaff(staffId?: string): Promise<void> {
    try {
      if (staffId) {
        await supabase.from('staff_sessions').delete().eq('staff_id', staffId);
      }
    } catch {
      if (staffId) localStore.logoutStaff(staffId);
    }
  },

  async checkStaffSession(): Promise<{ ok: boolean; staff: StaffMember }> {
    try {
      const token = localStorage.getItem('tyt_staff_token');
      if (!token) throw new Error('No staff token');
      const parsed = JSON.parse(atob(token));
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('id', parsed.id)
        .single();
      if (error || !data) throw new Error('Staff account not found');
      if (data.is_blocked || !data.is_active) {
        throw new Error('Account Blocked: Access revoked by administrator');
      }
      const mappedStaff: StaffMember = {
        ...data,
        isBlocked: data.is_blocked,
        blockedReason: data.blocked_reason,
        isActive: data.is_active,
        lastActiveAt: data.last_active_at,
        currentIp: data.current_ip,
        currentDevice: data.current_device,
      };
      return { ok: true, staff: mappedStaff };
    } catch (err: any) {
      const token = localStorage.getItem('tyt_staff_token');
      if (token) {
        try {
          const parsed = JSON.parse(atob(token));
          const list = localStore.getStaffMembers();
          const match = list.find((s) => s.id === parsed.id);
          if (match?.isBlocked) {
            throw new Error('Account Blocked: Access revoked by administrator');
          }
          if (match) return { ok: true, staff: match };
        } catch (e: any) {
          throw e;
        }
      }
      throw err;
    }
  },

  async register(name: string, email: string, password: string, phone?: string): Promise<AuthResponse> {
    try {
      const newUser = {
        name,
        email,
        password,
        phone: phone || '',
        role: 'USER',
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('users').insert([newUser]).select().single();
      if (error) throw new Error(error.message);
      const token = btoa(JSON.stringify(data));
      return { user: data as User, token };
    } catch (err: any) {
      console.warn('Supabase register fallback to localStore:', err.message);
      return localStore.register(name, email, password, phone);
    }
  },

  async getGoogleAuthUrl(): Promise<{ url: string; isConfigured: boolean }> {
    return { url: '', isConfigured: false };
  },

  async googleDirectLogin(payload: { email: string; name?: string; image?: string; sub?: string }): Promise<AuthResponse> {
    const mockUser: User = {
      id: `usr-google-${Date.now()}`,
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      image: payload.image,
      role: 'USER',
      createdAt: new Date().toISOString(),
    };
    const token = btoa(JSON.stringify(mockUser));
    return { user: mockUser, token };
  },

  async getMe(tokenKey = 'tyt_auth_token'): Promise<User | null> {
    const token = localStorage.getItem(tokenKey);
    if (!token) return null;
    try {
      const parsed = JSON.parse(atob(token));
      if (parsed && parsed.email) {
        const { data } = await supabase.from('users').select('*').eq('id', parsed.id).single();
        return data || parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Cities
  async getCities(): Promise<City[]> {
    try {
      const { data, error } = await supabase.from('cities').select('*');
      if (error) throw new Error(error.message);
      return (data || []).map((row: any) => ({
        ...row,
        shortDescription: row.short_description,
        bestTime: row.best_time,
        templesCount: row.temples_count,
        mustVisit: row.must_visit,
      }));
    } catch {
      return localStore.getCities();
    }
  },

  // Hotels
  async getHotels(cityId?: string, query?: string): Promise<Hotel[]> {
    try {
      let sbQuery = supabase.from('hotels').select('*');
      if (cityId) sbQuery = sbQuery.eq('city_id', cityId);
      const { data, error } = await sbQuery;
      if (error) throw new Error(error.message);
      let list = (data || []).map((row: any) => ({
        ...row,
        cityId: row.city_id,
        pricePerNight: row.price_per_night,
        isPureVeg: row.is_pure_veg,
        distanceFromTemple: row.distance_from_temple,
        sannidhiProximity: row.sannidhi_proximity,
      }));
      if (query) {
        const qLower = query.toLowerCase();
        list = list.filter((h) => h.name?.toLowerCase().includes(qLower) || h.city?.toLowerCase().includes(qLower));
      }
      return list;
    } catch {
      return localStore.getHotels(cityId, query);
    }
  },

  async getHotelById(id: string): Promise<Hotel> {
    try {
      const { data, error } = await supabase.from('hotels').select('*').eq('id', id).single();
      if (error || !data) throw new Error('Hotel not found');
      return {
        ...data,
        cityId: data.city_id,
        pricePerNight: data.price_per_night,
        isPureVeg: data.is_pure_veg,
        distanceFromTemple: data.distance_from_temple,
        sannidhiProximity: data.sannidhi_proximity,
      };
    } catch {
      const h = localStore.getHotelById(id);
      if (!h) throw new Error('Hotel not found');
      return h;
    }
  },

  // Packages
  async getPackages(category?: string, query?: string): Promise<Package[]> {
    try {
      let sbQuery = supabase.from('packages').select('*');
      if (category && category !== 'All') sbQuery = sbQuery.eq('category', category);
      const { data, error } = await sbQuery;
      if (error) throw new Error(error.message);
      let list = (data || []).map((row: any) => ({
        ...row,
        startingPrice: row.starting_price,
        maxGroupSize: row.max_group_size,
        highlights: Array.isArray(row.highlights) ? row.highlights : typeof row.highlights === 'string' ? JSON.parse(row.highlights) : [],
        itinerary: Array.isArray(row.itinerary) ? row.itinerary : typeof row.itinerary === 'string' ? JSON.parse(row.itinerary) : [],
      }));
      if (query) {
        const qLower = query.toLowerCase();
        list = list.filter((p) => p.title?.toLowerCase().includes(qLower) || p.destination?.toLowerCase().includes(qLower));
      }
      return list;
    } catch {
      return localStore.getPackages(category, query);
    }
  },

  async getPackageById(id: string): Promise<Package> {
    try {
      const { data, error } = await supabase.from('packages').select('*').eq('id', id).single();
      if (error || !data) throw new Error('Package not found');
      return {
        ...data,
        startingPrice: data.starting_price,
        maxGroupSize: data.max_group_size,
        highlights: Array.isArray(data.highlights) ? data.highlights : typeof data.highlights === 'string' ? JSON.parse(data.highlights) : [],
        itinerary: Array.isArray(data.itinerary) ? data.itinerary : typeof data.itinerary === 'string' ? JSON.parse(data.itinerary) : [],
      };
    } catch {
      const p = localStore.getPackageById(id);
      if (!p) throw new Error('Package not found');
      return p;
    }
  },

  // Inquiries
  async submitInquiry(inquiryData: Partial<Inquiry>): Promise<Inquiry> {
    try {
      const payload = {
        title: inquiryData.title || '',
        type: inquiryData.type || 'PACKAGE',
        full_name: inquiryData.fullName || '',
        phone: inquiryData.phone || '',
        email: inquiryData.email || '',
        check_in_date: inquiryData.checkInDate || '',
        guests: inquiryData.guests || 2,
        adults: inquiryData.adults || 2,
        children: inquiryData.children || 0,
        child_ages: inquiryData.childAges || [],
        plan: inquiryData.plan || '',
        special_requests: inquiryData.specialRequests || '',
        pickup_location: inquiryData.pickupLocation || '',
        dropoff_location: inquiryData.dropoffLocation || '',
        user_id: inquiryData.userId || null,
        status: 'NEW',
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('inquiries').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      const mapped: Inquiry = {
        id: data.id,
        title: data.title,
        type: data.type,
        fullName: data.full_name,
        phone: data.phone,
        email: data.email,
        checkInDate: data.check_in_date,
        guests: data.guests,
        adults: data.adults,
        children: data.children,
        childAges: data.child_ages,
        plan: data.plan,
        specialRequests: data.special_requests,
        pickupLocation: data.pickup_location,
        dropoffLocation: data.dropoff_location,
        userId: data.user_id,
        status: data.status,
        createdAt: data.created_at,
        assignedStaffId: data.assigned_staff_id,
        assignedStaffName: data.assigned_staff_name,
        isLockedForStaff: data.is_locked_for_staff,
        notes: data.notes || [],
      };
      localStore.submitInquiry(mapped);
      broadcastNewInquiry(mapped);
      return mapped;
    } catch {
      const fallback = localStore.submitInquiry(inquiryData);
      broadcastNewInquiry(fallback);
      return fallback;
    }
  },

  async getInquiries(userId?: string): Promise<Inquiry[]> {
    try {
      let query = supabase.from('inquiries').select('*').order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        fullName: row.full_name,
        phone: row.phone,
        email: row.email,
        checkInDate: row.check_in_date,
        guests: row.guests,
        adults: row.adults,
        children: row.children,
        childAges: row.child_ages,
        plan: row.plan,
        specialRequests: row.special_requests,
        pickupLocation: row.pickup_location,
        dropoffLocation: row.dropoff_location,
        userId: row.user_id,
        status: row.status,
        createdAt: row.created_at,
        assignedStaffId: row.assigned_staff_id,
        assignedStaffName: row.assigned_staff_name,
        isLockedForStaff: row.is_locked_for_staff,
        notes: row.notes || [],
      }));
    } catch {
      return localStore.getInquiries(userId);
    }
  },

  async getMyInquiries(userId: string): Promise<Inquiry[]> {
    return this.getInquiries(userId);
  },

  // ================= ADMIN API =================
  async getAdminInquiries(): Promise<Inquiry[]> {
    return this.getInquiries();
  },

  async updateInquiryStatus(id: string, status: Inquiry['status']): Promise<Inquiry> {
    return this.updateInquiry(id, { status });
  },

  async updateInquiry(id: string, updates: Partial<Inquiry>, _asStaff = false): Promise<Inquiry> {
    try {
      const payload: Record<string, any> = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.assignedStaffId !== undefined) payload.assigned_staff_id = updates.assignedStaffId;
      if (updates.assignedStaffName !== undefined) payload.assigned_staff_name = updates.assignedStaffName;
      if (updates.isLockedForStaff !== undefined) payload.is_locked_for_staff = updates.isLockedForStaff;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.specialRequests !== undefined) payload.special_requests = updates.specialRequests;

      const { data, error } = await supabase.from('inquiries').update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      const mapped: Inquiry = {
        id: data.id,
        title: data.title,
        type: data.type,
        fullName: data.full_name,
        phone: data.phone,
        email: data.email,
        checkInDate: data.check_in_date,
        guests: data.guests,
        adults: data.adults,
        children: data.children,
        childAges: data.child_ages,
        plan: data.plan,
        specialRequests: data.special_requests,
        pickupLocation: data.pickup_location,
        dropoffLocation: data.dropoff_location,
        userId: data.user_id,
        status: data.status,
        createdAt: data.created_at,
        assignedStaffId: data.assigned_staff_id,
        assignedStaffName: data.assigned_staff_name,
        isLockedForStaff: data.is_locked_for_staff,
        notes: data.notes || [],
      };
      localStore.updateInquiry(id, updates);
      broadcastInquiryUpdated(mapped, {
        newStatus: mapped.status,
        staffName: mapped.assignedStaffName,
      });
      return mapped;
    } catch {
      const updated = localStore.updateInquiry(id, updates);
      broadcastInquiryUpdated(updated, {
        newStatus: updated.status,
        staffName: updated.assignedStaffName,
      });
      return updated;
    }
  },

  async toggleInquiryStatus(id: string): Promise<Inquiry> {
    const list = await this.getInquiries();
    const curr = list.find((i) => i.id === id);
    const nextStatus = curr?.status === 'NEW' ? 'CONTACTED' : curr?.status === 'CONTACTED' ? 'CLOSED' : 'NEW';
    return this.updateInquiry(id, { status: nextStatus });
  },

  async deleteInquiry(id: string): Promise<boolean> {
    try {
      await supabase.from('inquiries').delete().eq('id', id);
      localStore.deleteInquiry(id);
      return true;
    } catch {
      return localStore.deleteInquiry(id);
    }
  },

  async getDeletedInquiries(): Promise<Inquiry[]> {
    return localStore.getDeletedInquiries();
  },

  async restoreInquiry(id: string, staffId?: string, staffName?: string): Promise<Inquiry> {
    return localStore.restoreInquiry(id, staffId, staffName);
  },

  async permanentlyDeleteInquiry(id: string): Promise<boolean> {
    return localStore.permanentlyDeleteInquiry(id);
  },

  async emptyTrash(): Promise<boolean> {
    return localStore.emptyTrash();
  },

  async updateInquiryStatusByStaff(
    id: string,
    status: 'NEW' | 'CONTACTED' | 'CLOSED',
    staff: { id: string; name: string }
  ): Promise<Inquiry> {
    return this.updateInquiry(id, {
      status,
      assignedStaffId: staff.id,
      assignedStaffName: staff.name,
      isLockedForStaff: status === 'CLOSED',
    }, true);
  },

  async adminUnlockInquiry(id: string, newStatus: Inquiry['status'] = 'CONTACTED'): Promise<Inquiry> {
    return this.updateInquiry(id, {
      status: newStatus,
      isLockedForStaff: false,
    });
  },

  async addInquiryNote(
    id: string,
    noteData: { text: string; authorName: string; authorRole: 'ADMIN' | 'STAFF'; authorId?: string }
  ): Promise<Inquiry> {
    try {
      const { data: current } = await supabase.from('inquiries').select('notes').eq('id', id).single();
      const existing = Array.isArray(current?.notes) ? current.notes : [];
      const updatedNotes = [
        ...existing,
        {
          id: `note-${Date.now()}`,
          text: noteData.text,
          authorName: noteData.authorName,
          authorRole: noteData.authorRole,
          createdAt: new Date().toISOString(),
        },
      ];
      return await this.updateInquiry(id, { notes: updatedNotes });
    } catch {
      return localStore.addInquiryNote(id, noteData);
    }
  },

  async assignInquiryStaff(id: string, staffId: string, staffName: string): Promise<Inquiry> {
    return this.updateInquiry(id, {
      assignedStaffId: staffId,
      assignedStaffName: staffName,
    });
  },

  // Admin Staff Management
  async getStaffMembers(): Promise<StaffMember[]> {
    try {
      const { data, error } = await supabase.from('staff_members').select('*');
      if (error) throw new Error(error.message);
      return (data || []).map((row: any) => ({
        ...row,
        isBlocked: row.is_blocked,
        blockedReason: row.blocked_reason,
        isActive: row.is_active,
        lastActiveAt: row.last_active_at,
        currentIp: row.current_ip,
        currentDevice: row.current_device,
      }));
    } catch {
      return localStore.getStaffMembers();
    }
  },

  async createStaffMember(staff: Partial<StaffMember>): Promise<StaffMember> {
    try {
      const payload = {
        name: staff.name,
        email: staff.email,
        password: staff.password || 'Tirth@123',
        role: staff.role || 'STAFF',
        department: staff.department || 'Operations',
        is_active: staff.isActive !== false,
        is_blocked: Boolean(staff.isBlocked),
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('staff_members').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      const mapped = {
        ...data,
        isBlocked: data.is_blocked,
        blockedReason: data.blocked_reason,
        isActive: data.is_active,
      };
      localStore.createStaffMember(mapped);
      return mapped;
    } catch {
      return localStore.createStaffMember(staff);
    }
  },

  async updateStaffMember(id: string, staff: Partial<StaffMember>): Promise<StaffMember> {
    try {
      const payload: Record<string, any> = {};
      if (staff.name !== undefined) payload.name = staff.name;
      if (staff.email !== undefined) payload.email = staff.email;
      if (staff.password !== undefined) payload.password = staff.password;
      if (staff.department !== undefined) payload.department = staff.department;
      if (staff.isBlocked !== undefined) payload.is_blocked = staff.isBlocked;
      if (staff.blockedReason !== undefined) payload.blocked_reason = staff.blockedReason;
      if (staff.isActive !== undefined) payload.is_active = staff.isActive;

      const { data, error } = await supabase.from('staff_members').update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      const mapped = {
        ...data,
        isBlocked: data.is_blocked,
        blockedReason: data.blocked_reason,
        isActive: data.is_active,
      };
      localStore.updateStaffMember(id, mapped);
      return mapped;
    } catch {
      return localStore.updateStaffMember(id, staff);
    }
  },

  async toggleStaffStatus(id: string): Promise<StaffMember> {
    const list = await this.getStaffMembers();
    const curr = list.find((s) => s.id === id);
    return this.updateStaffMember(id, { isActive: !curr?.isActive });
  },

  async blockStaffMember(id: string, isBlocked: boolean, reason?: string): Promise<StaffMember> {
    return this.updateStaffMember(id, { isBlocked, blockedReason: reason, isActive: !isBlocked });
  },

  async getStaffSessions(): Promise<StaffSessionMonitor> {
    try {
      const { data } = await supabase.from('staff_sessions').select('*');
      return (data || []) as unknown as StaffSessionMonitor;
    } catch {
      return localStore.getStaffSessionMonitor();
    }
  },

  async getStaffLogs(_staffId?: string): Promise<StaffActivityLog[]> {
    return localStore.getStaffLogs(_staffId);
  },

  async resetStaffPassword(id: string, newPassword: string): Promise<StaffMember> {
    return this.updateStaffMember(id, { password: newPassword });
  },

  async deleteStaffMember(id: string): Promise<boolean> {
    try {
      await supabase.from('staff_members').delete().eq('id', id);
      localStore.deleteStaffMember(id);
      return true;
    } catch {
      localStore.deleteStaffMember(id);
      return true;
    }
  },

  // Image Upload Support
  async uploadImage(base64OrDataUrl: string, _filename?: string): Promise<string> {
    return base64OrDataUrl;
  },

  // Admin Hotels
  async createHotel(hotel: Partial<Hotel>): Promise<Hotel> {
    try {
      const payload = {
        name: hotel.name,
        city: hotel.city,
        city_id: hotel.cityId || '',
        price_per_night: hotel.pricePerNight || 0,
        rating: hotel.rating || 4.5,
        image: hotel.image || '',
        is_pure_veg: hotel.isPureVeg !== false,
        distance_from_temple: hotel.distanceFromTemple || '',
        sannidhi_proximity: hotel.sannidhiProximity || '',
      };
      const { data, error } = await supabase.from('hotels').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      const mapped = {
        ...data,
        cityId: data.city_id,
        pricePerNight: data.price_per_night,
        isPureVeg: data.is_pure_veg,
        distanceFromTemple: data.distance_from_temple,
        sannidhiProximity: data.sannidhi_proximity,
      };
      localStore.createHotel(mapped);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-hotel-changed', { detail: { action: 'create', hotel: mapped } }));
      }
      return mapped;
    } catch {
      const res = localStore.createHotel(hotel);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-hotel-changed', { detail: { action: 'create', hotel: res } }));
      }
      return res;
    }
  },

  async updateHotel(id: string, hotel: Partial<Hotel>): Promise<Hotel> {
    try {
      const payload: Record<string, any> = {};
      if (hotel.name !== undefined) payload.name = hotel.name;
      if (hotel.city !== undefined) payload.city = hotel.city;
      if (hotel.cityId !== undefined) payload.city_id = hotel.cityId;
      if (hotel.pricePerNight !== undefined) payload.price_per_night = hotel.pricePerNight;
      if (hotel.rating !== undefined) payload.rating = hotel.rating;
      if (hotel.image !== undefined) payload.image = hotel.image;
      if (hotel.isPureVeg !== undefined) payload.is_pure_veg = hotel.isPureVeg;
      if (hotel.distanceFromTemple !== undefined) payload.distance_from_temple = hotel.distanceFromTemple;
      if (hotel.sannidhiProximity !== undefined) payload.sannidhi_proximity = hotel.sannidhiProximity;

      const { data, error } = await supabase.from('hotels').update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      const mapped = {
        ...data,
        cityId: data.city_id,
        pricePerNight: data.price_per_night,
        isPureVeg: data.is_pure_veg,
        distanceFromTemple: data.distance_from_temple,
        sannidhiProximity: data.sannidhi_proximity,
      };
      localStore.updateHotel(id, mapped);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-hotel-changed', { detail: { action: 'update', hotel: mapped } }));
      }
      return mapped;
    } catch {
      const res = localStore.updateHotel(id, hotel);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-hotel-changed', { detail: { action: 'update', hotel: res } }));
      }
      return res;
    }
  },

  async deleteHotel(idOrName: string): Promise<boolean> {
    const raw = String(idOrName || '').trim();
    if (!raw) return true;
    try {
      await supabase.from('hotels').delete().or(`id.eq.${raw},name.eq.${raw}`);
      localStore.deleteHotel(raw);
    } catch {
      localStore.deleteHotel(raw);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-hotel-changed', { detail: { action: 'delete', target: raw } }));
    }
    return true;
  },

  // Admin Packages
  async createPackage(pkg: Partial<Package>): Promise<Package> {
    try {
      const payload = {
        title: pkg.title,
        destination: pkg.destination,
        duration: pkg.duration,
        starting_price: pkg.startingPrice || 0,
        image: pkg.image || '',
        category: pkg.category || 'Spiritual',
        max_group_size: pkg.maxGroupSize || 20,
        rating: pkg.rating || 4.8,
        highlights: pkg.highlights || [],
        itinerary: pkg.itinerary || [],
      };
      const { data, error } = await supabase.from('packages').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      const mapped = {
        ...data,
        startingPrice: data.starting_price,
        maxGroupSize: data.max_group_size,
      };
      localStore.createPackage(mapped);
      return mapped;
    } catch {
      return localStore.createPackage(pkg);
    }
  },

  async updatePackage(id: string, pkg: Partial<Package>): Promise<Package> {
    try {
      const payload: Record<string, any> = {};
      if (pkg.title !== undefined) payload.title = pkg.title;
      if (pkg.destination !== undefined) payload.destination = pkg.destination;
      if (pkg.duration !== undefined) payload.duration = pkg.duration;
      if (pkg.startingPrice !== undefined) payload.starting_price = pkg.startingPrice;
      if (pkg.image !== undefined) payload.image = pkg.image;
      if (pkg.category !== undefined) payload.category = pkg.category;
      if (pkg.maxGroupSize !== undefined) payload.max_group_size = pkg.maxGroupSize;
      if (pkg.rating !== undefined) payload.rating = pkg.rating;
      if (pkg.highlights !== undefined) payload.highlights = pkg.highlights;
      if (pkg.itinerary !== undefined) payload.itinerary = pkg.itinerary;

      const { data, error } = await supabase.from('packages').update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      const mapped = {
        ...data,
        startingPrice: data.starting_price,
        maxGroupSize: data.max_group_size,
      };
      localStore.updatePackage(id, mapped);
      return mapped;
    } catch {
      return localStore.updatePackage(id, pkg);
    }
  },

  async deletePackage(idOrTitle: string): Promise<boolean> {
    const raw = String(idOrTitle || '').trim();
    if (!raw) return true;
    try {
      await supabase.from('packages').delete().or(`id.eq.${raw},title.eq.${raw}`);
      localStore.deletePackage(raw);
      return true;
    } catch {
      return localStore.deletePackage(raw);
    }
  },

  // Admin Cities
  async createCity(city: Partial<City>): Promise<City> {
    try {
      const payload = {
        name: city.name,
        state: city.state || 'India',
        image: city.image || '',
        short_description: city.shortDescription || '',
        best_time: city.bestTime || '',
        temples_count: city.templesCount || 1,
        must_visit: city.mustVisit || [],
      };
      const { data, error } = await supabase.from('cities').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      const mapped = {
        ...data,
        shortDescription: data.short_description,
        bestTime: data.best_time,
        templesCount: data.temples_count,
        mustVisit: data.must_visit,
      };
      localStore.createCity(mapped);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: { action: 'create', city: mapped } }));
        window.dispatchEvent(new Event('tirth-hotel-changed'));
      }
      return mapped;
    } catch {
      return localStore.createCity(city);
    }
  },

  async updateCity(id: string, city: Partial<City>): Promise<City> {
    try {
      const payload: Record<string, any> = {};
      if (city.name !== undefined) payload.name = city.name;
      if (city.state !== undefined) payload.state = city.state;
      if (city.image !== undefined) payload.image = city.image;
      if (city.shortDescription !== undefined) payload.short_description = city.shortDescription;
      if (city.bestTime !== undefined) payload.best_time = city.bestTime;
      if (city.templesCount !== undefined) payload.temples_count = city.templesCount;
      if (city.mustVisit !== undefined) payload.must_visit = city.mustVisit;

      const { data, error } = await supabase.from('cities').update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      const mapped = {
        ...data,
        shortDescription: data.short_description,
        bestTime: data.best_time,
        templesCount: data.temples_count,
        mustVisit: data.must_visit,
      };
      localStore.updateCity(id, mapped);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: { action: 'update', city: mapped } }));
        window.dispatchEvent(new Event('tirth-hotel-changed'));
      }
      return mapped;
    } catch {
      return localStore.updateCity(id, city);
    }
  },

  async deleteCity(idOrName: string): Promise<boolean> {
    const raw = String(idOrName || '').trim();
    if (!raw) return true;
    try {
      await supabase.from('cities').delete().or(`id.eq.${raw},name.eq.${raw}`);
      localStore.deleteCity(raw);
    } catch {
      localStore.deleteCity(raw);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: { action: 'delete', target: raw } }));
      window.dispatchEvent(new Event('tirth-hotel-changed'));
    }
    return true;
  },

  // Reviews / Traveller Stories
  async getReviews(featuredOnly = false): Promise<Review[]> {
    try {
      let sbQuery = supabase.from('reviews').select('*');
      if (featuredOnly) sbQuery = sbQuery.eq('featured', true);
      const { data, error } = await sbQuery;
      if (error) throw new Error(error.message);
      return (data || []).map((row: any) => ({
        ...row,
        authorName: row.author_name,
        travelDate: row.travel_date,
      }));
    } catch {
      return localStore.getReviews(featuredOnly);
    }
  },

  async getAdminReviews(): Promise<Review[]> {
    return this.getReviews(false);
  },

  async createReview(review: Partial<Review>): Promise<Review> {
    try {
      const payload = {
        author_name: review.authorName || 'Devotee',
        rating: review.rating || 5,
        comment: review.comment || '',
        destination: review.destination || '',
        travel_date: review.travelDate || '',
        featured: Boolean(review.featured),
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('reviews').insert([payload]).select().single();
      if (error) throw new Error(error.message);
      const mapped = {
        ...data,
        authorName: data.author_name,
        travelDate: data.travel_date,
      };
      localStore.createReview(mapped);
      return mapped;
    } catch {
      return localStore.createReview(review);
    }
  },

  async updateReview(id: string, review: Partial<Review>): Promise<Review> {
    try {
      const payload: Record<string, any> = {};
      if (review.authorName !== undefined) payload.author_name = review.authorName;
      if (review.rating !== undefined) payload.rating = review.rating;
      if (review.comment !== undefined) payload.comment = review.comment;
      if (review.destination !== undefined) payload.destination = review.destination;
      if (review.travelDate !== undefined) payload.travel_date = review.travelDate;
      if (review.featured !== undefined) payload.featured = review.featured;

      const { data, error } = await supabase.from('reviews').update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      const mapped = {
        ...data,
        authorName: data.author_name,
        travelDate: data.travel_date,
      };
      localStore.updateReview(id, mapped);
      return mapped;
    } catch {
      return localStore.updateReview(id, review);
    }
  },

  async toggleReviewFeatured(id: string): Promise<Review> {
    const list = await this.getReviews(false);
    const curr = list.find((r) => r.id === id);
    return this.updateReview(id, { featured: !curr?.featured });
  },

  async deleteReview(idOrName: string): Promise<boolean> {
    if (!idOrName) return true;
    try {
      const raw = String(idOrName).trim();
      await supabase.from('reviews').delete().or(`id.eq.${raw},author_name.eq.${raw}`);
      localStore.deleteReview(idOrName);
      return true;
    } catch {
      return localStore.deleteReview(idOrName);
    }
  },

  // PILGRIMAGE COMPANION MATCHING SYSTEM
  async getCompanions(_filters?: CompanionSearchFilters): Promise<CompanionProfile[]> {
    return localStore.getCompanions(_filters);
  },

  async getCompanionById(id: string): Promise<CompanionProfile | null> {
    return localStore.getCompanionById(id);
  },

  async createCompanion(profile: Partial<CompanionProfile>): Promise<CompanionProfile> {
    return localStore.createCompanion(profile);
  },

  async updateCompanion(id: string, updates: Partial<CompanionProfile>): Promise<CompanionProfile> {
    return localStore.updateCompanion(id, updates);
  },

  async deleteCompanion(id: string): Promise<boolean> {
    return localStore.deleteCompanion(id);
  },

  async createCompanionConnection(conn: Partial<CompanionConnection>): Promise<CompanionConnection> {
    return localStore.createCompanionConnection(conn);
  },

  async getCompanionConnections(profileId?: string): Promise<CompanionConnection[]> {
    return localStore.getCompanionConnections(profileId);
  },

  async updateCompanionConnectionStatus(connId: string, status: 'PENDING' | 'ACCEPTED' | 'DECLINED'): Promise<CompanionConnection> {
    return localStore.updateCompanionConnectionStatus(connId, status);
  },

  async getCompanionProfiles(filters?: CompanionSearchFilters): Promise<CompanionProfile[]> {
    return this.getCompanions(filters);
  },

  async createCompanionProfile(profile: Partial<CompanionProfile>): Promise<CompanionProfile> {
    return this.createCompanion(profile);
  },

  async resetData(): Promise<void> {
    localStore.resetData();
  },
};

// WhatsApp Utility
export function generateWhatsAppLink(details: {
  title?: string;
  type?: string;
  name?: string;
  fullName?: string;
  phone?: string;
  checkIn?: string;
  checkInDate?: string;
  guests?: number;
  adults?: number;
  children?: number;
  childAges?: number[] | string;
  plan?: string;
  notes?: string;
  specialRequests?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
}) {
  const travelDeskNumber = '919876543210';
  const displayTitle = details.title || 'Sacred Pilgrimage';
  const displayName = details.fullName || details.name || 'Devotee';
  const displayPhone = details.phone || '';
  const displayDate = details.checkInDate || details.checkIn || 'Upcoming Sacred Muhurat';
  
  const numAdults = Number(details.adults || details.guests || 2);
  let numChildren = Number(details.children || 0);

  let parsedAges: (number | string)[] = [];
  if (Array.isArray(details.childAges)) {
    parsedAges = details.childAges;
    if (numChildren === 0) numChildren = details.childAges.length;
  } else if (typeof details.childAges === 'string' && details.childAges.trim()) {
    try {
      if (details.childAges.startsWith('[')) {
        parsedAges = JSON.parse(details.childAges);
      } else {
        parsedAges = details.childAges.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (numChildren === 0 && parsedAges.length > 0) {
        numChildren = parsedAges.length;
      }
    } catch {
      parsedAges = [details.childAges];
    }
  }

  let guestsFormatted = `${numAdults} Adult${numAdults > 1 ? 's' : ''}`;
  if (numChildren > 0) {
    guestsFormatted += `, ${numChildren} ${numChildren === 1 ? 'Child' : 'Children'}`;
    if (parsedAges.length > 0) {
      const formattedAges = parsedAges.map((a) => (Number(a) === 0 ? 'Under 1' : a));
      guestsFormatted += ` (Ages: ${formattedAges.join(', ')})`;
    }
  }

  const displayPlan = details.plan || '';
  const displayNotes = details.specialRequests || details.notes || '';
  const pickup = details.pickupLocation?.trim() || '';
  const dropoff = details.dropoffLocation?.trim() || '';

  const text = encodeURIComponent(
    `*Namaste TirthYatraTrails Travel Desk!*\n\n` +
    `I would like to check availability and get an instant quote for:\n` +
    `🛕 *${details.type === 'HOTEL' ? 'Hotel Booking' : 'Pilgrimage Package'}*: ${displayTitle}\n` +
    `👤 *Name*: ${displayName}\n` +
    `📱 *WhatsApp*: ${displayPhone}\n` +
    `📅 *Check-In / Travel Date*: ${displayDate}\n` +
    `👥 *Guests*: ${guestsFormatted}\n` +
    (pickup ? `📍 *Pickup Location*: ${pickup}\n` : '') +
    (dropoff ? `🏁 *Drop-off Location*: ${dropoff}\n` : '') +
    (displayPlan ? `🍽️ *Chosen Plan*: ${displayPlan}\n` : '') +
    (displayNotes ? `📝 *Notes/Puja Requests*: ${displayNotes}\n\n` : '\n') +
    `Please share the customized quotation and verified darshan availability at your earliest convenience.`
  );
  return `https://wa.me/${travelDeskNumber}?text=${text}`;
}