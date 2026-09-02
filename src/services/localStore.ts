import { City, Hotel, Package, Inquiry, User, AuthResponse, Review } from '../types.js';
import {
  INITIAL_CITIES,
  INITIAL_HOTELS,
  INITIAL_PACKAGES,
  INITIAL_INQUIRIES,
  INITIAL_REVIEWS,
} from '../server/seedData.js';

const STORAGE_KEYS = {
  CITIES: 'tyt_local_cities',
  HOTELS: 'tyt_local_hotels',
  PACKAGES: 'tyt_local_packages',
  INQUIRIES: 'tyt_local_inquiries',
  REVIEWS: 'tyt_local_reviews',
  USERS: 'tyt_local_users',
};

function getStored<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('Could not write to localStorage:', e);
  }
}

export const localStore = {
  // Cities
  getCities(): City[] {
    const stored = getStored<City[]>(STORAGE_KEYS.CITIES, []);
    if (stored.length === 0) {
      setStored(STORAGE_KEYS.CITIES, INITIAL_CITIES);
      return INITIAL_CITIES;
    }
    return stored;
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

  deleteCity(id: string): boolean {
    const cities = this.getCities().filter((c) => c.id !== id);
    setStored(STORAGE_KEYS.CITIES, cities);
    return true;
  },

  // Hotels
  getHotels(cityId?: string, query?: string): Hotel[] {
    let list = getStored<Hotel[]>(STORAGE_KEYS.HOTELS, []);
    if (list.length === 0) {
      list = [...INITIAL_HOTELS];
      setStored(STORAGE_KEYS.HOTELS, list);
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
      id: `htl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
    return newHotel;
  },

  updateHotel(id: string, updates: Partial<Hotel>): Hotel {
    const hotels = this.getHotels();
    const idx = hotels.findIndex((h) => h.id === id);
    if (idx === -1) throw new Error('Hotel not found');
    hotels[idx] = { ...hotels[idx], ...updates };
    setStored(STORAGE_KEYS.HOTELS, hotels);
    return hotels[idx];
  },

  deleteHotel(id: string): boolean {
    const hotels = this.getHotels().filter((h) => h.id !== id);
    setStored(STORAGE_KEYS.HOTELS, hotels);
    return true;
  },

  // Packages
  getPackages(category?: string, query?: string): Package[] {
    let list = getStored<Package[]>(STORAGE_KEYS.PACKAGES, []);
    if (list.length === 0) {
      list = [...INITIAL_PACKAGES];
      setStored(STORAGE_KEYS.PACKAGES, list);
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
      id: `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  deletePackage(id: string): boolean {
    const packages = this.getPackages().filter((p) => p.id !== id);
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
    let list = getStored<Review[]>(STORAGE_KEYS.REVIEWS, []);
    if (list.length === 0) {
      list = [...INITIAL_REVIEWS];
      setStored(STORAGE_KEYS.REVIEWS, list);
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
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  deleteReview(id: string): boolean {
    const reviews = this.getReviews().filter((r) => r.id !== id);
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

  resetData(): void {
    setStored(STORAGE_KEYS.CITIES, INITIAL_CITIES);
    setStored(STORAGE_KEYS.HOTELS, INITIAL_HOTELS);
    setStored(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
    setStored(STORAGE_KEYS.INQUIRIES, INITIAL_INQUIRIES);
    setStored(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
  },
};
