import { City, Hotel, Package, Inquiry, User, AuthResponse, Review, StaffMember, CompanionProfile, CompanionConnection, CompanionSearchFilters, TransitHub, HotelInventory, TravelStory } from '../types.js';
import { supabase, supabaseRest, getSupabaseHeaders } from '../lib/supabase.js';
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
    try {
      const { data, error } = await supabase.from('cities').select('*');
      if (!error && data && data.length) return data.map(mapCityRow);
    } catch {}
    return localStore.getCities();
  },

  async getHotels(cityId?: string, query?: string): Promise<Hotel[]> {
    try {
      let q = supabase.from('hotels').select('*');
      if (cityId) q = q.eq('city_id', cityId);
      const { data, error } = await q;
      if (!error && data && data.length) {
        let list = data.map(mapHotelRow);
        if (query) {
          const lower = query.toLowerCase();
          list = list.filter((h) => h.name.toLowerCase().includes(lower) || h.cityName?.toLowerCase().includes(lower));
        }
        return list;
      }
    } catch {}
    return localStore.getHotels(cityId, query);
  },

  async getHotelById(id: string): Promise<Hotel> {
    try {
      const { data, error } = await supabase.from('hotels').select('*').eq('id', id).maybeSingle();
      if (!error && data) return mapHotelRow(data);
    } catch {}
    return localStore.getHotelById(id)!;
  },

  async getPackages(category?: string, query?: string): Promise<Package[]> {
    try {
      // 1. Try yatra_packages table
      let q = supabase.from('yatra_packages').select('*');
      if (category) q = q.eq('category', category);
      const res1 = await q;
      if (!res1.error && res1.data && res1.data.length) {
        let list = res1.data.map(mapPackageRow);
        if (query) {
          const lower = query.toLowerCase();
          list = list.filter((p) => p.title.toLowerCase().includes(lower) || p.location.toLowerCase().includes(lower));
        }
        return list;
      }

      // 2. Try packages table / view
      let q2 = supabase.from('packages').select('*');
      if (category) q2 = q2.eq('category', category);
      const res2 = await q2;
      if (!res2.error && res2.data && res2.data.length) {
        let list = res2.data.map(mapPackageRow);
        if (query) {
          const lower = query.toLowerCase();
          list = list.filter((p) => p.title.toLowerCase().includes(lower) || p.location.toLowerCase().includes(lower));
        }
        return list;
      }
    } catch {}
    return localStore.getPackages(category, query);
  },

  async getPackageById(id: string): Promise<Package> {
    try {
      const res1 = await supabase.from('yatra_packages').select('*').eq('id', id).maybeSingle();
      if (!res1.error && res1.data) return mapPackageRow(res1.data);
      const res2 = await supabase.from('packages').select('*').eq('id', id).maybeSingle();
      if (!res2.error && res2.data) return mapPackageRow(res2.data);
    } catch {}
    return localStore.getPackageById(id)!;
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

  // Admin Hotels/Packages/Cities/Reviews with guaranteed snake_case mapping and explicit REST header fallback
  async createHotel(hotel: Partial<Hotel>): Promise<Hotel> {
    const payload = hotelToRow(hotel);
    if (!payload.id) {
      payload.id = `htl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }
    try {
      const { data, error } = await supabase.from('hotels').insert([payload]).select().maybeSingle();
      if (!error && data) {
        const mapped = mapHotelRow(data);
        localStore.createHotel(mapped);
        return mapped;
      }
      const restRes = await supabaseRest<any[]>('hotels', {
        method: 'POST',
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapHotelRow(restRes.data[0]);
        localStore.createHotel(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('createHotel remote error, falling back to localStore', err);
    }
    return localStore.createHotel({ ...hotel, id: payload.id } as Hotel);
  },

  async updateHotel(id: string, hotel: Partial<Hotel>): Promise<Hotel> {
    const payload = hotelToRow(hotel);
    delete payload.id;
    try {
      const { data, error } = await supabase.from('hotels').update(payload).eq('id', id).select().maybeSingle();
      if (!error && data) {
        const mapped = mapHotelRow(data);
        localStore.updateHotel(id, mapped);
        return mapped;
      }
      const restRes = await supabaseRest<any[]>('hotels', {
        method: 'PATCH',
        params: { id: `eq.${id}` },
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapHotelRow(restRes.data[0]);
        localStore.updateHotel(id, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('updateHotel remote error, falling back to localStore', err);
    }
    return localStore.updateHotel(id, hotel);
  },

  async deleteHotel(id: string): Promise<boolean> {
    try {
      await supabase.from('hotels').delete().eq('id', id);
    } catch {}
    localStore.deleteHotel(id);
    return true;
  },

  async createPackage(pkg: Partial<Package>): Promise<Package> {
    const payload = packageToRow(pkg);
    if (!payload.id) {
      payload.id = `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    // 1. Try Supabase SDK with yatra_packages table first, then packages table
    try {
      let res = await supabase.from('yatra_packages').insert([payload]).select().maybeSingle();
      if (res.error) {
        res = await supabase.from('packages').insert([payload]).select().maybeSingle();
      }
      if (!res.error && res.data) {
        const mapped = mapPackageRow(res.data);
        localStore.createPackage(mapped);
        return mapped;
      }
    } catch (sdkErr) {
      console.warn('Supabase SDK createPackage error, trying direct REST with explicit headers', sdkErr);
    }

    // 2. Direct REST execution with guaranteed explicit apikey & Authorization headers
    try {
      let restRes = await supabaseRest<any[]>('yatra_packages', {
        method: 'POST',
        body: payload,
      });
      if (restRes.error || !restRes.data?.length) {
        restRes = await supabaseRest<any[]>('packages', {
          method: 'POST',
          body: payload,
        });
      }
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapPackageRow(restRes.data[0]);
        localStore.createPackage(mapped);
        return mapped;
      }
    } catch (restErr) {
      console.warn('Direct REST createPackage error, falling back to localStore', restErr);
    }

    return localStore.createPackage({ ...pkg, id: payload.id } as Package);
  },

  async updatePackage(id: string, pkg: Partial<Package>): Promise<Package> {
    const payload = packageToRow(pkg);
    delete payload.id;

    // 1. Try Supabase SDK with yatra_packages table first, then packages table
    try {
      let res = await supabase.from('yatra_packages').update(payload).eq('id', id).select().maybeSingle();
      if (res.error) {
        res = await supabase.from('packages').update(payload).eq('id', id).select().maybeSingle();
      }
      if (!res.error && res.data) {
        const mapped = mapPackageRow(res.data);
        localStore.updatePackage(id, mapped);
        return mapped;
      }
    } catch (sdkErr) {
      console.warn('Supabase SDK updatePackage error, trying direct REST', sdkErr);
    }

    // 2. Direct REST execution with guaranteed explicit headers
    try {
      let restRes = await supabaseRest<any[]>('yatra_packages', {
        method: 'PATCH',
        params: { id: `eq.${id}` },
        body: payload,
      });
      if (restRes.error || !restRes.data?.length) {
        restRes = await supabaseRest<any[]>('packages', {
          method: 'PATCH',
          params: { id: `eq.${id}` },
          body: payload,
        });
      }
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapPackageRow(restRes.data[0]);
        localStore.updatePackage(id, mapped);
        return mapped;
      }
    } catch (restErr) {
      console.warn('Direct REST updatePackage error, falling back to localStore', restErr);
    }

    return localStore.updatePackage(id, pkg);
  },

  async deletePackage(id: string): Promise<boolean> {
    try {
      await supabase.from('yatra_packages').delete().eq('id', id);
      await supabase.from('packages').delete().eq('id', id);
    } catch {}
    localStore.deletePackage(id);
    return true;
  },

  async createCity(city: Partial<City>): Promise<City> {
    const payload = cityToRow(city);
    if (!payload.id) {
      payload.id = (city.name || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    try {
      const { data, error } = await supabase.from('cities').insert([payload]).select().maybeSingle();
      if (!error && data) {
        const mapped = mapCityRow(data);
        localStore.createCity(mapped);
        return mapped;
      }
      const restRes = await supabaseRest<any[]>('cities', {
        method: 'POST',
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapCityRow(restRes.data[0]);
        localStore.createCity(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('createCity remote error, falling back to localStore', err);
    }
    return localStore.createCity({ ...city, id: payload.id } as City);
  },

  async updateCity(id: string, city: Partial<City>): Promise<City> {
    const payload = cityToRow(city);
    delete payload.id;
    try {
      const { data, error } = await supabase.from('cities').update(payload).eq('id', id).select().maybeSingle();
      if (!error && data) {
        const mapped = mapCityRow(data);
        localStore.updateCity(id, mapped);
        return mapped;
      }
      const restRes = await supabaseRest<any[]>('cities', {
        method: 'PATCH',
        params: { id: `eq.${id}` },
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapCityRow(restRes.data[0]);
        localStore.updateCity(id, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('updateCity remote error, falling back to localStore', err);
    }
    return localStore.updateCity(id, city);
  },

  async deleteCity(id: string): Promise<boolean> {
    try {
      await supabase.from('cities').delete().eq('id', id);
    } catch {}
    localStore.deleteCity(id);
    return true;
  },

  async getReviews(featuredOnly = false): Promise<Review[]> {
    try {
      let q = supabase.from('reviews').select('*');
      if (featuredOnly) q = q.eq('is_featured', true);
      const { data, error } = await q;
      if (!error && data && data.length) return data.map(mapReviewRow);
    } catch {}
    return localStore.getReviews(featuredOnly);
  },
  async getAdminReviews(): Promise<Review[]> { return this.getReviews(false); },

  async createReview(rev: Partial<Review>): Promise<Review> {
    const payload = reviewToRow(rev);
    if (!payload.id) {
      payload.id = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    }
    try {
      const { data, error } = await supabase.from('reviews').insert([payload]).select().maybeSingle();
      if (!error && data) {
        const mapped = mapReviewRow(data);
        localStore.createReview(mapped);
        return mapped;
      }
      const restRes = await supabaseRest<any[]>('reviews', {
        method: 'POST',
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapReviewRow(restRes.data[0]);
        localStore.createReview(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('createReview remote error, falling back to localStore', err);
    }
    return localStore.createReview({ ...rev, id: payload.id } as Review);
  },

  async updateReview(id: string, rev: Partial<Review>): Promise<Review> {
    const payload = reviewToRow(rev);
    delete payload.id;
    try {
      const { data, error } = await supabase.from('reviews').update(payload).eq('id', id).select().maybeSingle();
      if (!error && data) {
        const mapped = mapReviewRow(data);
        localStore.updateReview(id, mapped);
        return mapped;
      }
      const restRes = await supabaseRest<any[]>('reviews', {
        method: 'PATCH',
        params: { id: `eq.${id}` },
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapReviewRow(restRes.data[0]);
        localStore.updateReview(id, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('updateReview remote error, falling back to localStore', err);
    }
    return localStore.updateReview(id, rev);
  },

  async toggleReviewFeatured(id: string): Promise<Review> {
    const list = await this.getReviews();
    const t = list.find((r) => r.id === id);
    return this.updateReview(id, { isFeatured: !t?.isFeatured });
  },

  async deleteReview(id: string): Promise<boolean> {
    try {
      await supabase.from('reviews').delete().eq('id', id);
    } catch {}
    localStore.deleteReview(id);
    return true;
  },

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

  // Transit Hubs (Airports, Railway Stations, Helipads)
  async getHubs(cityId?: string): Promise<TransitHub[]> {
    try {
      let q = supabase.from('hubs').select('*');
      if (cityId) q = q.eq('city_id', cityId);
      const { data } = await q;
      if (data && data.length) return data.map(mapHubRow);
      return getFallbackHubs(cityId);
    } catch {
      return getFallbackHubs(cityId);
    }
  },

  async createHub(hub: Partial<TransitHub>): Promise<TransitHub> {
    const payload = {
      id: hub.id || `hub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      city_id: hub.cityId,
      name: hub.name,
      hub_type: hub.hubType || 'AIRPORT',
      code: hub.code || '',
      distance_to_temple_km: hub.distanceToTempleKm || 0,
      is_primary: Boolean(hub.isPrimary),
    };
    try {
      const { data, error } = await supabase.from('hubs').insert([payload]).select().maybeSingle();
      if (!error && data) return mapHubRow(data);
      const restRes = await supabaseRest<any[]>('hubs', {
        method: 'POST',
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) return mapHubRow(restRes.data[0]);
    } catch {}
    return { ...hub, id: payload.id } as TransitHub;
  },

  async updateHub(id: string, hub: Partial<TransitHub>): Promise<TransitHub> {
    const payload: Record<string, any> = {};
    if (hub.name !== undefined) payload.name = hub.name;
    if (hub.hubType !== undefined) payload.hub_type = hub.hubType;
    if (hub.code !== undefined) payload.code = hub.code;
    if (hub.distanceToTempleKm !== undefined) payload.distance_to_temple_km = hub.distanceToTempleKm;
    if (hub.isPrimary !== undefined) payload.is_primary = hub.isPrimary;
    try {
      const { data, error } = await supabase.from('hubs').update(payload).eq('id', id).select().maybeSingle();
      if (!error && data) return mapHubRow(data);
      const restRes = await supabaseRest<any[]>('hubs', {
        method: 'PATCH',
        params: { id: `eq.${id}` },
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) return mapHubRow(restRes.data[0]);
    } catch {}
    return { ...hub, id } as TransitHub;
  },

  async deleteHub(id: string): Promise<boolean> {
    try {
      await supabase.from('hubs').delete().eq('id', id);
    } catch {}
    return true;
  },

  // Hotel Inventory & Realtime Allocations
  async getHotelInventory(hotelId?: string): Promise<HotelInventory[]> {
    try {
      let q = supabase.from('hotel_inventory').select('*').order('date', { ascending: true });
      if (hotelId) q = q.eq('hotel_id', hotelId);
      const { data } = await q;
      if (data && data.length) return data.map(mapHotelInventoryRow);
      return getFallbackInventory(hotelId);
    } catch {
      return getFallbackInventory(hotelId);
    }
  },

  async updateHotelInventory(id: string, updates: Partial<HotelInventory>): Promise<HotelInventory> {
    const payload: Record<string, any> = {};
    if (updates.totalInventory !== undefined) payload.total_inventory = updates.totalInventory;
    if (updates.bookedCount !== undefined) payload.booked_count = updates.bookedCount;
    if (updates.blockedCount !== undefined) payload.blocked_count = updates.blockedCount;
    if (updates.priceOverride !== undefined) payload.price_override = updates.priceOverride;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.updatedBy !== undefined) payload.updated_by = updates.updatedBy;
    try {
      const { data, error } = await supabase.from('hotel_inventory').update(payload).eq('id', id).select().maybeSingle();
      if (!error && data) return mapHotelInventoryRow(data);
      const restRes = await supabaseRest<any[]>('hotel_inventory', {
        method: 'PATCH',
        params: { id: `eq.${id}` },
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) return mapHotelInventoryRow(restRes.data[0]);
    } catch {}
    return { ...updates, id } as HotelInventory;
  },

  async batchUpdateHotelInventory(updates: Array<Partial<HotelInventory>>): Promise<boolean> {
    for (const item of updates) {
      if (item.id) {
        await this.updateHotelInventory(item.id, item);
      }
    }
    return true;
  },

  // Travel Stories & Temple Blogs
  async getTravelStories(): Promise<TravelStory[]> {
    try {
      const { data } = await supabase.from('travel_stories').select('*').order('created_at', { ascending: false });
      if (data && data.length) return data.map(mapTravelStoryRow);
      return getFallbackStories();
    } catch {
      return getFallbackStories();
    }
  },

  async createTravelStory(story: Partial<TravelStory>): Promise<TravelStory> {
    const payload = {
      id: story.id || `story-${Date.now()}`,
      title: story.title,
      slug: story.slug || (story.title || 'story').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      author_name: story.authorName || 'Devotee Pilgrim',
      author_role: story.authorRole || 'Spiritual Pilgrim',
      excerpt: story.excerpt || '',
      content: story.content || '',
      destination: story.destination || 'Holy Base',
      cover_image: story.coverImage || 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
      tags: story.tags || ['Pilgrimage', 'Darshan'],
      read_time_minutes: story.readTimeMinutes || 5,
      is_published: story.isPublished !== false,
      likes_count: story.likesCount || 0,
    };
    try {
      const { data, error } = await supabase.from('travel_stories').insert([payload]).select().maybeSingle();
      if (!error && data) return mapTravelStoryRow(data);
      const restRes = await supabaseRest<any[]>('travel_stories', {
        method: 'POST',
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) return mapTravelStoryRow(restRes.data[0]);
    } catch {}
    return { ...story, id: payload.id } as TravelStory;
  },

  async updateTravelStory(id: string, story: Partial<TravelStory>): Promise<TravelStory> {
    const payload: Record<string, any> = {};
    if (story.title !== undefined) payload.title = story.title;
    if (story.content !== undefined) payload.content = story.content;
    if (story.excerpt !== undefined) payload.excerpt = story.excerpt;
    if (story.isPublished !== undefined) payload.is_published = story.isPublished;
    if (story.likesCount !== undefined) payload.likes_count = story.likesCount;
    try {
      const { data, error } = await supabase.from('travel_stories').update(payload).eq('id', id).select().maybeSingle();
      if (!error && data) return mapTravelStoryRow(data);
      const restRes = await supabaseRest<any[]>('travel_stories', {
        method: 'PATCH',
        params: { id: `eq.${id}` },
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) return mapTravelStoryRow(restRes.data[0]);
    } catch {}
    return { ...story, id } as TravelStory;
  },

  async deleteTravelStory(id: string): Promise<boolean> {
    try {
      await supabase.from('travel_stories').delete().eq('id', id);
    } catch {}
    return true;
  },

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

export function mapCityRow(row: any): City {
  if (!row) return {} as City;
  return {
    id: String(row.id),
    name: row.name || 'Sacred Destination',
    state: row.state || 'India',
    imageUrl: row.image_url || row.imageUrl || 'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80',
    hotelCount: Number(row.hotel_count ?? row.hotelCount ?? 0),
    popularFor: row.popular_for || row.popularFor || 'Sacred Temple Darshan',
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

export function mapHubRow(row: any): TransitHub {
  if (!row) return {} as TransitHub;
  return {
    id: String(row.id),
    cityId: row.city_id || row.cityId,
    name: row.name || 'Transit Hub',
    hubType: row.hub_type || row.hubType || 'AIRPORT',
    code: row.code,
    distanceToTempleKm: Number(row.distance_to_temple_km ?? row.distanceToTempleKm ?? 0),
    isPrimary: Boolean(row.is_primary ?? row.isPrimary),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

export function mapHotelRow(row: any): Hotel {
  if (!row) return {} as Hotel;
  return {
    id: String(row.id),
    cityId: row.city_id || row.cityId,
    cityName: row.city_name || row.cityName || 'Holy Base',
    name: row.name || 'Sacred Hotel',
    starRating: Number(row.star_rating ?? row.starRating ?? 3),
    googleRating: Number(row.google_rating ?? row.googleRating ?? 4.5),
    reviewCount: Number(row.review_count ?? row.reviewCount ?? 0),
    address: row.address || '',
    description: row.description || '',
    images: Array.isArray(row.images) ? row.images : [],
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    basePrice: Number(row.base_price ?? row.basePrice ?? 3500),
    isTopRated: Boolean(row.is_top_rated ?? row.isTopRated),
    distanceToTemple: row.distance_to_temple || row.distanceToTemple,
    darshanType: row.darshan_type || row.darshanType,
    rooms: Array.isArray(row.rooms) ? row.rooms : [],
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

export function mapHotelInventoryRow(row: any): HotelInventory {
  if (!row) return {} as HotelInventory;
  const total = Number(row.total_inventory ?? row.totalInventory ?? 10);
  const booked = Number(row.booked_count ?? row.bookedCount ?? 0);
  const blocked = Number(row.blocked_count ?? row.blockedCount ?? 0);
  const available = Math.max(0, total - booked - blocked);

  let status: HotelInventory['status'] = row.status || 'AVAILABLE';
  if (available === 0) status = 'SOLD_OUT';
  else if (status !== 'BLOCKED' && available <= 2) status = 'FAST_FILLING';

  return {
    id: String(row.id),
    hotelId: row.hotel_id || row.hotelId,
    hotelName: row.hotel_name || row.hotelName,
    roomId: row.room_id || row.roomId,
    roomType: row.room_type || row.roomType || 'Deluxe Room',
    date: row.date || new Date().toISOString().split('T')[0],
    totalInventory: total,
    bookedCount: booked,
    blockedCount: blocked,
    availableCount: available,
    priceOverride: row.price_override !== undefined && row.price_override !== null ? Number(row.price_override) : undefined,
    status,
    updatedBy: row.updated_by || row.updatedBy,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

export function mapPackageRow(row: any): Package {
  if (!row) return {} as Package;
  return {
    id: String(row.id),
    title: row.title || 'Sacred Pilgrimage Circuit',
    location: row.location || 'Holy Himalayas',
    duration: row.duration || '6 Days / 5 Nights',
    bookedRank: row.booked_rank || row.bookedRank,
    imageUrl: row.image_url || row.imageUrl || 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
    galleryImages: Array.isArray(row.gallery_images) ? row.gallery_images : (Array.isArray(row.galleryImages) ? row.galleryImages : []),
    startingPrice: Number(row.starting_price ?? row.startingPrice ?? 24000),
    overview: row.overview || '',
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    cancellationPolicy: row.cancellation_policy || row.cancellationPolicy || '',
    category: row.category || 'Char Dham',
    packageType: row.package_type || row.packageType || 'All-Inclusive Guided Yatra',
    experienceLevel: row.experience_level || row.experienceLevel || 'Comfortable • Senior Friendly',
    hotelsLevel: row.hotels_level || row.hotelsLevel || '3 & 4 Star Deluxe Stays',
    transfers: row.transfers || 'Private AC Coach',
    itinerary: Array.isArray(row.itinerary) ? row.itinerary : [],
    isPublished: Boolean(row.is_published ?? row.isPublished ?? true),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

export function mapTravelStoryRow(row: any): TravelStory {
  if (!row) return {} as TravelStory;
  return {
    id: String(row.id),
    title: row.title || 'Sacred Pilgrim Journey',
    slug: row.slug || 'sacred-pilgrim-journey',
    authorName: row.author_name || row.authorName || 'Devotee Pilgrim',
    authorRole: row.author_role || row.authorRole || 'Spiritual Pilgrim',
    excerpt: row.excerpt || '',
    content: row.content || '',
    destination: row.destination || 'Ayodhya Dham',
    coverImage: row.cover_image || row.coverImage || 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
    tags: Array.isArray(row.tags) ? row.tags : ['Pilgrimage', 'Darshan'],
    readTimeMinutes: Number(row.read_time_minutes ?? row.readTimeMinutes ?? 5),
    isPublished: Boolean(row.is_published ?? row.isPublished ?? true),
    publishedAt: row.published_at || row.publishedAt,
    likesCount: Number(row.likes_count ?? row.likesCount ?? 0),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

export function mapReviewRow(row: any): Review {
  if (!row) return {} as Review;
  return {
    id: String(row.id),
    authorName: row.author_name || row.authorName || 'Pilgrim',
    authorLocation: row.author_location || row.authorLocation || 'India',
    authorInitials: row.author_initials || row.authorInitials || 'P',
    rating: Number(row.rating ?? 5.0),
    reviewText: row.review_text || row.reviewText || '',
    destinationImage: row.destination_image || row.destinationImage || '',
    isVerified: Boolean(row.is_verified ?? row.isVerified ?? true),
    googleReviewUrl: row.google_review_url || row.googleReviewUrl || '',
    isFeatured: Boolean(row.is_featured ?? row.isFeatured ?? true),
    order: Number(row.order ?? 0),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

export function packageToRow(pkg: Partial<Package>): Record<string, any> {
  const row: Record<string, any> = {};
  if (pkg.id !== undefined) row.id = pkg.id;
  if (pkg.title !== undefined) row.title = pkg.title;
  if (pkg.location !== undefined) row.location = pkg.location;
  if (pkg.duration !== undefined) row.duration = pkg.duration;
  if (pkg.bookedRank !== undefined || (pkg as any).booked_rank !== undefined) {
    row.booked_rank = pkg.bookedRank ?? (pkg as any).booked_rank;
  }
  if (pkg.imageUrl !== undefined || (pkg as any).image_url !== undefined) {
    row.image_url = pkg.imageUrl ?? (pkg as any).image_url;
  }
  if (pkg.galleryImages !== undefined || (pkg as any).gallery_images !== undefined) {
    const rawImgs = pkg.galleryImages ?? (pkg as any).gallery_images;
    row.gallery_images = Array.isArray(rawImgs) ? rawImgs : [];
  }
  if (pkg.startingPrice !== undefined || (pkg as any).starting_price !== undefined) {
    row.starting_price = Number(pkg.startingPrice ?? (pkg as any).starting_price ?? 0);
  }
  if (pkg.overview !== undefined) row.overview = pkg.overview;
  if (pkg.highlights !== undefined) {
    row.highlights = Array.isArray(pkg.highlights) ? pkg.highlights : [];
  }
  if (pkg.cancellationPolicy !== undefined || (pkg as any).cancellation_policy !== undefined) {
    row.cancellation_policy = pkg.cancellationPolicy ?? (pkg as any).cancellation_policy;
  }
  if (pkg.category !== undefined) row.category = pkg.category;
  if (pkg.packageType !== undefined || (pkg as any).package_type !== undefined) {
    row.package_type = pkg.packageType ?? (pkg as any).package_type;
  }
  if (pkg.experienceLevel !== undefined || (pkg as any).experience_level !== undefined) {
    row.experience_level = pkg.experienceLevel ?? (pkg as any).experience_level;
  }
  if (pkg.hotelsLevel !== undefined || (pkg as any).hotels_level !== undefined) {
    row.hotels_level = pkg.hotelsLevel ?? (pkg as any).hotels_level;
  }
  if (pkg.transfers !== undefined) row.transfers = pkg.transfers;
  if (pkg.itinerary !== undefined) {
    row.itinerary = Array.isArray(pkg.itinerary) ? pkg.itinerary : [];
  }
  if (pkg.isPublished !== undefined || (pkg as any).is_published !== undefined) {
    row.is_published = Boolean(pkg.isPublished ?? (pkg as any).is_published ?? true);
  }
  return row;
}

export function hotelToRow(hotel: Partial<Hotel>): Record<string, any> {
  const row: Record<string, any> = {};
  if (hotel.id !== undefined) row.id = hotel.id;
  if (hotel.cityId !== undefined || (hotel as any).city_id !== undefined) {
    row.city_id = hotel.cityId ?? (hotel as any).city_id;
  }
  if (hotel.cityName !== undefined || (hotel as any).city_name !== undefined) {
    row.city_name = hotel.cityName ?? (hotel as any).city_name;
  }
  if (hotel.name !== undefined) row.name = hotel.name;
  if (hotel.starRating !== undefined || (hotel as any).star_rating !== undefined) {
    row.star_rating = Number(hotel.starRating ?? (hotel as any).star_rating ?? 3);
  }
  if (hotel.googleRating !== undefined || (hotel as any).google_rating !== undefined) {
    row.google_rating = Number(hotel.googleRating ?? (hotel as any).google_rating ?? 4.5);
  }
  if (hotel.reviewCount !== undefined || (hotel as any).review_count !== undefined) {
    row.review_count = Number(hotel.reviewCount ?? (hotel as any).review_count ?? 0);
  }
  if (hotel.address !== undefined) row.address = hotel.address;
  if (hotel.description !== undefined) row.description = hotel.description;
  if (hotel.images !== undefined) {
    row.images = Array.isArray(hotel.images) ? hotel.images : [];
  }
  if (hotel.amenities !== undefined) {
    row.amenities = Array.isArray(hotel.amenities) ? hotel.amenities : [];
  }
  if (hotel.basePrice !== undefined || (hotel as any).base_price !== undefined) {
    row.base_price = Number(hotel.basePrice ?? (hotel as any).base_price ?? 0);
  }
  if (hotel.isTopRated !== undefined || (hotel as any).is_top_rated !== undefined) {
    row.is_top_rated = Boolean(hotel.isTopRated ?? (hotel as any).is_top_rated);
  }
  if (hotel.distanceToTemple !== undefined || (hotel as any).distance_to_temple !== undefined) {
    row.distance_to_temple = hotel.distanceToTemple ?? (hotel as any).distance_to_temple;
  }
  if (hotel.darshanType !== undefined || (hotel as any).darshan_type !== undefined) {
    row.darshan_type = hotel.darshanType ?? (hotel as any).darshan_type;
  }
  if (hotel.rooms !== undefined) {
    row.rooms = Array.isArray(hotel.rooms) ? hotel.rooms : [];
  }
  return row;
}

export function cityToRow(city: Partial<City>): Record<string, any> {
  const row: Record<string, any> = {};
  if (city.id !== undefined) row.id = city.id;
  if (city.name !== undefined) row.name = city.name;
  if (city.state !== undefined) row.state = city.state;
  if (city.imageUrl !== undefined || (city as any).image_url !== undefined) {
    row.image_url = city.imageUrl ?? (city as any).image_url;
  }
  if (city.hotelCount !== undefined || (city as any).hotel_count !== undefined) {
    row.hotel_count = Number(city.hotelCount ?? (city as any).hotel_count ?? 0);
  }
  if (city.popularFor !== undefined || (city as any).popular_for !== undefined) {
    row.popular_for = city.popularFor ?? (city as any).popular_for;
  }
  return row;
}

export function reviewToRow(rev: Partial<Review>): Record<string, any> {
  const row: Record<string, any> = {};
  if (rev.id !== undefined) row.id = rev.id;
  if (rev.authorName !== undefined || (rev as any).author_name !== undefined) {
    row.author_name = rev.authorName ?? (rev as any).author_name;
  }
  if (rev.authorLocation !== undefined || (rev as any).author_location !== undefined) {
    row.author_location = rev.authorLocation ?? (rev as any).author_location;
  }
  if (rev.authorInitials !== undefined || (rev as any).author_initials !== undefined) {
    row.author_initials = rev.authorInitials ?? (rev as any).author_initials;
  }
  if (rev.rating !== undefined) row.rating = Number(rev.rating);
  if (rev.reviewText !== undefined || (rev as any).review_text !== undefined) {
    row.review_text = rev.reviewText ?? (rev as any).review_text;
  }
  if (rev.destinationImage !== undefined || (rev as any).destination_image !== undefined) {
    row.destination_image = rev.destinationImage ?? (rev as any).destination_image;
  }
  if (rev.isVerified !== undefined || (rev as any).is_verified !== undefined) {
    row.is_verified = Boolean(rev.isVerified ?? (rev as any).is_verified);
  }
  if (rev.googleReviewUrl !== undefined || (rev as any).google_review_url !== undefined) {
    row.google_review_url = rev.googleReviewUrl ?? (rev as any).google_review_url;
  }
  if (rev.isFeatured !== undefined || (rev as any).is_featured !== undefined) {
    row.is_featured = Boolean(rev.isFeatured ?? (rev as any).is_featured);
  }
  if (rev.order !== undefined) row.order = Number(rev.order);
  return row;
}

// Fallback seed generators
function getFallbackHubs(cityId?: string): TransitHub[] {
  const all: TransitHub[] = [
    { id: 'hub-ayj-air', cityId: 'ayodhya', cityName: 'Ayodhya', name: 'Maharishi Valmiki International Airport (AYJ)', hubType: 'AIRPORT', code: 'AYJ', distanceToTempleKm: 9.5, isPrimary: true },
    { id: 'hub-ayj-rail', cityId: 'ayodhya', cityName: 'Ayodhya', name: 'Ayodhya Dham Junction (AY)', hubType: 'RAILWAY_STATION', code: 'AY', distanceToTempleKm: 1.2, isPrimary: false },
    { id: 'hub-vns-air', cityId: 'varanasi', cityName: 'Varanasi', name: 'Lal Bahadur Shastri International Airport (VNS)', hubType: 'AIRPORT', code: 'VNS', distanceToTempleKm: 24.0, isPrimary: true },
    { id: 'hub-vns-rail', cityId: 'varanasi', cityName: 'Varanasi', name: 'Varanasi Cantt Station (BSB)', hubType: 'RAILWAY_STATION', code: 'BSB', distanceToTempleKm: 4.5, isPrimary: false },
    { id: 'hub-keda-heli', cityId: 'kedarnath', cityName: 'Kedarnath', name: 'Guptkashi & Phata Helipad Base', hubType: 'HELIPAD', code: 'GPK', distanceToTempleKm: 14.0, isPrimary: true },
    { id: 'hub-puri-rail', cityId: 'puri', cityName: 'Puri', name: 'Puri Railway Station (PURI)', hubType: 'RAILWAY_STATION', code: 'PURI', distanceToTempleKm: 2.1, isPrimary: true },
  ];
  if (cityId) return all.filter((h) => h.cityId.toLowerCase() === cityId.toLowerCase());
  return all;
}

function getFallbackInventory(hotelId?: string): HotelInventory[] {
  const dates = [
    '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24'
  ];
  const items: HotelInventory[] = [];
  const targetHotelId = hotelId || 'htl-ayodhya-ramayana';
  dates.forEach((d, idx) => {
    const total = 12;
    const booked = idx === 1 ? 11 : idx === 3 ? 6 : 4;
    const blocked = idx === 5 ? 2 : 0;
    const avail = Math.max(0, total - booked - blocked);
    items.push({
      id: `inv-${targetHotelId}-deluxe-${d}`,
      hotelId: targetHotelId,
      hotelName: 'The Ramayana Heritage & Suites',
      roomType: 'Deluxe Temple View Room',
      date: d,
      totalInventory: total,
      bookedCount: booked,
      blockedCount: blocked,
      availableCount: avail,
      priceOverride: idx % 2 === 0 ? 5200 : 4800,
      status: avail === 0 ? 'SOLD_OUT' : avail <= 2 ? 'FAST_FILLING' : 'AVAILABLE',
      updatedBy: 'Lead Operator',
    });
  });
  return items;
}

function getFallbackStories(): TravelStory[] {
  return [
    {
      id: 'story-1',
      title: 'A Devotee’s Awakening at Ayodhya Ram Janmabhoomi: Complete Darshan Guide',
      slug: 'ayodhya-ram-janmabhoomi-darshan-guide',
      authorName: 'Pandit Rameshwar Shastri',
      authorRole: 'Spiritual Guide & Author',
      excerpt: 'Experiencing the sacred divine sanctum of Shri Ram Lalla with seamless wheel-chair access and VIP morning Aarti passes.',
      content: 'The morning chants echo across the holy Sarayu banks as millions of pilgrims gather with folded hands...',
      destination: 'Ayodhya Dham',
      coverImage: 'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=1200&q=80',
      tags: ['Ayodhya', 'Ram Mandir', 'Darshan Guide'],
      readTimeMinutes: 6,
      isPublished: true,
      publishedAt: '2026-09-15T08:00:00Z',
      likesCount: 142,
    },
    {
      id: 'story-2',
      title: 'Himalayan Bliss: Helicopter Yatra to Kedarnath and Badrinath Sanctums',
      slug: 'kedarnath-badrinath-helicopter-yatra-experience',
      authorName: 'Dr. Meenakshi Sundaram',
      authorRole: 'Senior Pilgrim Traveler',
      excerpt: 'How our family arranged senior-friendly helicopter transfers, medical oxygen escorts, and VIP priests for Kedarnath.',
      content: 'Flying above the snow-clad peaks of Rudraprayag into the sacred valley of Baba Kedar was nothing short of a divine blessing...',
      destination: 'Kedarnath & Badrinath',
      coverImage: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
      tags: ['Char Dham', 'Kedarnath', 'Helicopter Yatra'],
      readTimeMinutes: 8,
      isPublished: true,
      publishedAt: '2026-09-12T10:30:00Z',
      likesCount: 238,
    }
  ];
}

export function generateWhatsAppLink(details: any) {
  const travelDeskNumber = '919876543210';
  const text = encodeURIComponent(`Namaste TirthYatraTrails! Inquiry for ${details.title || 'Pilgrimage'}`);
  return `https://wa.me/${travelDeskNumber}?text=${text}`;
}