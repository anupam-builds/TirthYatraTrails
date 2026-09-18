import { City, Hotel, Package, Inquiry, User, AuthResponse, Review, StaffMember, InquiryNote, StaffActivityLog, StaffSessionMonitor, CompanionProfile, CompanionConnection, CompanionSearchFilters, TransitHub } from '../types.js';
import {
  INITIAL_CITIES,
  INITIAL_HOTELS,
  INITIAL_PACKAGES,
  INITIAL_INQUIRIES,
  INITIAL_REVIEWS,
  INITIAL_STAFF,
  INITIAL_STAFF_LOGS,
  INITIAL_COMPANIONS,
} from '../server/seedData.js';

const STORAGE_KEYS = {
  CITIES: 'tyt_local_cities',
  HUBS: 'tyt_local_hubs',
  HOTELS: 'tyt_local_hotels',
  PACKAGES: 'tyt_local_packages',
  INQUIRIES: 'tyt_local_inquiries',
  REVIEWS: 'tyt_local_reviews',
  USERS: 'tyt_local_users',
  STAFF: 'tyt_local_staff',
  STAFF_LOGS: 'tyt_local_staff_logs',
  COMPANIONS: 'tyt_local_companions',
  COMPANION_CONNS: 'tyt_local_companion_conns',
};

const INITIAL_HUBS: TransitHub[] = [
  { id: 'hub-ayj-air', cityId: 'ayodhya', cityName: 'Ayodhya', name: 'Maharishi Valmiki International Airport (AYJ)', hubType: 'AIRPORT', code: 'AYJ', distanceToTempleKm: 9.5, isPrimary: true },
  { id: 'hub-ayj-rail', cityId: 'ayodhya', cityName: 'Ayodhya', name: 'Ayodhya Dham Junction (AY)', hubType: 'RAILWAY_STATION', code: 'AY', distanceToTempleKm: 1.2, isPrimary: false },
  { id: 'hub-vns-air', cityId: 'varanasi', cityName: 'Varanasi', name: 'Lal Bahadur Shastri International Airport (VNS)', hubType: 'AIRPORT', code: 'VNS', distanceToTempleKm: 24.0, isPrimary: true },
  { id: 'hub-vns-rail', cityId: 'varanasi', cityName: 'Varanasi', name: 'Varanasi Cantt Station (BSB)', hubType: 'RAILWAY_STATION', code: 'BSB', distanceToTempleKm: 4.5, isPrimary: false },
  { id: 'hub-keda-heli', cityId: 'kedarnath', cityName: 'Kedarnath', name: 'Guptkashi & Phata Helipad Base', hubType: 'HELIPAD', code: 'GPK', distanceToTempleKm: 14.0, isPrimary: true },
  { id: 'hub-puri-rail', cityId: 'puri', cityName: 'Puri', name: 'Puri Railway Station (PURI)', hubType: 'RAILWAY_STATION', code: 'PURI', distanceToTempleKm: 2.1, isPrimary: true },
];

function getStored<T>(key: string, defaultVal: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return defaultVal;
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('Could not write to localStorage:', e);
  }
}

