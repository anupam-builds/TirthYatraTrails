import { City, Hotel, Package, Inquiry, InquiryStatus, User, AuthResponse, Review, StaffMember, CompanionProfile, CompanionConnection, CompanionSearchFilters, TransitHub, HotelInventory, TravelStory } from '../types.js';
import { supabase, supabaseRest, getSupabaseHeaders, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase.js';
import { localStore } from './localStore.js';
import { broadcastNewInquiry, broadcastInquiryUpdated } from './soundNotification.js';

// ------------------------------------------------------------------------------
// Sacred Cities & Transit Hubs Persistence
// Note: Transit hubs are embedded directly as JSONB (transit_hubs) on public.cities
// to eliminate redundant relational table queries and avoid 404 errors.
// ------------------------------------------------------------------------------

/**
 * Resolves candidate IDs for a lead/inquiry to handle type and format mismatches
 * (e.g. UUID, integer, client prefix 'inq-', 'lead-', reference_id, or localStore mapping).
 */
export function getCandidateLeadIds(rawId: string | number): string[] {
  const trimmed = String(rawId || '').trim();
  if (!trimmed) return [];

  const candidates = new Set<string>();
  candidates.add(trimmed);

  // If there's an inquiry in localStore with this id, leadId, or referenceId:
  try {
    const list = localStore.getInquiries();
    const found = list.find(
      (i) =>
        String(i.id) === trimmed ||
        String(i.leadId) === trimmed ||
        String(i.referenceId) === trimmed
    );
    if (found) {
      if (found.id) candidates.add(String(found.id));
      if (found.leadId) candidates.add(String(found.leadId));
      if (found.referenceId) candidates.add(String(found.referenceId));
    }
  } catch {}

  // Strip prefixes like "inq-", "lead-", "ttt-", or "htl-"
  if (/^(inq|lead|ttt|htl)[-_]/i.test(trimmed)) {
    const stripped = trimmed.replace(/^(inq|lead|ttt|htl)[-_]/i, '');
    if (stripped) candidates.add(stripped);
  }

  // If ends with numeric digits
  const numMatch = trimmed.match(/\d+$/);
  if (numMatch) {
    candidates.add(numMatch[0]);
  }

  return Array.from(candidates).filter((c) => c && c !== 'undefined' && c !== 'null');
}

/**
 * Dynamic prefix router for table resolution based on entity ID prefix.
 */
export const getTargetTable = (id: string | number): 'inquiries' | 'hotels' | 'leads' => {
  const str = String(id || '');
  if (str.startsWith('inq')) return 'inquiries';
  if (str.startsWith('htl')) return 'hotels';
  return 'leads';
};

/**
 * Resilient PATCH executor for Supabase tables ('leads', 'inquiries', and 'hotels').
 * Dynamically routes IDs to target tables based on ID prefix ('inq' -> inquiries, 'htl' -> hotels, other -> leads),
 * strips malformed requests (invalid IDs or empty payloads),
 * tries candidate IDs across common ID columns ('id', 'lead_id', 'reference_id'),
 * logs exact Supabase/PostgREST error details on non-2xx responses,
 * and recovers gracefully.
 */
export async function resilientPatchRecord(
  tablesOrTarget: Array<'leads' | 'inquiries' | 'hotels'> | 'leads' | 'inquiries' | 'hotels' | undefined,
  rawId: string | number,
  payload: Record<string, any>
): Promise<any | null> {
  const id = rawId;
  const cleanId = String(id || '').trim();

  // Strip malformed requests (empty, 'undefined', 'null')
  if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
    console.warn('[resilientPatchRecord] Stripped malformed request with invalid id:', id);
    return null;
  }

  // Dynamic Table Resolver
  const targetTable = getTargetTable(cleanId);

  // Sanitize payload: strip keys with undefined values or empty names
  const cleanPayload: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload || {})) {
    if (v !== undefined && k !== 'undefined' && k.trim() !== '') {
      cleanPayload[k] = v;
    }
  }

  if (Object.keys(cleanPayload).length === 0) {
    console.warn('[resilientPatchRecord] Stripped malformed request: empty payload for id:', id);
    return null;
  }

  const allKnownTables: Array<'leads' | 'inquiries' | 'hotels'> = ['inquiries', 'hotels', 'leads'];
  const tables: Array<'leads' | 'inquiries' | 'hotels'> = Array.isArray(tablesOrTarget)
    ? [targetTable, ...tablesOrTarget.filter((t) => t !== targetTable)]
    : tablesOrTarget
    ? [tablesOrTarget, ...allKnownTables.filter((t) => t !== tablesOrTarget)]
    : [targetTable, ...allKnownTables.filter((t) => t !== targetTable)];

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  const explicitHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const candidateIds = getCandidateLeadIds(cleanId);
  const candidateColumns = ['id', 'lead_id', 'reference_id'];

  for (const table of tables) {
    for (const cid of candidateIds) {
      for (const col of candidateColumns) {
        try {
          const url = `${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(cid)}`;
          const res = await fetch(url, {
            method: 'PATCH',
            headers: explicitHeaders,
            body: JSON.stringify(cleanPayload),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => null);
            console.error('PATCH failed details:', { status: res.status, errData, payload: cleanPayload });

            // If error is 400 and might be due to check constraint on status (e.g. enum casing), try alternate casing
            if (res.status === 400 && cleanPayload.status && typeof cleanPayload.status === 'string') {
              const altStatus =
                cleanPayload.status === cleanPayload.status.toLowerCase()
                  ? cleanPayload.status.toUpperCase()
                  : cleanPayload.status.toLowerCase();
              const altPayload = { ...cleanPayload, status: altStatus };
              try {
                const retryRes = await fetch(url, {
                  method: 'PATCH',
                  headers: explicitHeaders,
                  body: JSON.stringify(altPayload),
                });
                if (!retryRes.ok) {
                  const retryErrData = await retryRes.json().catch(() => null);
                  console.error('PATCH failed details:', { status: retryRes.status, errData: retryErrData, payload: altPayload });
                } else {
                  const retryData = await retryRes.json().catch(() => null);
                  const row = Array.isArray(retryData) ? retryData[0] : retryData;
                  if (row && Object.keys(row).length > 0) {
                    return row;
                  }
                }
              } catch {}
            }
            continue;
          }

          const data = await res.json().catch(() => null);
          const row = Array.isArray(data) ? data[0] : data;
          if (row && Object.keys(row).length > 0) {
            return row;
          }
        } catch (fetchErr) {
          console.warn(`[resilientPatchRecord] Network error patching ${table}.${col}=${cid}:`, fetchErr);
        }
      }
    }
  }

  // SDK fallback
  for (const table of tables) {
    for (const cid of candidateIds) {
      try {
        const { data, error } = await supabase.from(table).update(cleanPayload).eq('id', cid).select().maybeSingle();
        if (error) {
          console.error(`SDK update failed details (${table}.id=${cid}):`, error);
        } else if (data) {
          return data;
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Strips and cleans sentinel strings representing unassigned states (e.g. '--Unassigned--', 'UNASSIGNED', etc.)
 * returning null for unassigned or a valid trimmed string.
 */
export function cleanUnassignedValue(val?: string | null): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (
    !s ||
    s === 'undefined' ||
    s === 'null' ||
    s === 'UNASSIGNED' ||
    s.toLowerCase() === 'unassigned' ||
    s.startsWith('--') ||
    s.includes('Unassigned')
  ) {
    return null;
  }
  return s;
}

/**
 * Toggle staff block/grant status across staff_members or profiles tables.
 */
export async function toggleStaffBlock(staffId: string, isBlocked: boolean) {
  const targetTable = staffId.startsWith('stf-') ? 'staff_members' : 'profiles';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${targetTable}?id=eq.${encodeURIComponent(staffId)}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ is_blocked: isBlocked }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Toggle block failed (${res.status}):`, errText);
    throw new Error(`Block/Grant toggle failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Universal safeguarded status and assignment updater for leads and inquiries.
 * Targets 'inquiries' (if ID starts with 'inq') or 'leads', cleans '--Unassigned--'
 * staff IDs into null, enforces staff closed-status locks, and writes proper timestamps using PostgREST.
 */
export async function updateLeadOrInquiryStatus(
  id: string | number,
  status: InquiryStatus | string | Partial<Inquiry>,
  assignedStaffId?: string | { userRole?: string; currentStatus?: string },
  staffNameOrOptions?: string | { userRole?: string; currentStatus?: string },
  options?: { userRole?: string; currentStatus?: string }
): Promise<any> {
  console.log('🚀 [API] updateLeadOrInquiryStatus called with:', { id, status, assignedStaffId });
  const resolvedOptions =
    (typeof options === 'object' && options !== null)
      ? options
      : (typeof staffNameOrOptions === 'object' && staffNameOrOptions !== null)
      ? staffNameOrOptions
      : (typeof assignedStaffId === 'object' && assignedStaffId !== null)
      ? assignedStaffId
      : undefined;

  // Enforce staff closed-status lock
  if (
    resolvedOptions?.userRole?.toLowerCase() === 'staff' &&
    resolvedOptions?.currentStatus?.toLowerCase() === 'closed'
  ) {
    throw new Error('Access denied: Closed leads can only be modified by administrators.');
  }

  const cleanId = String(id || '').trim();
  if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
    console.warn('[updateLeadOrInquiryStatus] Stripped malformed lead/inquiry id:', id);
    throw new Error('Invalid lead/inquiry ID');
  }

  const targetTable = cleanId.startsWith('inq') ? 'inquiries' : 'leads';
  const payload: Record<string, any> = { updated_at: new Date().toISOString() };

  let actualAssignedStaffId: any = undefined;
  if (typeof assignedStaffId === 'string') {
    actualAssignedStaffId = assignedStaffId;
  } else if (typeof assignedStaffId === 'object' && assignedStaffId !== null) {
    if ('assignedStaffId' in assignedStaffId) {
      actualAssignedStaffId = (assignedStaffId as any).assignedStaffId;
    } else if ('id' in assignedStaffId) {
      actualAssignedStaffId = (assignedStaffId as any).id;
    } else if ('target' in assignedStaffId && (assignedStaffId as any).target?.value) {
      actualAssignedStaffId = (assignedStaffId as any).target.value;
    }
  }
  const actualStaffName = typeof staffNameOrOptions === 'string' ? staffNameOrOptions : undefined;

  if (typeof status === 'string') {
    payload.status = status;
  } else if (typeof status === 'object' && status !== null) {
    Object.assign(payload, status);
    if ('status' in status && status.status) {
      payload.status = status.status;
    }
    if ('assignedStaffId' in status) {
      actualAssignedStaffId = (status as any).assignedStaffId;
      delete payload.assignedStaffId;
    }
    if ('assignedStaffName' in status) {
      payload.assigned_staff_name = (status as any).assignedStaffName;
      delete payload.assignedStaffName;
    }
    if ('whatsapp_number' in status || 'whatsappNumber' in status || 'phone' in status || 'customerPhone' in status) {
      const ph = (status as any).whatsapp_number || (status as any).phone || (status as any).whatsappNumber || (status as any).customerPhone || '';
      payload.phone = ph;
      payload.whatsapp_number = ph;
    }
    if ('metadata' in status) {
      payload.metadata = (status as any).metadata;
    }
  }

  if (actualAssignedStaffId !== undefined) {
    payload.assigned_staff_id =
      actualAssignedStaffId === '--Unassigned--' ||
      actualAssignedStaffId === 'UNASSIGNED' ||
      !actualAssignedStaffId ||
      actualAssignedStaffId === 'undefined' ||
      actualAssignedStaffId === 'null'
        ? null
        : actualAssignedStaffId;
  }

  if (actualStaffName) {
    payload.assigned_staff_name = payload.assigned_staff_id ? actualStaffName : null;
  }

  const url = `${SUPABASE_URL}/rest/v1/${targetTable}?id=eq.${encodeURIComponent(cleanId)}`;
  console.log('🌐 [API] Fetching PATCH:', url, payload);

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`PATCH ${targetTable} failed (${res.status}):`, errText);
    throw new Error(`Update failed: ${res.status}`);
  }

  const data = await res.json();
  // PostgREST return=representation returns an array; extract first item if array
  const rawRow = Array.isArray(data) ? (data[0] || { id: cleanId, status: payload.status, ...payload }) : (data || { id: cleanId, status: payload.status, ...payload });

  const mapped: Inquiry = {
    ...rawRow,
    id: rawRow.id || cleanId,
    status: (rawRow.status || payload.status || 'NEW') as any,
    assignedStaffId: rawRow.assigned_staff_id !== undefined ? rawRow.assigned_staff_id : payload.assigned_staff_id,
    assignedStaffName: rawRow.assigned_staff_name !== undefined ? rawRow.assigned_staff_name : payload.assigned_staff_name,
    updatedAt: rawRow.updated_at || payload.updated_at,
  } as Inquiry;

  try {
    localStore.updateInquiry(cleanId, mapped);
    broadcastInquiryUpdated(mapped, { newStatus: mapped.status, staffName: mapped.assignedStaffName });
  } catch {}

  return {
    ...rawRow,
    ...mapped,
    assignedStaffId: mapped.assignedStaffId,
    assignedStaffName: mapped.assignedStaffName,
  };
}

