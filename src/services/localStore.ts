import { City, Hotel, Package, Inquiry, User, AuthResponse, Review, StaffMember, InquiryNote, StaffActivityLog, StaffSessionMonitor } from '../types.js';
import {
  INITIAL_CITIES,
  INITIAL_HOTELS,
  INITIAL_PACKAGES,
  INITIAL_INQUIRIES,
  INITIAL_REVIEWS,
  INITIAL_STAFF,
  INITIAL_STAFF_LOGS,
} from '../server/seedData.js';

const STORAGE_KEYS = {
  CITIES: 'tyt_local_cities',
  HOTELS: 'tyt_local_hotels',
  PACKAGES: 'tyt_local_packages',
  INQUIRIES: 'tyt_local_inquiries',
  REVIEWS: 'tyt_local_reviews',
  USERS: 'tyt_local_users',
  STAFF: 'tyt_local_staff',
  STAFF_LOGS: 'tyt_local_staff_logs',
};

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
    const id = (cityData.name || 'city').toLowerCase().replace(/\s+/g, '-');
    const newCity: City = {
      id: cityData.id || id,
      name: cityData.name || 'Sacred Destination',
      state: cityData.state || 'India',
      hotelCount: Number(cityData.hotelCount) || 1,
      imageUrl: cityData.imageUrl || 'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80',
      popularFor: cityData.popularFor || 'Sacred Pilgrimage & Aarti',
    };
    cities.push(newCity);
    setStored(STORAGE_KEYS.CITIES, cities);
    return newCity;
  },

  updateCity(id: string, updates: Partial<City>): City {
    const cities = this.getCities();
    const idx = cities.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('City not found');
    cities[idx] = { ...cities[idx], ...updates };
    setStored(STORAGE_KEYS.CITIES, cities);
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
      list = list.filter((h) => h.cityId === cityId);
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
      amenities: hotelData.amenities || ['Free Wi-Fi', 'Sattvic Food'],
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
  getInquiries(userId?: string): Inquiry[] {
    let list = getStored<Inquiry[]>(STORAGE_KEYS.INQUIRIES, []);
    if (list.length === 0) {
      list = [...INITIAL_INQUIRIES];
      setStored(STORAGE_KEYS.INQUIRIES, list);
    }
    list = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (userId) {
      list = list.filter((i) => i.userId === userId);
    }
    return list;
  },

  submitInquiry(inquiryData: Partial<Inquiry>): Inquiry {
    const inquiries = this.getInquiries();
    const fullName = inquiryData.fullName || inquiryData.customerName || 'Devotee';
    const email = inquiryData.email || inquiryData.customerEmail || '';
    const phone = inquiryData.whatsappNumber || inquiryData.customerPhone || '';
    const title = inquiryData.referenceName || inquiryData.title || 'Divine Yatra Stay';

    const newInquiry: Inquiry = {
      id: `inq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
      userCity: inquiryData.userCity || '',
      checkInDate: inquiryData.checkInDate || '',
      guests: Number(inquiryData.guests) || 2,
      adults: Number(inquiryData.adults) || 2,
      children: Number(inquiryData.children) || 0,
      childAges: inquiryData.childAges ? String(inquiryData.childAges) : undefined,
      planChosen: inquiryData.planChosen || inquiryData.selectedPlan || '',
      selectedPlan: inquiryData.selectedPlan || inquiryData.planChosen || '',
      pickupLocation: inquiryData.pickupLocation || '',
      dropoffLocation: inquiryData.dropoffLocation || '',
      specialRequests: inquiryData.specialRequests || '',
      status: 'NEW',
      isResolved: false,
      createdAt: new Date().toISOString(),
    };
    inquiries.unshift(newInquiry);
    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return newInquiry;
  },

  updateInquiryStatus(id: string, status: Inquiry['status']): Inquiry {
    const inquiries = this.getInquiries();
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inquiry not found');
    inquiries[idx].status = status;
    inquiries[idx].isResolved = status === 'CONFIRMED' || status === 'CLOSED';
    if (status !== 'CLOSED') {
      inquiries[idx].isLockedForStaff = false;
    }
    setStored(STORAGE_KEYS.INQUIRIES, inquiries);
    return inquiries[idx];
  },

  updateInquiryStatusByStaff(
    id: string,
    status: 'CONTACTED' | 'CLOSED',
    staff: { id: string; name: string }
  ): Inquiry {
    const inquiries = this.getInquiries();
    const idx = inquiries.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Inquiry not found');

    const inq = inquiries[idx];
    if (inq.isLockedForStaff || inq.status === 'CLOSED') {
      throw new Error('This inquiry is permanently locked. Only an Administrator can reopen closed leads.');
    }

    if (status === 'CLOSED') {
      inquiries[idx].status = 'CLOSED';
      inquiries[idx].isResolved = true;
      inquiries[idx].isLockedForStaff = true;
      inquiries[idx].closedAt = new Date().toISOString();
      inquiries[idx].closedBy = `${staff.name} (Staff)`;
    } else {
      inquiries[idx].status = 'CONTACTED';
      inquiries[idx].isResolved = false;
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
    const inquiries = this.getInquiries().filter((i) => i.id !== id);
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
    // Compute current assigned leads count dynamically
    const inquiries = this.getInquiries();
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

  resetData(): void {
    setStored(STORAGE_KEYS.CITIES, INITIAL_CITIES);
    setStored(STORAGE_KEYS.HOTELS, INITIAL_HOTELS);
    setStored(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
    setStored(STORAGE_KEYS.INQUIRIES, INITIAL_INQUIRIES);
    setStored(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    setStored(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    setStored(STORAGE_KEYS.STAFF_LOGS, INITIAL_STAFF_LOGS);
  },
};