export const localStore = {
  // Stay / Hotel Count Calculation
  countHotelsForCity(city: City, hotels?: Hotel[]): number {
    if (!city) return 0;
    const hList = hotels || this.getHotels();
    const cId = (city.id || '').toLowerCase().trim();
    const cName = (city.name || '').toLowerCase().trim();
    return (hList || []).filter((h) => {
      const hCityId = (h.cityId || '').toLowerCase().trim();
      const hCityName = (h.cityName || '').toLowerCase().trim();
      if (hCityId && (hCityId === cId || hCityId === cId.replace('city-', '') || `city-${hCityId}` === cId)) {
        return true;
      }
      if (hCityName && (hCityName === cName || cName.includes(hCityName) || hCityName.includes(cName))) {
        return true;
      }
      const hAddr = (h.address || '').toLowerCase();
      if (hAddr && (hAddr.includes(cName) || (cName.includes('&') && cName.split('&').some((p) => hAddr.includes(p.trim()))))) {
        return true;
      }
      return false;
    }).length;
  },

  // Cities
  getCities(): City[] {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.CITIES) : null;
    let list: City[];
    if (raw === null) {
      setStored(STORAGE_KEYS.CITIES, INITIAL_CITIES);
      list = [...INITIAL_CITIES];
    } else {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [...INITIAL_CITIES];
      }
    }
    const hotels = this.getHotels();
    return list.map((c) => ({
      ...c,
      hotelCount: this.countHotelsForCity(c, hotels),
    }));
  },

  createCity(cityData: Partial<City>): City {
    const cities = this.getCities();
    const cleanName = (cityData.name || 'Sacred Destination').trim();
    const id = cityData.id || cleanName.toLowerCase().replace(/\s+/g, '-');

    // Prevent duplicate city entries
    const existingIndex = cities.findIndex(
      (c) =>
        c.name.toLowerCase().trim() === cleanName.toLowerCase() ||
        c.id.toLowerCase() === id.toLowerCase()
    );

    if (existingIndex !== -1) {
      const existing = cities[existingIndex];
      const merged: City = {
        ...existing,
        ...cityData,
        name: cleanName,
        id: existing.id,
      };
      cities[existingIndex] = merged;
      setStored(STORAGE_KEYS.CITIES, cities);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: { action: 'update', city: merged } }));
        window.dispatchEvent(new Event('tirth-hotel-changed'));
      }
      return merged;
    }

    const newCity: City = {
      id,
      name: cleanName,
      state: (cityData.state || 'India').trim(),
      hotelCount: Number(cityData.hotelCount) || 0,
      imageUrl: cityData.imageUrl || 'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80',
      popularFor: (cityData.popularFor || 'Sacred Pilgrimage & Aarti').trim(),
    };
    cities.push(newCity);
    setStored(STORAGE_KEYS.CITIES, cities);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: { action: 'create', city: newCity } }));
      window.dispatchEvent(new Event('tirth-hotel-changed'));
    }

    return newCity;
  },

  updateCity(id: string, updates: Partial<City>): City {
    const cities = this.getCities();
    const idx = cities.findIndex((c) => c.id === id || c.name.toLowerCase() === id.toLowerCase());
    if (idx === -1) throw new Error('City not found');
    cities[idx] = { ...cities[idx], ...updates };
    setStored(STORAGE_KEYS.CITIES, cities);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: { action: 'update', city: cities[idx] } }));
      window.dispatchEvent(new Event('tirth-hotel-changed'));
    }

    return cities[idx];
  },

  deleteCity(idOrName: string): boolean {
    if (!idOrName) return true;
    const raw = String(idOrName).trim();
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {}
    const target = decoded.toLowerCase();

    const cities = this.getCities().filter((c) => {
      const cId = (c.id || '').toLowerCase();
      const cName = (c.name || '').toLowerCase();
      const matches =
        cId === target ||
        cName === target ||
        cId === `city-${target}` ||
        `city-${cId}` === target ||
        target.includes(cId) ||
        (target.length > 3 && cName.includes(target)) ||
        (cName.length > 3 && target.includes(cName));
      return !matches;
    });
    setStored(STORAGE_KEYS.CITIES, cities);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: { action: 'delete', target } }));
      window.dispatchEvent(new Event('tirth-hotel-changed'));
    }

    return true;
  },

  // Hotels
  getHotels(cityId?: string, query?: string): Hotel[] {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.HOTELS) : null;
    let list: Hotel[];
    if (raw === null) {
      setStored(STORAGE_KEYS.HOTELS, INITIAL_HOTELS);
      list = [...INITIAL_HOTELS];
    } else {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [...INITIAL_HOTELS];
      }
    }
    if (cityId) {
      const cLower = cityId.toLowerCase().trim();
      list = list.filter((h) =>
        (h.cityId && h.cityId.toLowerCase() === cLower) ||
        (h.cityName && h.cityName.toLowerCase() === cLower) ||
        (h.cityName && h.cityName.toLowerCase().includes(cLower)) ||
        (cLower.includes(h.cityName?.toLowerCase() || ''))
      );
    }
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q) ||
          (h.cityName && h.cityName.toLowerCase().includes(q)) ||
          h.description.toLowerCase().includes(q)
      );
    }
    return list;
  },

  getHotelById(id: string): Hotel | null {
    const hotels = this.getHotels();
    return hotels.find((h) => h.id === id) || null;
  },

  createHotel(hotelData: Partial<Hotel>): Hotel {
    const hotels = this.getHotels();
    const newHotel: Hotel = {
      id: hotelData.id || `htl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: hotelData.name || 'Sacred Hotel',
      cityId: hotelData.cityId || 'city-varanasi',
      cityName: hotelData.cityName || 'Varanasi',
      starRating: Number(hotelData.starRating) || 4,
      googleRating: Number(hotelData.googleRating) || 4.8,
      reviewCount: Number(hotelData.reviewCount) || 50,
      address: hotelData.address || '',
      description: hotelData.description || '',
      images: hotelData.images || ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'],
      amenities: hotelData.amenities || ['Free Wi-Fi', 'Pure Vegetarian Dining'],
      basePrice: Number(hotelData.basePrice) || 3500,
      isTopRated: Boolean(hotelData.isTopRated),
      rooms: hotelData.rooms || [],
      distanceToTemple: hotelData.distanceToTemple || '',
      darshanType: hotelData.darshanType || '',
    };
    hotels.unshift(newHotel);
    setStored(STORAGE_KEYS.HOTELS, hotels);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-hotel-changed', { detail: { action: 'create', hotel: newHotel } }));
    }
    return newHotel;
  },

  updateHotel(id: string, updates: Partial<Hotel>): Hotel {
    const hotels = this.getHotels();
    const idx = hotels.findIndex((h) => h.id === id);
    if (idx === -1) throw new Error('Hotel not found');
    hotels[idx] = { ...hotels[idx], ...updates };
    setStored(STORAGE_KEYS.HOTELS, hotels);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-hotel-changed', { detail: { action: 'update', hotel: hotels[idx] } }));
    }
    return hotels[idx];
  },

  deleteHotel(idOrName: string): boolean {
    if (!idOrName) return true;
    const raw = String(idOrName).trim();
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {}
    const target = decoded.toLowerCase();

    const hotels = this.getHotels().filter((h) => {
      const hId = (h.id || '').toLowerCase();
      const hName = (h.name || '').toLowerCase();
      const matches =
        hId === target ||
        hName === target ||
        hId === `htl-${target}` ||
        `htl-${hId}` === target ||
        target.includes(hId) ||
        (target.length > 4 && hName.includes(target)) ||
        (hName.length > 4 && target.includes(hName));
      return !matches;
    });
    setStored(STORAGE_KEYS.HOTELS, hotels);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-hotel-changed', { detail: { action: 'delete', target } }));
    }
    return true;
  },

  // Packages
  getPackages(category?: string, query?: string): Package[] {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.PACKAGES) : null;
    let list: Package[];
    if (raw === null) {
      setStored(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
      list = [...INITIAL_PACKAGES];
    } else {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [...INITIAL_PACKAGES];
      }
    }
    if (category && category !== 'All') {
      list = list.filter(
        (p) =>
          p.category.toLowerCase().includes(category.toLowerCase()) ||
          (p.title && p.title.toLowerCase().includes(category.toLowerCase()))
      );
    }
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.overview.toLowerCase().includes(q)
      );
    }
    return list;
  },

  getPackageById(id: string): Package | null {
    const packages = this.getPackages();
    return packages.find((p) => p.id === id) || null;
  },

  createPackage(pkgData: Partial<Package>): Package {
    const packages = this.getPackages();
    const newPkg: Package = {
      id: pkgData.id || `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: pkgData.title || 'Sacred Pilgrimage Yatra',
      location: pkgData.location || 'Sacred Dhams',
      duration: pkgData.duration || '3 Nights 4 Days',
      bookedRank: pkgData.bookedRank || 'Popular Yatra',
      imageUrl: pkgData.imageUrl || 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80',
      galleryImages: pkgData.galleryImages || [],
      startingPrice: Number(pkgData.startingPrice) || 25000,
      overview: pkgData.overview || '',
      highlights: pkgData.highlights || [],
      cancellationPolicy: pkgData.cancellationPolicy || 'Standard cancellation policy applies.',
      category: pkgData.category || 'Pilgrimage',
      packageType: pkgData.packageType || 'All-Inclusive Guided Yatra',
      experienceLevel: pkgData.experienceLevel || 'Comfortable • Senior Friendly',
      hotelsLevel: pkgData.hotelsLevel || '3 & 4 Star Deluxe Stays',
      transfers: pkgData.transfers || 'Private AC Coach',
      itinerary: pkgData.itinerary || [],
    };
    packages.unshift(newPkg);
    setStored(STORAGE_KEYS.PACKAGES, packages);
    return newPkg;
  },

  updatePackage(id: string, updates: Partial<Package>): Package {
    const packages = this.getPackages();
    const idx = packages.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Package not found');
    packages[idx] = { ...packages[idx], ...updates };
    setStored(STORAGE_KEYS.PACKAGES, packages);
    return packages[idx];
  },

  deletePackage(idOrTitle: string): boolean {
    if (!idOrTitle) return true;
    const raw = String(idOrTitle).trim();
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {}
    const target = decoded.toLowerCase();

    const packages = this.getPackages().filter((p) => {
      const pId = (p.id || '').toLowerCase();
      const pTitle = (p.title || '').toLowerCase();
      const matches =
        pId === target ||
        pTitle === target ||
        pId === `pkg-${target}` ||
        `pkg-${pId}` === target ||
        target.includes(pId) ||
        (target.length > 4 && pTitle.includes(target)) ||
        (pTitle.length > 4 && target.includes(pTitle));
      return !matches;
    });
    setStored(STORAGE_KEYS.PACKAGES, packages);
    return true;
  },

  // Inquiries
  getInquiries(userId?: string, includeDeleted = false): Inquiry[] {
    let list = getStored<Inquiry[]>(STORAGE_KEYS.INQUIRIES, []);
    if (list.length === 0) {
      list = [...INITIAL_INQUIRIES];
      setStored(STORAGE_KEYS.INQUIRIES, list);
    }

    const rawStaff = getStored<StaffMember[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const defaultStaff = rawStaff[0] || INITIAL_STAFF[0];

    // Ensure all inquiries have a TTT leadId and assigned staff
    let modified = false;
    list.forEach((inq, idx) => {
      if (inq.leadId && inq.leadId.startsWith('TTX')) {
        inq.leadId = inq.leadId.replace(/^TTX/, 'TTT');
        modified = true;
      } else if (!inq.leadId) {
        const num = (idx + 1).toString().padStart(8, '0');
        inq.leadId = `TTT${num}`;
        modified = true;
      }

      if (!inq.assignedStaffId && defaultStaff) {
        inq.assignedStaffId = defaultStaff.id;
        inq.assignedStaffName = defaultStaff.name;
        modified = true;
      }
    });
    if (modified) {
      setStored(STORAGE_KEYS.INQUIRIES, list);
    }

    if (!includeDeleted) {
      list = list.filter((i) => !i.isDeleted);
    }

    list = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (userId) {
      list = list.filter((i) => i.userId === userId);
    }
    return list;
  },

  getDeletedInquiries(): Inquiry[] {
    const list = getStored<Inquiry[]>(STORAGE_KEYS.INQUIRIES, []);
    return list
      .filter((i) => i.isDeleted === true)
      .sort(
        (a, b) =>
          new Date(b.deletedAt || b.createdAt).getTime() -
          new Date(a.deletedAt || a.createdAt).getTime()
      );
  },

  submitInquiry(inquiryData: Partial<Inquiry>): Inquiry {
    const inquiries = getStored<Inquiry[]>(STORAGE_KEYS.INQUIRIES, []);
    const fullName = inquiryData.fullName || inquiryData.customerName || 'Devotee';
    const email = inquiryData.email || inquiryData.customerEmail || '';
    const phone = inquiryData.whatsappNumber || inquiryData.customerPhone || '';
    const title = inquiryData.referenceName || inquiryData.title || 'Divine Yatra Stay';

    const existingNums = inquiries
      .map((i) => {
        if (i.leadId) {
          const cleaned = i.leadId.replace(/^(TTT|TTX)/, '');
          const num = parseInt(cleaned, 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter((n) => n > 0);
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    const nextLeadId = inquiryData.leadId || `TTT${(maxNum + 1).toString().padStart(8, '0')}`;

    const rawStaff = getStored<StaffMember[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const defaultStaff = rawStaff[0] || INITIAL_STAFF[0];
    const assignedStaffId = inquiryData.assignedStaffId || defaultStaff?.id || 'stf-1';
    const assignedStaffName = inquiryData.assignedStaffName || defaultStaff?.name || 'Priya Sharma';

    const newInquiry: Inquiry = {
      id: `inq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      leadId: nextLeadId,
      userId: inquiryData.userId,
      type: inquiryData.type || 'HOTEL',
      referenceId: inquiryData.referenceId || '',
      referenceName: inquiryData.referenceName || title,
      title: title,
      fullName: fullName,
      customerName: fullName,
      email: email,
      customerEmail: email,
      whatsappNumber: phone,
      customerPhone: phone,
      userCity: inquiryData.userCity || 'New Delhi',
      checkInDate: inquiryData.checkInDate || '',
      guests: Number(inquiryData.guests) || 2,
      adults: Number(inquiryData.adults) || 2,
      children: Number(inquiryData.children) || 0,
      childAges: inquiryData.childAges ? String(inquiryData.childAges) : undefined,
      planChosen: inquiryData.planChosen || inquiryData.selectedPlan || '',
      selectedPlan: inquiryData.selectedPlan || inquiryData.planChosen || '',
      accommodationTier: inquiryData.accommodationTier || '3 Star Hotel',
      pickupLocation: inquiryData.pickupLocation || '',
      dropoffLocation: inquiryData.dropoffLocation || '',
      specialRequests: inquiryData.specialRequests || '',
      status: inquiryData.status || 'NEW',
      isResolved: false,
      assignedStaffId,
      assignedStaffName,
      tags: inquiryData.tags || (inquiryData.type === 'PACKAGE' ? ['Package Tour'] : ['Hotel Stay']),
      tourDuration: inquiryData.tourDuration,
      customerRating: inquiryData.customerRating || 5,
      createdAt: new Date().toISOString(),
    };
    inquiries.unshift(newInquiry);
    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return newInquiry;
  },

  updateInquiry(id: string, updates: Partial<Inquiry>): Inquiry {
    const inquiries = this.getInquiries();
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inquiry not found');

    const current = inquiries[idx];
    const newStatus = updates.status || current.status;
    const isResolved = newStatus === 'CONFIRMED' || newStatus === 'WON' || newStatus === 'CLOSED';

    const rawLeadId = current.leadId || updates.leadId || `TTT${(idx + 1).toString().padStart(8, '0')}`;
    const cleanLeadId = rawLeadId.startsWith('TTX') ? rawLeadId.replace(/^TTX/, 'TTT') : rawLeadId;

    const merged: Inquiry = {
      ...current,
      ...updates,
      id: current.id,
      leadId: cleanLeadId,
      status: newStatus,
      isResolved,
      updatedAt: new Date().toISOString(),
    };

    if (newStatus === 'CLOSED') {
      merged.isLockedForStaff = true;
      if (!merged.closedAt) merged.closedAt = new Date().toISOString();
    } else {
      merged.isLockedForStaff = false;
      merged.closedAt = undefined;
      merged.closedBy = undefined;
    }

    inquiries[idx] = merged;
    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return merged;
  },

  updateInquiryStatus(id: string, status: Inquiry['status']): Inquiry {
    const inquiries = this.getInquiries();
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inquiry not found');
    inquiries[idx].status = status;
    inquiries[idx].isResolved = status === 'CONFIRMED' || status === 'WON' || status === 'CLOSED';
    if (status !== 'CLOSED') {
      inquiries[idx].isLockedForStaff = false;
      inquiries[idx].closedAt = undefined;
      inquiries[idx].closedBy = undefined;
    } else {
      inquiries[idx].isLockedForStaff = true;
      inquiries[idx].closedAt = new Date().toISOString();
    }
    inquiries[idx].updatedAt = new Date().toISOString();
    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return inquiries[idx];
  },

  updateInquiryStatusByStaff(
    id: string,
    status: Inquiry['status'],
    staff: { id: string; name: string }
  ): Inquiry {
    const inquiries = this.getInquiries();
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inquiry not found');

    const inq = inquiries[idx];
    if (inq.isLockedForStaff && inq.status === 'CLOSED') {
      throw new Error('This inquiry is permanently locked. Only an Administrator can reopen closed leads.');
    }

    if (status !== 'NEW' && status !== 'CONTACTED' && status !== 'CLOSED') {
      throw new Error('Staff members can only set status to NEW, CONTACTED, or CLOSED.');
    }

    inquiries[idx].status = status;
    inquiries[idx].updatedAt = new Date().toISOString();

    if (status === 'CLOSED') {
      inquiries[idx].isResolved = true;
      inquiries[idx].isLockedForStaff = true;
      inquiries[idx].closedAt = new Date().toISOString();
      inquiries[idx].closedBy = `${staff.name} (Staff)`;
    } else {
      inquiries[idx].isResolved = false;
      inquiries[idx].isLockedForStaff = false;
    }

    if (!inquiries[idx].assignedStaffId) {
      inquiries[idx].assignedStaffId = staff.id;
      inquiries[idx].assignedStaffName = staff.name;
    }

    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return inquiries[idx];
  },

  adminUnlockInquiry(id: string, newStatus: Inquiry['status'] = 'CONTACTED'): Inquiry {
    const inquiries = this.getInquiries();
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inquiry not found');

    inquiries[idx].status = newStatus;
    inquiries[idx].isLockedForStaff = false;
    inquiries[idx].isResolved = newStatus === 'CONFIRMED' || newStatus === 'CLOSED';
    inquiries[idx].closedAt = undefined;
    inquiries[idx].closedBy = undefined;

    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return inquiries[idx];
  },

  addInquiryNote(
    id: string,
    noteData: { text: string; authorName: string; authorRole: 'ADMIN' | 'STAFF'; authorId?: string }
  ): Inquiry {
    const inquiries = this.getInquiries();
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inquiry not found');

    const newNote: InquiryNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      authorId: noteData.authorId,
      authorName: noteData.authorName,
      authorRole: noteData.authorRole,
      text: noteData.text.trim(),
      createdAt: new Date().toISOString(),
    };

    if (!inquiries[idx].followUpNotes) {
      inquiries[idx].followUpNotes = [];
    }
    inquiries[idx].followUpNotes.unshift(newNote);
    inquiries[idx].notes = newNote.text;

    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return inquiries[idx];
  },

  assignInquiryStaff(id: string, staffId: string, staffName: string): Inquiry {
    const inquiries = this.getInquiries();
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inquiry not found');

    inquiries[idx].assignedStaffId = staffId || undefined;
    inquiries[idx].assignedStaffName = staffName || undefined;

    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return inquiries[idx];
  },

  toggleInquiryStatus(id: string): Inquiry {
    const inquiries = this.getInquiries();
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inquiry not found');
    inquiries[idx].isResolved = !inquiries[idx].isResolved;
    inquiries[idx].status = inquiries[idx].isResolved ? 'CONFIRMED' : 'NEW';
    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return inquiries[idx];
  },

  deleteInquiry(id: string): boolean {
    const inquiries = getStored<Inquiry[]>(STORAGE_KEYS.INQUIRIES, []);
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx !== -1) {
      inquiries[idx].isDeleted = true;
      inquiries[idx].deletedAt = new Date().toISOString();
      inquiries[idx].deletedBy = 'Administrator';
      setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    }
    return true;
  },

  restoreInquiry(id: string, staffId?: string, staffName?: string): Inquiry {
    const inquiries = getStored<Inquiry[]>(STORAGE_KEYS.INQUIRIES, []);
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inquiry not found');

    const inq = inquiries[idx];
    inq.isDeleted = false;
    inq.deletedAt = undefined;
    inq.deletedBy = undefined;
    if (staffId) {
      inq.assignedStaffId = staffId;
      const rawStaff = getStored<StaffMember[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
      inq.assignedStaffName = staffName || (rawStaff.find((s) => s.id === staffId)?.name || 'Staff');
    }
    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return inq;
  },

  permanentlyDeleteInquiry(id: string): boolean {
    const inquiries = getStored<Inquiry[]>(STORAGE_KEYS.INQUIRIES, []).filter((i) => i.id !== id);
    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return true;
  },

  emptyTrash(): boolean {
    const inquiries = getStored<Inquiry[]>(STORAGE_KEYS.INQUIRIES, []).filter((i) => !i.isDeleted);
    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return true;
  },

  // Reviews
  getReviews(featuredOnly = false): Review[] {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.REVIEWS) : null;
    let list: Review[];
    if (raw === null) {
      setStored(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
      list = [...INITIAL_REVIEWS];
    } else {
      try {
        list = JSON.parse(raw);
        // Ensure any seed reviews missing audio are updated
        list.forEach((r) => {
          if (!r.audioUrl) {
            const seedMatch = INITIAL_REVIEWS.find((sr) => sr.id === r.id);
            if (seedMatch && seedMatch.audioUrl) {
              r.audioUrl = seedMatch.audioUrl;
              r.audioDuration = seedMatch.audioDuration;
              r.audioTitle = seedMatch.audioTitle;
              r.language = seedMatch.language;
            }
          }
        });
      } catch {
        list = [...INITIAL_REVIEWS];
      }
    }
    if (featuredOnly) {
      list = list.filter((r) => r.isFeatured);
    }
    return list.sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  createReview(reviewData: Partial<Review>): Review {
    const reviews = this.getReviews();
    const authorName = reviewData.authorName || 'Devotee';
    const computedInitials =
      reviewData.authorInitials ||
      authorName.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() ||
      'TT';

    const newReview: Review = {
      id: reviewData.id || `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      authorName,
      authorLocation: reviewData.authorLocation || 'Sacred Dham',
      authorInitials: computedInitials,
      rating: Number(reviewData.rating) || 5.0,
      reviewText: reviewData.reviewText || '',
      destinationImage:
        reviewData.destinationImage ||
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
      isVerified: reviewData.isVerified !== undefined ? Boolean(reviewData.isVerified) : true,
      googleReviewUrl: reviewData.googleReviewUrl || undefined,
      isFeatured: reviewData.isFeatured !== undefined ? Boolean(reviewData.isFeatured) : true,
      order: Number(reviewData.order) || reviews.length + 1,
      audioUrl: reviewData.audioUrl || undefined,
      audioDuration: reviewData.audioDuration ? Number(reviewData.audioDuration) : undefined,
      audioTitle: reviewData.audioTitle || undefined,
      language: reviewData.language || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    reviews.unshift(newReview);
    setStored(STORAGE_KEYS.REVIEWS, reviews);
    return newReview;
  },

  updateReview(id: string, updateData: Partial<Review>): Review {
    const reviews = this.getReviews();
    const idx = reviews.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Review not found');
    const existing = reviews[idx];
    const authorName = updateData.authorName !== undefined ? updateData.authorName : existing.authorName;
    const computedInitials =
      updateData.authorInitials !== undefined && updateData.authorInitials.trim()
        ? updateData.authorInitials.trim()
        : authorName.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'TT';

    reviews[idx] = {
      ...existing,
      ...updateData,
      authorName,
      authorInitials: computedInitials,
      rating: updateData.rating !== undefined ? Number(updateData.rating) : existing.rating,
      order: updateData.order !== undefined ? Number(updateData.order) : existing.order,
      isVerified: updateData.isVerified !== undefined ? Boolean(updateData.isVerified) : existing.isVerified,
      isFeatured: updateData.isFeatured !== undefined ? Boolean(updateData.isFeatured) : existing.isFeatured,
      audioUrl: updateData.audioUrl !== undefined ? updateData.audioUrl : existing.audioUrl,
      audioDuration: updateData.audioDuration !== undefined ? (updateData.audioDuration ? Number(updateData.audioDuration) : undefined) : existing.audioDuration,
      audioTitle: updateData.audioTitle !== undefined ? updateData.audioTitle : existing.audioTitle,
      language: updateData.language !== undefined ? updateData.language : existing.language,
      updatedAt: new Date().toISOString(),
    };
    setStored(STORAGE_KEYS.REVIEWS, reviews);
    return reviews[idx];
  },

  toggleReviewFeatured(id: string): Review {
    const reviews = this.getReviews();
    const idx = reviews.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Review not found');
    reviews[idx].isFeatured = !reviews[idx].isFeatured;
    reviews[idx].updatedAt = new Date().toISOString();
    setStored(STORAGE_KEYS.REVIEWS, reviews);
    return reviews[idx];
  },

  deleteReview(idOrName: string): boolean {
    if (!idOrName) return true;
    const raw = String(idOrName).trim();
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {}
    const target = decoded.toLowerCase();

    const reviews = this.getReviews().filter((r) => {
      const rId = (r.id || '').toLowerCase();
      const rName = (r.authorName || '').toLowerCase();
      const matches =
        rId === target ||
        rName === target ||
        rId === `rev-${target}` ||
        `rev-${rId}` === target ||
        target.includes(rId) ||
        (target.length > 4 && rName.includes(target)) ||
        (rName.length > 4 && target.includes(rName));
      return !matches;
    });
    setStored(STORAGE_KEYS.REVIEWS, reviews);
    return true;
  },

  // Auth / Users
  login(email: string, pass: string, portal: 'customer' | 'admin'): AuthResponse {
    const normEmail = email.trim().toLowerCase();
    
    // Check built-in admin credentials
    if (
      portal === 'admin' &&
      (normEmail === 'admin@tirthyatratrails.com' || normEmail === 'admin@tirthyatra.com') &&
      pass === 'Admin@123'
    ) {
      const adminUser: User = {
        id: 'usr-admin-1',
        name: 'Enterprise Yatra Admin',
        email: 'admin@tirthyatratrails.com',
        role: 'ADMIN',
        createdAt: '2026-01-10T08:00:00.000Z',
      };
      const token = btoa(JSON.stringify(adminUser));
      return { user: adminUser, token };
    }

    // Check demo customer credentials
    if (normEmail === 'rohan.sharma@example.com' && pass === 'User@123') {
      const demoUser: User = {
        id: 'usr-demo-1',
        name: 'Rohan Sharma',
        email: 'rohan.sharma@example.com',
        role: 'USER',
        createdAt: '2026-02-15T10:30:00.000Z',
      };
      const token = btoa(JSON.stringify(demoUser));
      return { user: demoUser, token };
    }

    // Check locally registered users
    const users = getStored<(User & { password?: string })[]>(STORAGE_KEYS.USERS, []);
    const found = users.find((u) => u.email.toLowerCase() === normEmail);
    if (found) {
      if (found.password && found.password !== pass) {
        throw new Error('Invalid email or password.');
      }
      if (portal === 'admin' && found.role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required.');
      }
      const { password, ...safeUser } = found;
      const token = btoa(JSON.stringify(safeUser));
      return { user: safeUser, token };
    }

    throw new Error('Invalid email or password.');
  },

  register(name: string, email: string, pass: string, phone?: string): AuthResponse {
    const normEmail = email.trim().toLowerCase();
    const users = getStored<(User & { password?: string })[]>(STORAGE_KEYS.USERS, []);
    if (users.some((u) => u.email.toLowerCase() === normEmail)) {
      throw new Error('An account with this email address already exists.');
    }
    const newUser: User & { password?: string } = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      email: normEmail,
      phone: phone || '',
      password: pass,
      role: 'USER',
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    setStored(STORAGE_KEYS.USERS, users);
    const { password, ...safeUser } = newUser;
    const token = btoa(JSON.stringify(safeUser));
    return { user: safeUser, token };
  },

  // Staff Members Management
  getStaffMembers(): StaffMember[] {
    const isCustomized = typeof window !== 'undefined' && localStorage.getItem('tyt_staff_customized');
    let list = getStored<StaffMember[]>(STORAGE_KEYS.STAFF, []);
    if (list.length === 0 && !isCustomized) {
      list = [...INITIAL_STAFF];
      setStored(STORAGE_KEYS.STAFF, list);
    }
    // Compute current assigned leads count dynamically without recursive getInquiries()
    const inquiries = getStored<Inquiry[]>(STORAGE_KEYS.INQUIRIES, INITIAL_INQUIRIES);
    return list.map((staff) => {
      const assignedCount = inquiries.filter((inq) => inq.assignedStaffId === staff.id).length;
      const contactedCount = inquiries.filter(
        (inq) => (inq.assignedStaffId === staff.id || inq.closedBy?.includes(staff.name)) && inq.status === 'CONTACTED'
      ).length;
      const closedCount = inquiries.filter(
        (inq) => (inq.assignedStaffId === staff.id || inq.closedBy?.includes(staff.name)) && inq.status === 'CLOSED'
      ).length;
      const notesCount = inquiries.reduce((count, inq) => {
        const matching = (inq.followUpNotes || []).filter(
          (n) => n.authorId === staff.id || n.authorName === staff.name
        );
        return count + matching.length;
      }, 0);

      return {
        ...staff,
        assignedLeadsCount: assignedCount,
        contactedCount: Math.max(staff.contactedCount || 0, contactedCount),
        closedCount: Math.max(staff.closedCount || 0, closedCount),
        notesCount: Math.max(staff.notesCount || 0, notesCount),
        isBlocked: Boolean(staff.isBlocked),
        isCurrentlyLoggedIn: Boolean(staff.isCurrentlyLoggedIn && !staff.isBlocked),
      };
    });
  },

  createStaffMember(staffData: Partial<StaffMember>): StaffMember {
    const list = this.getStaffMembers();
    const email = (staffData.email || '').trim().toLowerCase();
    if (!email) throw new Error('Staff Email ID is required.');
    if (list.some((s) => s.email.toLowerCase() === email)) {
      throw new Error('A staff member with this Email ID already exists.');
    }
    if (!staffData.password || staffData.password.trim().length < 6) {
      throw new Error('Staff Password is required (minimum 6 characters).');
    }

    const newStaff: StaffMember = {
      id: `stf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: (staffData.name || 'Travel Specialist').trim(),
      email: email,
      password: staffData.password.trim(),
      phone: (staffData.phone || '').trim(),
      designation: (staffData.designation || 'Pilgrim Operations Specialist').trim(),
      role: 'STAFF',
      isActive: staffData.isActive !== undefined ? Boolean(staffData.isActive) : true,
      isBlocked: false,
      permissions: {
        canViewInquiries: staffData.permissions?.canViewInquiries !== undefined ? staffData.permissions.canViewInquiries : true,
        canUpdateStatus: staffData.permissions?.canUpdateStatus !== undefined ? staffData.permissions.canUpdateStatus : true,
        canAddNotes: staffData.permissions?.canAddNotes !== undefined ? staffData.permissions.canAddNotes : true,
      },
      assignedLeadsCount: 0,
      contactedCount: 0,
      closedCount: 0,
      notesCount: 0,
      isCurrentlyLoggedIn: false,
      createdAt: new Date().toISOString(),
    };

    list.unshift(newStaff);
    setStored(STORAGE_KEYS.STAFF, list);

    this.addStaffLog({
      staffId: newStaff.id,
      staffName: newStaff.name,
      staffEmail: newStaff.email,
      action: 'LOGIN',
      description: `Staff account provisioned by Administrator: ${newStaff.name} (${newStaff.email})`,
      details: `Designation: ${newStaff.designation}`,
      ipAddress: '127.0.0.1',
      device: 'Admin Console',
    });

    return newStaff;
  },

  updateStaffMember(id: string, updates: Partial<StaffMember>): StaffMember {
    const list = this.getStaffMembers();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Staff member not found');

    const prevStaff = list[idx];
    const passwordChanged = Boolean(updates.password && updates.password.trim() !== prevStaff.password);

    const updated = {
      ...list[idx],
      ...updates,
      permissions: {
        ...list[idx].permissions,
        ...(updates.permissions || {}),
      },
    };

    list[idx] = updated;
    setStored(STORAGE_KEYS.STAFF, list);

    if (passwordChanged) {
      this.addStaffLog({
        staffId: prevStaff.id,
        staffName: prevStaff.name,
        staffEmail: prevStaff.email,
        action: 'PASSWORD_RESET',
        description: `Staff password updated by Administrator`,
      });
    }

    return updated;
  },

  blockStaffMember(id: string, isBlocked: boolean, reason?: string): StaffMember {
    const list = this.getStaffMembers();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Staff member not found');

    const staff = list[idx];
    staff.isBlocked = isBlocked;

    if (isBlocked) {
      staff.isActive = false;
      staff.isCurrentlyLoggedIn = false; // Immediately invalidate active session
      staff.blockedAt = new Date().toISOString();
      staff.blockedReason = reason || 'Revoked by Administrator due to security or policy guidelines';
    } else {
      staff.isActive = true;
      staff.blockedAt = undefined;
      staff.blockedReason = undefined;
    }

    list[idx] = staff;
    setStored(STORAGE_KEYS.STAFF, list);

    this.addStaffLog({
      staffId: staff.id,
      staffName: staff.name,
      staffEmail: staff.email,
      action: isBlocked ? 'BLOCKED' : 'UNBLOCKED',
      description: isBlocked
        ? `Administrator revoked access and terminated all active sessions. Reason: ${staff.blockedReason}`
        : `Administrator restored access and unblocked staff account`,
      details: reason,
      ipAddress: '127.0.0.1',
      device: 'Admin Console',
    });

    return staff;
  },

  toggleStaffStatus(id: string): StaffMember {
    const list = this.getStaffMembers();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Staff member not found');

    const currentActive = Boolean(list[idx].isActive && !list[idx].isBlocked);
    return this.blockStaffMember(id, currentActive, currentActive ? 'Status toggled to Inactive by Admin' : undefined);
  },

  deleteStaffMember(id: string): boolean {
    const target = id.trim().toLowerCase();
    const list = this.getStaffMembers().filter(
      (s) => s.id !== id && s.email.toLowerCase() !== target
    );
    setStored(STORAGE_KEYS.STAFF, list);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tyt_staff_customized', 'true');
    }
    return true;
  },

  loginStaff(email: string, pass: string): { user: StaffMember; token: string } {
    const normEmail = email.trim().toLowerCase();
    const list = this.getStaffMembers();
    const staff = list.find((s) => s.email.toLowerCase() === normEmail);

    if (!staff) {
      throw new Error('No staff account found with this email. Self-registration is disabled. Please request an administrator to create your staff account.');
    }

    if (staff.password && staff.password !== pass) {
      throw new Error('Invalid staff credentials. Please check your email and password.');
    }

    if (staff.isBlocked || !staff.isActive) {
      this.addStaffLog({
        staffId: staff.id,
        staffName: staff.name,
        staffEmail: staff.email,
        action: 'LOGIN',
        description: `BLOCKED LOGIN ATTEMPT: Access denied due to admin block (${staff.blockedReason || 'Revoked'})`,
        ipAddress: '122.161.48.12',
        device: 'Staff Web Client',
      });
      throw new Error(`Access Blocked: Your staff account has been revoked by the administrator. Reason: ${staff.blockedReason || 'Access Revoked'}. All active sessions terminated.`);
    }

    // Update lastLogin & session metadata
    staff.lastLogin = new Date().toISOString();
    staff.lastActiveAt = new Date().toISOString();
    staff.isCurrentlyLoggedIn = true;
    staff.lastLoginIp = '122.161.48.12';
    staff.lastLoginDevice = 'Chrome on Desktop';
    setStored(STORAGE_KEYS.STAFF, list);

    this.addStaffLog({
      staffId: staff.id,
      staffName: staff.name,
      staffEmail: staff.email,
      action: 'LOGIN',
      description: 'Staff member authenticated successfully into Operations Desk',
      ipAddress: staff.lastLoginIp,
      device: staff.lastLoginDevice,
    });

    const safeStaff = { ...staff };
    delete safeStaff.password;
    const token = btoa(JSON.stringify(safeStaff));
    return { user: safeStaff, token };
  },

  logoutStaff(staffId: string): void {
    const list = this.getStaffMembers();
    const idx = list.findIndex((s) => s.id === staffId);
    if (idx !== -1) {
      list[idx].isCurrentlyLoggedIn = false;
      list[idx].lastActiveAt = new Date().toISOString();
      setStored(STORAGE_KEYS.STAFF, list);

      this.addStaffLog({
        staffId,
        staffName: list[idx].name,
        staffEmail: list[idx].email,
        action: 'LOGOUT',
        description: 'Staff member logged out from session',
        ipAddress: list[idx].lastLoginIp,
        device: list[idx].lastLoginDevice,
      });
    }
  },

  addStaffLog(logData: Omit<StaffActivityLog, 'id' | 'timestamp'> & { timestamp?: string }): StaffActivityLog {
    const logs = getStored<StaffActivityLog[]>(STORAGE_KEYS.STAFF_LOGS, [...INITIAL_STAFF_LOGS]);
    const newLog: StaffActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: logData.timestamp || new Date().toISOString(),
      ...logData,
    };
    logs.unshift(newLog);
    if (logs.length > 250) logs.splice(250);
    setStored(STORAGE_KEYS.STAFF_LOGS, logs);
    return newLog;
  },

  getStaffLogs(staffId?: string): StaffActivityLog[] {
    const logs = getStored<StaffActivityLog[]>(STORAGE_KEYS.STAFF_LOGS, [...INITIAL_STAFF_LOGS]);
    if (staffId) {
      return logs.filter((l) => l.staffId === staffId);
    }
    return logs;
  },

  getStaffSessionMonitor(): StaffSessionMonitor {
    const staffList = this.getStaffMembers();
    const totalStaff = staffList.length;
    const activeStaffCount = staffList.filter((s) => s.isActive && !s.isBlocked).length;
    const blockedStaffCount = staffList.filter((s) => s.isBlocked).length;
    const currentlyLoggedInCount = staffList.filter((s) => s.isCurrentlyLoggedIn && !s.isBlocked).length;

    return {
      totalStaff,
      activeStaffCount,
      blockedStaffCount,
      currentlyLoggedInCount,
      sessions: staffList.map((s) => ({
        staffId: s.id,
        staffName: s.name,
        staffEmail: s.email,
        designation: s.designation,
        isCurrentlyLoggedIn: Boolean(s.isCurrentlyLoggedIn && !s.isBlocked),
        lastActiveAt: s.lastActiveAt || s.lastLogin,
        lastLogin: s.lastLogin,
        ipAddress: s.lastLoginIp || '122.161.48.12',
        device: s.lastLoginDevice || 'Desktop Web Browser',
        isBlocked: Boolean(s.isBlocked),
        contactedCount: s.contactedCount || 0,
        closedCount: s.closedCount || 0,
        notesCount: s.notesCount || 0,
      })),
    };
  },

  // ==========================================
  // PILGRIMAGE COMPANION MATCHING SYSTEM
  // ==========================================
  getCompanions(filters?: CompanionSearchFilters): CompanionProfile[] {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.COMPANIONS) : null;
    let list: CompanionProfile[];
    if (raw === null) {
      setStored(STORAGE_KEYS.COMPANIONS, INITIAL_COMPANIONS);
      list = [...INITIAL_COMPANIONS];
    } else {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [...INITIAL_COMPANIONS];
      }
    }

    if (filters) {
      if (filters.destination && filters.destination !== 'ALL') {
        const d = filters.destination.toLowerCase();
        list = list.filter((c) => c.destination.toLowerCase().includes(d));
      }
      if (filters.pilgrimType && filters.pilgrimType !== 'ALL') {
        list = list.filter((c) => c.pilgrimType === filters.pilgrimType);
      }
      if (filters.travelMonth && filters.travelMonth !== 'ALL') {
        const tm = filters.travelMonth.toLowerCase();
        list = list.filter((c) => c.travelMonth.toLowerCase().includes(tm));
      }
      if (filters.language && filters.language !== 'ALL') {
        const lang = filters.language.toLowerCase();
        list = list.filter((c) => c.languages.some((l) => l.toLowerCase().includes(lang)));
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        list = list.filter(
          (c) =>
            c.pilgrimName.toLowerCase().includes(q) ||
            c.cityOfOrigin.toLowerCase().includes(q) ||
            c.destination.toLowerCase().includes(q) ||
            c.seekingDescription.toLowerCase().includes(q)
        );
      }
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getCompanionById(id: string): CompanionProfile | null {
    const list = this.getCompanions();
    return list.find((c) => c.id === id) || null;
  },

  createCompanion(data: Partial<CompanionProfile>): CompanionProfile {
    const list = this.getCompanions();
    const initials =
      data.avatarInitials ||
      (data.pilgrimName
        ? data.pilgrimName
            .split(' ')
            .map((n) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : 'PT');

    const newCompanion: CompanionProfile = {
      id: data.id || `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: data.userId,
      pilgrimName: data.pilgrimName || 'Devotee',
      age: data.age ? Number(data.age) : undefined,
      gender: data.gender || 'ANY',
      pilgrimType: data.pilgrimType || 'SOLO_TRAVELER',
      cityOfOrigin: data.cityOfOrigin || 'India',
      destination: data.destination || 'Sacred Pilgrimage',
      travelMonth: data.travelMonth || 'October 2026',
      startDate: data.startDate,
      endDate: data.endDate,
      datesFlexible: data.datesFlexible !== undefined ? Boolean(data.datesFlexible) : true,
      languages: Array.isArray(data.languages) && data.languages.length > 0 ? data.languages : ['Hindi', 'English'],
      seekingDescription: data.seekingDescription || '',
      assistanceNeeded: Array.isArray(data.assistanceNeeded) ? data.assistanceNeeded : [],
      dietaryPreference: data.dietaryPreference || 'Vegetarian',
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      contactPreference: data.contactPreference || 'WHATSAPP',
      isVerified: true,
      emergencyContactListed: Boolean(data.emergencyContactListed),
      status: 'OPEN',
      avatarInitials: initials,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.unshift(newCompanion);
    setStored(STORAGE_KEYS.COMPANIONS, list);
    return newCompanion;
  },

  updateCompanion(id: string, updates: Partial<CompanionProfile>): CompanionProfile {
    const list = this.getCompanions();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Companion post not found');

    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setStored(STORAGE_KEYS.COMPANIONS, list);
    return list[idx];
  },

  deleteCompanion(id: string): boolean {
    const list = this.getCompanions().filter((c) => c.id !== id);
    setStored(STORAGE_KEYS.COMPANIONS, list);
    return true;
  },

  createCompanionConnection(connData: Partial<CompanionConnection>): CompanionConnection {
    const conns = getStored<CompanionConnection[]>(STORAGE_KEYS.COMPANION_CONNS, []);
    const newConn: CompanionConnection = {
      id: `conn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      companionProfileId: connData.companionProfileId || '',
      senderName: connData.senderName || 'Interested Devotee',
      senderPhone: connData.senderPhone || '',
      senderEmail: connData.senderEmail || '',
      senderCity: connData.senderCity,
      senderType: connData.senderType || 'SOLO_TRAVELER',
      message: connData.message || 'Har Har Mahadev! I will be travelling during overlapping dates and would love to coordinate.',
      proposedDates: connData.proposedDates,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    conns.unshift(newConn);
    setStored(STORAGE_KEYS.COMPANION_CONNS, conns);
    return newConn;
  },

  getCompanionConnections(profileId?: string): CompanionConnection[] {
    let conns = getStored<CompanionConnection[]>(STORAGE_KEYS.COMPANION_CONNS, []);
    if (profileId) {
      conns = conns.filter((c) => c.companionProfileId === profileId);
    }
    return conns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  updateCompanionConnectionStatus(connId: string, status: 'PENDING' | 'ACCEPTED' | 'DECLINED'): CompanionConnection {
    const conns = getStored<CompanionConnection[]>(STORAGE_KEYS.COMPANION_CONNS, []);
    const idx = conns.findIndex((c) => c.id === connId);
    if (idx === -1) throw new Error('Connection request not found');
    conns[idx].status = status;
    setStored(STORAGE_KEYS.COMPANION_CONNS, conns);
    return conns[idx];
  },

  // Transit Hubs (Local Offline Fallback)
  getHubs(cityId?: string): TransitHub[] {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.HUBS) : null;
    let list: TransitHub[];
    if (raw === null) {
      setStored(STORAGE_KEYS.HUBS, INITIAL_HUBS);
      list = [...INITIAL_HUBS];
    } else {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [...INITIAL_HUBS];
      }
    }
    if (cityId) {
      const lower = cityId.toLowerCase().trim();
      return list.filter((h) => (h.cityId || '').toLowerCase().trim() === lower);
    }
    return list;
  },

  createHub(hubData: Partial<TransitHub>): TransitHub {
    const list = this.getHubs();
    const id = hubData.id || `hub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newHub: TransitHub = {
      id,
      cityId: hubData.cityId || 'ayodhya',
      cityName: hubData.cityName || 'Ayodhya',
      name: hubData.name || 'Transit Terminal',
      hubType: hubData.hubType || 'AIRPORT',
      code: hubData.code || '',
      distanceToTempleKm: Number(hubData.distanceToTempleKm ?? 10),
      isPrimary: Boolean(hubData.isPrimary),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(newHub);
    setStored(STORAGE_KEYS.HUBS, list);
    return newHub;
  },

  updateHub(id: string, hubData: Partial<TransitHub>): TransitHub {
    const list = this.getHubs();
    const idx = list.findIndex((h) => h.id === id);
    if (idx === -1) {
      return this.createHub({ ...hubData, id });
    }
    const updated = {
      ...list[idx],
      ...hubData,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    setStored(STORAGE_KEYS.HUBS, list);
    return updated;
  },

  deleteHub(id: string): boolean {
    const list = this.getHubs().filter((h) => h.id !== id);
    setStored(STORAGE_KEYS.HUBS, list);
    return true;
  },

  resetData(): void {
    setStored(STORAGE_KEYS.CITIES, INITIAL_CITIES);
    setStored(STORAGE_KEYS.HUBS, INITIAL_HUBS);
    setStored(STORAGE_KEYS.HOTELS, INITIAL_HOTELS);
    setStored(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
    setStored(STORAGE_KEYS.INQUIRIES, INITIAL_INQUIRIES);
    setStored(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    setStored(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    setStored(STORAGE_KEYS.STAFF_LOGS, INITIAL_STAFF_LOGS);
    setStored(STORAGE_KEYS.COMPANIONS, INITIAL_COMPANIONS);
    setStored(STORAGE_KEYS.COMPANION_CONNS, []);
  },
};