/**
 * Presence status updater targeting staff_members (for stf-* IDs) or profiles.
 * Ignores admin/user IDs (usr-*) and safely updates schema fields.
 */
export async function setStaffOnlineStatus(id: string, online: boolean): Promise<void> {
  if (!id || id.startsWith('usr-')) return;
  const targetTable = id.startsWith('stf-') ? 'staff_members' : 'profiles';
  const timestamp = new Date().toISOString();

  try {
    const updatePayload: Record<string, any> = {
      is_online: online,
      last_active_at: timestamp,
    };
    if (targetTable === 'profiles') {
      updatePayload.last_seen = timestamp;
    } else {
      updatePayload.is_currently_logged_in = online;
    }

    const { error } = await supabase.from(targetTable)
      .update(updatePayload)
      .eq('id', id);

    if (error && targetTable === 'profiles') {
      await supabase.from('profiles')
        .update({
          is_online: online,
          last_seen: timestamp,
        })
        .eq('id', id);
    }
  } catch (err) {
    console.warn(`[Presence] update failed on ${targetTable}:`, err);
  }

  // Sync local store and window event for responsive UI feedback
  try {
    localStore.updateStaffMember(id, {
      isCurrentlyLoggedIn: online,
      isOnline: online,
      lastActiveAt: timestamp,
      lastSeen: timestamp,
    } as any);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tirth-staff-presence-changed', {
        detail: { staffId: id, isOnline: online, lastSeen: timestamp },
      })
    );
  }
}

/**
 * Submits a customer inquiry to the Supabase 'inquiries' table with top-level
 * contact fields ('full_name', 'email', 'phone', 'whatsapp_number', 'status: new')
 * and rich JSON 'metadata'.
 */
export async function submitCustomerInquiry(formData: any) {
  const phoneVal = formData.whatsappNumber || formData.phone || formData.whatsapp_number || '';
  const fullNameVal = formData.fullName || formData.full_name || formData.customerName || '';
  const emailVal = formData.email || formData.customerEmail || '';
  const pickupCityVal = formData.pickupCity || formData.pickup_city || formData.pickupLocation || '';
  const dropCityVal = formData.sameAsPickup
    ? pickupCityVal
    : (formData.dropCity || formData.drop_city || formData.dropoffLocation || '');
  const packageInterestVal = formData.packageInterest || formData.package_interest || formData.title || formData.packageName || '';
  const startDateVal = formData.startDate || formData.start_date || formData.checkInDate || '';
  const durationVal = formData.duration || formData.tourDuration || '';
  const adultsVal = Number(formData.adults) || 1;
  const childrenVal = Number(formData.children) || 0;
  const accommodationTierVal = formData.accommodationTier || formData.accommodation_tier || formData.plan || formData.planChosen || '';
  const specialRequestsVal = formData.specialRequests || formData.special_requests || '';

  const payload = {
    full_name: fullNameVal,
    email: emailVal,
    phone: phoneVal,
    whatsapp_number: phoneVal,
    status: 'new',
    metadata: {
      whatsapp_number: phoneVal,
      resident_state: formData.residentState || formData.resident_state || formData.userCity || '',
      package_interest: packageInterestVal,
      start_date: startDateVal,
      duration: durationVal,
      adults: adultsVal,
      children: childrenVal,
      pickup_city: pickupCityVal,
      drop_city: dropCityVal,
      accommodation_tier: accommodationTierVal,
      special_requests: specialRequestsVal,
    },
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/inquiries`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`POST inquiries failed (${res.status}):`, errText);
    throw new Error(`Inquiry submission failed: ${res.status}`);
  }

  const result = await res.json();
  const createdRow = Array.isArray(result) ? result[0] : result;
  if (createdRow) {
    try {
      const mapped = mapInquiryRow(createdRow);
      broadcastNewInquiry(mapped);
      localStore.submitInquiry(mapped);
    } catch {}
  }
  return result;
}

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

  // Staff Online Presence setter
  async setStaffOnlineStatus(id: string, online: boolean): Promise<void> {
    return setStaffOnlineStatus(id, online);
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

      // Set online status in profiles & staff_members
      await this.setStaffOnlineStatus(data.id, true).catch(() => {});

      const { password: _, ...safeStaff } = data;
      const mapped: StaffMember = {
        ...safeStaff,
        isBlocked: safeStaff.is_blocked,
        isActive: safeStaff.is_active,
        isOnline: true,
        isCurrentlyLoggedIn: true,
      };
      return { user: mapped, token: btoa(JSON.stringify(mapped)) };
    } catch (err: any) {
      if (err.message?.includes('Access Blocked')) throw err;
      const res = localStore.loginStaff(email, password);
      await this.setStaffOnlineStatus(res.user.id, true).catch(() => {});
      return res;
    }
  },

  async logoutStaff(staffId?: string): Promise<void> {
    if (staffId) {
      try {
        await supabase.from('staff_sessions').delete().eq('staff_id', staffId);
      } catch {}
      await this.setStaffOnlineStatus(staffId, false).catch(() => {});
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

  // Public & Admin Cities Data via Supabase (Embedded Transit Hubs)
  async getCities(): Promise<City[]> {
    try {
      const { data, error } = await supabase.from('cities').select('*');
      if (!error && data && data.length > 0) {
        return data.map(mapCityRow);
      }
      if (error) {
        console.warn('getCities remote warning, checking localStore:', error.message);
      }
    } catch (err) {
      console.warn('getCities network error, falling back to localStore:', err);
    }
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
      let q = supabase.from('packages').select('*');
      if (category) q = q.eq('category', category);
      const res = await q;
      if (!res.error && res.data && res.data.length) {
        let list = res.data.map(mapPackageRow);
        if (query) {
          const lower = query.toLowerCase();
          list = list.filter((p) => p.title.toLowerCase().includes(lower) || p.location.toLowerCase().includes(lower));
        }
        return list;
      }
    } catch (err) {
      console.warn('getPackages query error, falling back to localStore:', err);
    }
    return localStore.getPackages(category, query);
  },

  async getPackageById(id: string): Promise<Package> {
    try {
      const res = await supabase.from('packages').select('*').eq('id', id).maybeSingle();
      if (!res.error && res.data) return mapPackageRow(res.data);
    } catch (err) {
      console.warn('getPackageById query error, falling back to localStore:', err);
    }
    return localStore.getPackageById(id)!;
  },

  // Inquiries
  async submitCustomerInquiry(formData: any) {
    return submitCustomerInquiry(formData);
  },

  async submitInquiry(inquiryData: Partial<Inquiry>): Promise<Inquiry> {
    const phoneVal =
      (inquiryData as any).whatsappNumber ||
      (inquiryData as any).whatsapp_number ||
      inquiryData.phone ||
      (inquiryData as any).metadata?.whatsapp_number ||
      inquiryData.customerPhone ||
      '';

    const customerName =
      (inquiryData as any).fullName ||
      (inquiryData as any).full_name ||
      (inquiryData as any).customerName ||
      'Pilgrim Devotee';

    const customerEmail =
      inquiryData.email ||
      (inquiryData as any).customerEmail ||
      '';

    const checkInDate =
      (inquiryData as any).startDate ||
      (inquiryData as any).checkInDate ||
      (inquiryData as any).check_in_date ||
      new Date().toISOString().split('T')[0];

    const structuredMetadata = {
      whatsapp_number: phoneVal,
      resident_state: (inquiryData as any).residentState || (inquiryData as any).resident_state || (inquiryData as any).userCity || inquiryData.userCity || '',
      package_interest: (inquiryData as any).packageInterest || (inquiryData as any).package_interest || inquiryData.title || (inquiryData as any).packageName || (inquiryData as any).referenceName || '',
      start_date: checkInDate,
      duration: (inquiryData as any).duration || (inquiryData as any).tourDuration || '',
      adults: Number(inquiryData.adults ?? (inquiryData as any).metadata?.adults ?? inquiryData.guests ?? 1) || 1,
      children: Number(inquiryData.children ?? (inquiryData as any).metadata?.children ?? 0) || 0,
      pickup_city: (inquiryData as any).pickupCity || (inquiryData as any).pickupLocation || (inquiryData as any).pickup_city || (inquiryData as any).pickup_location || '',
      drop_city: (inquiryData as any).sameAsPickup
        ? ((inquiryData as any).pickupCity || (inquiryData as any).pickupLocation || '')
        : ((inquiryData as any).dropCity || (inquiryData as any).dropoffLocation || (inquiryData as any).drop_city || (inquiryData as any).dropoff_location || ''),
      accommodation_tier: (inquiryData as any).accommodationTier || (inquiryData as any).accommodation_tier || inquiryData.plan || (inquiryData as any).planChosen || (inquiryData as any).selectedPlan || '',
      special_requests: (inquiryData as any).specialRequests || (inquiryData as any).special_requests || '',
      ...((inquiryData as any).metadata || {}),
    };

    try {
      const payload = {
        title: inquiryData.title || structuredMetadata.package_interest || 'Pilgrimage Inquiry',
        type: inquiryData.type || 'PACKAGE',
        full_name: customerName,
        phone: phoneVal,
        whatsapp_number: phoneVal,
        email: customerEmail,
        check_in_date: checkInDate,
        guests: structuredMetadata.adults + structuredMetadata.children,
        adults: structuredMetadata.adults,
        children: structuredMetadata.children,
        child_ages: (inquiryData as any).childAges || (inquiryData as any).child_ages,
        plan: structuredMetadata.accommodation_tier,
        special_requests: structuredMetadata.special_requests,
        pickup_location: structuredMetadata.pickup_city,
        dropoff_location: structuredMetadata.drop_city,
        user_id: (inquiryData as any).userId || (inquiryData as any).user_id,
        status: 'new',
        assigned_staff_id: (inquiryData as any).assignedStaffId,
        assigned_staff_name: (inquiryData as any).assignedStaffName,
        is_locked_for_staff: Boolean((inquiryData as any).isLockedForStaff),
        metadata: structuredMetadata,
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/inquiries`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`POST inquiries failed (${res.status}):`, errText);
        throw new Error(`Inquiry submission failed: ${res.status}`);
      }

      const resJson = await res.json();
      const createdRow = Array.isArray(resJson) ? resJson[0] : resJson;
      const mapped = mapInquiryRow(createdRow);
      broadcastNewInquiry(mapped);
      localStore.submitInquiry(mapped);
      return mapped;
    } catch (err: any) {
      console.error('⚠️ [submitInquiry] Supabase insert failed, falling back to localStore:', err);
      const fb = localStore.submitInquiry({
        ...inquiryData,
        fullName: customerName,
        phone: phoneVal,
        whatsapp_number: phoneVal,
        whatsappNumber: phoneVal,
        customerPhone: phoneVal,
        metadata: structuredMetadata,
      });
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

  // ---------------------------------------------------------------------------
  // Lead Assignment & Status Sync (targets 'leads' and 'inquiries' tables)
  // ---------------------------------------------------------------------------
  async updateLeadAssignment(leadId: string | number, staffId: string, staffName?: string): Promise<Inquiry> {
    const id = leadId;
    const cleanId = String(id || '').trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
      console.warn('updateLeadAssignment stripped malformed id:', id);
      throw new Error('Invalid lead ID for assignment');
    }

    const targetTable = getTargetTable(id);
    const cleanedStaffId = cleanUnassignedValue(staffId);

    let resolvedStaffName = cleanedStaffId ? staffName : null;
    if (!resolvedStaffName && cleanedStaffId) {
      try {
        const staffMembers = await this.getStaffMembers();
        const found = staffMembers.find((s) => String(s.id) === String(cleanedStaffId));
        if (found) resolvedStaffName = found.name;
      } catch {}
    }

    const payload: Record<string, any> = {
      assigned_staff_id: cleanedStaffId || null,
      assigned_staff_name: resolvedStaffName || null,
      updated_at: new Date().toISOString(),
    };

    const updatedRow = await resilientPatchRecord(targetTable, cleanId, payload);

    const mapped: Inquiry = updatedRow
      ? mapInquiryRow(updatedRow)
      : ({
          ...(await this.getInquiries()).find((i) => String(i.id) === cleanId) || {},
          id: cleanId,
          assignedStaffId: cleanedStaffId || undefined,
          assignedStaffName: resolvedStaffName || undefined,
        } as Inquiry);

    localStore.updateInquiry(cleanId, {
      assignedStaffId: cleanedStaffId || undefined,
      assignedStaffName: resolvedStaffName || undefined,
    });

    broadcastInquiryUpdated(mapped, { staffName: resolvedStaffName || undefined });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tirth-lead-changed', {
          detail: { action: 'assign', leadId: cleanId, staffId: cleanedStaffId || undefined, staffName: resolvedStaffName, lead: mapped },
        })
      );
      window.dispatchEvent(
        new CustomEvent('tirth-inquiry-changed', {
          detail: { action: 'assign', id: cleanId, assignedStaffId: cleanedStaffId || undefined, assignedStaffName: resolvedStaffName, inquiry: mapped },
        })
      );
    }

    return mapped;
  },

  async updateLeadStatus(
    leadId: string | number,
    status: Inquiry['status'] | string,
    staffId?: string,
    staffName?: string
  ): Promise<Inquiry> {
    const id = leadId;
    const cleanId = String(id || '').trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
      console.warn('updateLeadStatus stripped malformed id:', id);
      throw new Error('Invalid lead ID for status update');
    }

    const targetTable = getTargetTable(id);

    const rawStatus = String(status || '').trim();
    const formattedStatus = rawStatus.toLowerCase(); // e.g. 'contacted'
    const upperStatus = rawStatus.toUpperCase();

    const cleanedStaffId = staffId !== undefined ? cleanUnassignedValue(staffId) : undefined;
    const resolvedStaffName = cleanedStaffId ? staffName : null;

    const payload: Record<string, any> = {
      status: formattedStatus,
      updated_at: new Date().toISOString(),
    };
    if (staffId !== undefined) {
      payload.assigned_staff_id = cleanedStaffId || null;
      payload.assigned_staff_name = resolvedStaffName || null;
    }
    if (upperStatus === 'CLOSED') {
      payload.is_locked_for_staff = true;
      payload.closed_at = new Date().toISOString();
      if (staffName) payload.closed_by = staffName;
    }

    const updatedRow = await resilientPatchRecord(targetTable, cleanId, payload);

    const mapped: Inquiry = updatedRow
      ? mapInquiryRow(updatedRow)
      : ({
          ...(await this.getInquiries()).find((i) => String(i.id) === cleanId) || {},
          id: cleanId,
          status: upperStatus as any,
          ...(cleanedStaffId !== undefined
            ? { assignedStaffId: cleanedStaffId || undefined, assignedStaffName: resolvedStaffName || undefined }
            : {}),
        } as Inquiry);

    localStore.updateInquiry(cleanId, {
      status: upperStatus as any,
      ...(cleanedStaffId !== undefined
        ? { assignedStaffId: cleanedStaffId || undefined, assignedStaffName: resolvedStaffName || undefined }
        : {}),
    });

    broadcastInquiryUpdated(mapped, { newStatus: mapped.status, staffName: resolvedStaffName || undefined });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tirth-lead-changed', {
          detail: { action: 'status', leadId: cleanId, status: formattedStatus, lead: mapped },
        })
      );
      window.dispatchEvent(
        new CustomEvent('tirth-inquiry-changed', {
          detail: { action: 'update', id: cleanId, inquiry: mapped },
        })
      );
    }

    return mapped;
  },

  async updateLeadOrInquiryStatus(
    leadOrInquiryId: string | number,
    statusOrUpdates: InquiryStatus | string | Partial<Inquiry>,
    staffId?: string,
    staffName?: string
  ): Promise<Inquiry> {
    return updateLeadOrInquiryStatus(leadOrInquiryId, statusOrUpdates, staffId, staffName);
  },

  async updateInquiryStatus(
    id: string | number,
    status: Inquiry['status'] | string,
    staffId?: string,
    staffName?: string
  ): Promise<Inquiry> {
    return this.updateLeadOrInquiryStatus(id, status, staffId, staffName);
  },

  async updateInquiry(id: string | number, updates: Partial<Inquiry>, _asStaff = false): Promise<Inquiry> {
    const cleanId = String(id || '').trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
      console.warn('updateInquiry stripped malformed id:', id);
      throw new Error('Invalid inquiry ID');
    }

    const targetTable = getTargetTable(id);

    try {
      const payload: Record<string, any> = {};
      if (updates.status !== undefined) payload.status = String(updates.status).toLowerCase();
      if (updates.assignedStaffId !== undefined) {
        const cleaned = cleanUnassignedValue(updates.assignedStaffId);
        payload.assigned_staff_id = cleaned || null;
        payload.assigned_staff_name = cleaned ? (updates.assignedStaffName || null) : null;
      }
      if ((updates as any).isLockedForStaff !== undefined) payload.is_locked_for_staff = (updates as any).isLockedForStaff;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.specialRequests !== undefined) payload.special_requests = updates.specialRequests;
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.phone !== undefined || (updates as any).whatsapp_number !== undefined || updates.whatsappNumber !== undefined || updates.customerPhone !== undefined) {
        const ph = (updates as any).whatsapp_number || updates.phone || updates.whatsappNumber || updates.customerPhone || '';
        payload.phone = ph;
        payload.whatsapp_number = ph;
      }
      if ((updates as any).metadata !== undefined) {
        payload.metadata = (updates as any).metadata;
      }

      const data = await resilientPatchRecord(targetTable, cleanId, payload);

      const mapped = data ? mapInquiryRow(data) : localStore.updateInquiry(cleanId, updates);
      localStore.updateInquiry(cleanId, mapped);
      broadcastInquiryUpdated(mapped, { newStatus: mapped.status, staffName: mapped.assignedStaffName });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-lead-changed', { detail: { action: 'update', lead: mapped } }));
        window.dispatchEvent(new CustomEvent('tirth-inquiry-changed', { detail: { action: 'update', inquiry: mapped } }));
      }
      return mapped;
    } catch {
      const updated = localStore.updateInquiry(cleanId, updates);
      broadcastInquiryUpdated(updated, { newStatus: updated.status });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-lead-changed', { detail: { action: 'update', lead: updated } }));
        window.dispatchEvent(new CustomEvent('tirth-inquiry-changed', { detail: { action: 'update', inquiry: updated } }));
      }
      return updated;
    }
  },

  async toggleInquiryStatus(id: string): Promise<Inquiry> {
    const list = await this.getInquiries();
    const curr = list.find((i) => i.id === id);
    const next = curr?.status === 'NEW' ? 'CONTACTED' : curr?.status === 'CONTACTED' ? 'CLOSED' : 'NEW';
    return this.updateLeadStatus(id, next);
  },

  async deleteInquiry(id: string): Promise<boolean> {
    try {
      await supabase.from('leads').delete().eq('id', id);
    } catch {}
    try {
      await supabase.from('inquiries').delete().eq('id', id);
    } catch {}
    return localStore.deleteInquiry(id);
  },

  async getDeletedInquiries() { return localStore.getDeletedInquiries(); },
  async restoreInquiry(id: string, sId?: string, sName?: string) { return localStore.restoreInquiry(id, sId, sName); },
  async permanentlyDeleteInquiry(id: string) { return localStore.permanentlyDeleteInquiry(id); },
  async emptyTrash() { return localStore.emptyTrash(); },

  async updateInquiryStatusByStaff(id: string, status: 'NEW' | 'CONTACTED' | 'CLOSED', staff: { id: string; name: string }) {
    return this.updateLeadStatus(id, status, staff.id, staff.name);
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
    return this.updateLeadAssignment(id, staffId, staffName);
  },

  // Staff Mgmt & Live Session Monitor via Supabase
  async getStaffMembers(): Promise<StaffMember[]> {
    try {
      const { data: staffData } = await supabase.from('staff_members').select('*');
      let profilesMap: Record<string, any> = {};
      try {
        const { data: profData } = await supabase.from('profiles').select('id, is_online, last_seen');
        if (profData) {
          profData.forEach((p: any) => {
            profilesMap[String(p.id)] = p;
          });
        }
      } catch {}

      if (staffData && staffData.length) {
        return staffData.map((s) => {
          const prof = profilesMap[String(s.id)];
          const isOnline = Boolean(prof?.is_online ?? s.is_online ?? s.is_currently_logged_in);
          const lastSeen = prof?.last_seen || s.last_active_at || s.last_login;
          return mapStaffRow({
            ...s,
            is_online: isOnline,
            is_currently_logged_in: isOnline,
            last_seen: lastSeen,
          });
        });
      }
      return localStore.getStaffMembers();
    } catch {
      return localStore.getStaffMembers();
    }
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
  async toggleStaffBlock(staffId: string, isBlocked: boolean) {
    return toggleStaffBlock(staffId, isBlocked);
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
    const rawPayload = hotelToRow(hotel);
    const { id, ...cleanPayload } = rawPayload;
    const isTempId = id && (String(id).startsWith('htl-') || String(id).startsWith('hotel-') || String(id).startsWith('temp-'));
    const insertPayload: Record<string, any> = id && String(id).trim() !== '' && !isTempId
      ? { id: String(id).trim(), ...cleanPayload }
      : { ...cleanPayload };

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
    const explicitHeaders = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    console.log('Sending hotel payload:', JSON.stringify(insertPayload, null, 2));

    // 1. Direct PostgREST POST with explicit headers
    try {
      const restUrl = `${SUPABASE_URL}/rest/v1/hotels`;
      const response = await fetch(restUrl, {
        method: 'POST',
        headers: explicitHeaders,
        body: JSON.stringify(insertPayload),
      });

      if (response.ok) {
        const data = await response.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          const mapped = mapHotelRow(row);
          localStore.createHotel(mapped);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tirth-hotel-changed', { detail: { action: 'create', hotel: mapped } }));
          }
          return mapped;
        }
      } else {
        const errText = await response.text();
        console.error(`Direct fetch createHotel failed (${response.status}):`, errText);
      }
    } catch (fetchErr) {
      console.warn('Direct fetch createHotel network error:', fetchErr);
    }

    // 2. Secondary attempt via Supabase SDK or supabaseRest
    try {
      const { data, error } = await supabase.from('hotels').insert([insertPayload]).select().maybeSingle();
      if (!error && data) {
        const mapped = mapHotelRow(data);
        localStore.createHotel(mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-hotel-changed', { detail: { action: 'create', hotel: mapped } }));
        }
        return mapped;
      }
      if (error) {
        console.error('Supabase SDK createHotel error:', error.message, error.details);
      }

      const restRes = await supabaseRest<any[]>('hotels', {
        method: 'POST',
        headers: explicitHeaders,
        body: insertPayload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapHotelRow(restRes.data[0]);
        localStore.createHotel(mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-hotel-changed', { detail: { action: 'create', hotel: mapped } }));
        }
        return mapped;
      }
    } catch (err) {
      console.warn('createHotel remote error, falling back to localStore', err);
    }

    const fallbackId = (insertPayload as any).id || (id && !isTempId ? id : `htl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    const saved = localStore.createHotel({ ...hotel, ...insertPayload, id: fallbackId } as Hotel);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-hotel-changed', { detail: { action: 'create', hotel: saved } }));
    }
    return saved;
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
    const rawPayload = packageToRow(pkg);
    const { id, ...cleanPayload } = rawPayload;
    const isTempId = id && (String(id).startsWith('pkg-') || String(id).startsWith('temp-'));
    const insertPayload: Record<string, any> = id && String(id).trim() !== '' && !isTempId
      ? { id: String(id).trim(), ...cleanPayload }
      : { ...cleanPayload };

    // Ensure JSONB fields (itinerary, transfers, highlights, gallery_images) are passed as native arrays/objects, never double-stringified JSON text
    if (typeof insertPayload.itinerary === 'string') {
      try { insertPayload.itinerary = JSON.parse(insertPayload.itinerary); } catch { insertPayload.itinerary = []; }
    }
    if (!Array.isArray(insertPayload.itinerary)) {
      insertPayload.itinerary = insertPayload.itinerary ? [insertPayload.itinerary] : [];
    }

    if (typeof insertPayload.highlights === 'string') {
      try { insertPayload.highlights = JSON.parse(insertPayload.highlights); } catch { insertPayload.highlights = []; }
    }
    if (!Array.isArray(insertPayload.highlights)) {
      insertPayload.highlights = insertPayload.highlights ? [insertPayload.highlights] : [];
    }

    if (typeof insertPayload.gallery_images === 'string') {
      try { insertPayload.gallery_images = JSON.parse(insertPayload.gallery_images); } catch { insertPayload.gallery_images = []; }
    }
    if (!Array.isArray(insertPayload.gallery_images)) {
      insertPayload.gallery_images = insertPayload.gallery_images ? [insertPayload.gallery_images] : [];
    }

    if (typeof insertPayload.transfers === 'string' && (insertPayload.transfers.trim().startsWith('{') || insertPayload.transfers.trim().startsWith('['))) {
      try { insertPayload.transfers = JSON.parse(insertPayload.transfers); } catch {}
    }

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
    const explicitHeaders = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    // Debug Logging
    console.log('Sending package payload:', JSON.stringify(insertPayload, null, 2));

    // 1. Direct PostgREST POST with explicit headers targeting strictly packages
    try {
      const restUrl = `${SUPABASE_URL}/rest/v1/packages`;
      const response = await fetch(restUrl, {
        method: 'POST',
        headers: explicitHeaders,
        body: JSON.stringify(insertPayload),
      });

      if (response.ok) {
        const data = await response.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          const mapped = mapPackageRow(row);
          localStore.createPackage(mapped);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tirth-package-changed', { detail: mapped }));
          }
          return mapped;
        }
      } else {
        const errText = await response.text();
        console.error(`Direct fetch createPackage failed (${response.status}):`, errText);
      }
    } catch (fetchErr) {
      console.warn('Direct fetch createPackage network error:', fetchErr);
    }

    // 2. Secondary attempt via Supabase SDK or supabaseRest targeting packages table
    try {
      const { data, error } = await supabase.from('packages').insert([insertPayload]).select().maybeSingle();
      if (!error && data) {
        const mapped = mapPackageRow(data);
        localStore.createPackage(mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-package-changed', { detail: mapped }));
        }
        return mapped;
      }
      if (error) {
        console.error('Supabase SDK createPackage error:', error.message, error.details);
      }

      const restRes = await supabaseRest<any[]>('packages', {
        method: 'POST',
        headers: explicitHeaders,
        body: insertPayload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapPackageRow(restRes.data[0]);
        localStore.createPackage(mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-package-changed', { detail: mapped }));
        }
        return mapped;
      }
    } catch (err) {
      console.warn('createPackage error, saving to localStore:', err);
    }

    const fallbackId = (insertPayload as any).id || (id && !isTempId ? id : `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    const saved = localStore.createPackage({ ...pkg, ...insertPayload, id: fallbackId } as Package);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-package-changed', { detail: saved }));
    }
    return saved;
  },

  async updatePackage(id: string, pkg: Partial<Package>): Promise<Package> {
    const payload = packageToRow(pkg);
    delete payload.id;

    // Ensure JSONB fields (itinerary, transfers, highlights, gallery_images) are passed as native arrays/objects, never double-stringified JSON text
    if (typeof payload.itinerary === 'string') {
      try { payload.itinerary = JSON.parse(payload.itinerary); } catch { payload.itinerary = []; }
    }
    if (payload.itinerary !== undefined && !Array.isArray(payload.itinerary)) {
      payload.itinerary = [payload.itinerary];
    }

    if (typeof payload.highlights === 'string') {
      try { payload.highlights = JSON.parse(payload.highlights); } catch { payload.highlights = []; }
    }
    if (payload.highlights !== undefined && !Array.isArray(payload.highlights)) {
      payload.highlights = [payload.highlights];
    }

    if (typeof payload.gallery_images === 'string') {
      try { payload.gallery_images = JSON.parse(payload.gallery_images); } catch { payload.gallery_images = []; }
    }
    if (payload.gallery_images !== undefined && !Array.isArray(payload.gallery_images)) {
      payload.gallery_images = [payload.gallery_images];
    }

    if (typeof payload.transfers === 'string' && (payload.transfers.trim().startsWith('{') || payload.transfers.trim().startsWith('['))) {
      try { payload.transfers = JSON.parse(payload.transfers); } catch {}
    }

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
    const explicitHeaders = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    console.log('Sending package update payload:', JSON.stringify(payload, null, 2));

    // 1. Direct PostgREST PATCH with explicit headers
    try {
      const restUrl = `${SUPABASE_URL}/rest/v1/packages?id=eq.${encodeURIComponent(id)}`;
      const response = await fetch(restUrl, {
        method: 'PATCH',
        headers: explicitHeaders,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          const mapped = mapPackageRow(row);
          localStore.updatePackage(id, mapped);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tirth-package-changed', { detail: mapped }));
          }
          return mapped;
        }
      } else {
        const errText = await response.text();
        console.error(`Direct fetch updatePackage failed (${response.status}):`, errText);
      }
    } catch (fetchErr) {
      console.warn('Direct fetch updatePackage network error:', fetchErr);
    }

    // 2. Secondary attempt via Supabase SDK or supabaseRest targeting packages table
    try {
      const { data, error } = await supabase.from('packages').update(payload).eq('id', id).select().maybeSingle();
      if (!error && data) {
        const mapped = mapPackageRow(data);
        localStore.updatePackage(id, mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-package-changed', { detail: mapped }));
        }
        return mapped;
      }
      const restRes = await supabaseRest<any[]>('packages', {
        method: 'PATCH',
        headers: explicitHeaders,
        params: { id: `eq.${id}` },
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapPackageRow(restRes.data[0]);
        localStore.updatePackage(id, mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-package-changed', { detail: mapped }));
        }
        return mapped;
      }
    } catch (err) {
      console.warn('updatePackage remote error, saving to localStore:', err);
    }

    const updated = localStore.updatePackage(id, pkg);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-package-changed', { detail: updated }));
    }
    return updated;
  },

  async deletePackage(idOrQuery: string): Promise<boolean> {
    const rawId = String(idOrQuery || '').trim();
    // Parse safe id if rawId contains query expression like 'id=eq.pkg-123' or '?id=eq.pkg-123'
    const id = rawId.includes('id=eq.')
      ? rawId.split('id=eq.').pop()?.split('&')[0]?.trim() || rawId
      : rawId;

    if (!id) return false;

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
    const explicitHeaders = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    // 1. Direct PostgREST DELETE call safely targeting only /rest/v1/packages?id=eq.${id}
    try {
      const restUrl = `${SUPABASE_URL}/rest/v1/packages?id=eq.${encodeURIComponent(id)}`;
      const response = await fetch(restUrl, {
        method: 'DELETE',
        headers: explicitHeaders,
      });

      if (!response.ok && response.status !== 404) {
        const errText = await response.text();
        console.error(`Direct fetch deletePackage failed (${response.status}):`, errText);
      }
    } catch (fetchErr) {
      console.warn('Direct fetch deletePackage network error:', fetchErr);
    }

    // 2. Secondary supabase SDK call targeting only packages
    try {
      await supabase.from('packages').delete().eq('id', id);
    } catch (err) {
      console.warn('deletePackage Supabase SDK error:', err);
    }

    localStore.deletePackage(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-package-changed', { detail: { id } }));
    }
    return true;
  },

  async createCity(city: Partial<City>): Promise<City> {
    const payload = cityToRow(city);
    if (!payload.id) {
      payload.id = (city.name || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    if (!payload.transit_hubs) {
      payload.transit_hubs = city.transitHubs || [];
    }

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
    const explicitHeaders = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    // 1. First attempt direct PostgREST REST fetch with explicit headers to eliminate 400 Bad Request
    try {
      const restUrl = `${SUPABASE_URL}/rest/v1/cities`;
      const response = await fetch(restUrl, {
        method: 'POST',
        headers: explicitHeaders,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          const mapped = mapCityRow(row);
          localStore.createCity(mapped);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: mapped }));
          }
          return mapped;
        }
      } else {
        const errText = await response.text();
        console.warn(`Direct fetch createCity failed (${response.status}):`, errText);
      }
    } catch (fetchErr) {
      console.warn('Direct fetch createCity network error:', fetchErr);
    }

    // 2. Secondary attempt via supabase-js insert with explicit header overrides
    try {
      const { data, error } = await supabase.from('cities').insert([payload]).select().maybeSingle();
      if (!error && data) {
        const mapped = mapCityRow(data);
        localStore.createCity(mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: mapped }));
        }
        return mapped;
      }

      const restRes = await supabaseRest<any[]>('cities', {
        method: 'POST',
        headers: explicitHeaders,
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapCityRow(restRes.data[0]);
        localStore.createCity(mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: mapped }));
        }
        return mapped;
      }
    } catch (err) {
      console.warn('createCity remote error, saving to localStore:', err);
    }

    const saved = localStore.createCity({ ...city, id: payload.id } as City);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: saved }));
    }
    return saved;
  },

  async updateCity(id: string, city: Partial<City>): Promise<City> {
    const payload = cityToRow(city);
    delete payload.id;

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
    const explicitHeaders = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    // 1. Direct PostgREST PATCH with explicit headers
    try {
      const restUrl = `${SUPABASE_URL}/rest/v1/cities?id=eq.${encodeURIComponent(id)}`;
      const response = await fetch(restUrl, {
        method: 'PATCH',
        headers: explicitHeaders,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          const mapped = mapCityRow(row);
          localStore.updateCity(id, mapped);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: mapped }));
          }
          return mapped;
        }
      } else {
        const errText = await response.text();
        console.warn(`Direct fetch updateCity failed (${response.status}):`, errText);
      }
    } catch (fetchErr) {
      console.warn('Direct fetch updateCity network error:', fetchErr);
    }

    // 2. Secondary attempt via supabase-js or supabaseRest
    try {
      const { data, error } = await supabase.from('cities').update(payload).eq('id', id).select().maybeSingle();
      if (!error && data) {
        const mapped = mapCityRow(data);
        localStore.updateCity(id, mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: mapped }));
        }
        return mapped;
      }
      const restRes = await supabaseRest<any[]>('cities', {
        method: 'PATCH',
        headers: explicitHeaders,
        params: { id: `eq.${id}` },
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapCityRow(restRes.data[0]);
        localStore.updateCity(id, mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: mapped }));
        }
        return mapped;
      }
    } catch (err) {
      console.warn('updateCity remote error, saving to localStore:', err);
    }

    const updated = localStore.updateCity(id, city);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: updated }));
    }
    return updated;
  },

  async saveCity(city: Partial<City>): Promise<City> {
    if (city.id) {
      const cities = await this.getCities();
      const existing = cities.find((c) => c.id === city.id);
      if (existing) {
        return this.updateCity(city.id, city);
      }
    }
    return this.createCity(city);
  },

  async deleteCity(id: string): Promise<boolean> {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
    const explicitHeaders = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    };

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/cities?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: explicitHeaders,
      });
      await supabase.from('cities').delete().eq('id', id);
    } catch (err) {
      console.warn('deleteCity remote error:', err);
    }
    localStore.deleteCity(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: { id } }));
    }
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
    const rawPayload = reviewToRow(rev);
    const { id, ...cleanPayload } = rawPayload;
    const isTempId = id && (String(id).startsWith('rev-') || String(id).startsWith('temp-'));
    const insertPayload: Record<string, any> = id && String(id).trim() !== '' && !isTempId
      ? { id: String(id).trim(), ...cleanPayload }
      : { ...cleanPayload };

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
    const explicitHeaders = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    console.log('Sending review payload:', JSON.stringify(insertPayload, null, 2));

    // 1. Direct PostgREST POST with explicit headers
    try {
      const restUrl = `${SUPABASE_URL}/rest/v1/reviews`;
      const response = await fetch(restUrl, {
        method: 'POST',
        headers: explicitHeaders,
        body: JSON.stringify(insertPayload),
      });

      if (response.ok) {
        const data = await response.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          const mapped = mapReviewRow(row);
          localStore.createReview(mapped);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tirth-review-changed', { detail: { action: 'create', review: mapped } }));
          }
          return mapped;
        }
      } else {
        const errText = await response.text();
        console.error(`Direct fetch createReview failed (${response.status}):`, errText);
      }
    } catch (fetchErr) {
      console.warn('Direct fetch createReview network error:', fetchErr);
    }

    // 2. Secondary attempt via Supabase SDK or supabaseRest
    try {
      const { data, error } = await supabase.from('reviews').insert([insertPayload]).select().maybeSingle();
      if (!error && data) {
        const mapped = mapReviewRow(data);
        localStore.createReview(mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-review-changed', { detail: { action: 'create', review: mapped } }));
        }
        return mapped;
      }
      if (error) {
        console.error('Supabase SDK createReview error:', error.message, error.details);
      }

      const restRes = await supabaseRest<any[]>('reviews', {
        method: 'POST',
        headers: explicitHeaders,
        body: insertPayload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapReviewRow(restRes.data[0]);
        localStore.createReview(mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-review-changed', { detail: { action: 'create', review: mapped } }));
        }
        return mapped;
      }
    } catch (err) {
      console.warn('createReview remote error, falling back to localStore', err);
    }

    const fallbackId = (insertPayload as any).id || (id && !isTempId ? id : `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
    const saved = localStore.createReview({ ...rev, ...insertPayload, id: fallbackId } as Review);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-review-changed', { detail: { action: 'create', review: saved } }));
    }
    return saved;
  },

  async updateReview(id: string, rev: Partial<Review>): Promise<Review> {
    const rawPayload = reviewToRow(rev);
    const { id: _ignoredId, ...payload } = rawPayload;

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
    const explicitHeaders = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    try {
      const restUrl = `${SUPABASE_URL}/rest/v1/reviews?id=eq.${encodeURIComponent(id)}`;
      const response = await fetch(restUrl, {
        method: 'PATCH',
        headers: explicitHeaders,
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = await response.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          const mapped = mapReviewRow(row);
          localStore.updateReview(id, mapped);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tirth-review-changed', { detail: { action: 'update', review: mapped } }));
          }
          return mapped;
        }
      }
    } catch (fetchErr) {
      console.warn('Direct fetch updateReview error:', fetchErr);
    }

    try {
      const { data, error } = await supabase.from('reviews').update(payload).eq('id', id).select().maybeSingle();
      if (!error && data) {
        const mapped = mapReviewRow(data);
        localStore.updateReview(id, mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-review-changed', { detail: { action: 'update', review: mapped } }));
        }
        return mapped;
      }
      const restRes = await supabaseRest<any[]>('reviews', {
        method: 'PATCH',
        headers: explicitHeaders,
        params: { id: `eq.${id}` },
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) {
        const mapped = mapReviewRow(restRes.data[0]);
        localStore.updateReview(id, mapped);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tirth-review-changed', { detail: { action: 'update', review: mapped } }));
        }
        return mapped;
      }
    } catch (err) {
      console.warn('updateReview remote error, falling back to localStore', err);
    }
    const saved = localStore.updateReview(id, rev);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-review-changed', { detail: { action: 'update', review: saved } }));
    }
    return saved;
  },

  async toggleReviewFeatured(id: string): Promise<Review> {
    const list = await this.getReviews();
    const t = list.find((r) => r.id === id);
    return this.updateReview(id, { isFeatured: !t?.isFeatured });
  },

  async deleteReview(id: string): Promise<boolean> {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Prefer: 'return=representation',
        },
      });
    } catch {}
    try {
      await supabase.from('reviews').delete().eq('id', id);
    } catch {}
    localStore.deleteReview(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-review-changed', { detail: { action: 'delete', id } }));
    }
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

  // Transit Hubs (Extracted directly from embedded cities.transit_hubs - Zero 404 queries)
  async getHubs(cityId?: string): Promise<TransitHub[]> {
    try {
      const cities = await this.getCities();
      const allHubs: TransitHub[] = [];
      cities.forEach((c) => {
        if (Array.isArray(c.transitHubs)) {
          c.transitHubs.forEach((h) => {
            allHubs.push({
              ...h,
              cityId: h.cityId || c.id,
              cityName: h.cityName || c.name,
            });
          });
        }
      });

      if (allHubs.length > 0) {
        if (cityId) {
          const lower = cityId.toLowerCase().trim();
          return allHubs.filter((h) => (h.cityId || '').toLowerCase().trim() === lower);
        }
        return allHubs;
      }
    } catch (err) {
      console.warn('getHubs extraction error, using localStore:', err);
    }
    return localStore.getHubs(cityId);
  },

  async createHub(hub: Partial<TransitHub>): Promise<TransitHub> {
    const hubId = hub.id || `hub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newHub: TransitHub = {
      id: hubId,
      cityId: hub.cityId || 'ayodhya',
      cityName: hub.cityName || 'Ayodhya',
      name: hub.name || 'Transit Hub',
      hubType: hub.hubType || 'AIRPORT',
      code: hub.code || '',
      distanceToTempleKm: Number(hub.distanceToTempleKm ?? 10),
      isPrimary: Boolean(hub.isPrimary),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const cities = await this.getCities();
      const targetCity = cities.find(
        (c) => c.id.toLowerCase() === (newHub.cityId || '').toLowerCase()
      );
      if (targetCity) {
        newHub.cityName = targetCity.name;
        const existingHubs = Array.isArray(targetCity.transitHubs) ? targetCity.transitHubs : [];
        const updatedHubs = [newHub, ...existingHubs.filter((h) => h.id !== hubId)];
        await this.updateCity(targetCity.id, { transitHubs: updatedHubs });
      }
    } catch (err) {
      console.warn('createHub city update error, saving to localStore:', err);
    }

    localStore.createHub(newHub);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-hub-changed', { detail: newHub }));
    }
    return newHub;
  },

  async updateHub(id: string, hub: Partial<TransitHub>): Promise<TransitHub> {
    let updatedHub: TransitHub = { ...hub, id } as TransitHub;

    try {
      const cities = await this.getCities();
      for (const city of cities) {
        const hubs = Array.isArray(city.transitHubs) ? city.transitHubs : [];
        const idx = hubs.findIndex((h) => h.id === id);
        if (idx !== -1) {
          updatedHub = {
            ...hubs[idx],
            ...hub,
            id,
            updatedAt: new Date().toISOString(),
          };
          hubs[idx] = updatedHub;
          await this.updateCity(city.id, { transitHubs: [...hubs] });
          break;
        }
      }
    } catch (err) {
      console.warn('updateHub city update error, saving to localStore:', err);
    }

    localStore.updateHub(id, updatedHub);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-hub-changed', { detail: updatedHub }));
    }
    return updatedHub;
  },

  async saveHub(hub: Partial<TransitHub>): Promise<TransitHub> {
    if (hub.id) {
      const existing = (await this.getHubs()).find((h) => h.id === hub.id);
      if (existing) {
        return this.updateHub(hub.id, hub);
      }
    }
    return this.createHub(hub);
  },

  async deleteHub(id: string): Promise<boolean> {
    try {
      const cities = await this.getCities();
      for (const city of cities) {
        const hubs = Array.isArray(city.transitHubs) ? city.transitHubs : [];
        if (hubs.some((h) => h.id === id)) {
          const filtered = hubs.filter((h) => h.id !== id);
          await this.updateCity(city.id, { transitHubs: filtered });
          break;
        }
      }
    } catch (err) {
      console.warn('deleteHub city update error:', err);
    }

    localStore.deleteHub(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-hub-changed', { detail: { id } }));
    }
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
    const isTempId = story.id && (String(story.id).startsWith('story-') || String(story.id).startsWith('temp-'));
    const payload: Record<string, any> = {
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
    if (story.id && String(story.id).trim() !== '' && !isTempId) {
      payload.id = String(story.id).trim();
    }

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
    const explicitHeaders = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    try {
      const restUrl = `${SUPABASE_URL}/rest/v1/travel_stories`;
      const response = await fetch(restUrl, {
        method: 'POST',
        headers: explicitHeaders,
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = await response.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (row) return mapTravelStoryRow(row);
      }
    } catch {}

    try {
      const { data, error } = await supabase.from('travel_stories').insert([payload]).select().maybeSingle();
      if (!error && data) return mapTravelStoryRow(data);
      const restRes = await supabaseRest<any[]>('travel_stories', {
        method: 'POST',
        headers: explicitHeaders,
        body: payload,
      });
      if (restRes.data && restRes.data.length > 0) return mapTravelStoryRow(restRes.data[0]);
    } catch {}
    const fallbackId = payload.id || story.id || `story-${Date.now()}`;
    return { ...story, ...payload, id: fallbackId } as TravelStory;
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
    whatsapp_number: row.whatsapp_number || row.whatsappNumber || phone,
    metadata: row.metadata ? (typeof row.metadata === 'string' ? (() => { try { return JSON.parse(row.metadata); } catch { return row.metadata; } })() : row.metadata) : undefined,
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
    status: (row.status ? (row.status.toUpperCase() as any) : 'NEW'),
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

export function mapStaffRow(row: any): StaffMember {
  const isOnline = Boolean(row.is_online ?? row.isOnline ?? row.is_currently_logged_in ?? row.isCurrentlyLoggedIn);
  return {
    ...row,
    id: String(row.id),
    name: row.name || row.full_name || 'Staff Member',
    email: row.email || '',
    isBlocked: Boolean(row.is_blocked ?? row.isBlocked),
    blockedReason: row.blocked_reason ?? row.blockedReason,
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : (row.isActive !== undefined ? Boolean(row.isActive) : true),
    lastActiveAt: row.last_active_at || row.lastActiveAt || row.last_seen || row.lastSeen,
    lastLogin: row.last_login || row.lastLogin,
    lastSeen: row.last_seen || row.lastSeen || row.last_active_at || row.lastActiveAt,
    isOnline,
    isCurrentlyLoggedIn: isOnline,
    currentIp: row.current_ip || row.currentIp,
    currentDevice: row.current_device || row.currentDevice,
  };
}

export function mapCityRow(row: any): City {
  if (!row) return {} as City;

  let transitHubs: TransitHub[] = [];
  const rawHubs = row.transit_hubs ?? row.transitHubs ?? row.hubs;
  if (Array.isArray(rawHubs)) {
    transitHubs = rawHubs.map(mapHubRow);
  } else if (typeof rawHubs === 'string') {
    try {
      const parsed = JSON.parse(rawHubs);
      if (Array.isArray(parsed)) {
        transitHubs = parsed.map(mapHubRow);
      }
    } catch {}
  }

  return {
    id: String(row.id),
    name: row.name || 'Sacred Destination',
    state: row.state || 'India',
    imageUrl: row.image_url || row.imageUrl || 'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80',
    hotelCount: Number(row.hotel_count ?? row.hotelCount ?? 0),
    popularFor: row.popular_for || row.popularFor || 'Sacred Temple Darshan',
    transitHubs,
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
    audioUrl: row.audio_url || row.audioUrl || undefined,
    audioDuration: row.audio_duration !== undefined && row.audio_duration !== null
      ? Number(row.audio_duration)
      : (row.audioDuration !== undefined && row.audioDuration !== null ? Number(row.audioDuration) : undefined),
    audioTitle: row.audio_title || row.audioTitle || undefined,
    language: row.language || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
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
    let rawImgs = pkg.galleryImages ?? (pkg as any).gallery_images;
    if (typeof rawImgs === 'string') {
      try { rawImgs = JSON.parse(rawImgs); } catch { rawImgs = []; }
    }
    row.gallery_images = Array.isArray(rawImgs) ? rawImgs : [];
  }
  if (pkg.startingPrice !== undefined || (pkg as any).starting_price !== undefined) {
    row.starting_price = Number(pkg.startingPrice ?? (pkg as any).starting_price ?? 0);
  }
  if (pkg.overview !== undefined) row.overview = pkg.overview;
  if (pkg.highlights !== undefined) {
    let rawHls = pkg.highlights;
    if (typeof rawHls === 'string') {
      try { rawHls = JSON.parse(rawHls); } catch { rawHls = []; }
    }
    row.highlights = Array.isArray(rawHls) ? rawHls : [];
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
  if (pkg.transfers !== undefined) {
    let rawTrs = pkg.transfers;
    if (typeof rawTrs === 'string' && (rawTrs.trim().startsWith('{') || rawTrs.trim().startsWith('['))) {
      try { rawTrs = JSON.parse(rawTrs); } catch {}
    }
    row.transfers = rawTrs;
  }
  if (pkg.itinerary !== undefined) {
    let rawItin = pkg.itinerary;
    if (typeof rawItin === 'string') {
      try { rawItin = JSON.parse(rawItin); } catch { rawItin = []; }
    }
    row.itinerary = Array.isArray(rawItin) ? rawItin : [];
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
  if (city.transitHubs !== undefined || (city as any).transit_hubs !== undefined) {
    const raw = city.transitHubs ?? (city as any).transit_hubs;
    row.transit_hubs = Array.isArray(raw) ? raw : [];
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
  if (rev.audioUrl !== undefined || (rev as any).audio_url !== undefined) {
    row.audio_url = rev.audioUrl ?? (rev as any).audio_url;
  }
  if (rev.audioDuration !== undefined || (rev as any).audio_duration !== undefined) {
    row.audio_duration = Number(rev.audioDuration ?? (rev as any).audio_duration ?? 0);
  }
  if (rev.audioTitle !== undefined || (rev as any).audio_title !== undefined) {
    row.audio_title = rev.audioTitle ?? (rev as any).audio_title;
  }
  if (rev.language !== undefined) row.language = rev.language;
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