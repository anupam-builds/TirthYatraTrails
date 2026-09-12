import fs from 'fs';
import path from 'path';
import { City, Hotel, Package, User, Inquiry, Room, Review, Account, StaffMember, InquiryNote, StaffActivityLog, StaffSessionMonitor } from '../types.js';
import {
  getInitialSeedData,
  INITIAL_CITIES,
  INITIAL_HOTELS,
  INITIAL_PACKAGES,
  INITIAL_INQUIRIES,
  INITIAL_REVIEWS,
  INITIAL_STAFF,
  INITIAL_STAFF_LOGS,
} from './seedData.js';
import bcrypt from 'bcryptjs';

interface DatabaseSchema {
  users: (User & { password?: string })[];
  staff: StaffMember[];
  staffLogs?: StaffActivityLog[];
  accounts: Account[];
  cities: City[];
  hotels: Hotel[];
  packages: Package[];
  inquiries: Inquiry[];
  reviews: Review[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

class DatabaseStore {
  private data: DatabaseSchema = {
    users: [],
    staff: [...INITIAL_STAFF],
    staffLogs: [...INITIAL_STAFF_LOGS],
    accounts: [],
    cities: [...INITIAL_CITIES],
    hotels: [...INITIAL_HOTELS],
    packages: [...INITIAL_PACKAGES],
    inquiries: [...INITIAL_INQUIRIES],
    reviews: [...INITIAL_REVIEWS],
  };
  private isInitialized = false;

  constructor() {
    this.syncCityHotelCounts();
  }

  public async init() {
    if (this.isInitialized) return;
    
    try {
      if (!fs.existsSync(DATA_DIR)) {
        try {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        } catch (e) {
          console.warn('Could not create data directory (serverless environment):', e);
        }
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        try {
          this.data = JSON.parse(raw);
        } catch {
          this.data = {
            users: [],
            accounts: [],
            cities: [...INITIAL_CITIES],
            hotels: [...INITIAL_HOTELS],
            packages: [...INITIAL_PACKAGES],
            inquiries: [...INITIAL_INQUIRIES],
            reviews: [...INITIAL_REVIEWS],
            staff: [],
            staffLogs: [...INITIAL_STAFF_LOGS],
          };
        }

        const seed = await getInitialSeedData();

        // Ensure staff array exists
        if (!this.data.staff) this.data.staff = seed.staff || [];
        // Ensure staffLogs array exists
        if (!this.data.staffLogs) this.data.staffLogs = (seed as any).staffLogs || [...INITIAL_STAFF_LOGS];

        // Ensure default admin user is present and configured
        const adminEmail = 'admin@tirthyatratrails.com';
        const hasAdmin = this.data.users?.some(
          (u) => u.email?.toLowerCase() === adminEmail.toLowerCase()
        );
        if (!hasAdmin) {
          const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
          if (!this.data.users) this.data.users = [];
          this.data.users.unshift({
            id: 'usr-admin-1',
            name: 'Enterprise Yatra Admin',
            email: adminEmail,
            password: adminPasswordHash,
            role: 'ADMIN',
            createdAt: '2026-01-10T08:00:00.000Z',
          });
        }

        // Ensure accounts array exists
        if (!this.data.accounts) this.data.accounts = [];
        // Ensure inquiries array exists
        if (!this.data.inquiries) this.data.inquiries = seed.inquiries || [];

        // Ensure cities are seeded
        if (!this.data.cities || this.data.cities.length === 0) {
          this.data.cities = seed.cities;
        } else {
          for (const city of seed.cities) {
            if (!this.data.cities.some((c) => c.id === city.id)) {
              this.data.cities.push(city);
            }
          }
        }

        // Ensure hotels are seeded
        if (!this.data.hotels || this.data.hotels.length === 0) {
          this.data.hotels = seed.hotels;
        } else {
          for (const hotel of seed.hotels) {
            if (!this.data.hotels.some((h) => h.id === hotel.id)) {
              this.data.hotels.push(hotel);
            }
          }
        }

        // Ensure packages are seeded
        if (!this.data.packages || this.data.packages.length === 0) {
          this.data.packages = seed.packages;
        } else {
          for (const pkg of seed.packages) {
            if (!this.data.packages.some((p) => p.id === pkg.id)) {
              this.data.packages.push(pkg);
            }
          }
        }

        // Ensure reviews array exists and is seeded if empty
        if (!this.data.reviews || this.data.reviews.length === 0) {
          this.data.reviews = seed.reviews;
        }

        this.syncCityHotelCounts();
        this.save();
      } else {
        const seed = await getInitialSeedData();
        this.data = seed as any;
        this.syncCityHotelCounts();
        this.save();
      }
      this.isInitialized = true;
    } catch (err) {
      console.error('Error initializing database file, running with in-memory seed data:', err);
      const seed = await getInitialSeedData();
      this.data = seed as any;
      this.syncCityHotelCounts();
      this.isInitialized = true;
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      // In serverless / read-only Vercel environment, disk write might fail; stay functional in memory
      console.warn('Database disk write skipped (in-memory mode active):', err);
    }
  }

  public async resetData() {
    const seed = await getInitialSeedData();
    this.data = seed as any;
    this.save();
    return this.data;
  }

  // Users
  public getUsers() {
    return this.data.users.map(({ password, ...u }) => u);
  }

  public getUserByEmail(email: string) {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string) {
    const u = this.data.users.find((user) => user.id === id);
    if (!u) return null;
    const { password, ...safeUser } = u;
    return safeUser;
  }

  public async createUser(name: string, email: string, passwordPlain: string, role: 'USER' | 'ADMIN' = 'USER', phone?: string) {
    const existing = this.getUserByEmail(email);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const newUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      password: passwordHash,
      role,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.save();
    const { password, ...safeUser } = newUser;
    return safeUser;
  }

  public async findOrCreateOAuthUser({
    provider,
    providerAccountId,
    email,
    name,
    image,
    accessToken,
    refreshToken,
    idToken,
    expiresAt,
  }: {
    provider: string;
    providerAccountId: string;
    email: string;
    name?: string;
    image?: string;
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt?: number;
  }) {
    if (!this.data.accounts) this.data.accounts = [];
    if (!this.data.users) this.data.users = [];

    let account = this.data.accounts.find(
      (a) => a.provider === provider && a.providerAccountId === providerAccountId
    );

    let user: (User & { password?: string }) | undefined;

    if (account) {
      user = this.data.users.find((u) => u.id === account!.userId);
    }

    if (!user && email) {
      user = this.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      const newUser: User & { password?: string } = {
        id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        emailVerified: new Date().toISOString(),
        image: image || '',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.users.push(newUser);
      user = newUser;
    } else {
      if (name && !user.name) user.name = name;
      if (image && !user.image) user.image = image;
      user.updatedAt = new Date().toISOString();
    }

    if (!account) {
      const newAccount: Account = {
        id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: user.id,
        type: 'oauth',
        provider,
        providerAccountId,
        access_token: accessToken,
        refresh_token: refreshToken,
        id_token: idToken,
        expires_at: expiresAt,
        token_type: 'Bearer',
        scope: 'openid profile email',
      };
      this.data.accounts.push(newAccount);
    } else {
      if (accessToken) account.access_token = accessToken;
      if (refreshToken) account.refresh_token = refreshToken;
      if (idToken) account.id_token = idToken;
    }

    this.save();
    const { password, ...safeUser } = user;
    return safeUser;
  }

  // Dynamic Stay / Hotel Count Calculation
  public countHotelsForCity(city: City): number {
    if (!city) return 0;
    const cId = (city.id || '').toLowerCase().trim();
    const cName = (city.name || '').toLowerCase().trim();
    return (this.data.hotels || []).filter((h) => {
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
  }

  public syncCityHotelCounts() {
    if (!this.data.cities || !Array.isArray(this.data.cities)) return;
    this.data.cities = this.data.cities.map((city) => ({
      ...city,
      hotelCount: this.countHotelsForCity(city),
    }));
  }

  // Cities
  public getCities(): City[] {
    this.syncCityHotelCounts();
    return this.data.cities;
  }

  public getCityById(id: string): City | undefined {
    const city = this.data.cities.find((c) => c.id === id);
    if (!city) return undefined;
    return {
      ...city,
      hotelCount: this.countHotelsForCity(city),
    };
  }

  public createCity(cityData: Partial<City>) {
    const id = (cityData.name || 'city').toLowerCase().replace(/\s+/g, '-');
    const newCity: City = {
      id: cityData.id || id,
      name: cityData.name || 'Sacred Destination',
      state: cityData.state || 'India',
      hotelCount: 0,
      imageUrl: cityData.imageUrl || 'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80',
      popularFor: cityData.popularFor || 'Sacred Pilgrimage & Aarti',
    };
    newCity.hotelCount = this.countHotelsForCity(newCity);
    this.data.cities.push(newCity);
    this.save();
    return newCity;
  }

  public updateCity(id: string, updates: Partial<City>) {
    const index = this.data.cities.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('City not found');
    this.data.cities[index] = { ...this.data.cities[index], ...updates };
    this.save();
    return this.data.cities[index];
  }

  public deleteCity(idOrName: string) {
    if (!idOrName) return true;
    const raw = String(idOrName).trim();
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {}
    const target = decoded.toLowerCase();

    const index = this.data.cities.findIndex((c) => {
      const cId = (c.id || '').toLowerCase();
      const cName = (c.name || '').toLowerCase();
      return (
        cId === target ||
        cName === target ||
        cId === `city-${target}` ||
        `city-${cId}` === target ||
        target.includes(cId) ||
        (target.length > 3 && cName.includes(target)) ||
        (cName.length > 3 && target.includes(cName))
      );
    });

    if (index !== -1) {
      this.data.cities.splice(index, 1);
      this.save();
    }
    return true;
  }

  // Hotels
  public getHotels(cityId?: string, query?: string) {
    let list = this.data.hotels;
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
  }

  public getHotelById(id: string) {
    return this.data.hotels.find((h) => h.id === id);
  }

  public createHotel(hotelData: any) {
    const city = this.getCityById(hotelData.cityId);
    const newHotel: Hotel = {
      id: `htl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: hotelData.name,
      cityId: hotelData.cityId,
      cityName: city ? city.name : hotelData.cityName || 'Sacred Destination',
      starRating: Number(hotelData.starRating) || 4,
      googleRating: Number(hotelData.googleRating) || 4.8,
      reviewCount: Number(hotelData.reviewCount) || 50,
      address: hotelData.address || '',
      description: hotelData.description || '',
      images: hotelData.images || [],
      amenities: hotelData.amenities || [],
      basePrice: Number(hotelData.basePrice) || 3500,
      isTopRated: Boolean(hotelData.isTopRated),
      rooms: hotelData.rooms || [],
      distanceToTemple: hotelData.distanceToTemple || '',
      darshanType: hotelData.darshanType || '',
    };
    this.data.hotels.unshift(newHotel);
    this.syncCityHotelCounts();
    this.save();
    return newHotel;
  }

  public updateHotel(id: string, updates: Partial<Hotel>) {
    const index = this.data.hotels.findIndex((h) => h.id === id);
    if (index === -1) throw new Error('Hotel not found');
    const existing = this.data.hotels[index];
    const updated = { ...existing, ...updates };
    if (updates.cityId && updates.cityId !== existing.cityId) {
      const city = this.getCityById(updates.cityId);
      if (city) updated.cityName = city.name;
    }
    this.data.hotels[index] = updated;
    this.syncCityHotelCounts();
    this.save();
    return updated;
  }

  public deleteHotel(idOrName: string) {
    if (!idOrName) return true;
    const raw = String(idOrName).trim();
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {}
    const target = decoded.toLowerCase();

    const index = this.data.hotels.findIndex((h) => {
      const hId = (h.id || '').toLowerCase();
      const hName = (h.name || '').toLowerCase();
      return (
        hId === target ||
        hName === target ||
        hId === `htl-${target}` ||
        `htl-${hId}` === target ||
        target.includes(hId) ||
        (target.length > 4 && hName.includes(target)) ||
        (hName.length > 4 && target.includes(hName))
      );
    });

    if (index !== -1) {
      this.data.hotels.splice(index, 1);
      this.syncCityHotelCounts();
      this.save();
    }
    return true;
  }

  // Packages
  public getPackages(category?: string, query?: string) {
    let list = this.data.packages;
    if (category && category !== 'All') {
      list = list.filter((p) => p.category.toLowerCase().includes(category.toLowerCase()) || (p.title && p.title.toLowerCase().includes(category.toLowerCase())));
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
  }

  public getPackageById(id: string) {
    return this.data.packages.find((p) => p.id === id);
  }

  public createPackage(pkgData: any) {
    const newPkg: Package = {
      id: `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: pkgData.title,
      location: pkgData.location,
      duration: pkgData.duration,
      bookedRank: pkgData.bookedRank,
      imageUrl: pkgData.imageUrl,
      galleryImages: pkgData.galleryImages || [],
      startingPrice: Number(pkgData.startingPrice) || 25000,
      overview: pkgData.overview,
      highlights: pkgData.highlights || [],
      cancellationPolicy: pkgData.cancellationPolicy || '',
      category: pkgData.category || 'Pilgrimage',
      packageType: pkgData.packageType || 'All-Inclusive Guided Yatra',
      experienceLevel: pkgData.experienceLevel || 'Comfortable • Senior Friendly',
      hotelsLevel: pkgData.hotelsLevel || '3 & 4 Star Deluxe Stays',
      transfers: pkgData.transfers || 'Private AC Coach',
      itinerary: pkgData.itinerary || [],
    };
    this.data.packages.unshift(newPkg);
    this.save();
    return newPkg;
  }

  public updatePackage(id: string, updates: Partial<Package>) {
    const index = this.data.packages.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Package not found');
    this.data.packages[index] = { ...this.data.packages[index], ...updates };
    this.save();
    return this.data.packages[index];
  }

  public deletePackage(idOrTitle: string) {
    if (!idOrTitle) return true;
    const raw = String(idOrTitle).trim();
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {}
    const target = decoded.toLowerCase();

    const index = this.data.packages.findIndex((p) => {
      const pId = (p.id || '').toLowerCase();
      const pTitle = (p.title || '').toLowerCase();
      return (
        pId === target ||
        pTitle === target ||
        pId === `pkg-${target}` ||
        `pkg-${pId}` === target ||
        target.includes(pId) ||
        (target.length > 4 && pTitle.includes(target)) ||
        (pTitle.length > 4 && target.includes(pTitle))
      );
    });

    if (index !== -1) {
      this.data.packages.splice(index, 1);
      this.save();
    }
    return true;
  }

  // Inquiries
  public getInquiries(userId?: string) {
    let list = [...this.data.inquiries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (userId) {
      list = list.filter((inq) => inq.userId === userId);
    }
    return list;
  }

  public createInquiry(inquiryData: any) {
    const fullName = inquiryData.fullName || inquiryData.customerName || 'Devotee';
    const email = inquiryData.email || inquiryData.customerEmail || '';
    const phone = inquiryData.whatsappNumber || inquiryData.customerPhone || '';
    const title = inquiryData.referenceName || inquiryData.title || 'Divine Yatra Stay';

    let childAgesStr = '';
    let childrenCount = 0;

    if (inquiryData.childAges !== undefined && inquiryData.childAges !== null) {
      if (Array.isArray(inquiryData.childAges)) {
        childAgesStr = JSON.stringify(inquiryData.childAges);
        childrenCount = inquiryData.childAges.length;
      } else if (typeof inquiryData.childAges === 'string') {
        childAgesStr = inquiryData.childAges;
        try {
          if (childAgesStr.startsWith('[')) {
            const parsed = JSON.parse(childAgesStr);
            childrenCount = Array.isArray(parsed) ? parsed.length : 0;
          }
        } catch {}
      }
    }

    if (inquiryData.children !== undefined && Number(inquiryData.children) > 0) {
      childrenCount = Number(inquiryData.children);
    }

    const adultsCount = Number(inquiryData.adults || inquiryData.guests || 2);
    const totalGuests = adultsCount + childrenCount;

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
      guests: totalGuests,
      adults: adultsCount,
      children: childrenCount,
      childAges: childAgesStr || undefined,
      planChosen: inquiryData.planChosen || inquiryData.selectedPlan || '',
      selectedPlan: inquiryData.selectedPlan || inquiryData.planChosen || '',
      pickupLocation: inquiryData.pickupLocation || '',
      dropoffLocation: inquiryData.dropoffLocation || '',
      specialRequests: inquiryData.specialRequests || '',
      status: 'NEW',
      isResolved: false,
      createdAt: new Date().toISOString(),
    };
    this.data.inquiries.unshift(newInquiry);
    this.save();
    return newInquiry;
  }

  public updateInquiryStatus(id: string, status: Inquiry['status']) {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inquiry not found');
    this.data.inquiries[index].status = status;
    this.data.inquiries[index].isResolved = status === 'CONFIRMED' || status === 'CLOSED';
    if (status !== 'CLOSED') {
      this.data.inquiries[index].isLockedForStaff = false;
    }
    this.save();
    return this.data.inquiries[index];
  }

  public updateInquiryStatusByStaff(
    id: string,
    status: 'CONTACTED' | 'CLOSED',
    staff: { id: string; name: string }
  ) {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inquiry not found');

    const inq = this.data.inquiries[index];
    if (inq.isLockedForStaff || inq.status === 'CLOSED') {
      throw new Error('This inquiry is permanently locked. Only an Administrator can reopen closed leads.');
    }

    if (status === 'CLOSED') {
      inq.status = 'CLOSED';
      inq.isResolved = true;
      inq.isLockedForStaff = true;
      inq.closedAt = new Date().toISOString();
      inq.closedBy = `${staff.name} (Staff)`;
    } else {
      inq.status = 'CONTACTED';
      inq.isResolved = false;
    }

    if (!inq.assignedStaffId) {
      inq.assignedStaffId = staff.id;
      inq.assignedStaffName = staff.name;
    }

    // Record staff activity log & update staff metrics
    const staffIndex = this.data.staff?.findIndex((s) => s.id === staff.id) ?? -1;
    if (staffIndex !== -1 && this.data.staff) {
      this.data.staff[staffIndex].lastActiveAt = new Date().toISOString();
      this.data.staff[staffIndex].isCurrentlyLoggedIn = true;
      if (status === 'CLOSED') {
        this.data.staff[staffIndex].closedCount = (this.data.staff[staffIndex].closedCount || 0) + 1;
      } else {
        this.data.staff[staffIndex].contactedCount = (this.data.staff[staffIndex].contactedCount || 0) + 1;
      }
    }

    this.addStaffLog({
      staffId: staff.id,
      staffName: staff.name,
      staffEmail: staffIndex !== -1 && this.data.staff ? this.data.staff[staffIndex].email : '',
      action: 'STATUS_UPDATE',
      description: `Marked inquiry #${inq.id.slice(-4)} (${inq.title}) as ${status}`,
      inquiryId: inq.id,
      details: `Devotee: ${inq.fullName || inq.customerName}, Contact: ${inq.whatsappNumber || inq.customerPhone}`,
    });

    this.save();
    return inq;
  }

  public adminUnlockInquiry(id: string, newStatus: Inquiry['status'] = 'CONTACTED') {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inquiry not found');

    const inq = this.data.inquiries[index];
    inq.status = newStatus;
    inq.isLockedForStaff = false;
    inq.isResolved = newStatus === 'CONFIRMED' || newStatus === 'CLOSED';
    inq.closedAt = undefined;
    inq.closedBy = undefined;

    this.save();
    return inq;
  }

  public addInquiryNote(
    id: string,
    noteData: { text: string; authorName: string; authorRole: 'ADMIN' | 'STAFF'; authorId?: string }
  ) {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inquiry not found');

    const inq = this.data.inquiries[index];
    const newNote: InquiryNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      authorId: noteData.authorId,
      authorName: noteData.authorName,
      authorRole: noteData.authorRole,
      text: noteData.text.trim(),
      createdAt: new Date().toISOString(),
    };

    if (!inq.followUpNotes) {
      inq.followUpNotes = [];
    }
    inq.followUpNotes.unshift(newNote);
    inq.notes = newNote.text;

    if (noteData.authorRole === 'STAFF' && noteData.authorId) {
      const staffIndex = this.data.staff?.findIndex((s) => s.id === noteData.authorId) ?? -1;
      if (staffIndex !== -1 && this.data.staff) {
        this.data.staff[staffIndex].lastActiveAt = new Date().toISOString();
        this.data.staff[staffIndex].isCurrentlyLoggedIn = true;
        this.data.staff[staffIndex].notesCount = (this.data.staff[staffIndex].notesCount || 0) + 1;
      }
      this.addStaffLog({
        staffId: noteData.authorId,
        staffName: noteData.authorName,
        staffEmail: staffIndex !== -1 && this.data.staff ? this.data.staff[staffIndex].email : '',
        action: 'NOTE_ADDED',
        description: `Added follow-up note for inquiry #${inq.id.slice(-4)}`,
        inquiryId: inq.id,
        details: noteData.text.trim(),
      });
    }

    this.save();
    return inq;
  }

  public assignInquiryStaff(id: string, staffId: string, staffName: string) {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inquiry not found');

    const inq = this.data.inquiries[index];
    inq.assignedStaffId = staffId || undefined;
    inq.assignedStaffName = staffName || undefined;

    this.save();
    return inq;
  }

  // Staff Management & Session Tracking
  public getStaffMembers() {
    if (!this.data.staff || this.data.staff.length === 0) {
      this.data.staff = [...INITIAL_STAFF];
    }
    const inquiries = this.data.inquiries || [];
    return this.data.staff.map((s) => {
      const assigned = inquiries.filter((inq) => inq.assignedStaffId === s.id);
      const computedContacted = inquiries.filter(
        (inq) => (inq.assignedStaffId === s.id || inq.closedBy?.includes(s.name)) && inq.status === 'CONTACTED'
      ).length;
      const computedClosed = inquiries.filter(
        (inq) => (inq.assignedStaffId === s.id || inq.closedBy?.includes(s.name)) && inq.status === 'CLOSED'
      ).length;
      const computedNotes = inquiries.reduce((count, inq) => {
        const matching = (inq.followUpNotes || []).filter(
          (n) => n.authorId === s.id || n.authorName === s.name
        );
        return count + matching.length;
      }, 0);

      return {
        ...s,
        assignedLeadsCount: assigned.length,
        contactedCount: Math.max(s.contactedCount || 0, computedContacted),
        closedCount: Math.max(s.closedCount || 0, computedClosed),
        notesCount: Math.max(s.notesCount || 0, computedNotes),
        isBlocked: Boolean(s.isBlocked),
        isCurrentlyLoggedIn: Boolean(s.isCurrentlyLoggedIn && !s.isBlocked),
      };
    });
  }

  public getStaffMemberById(id: string): StaffMember | null {
    const list = this.getStaffMembers();
    return list.find((s) => s.id === id) || null;
  }

  public createStaffMember(staffData: Partial<StaffMember>, adminInfo?: { name?: string; ip?: string; device?: string }) {
    const staffList = this.getStaffMembers();
    const email = (staffData.email || '').trim().toLowerCase();
    if (!email) throw new Error('Staff Email ID is required');
    if (staffList.some((s) => s.email.toLowerCase() === email)) {
      throw new Error('A staff member with this Email ID already exists');
    }
    if (!staffData.password || staffData.password.trim().length < 6) {
      throw new Error('Staff Password is required (minimum 6 characters)');
    }

    const newStaff: StaffMember = {
      id: `stf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: (staffData.name || 'Staff Specialist').trim(),
      email: email,
      password: staffData.password.trim(),
      phone: (staffData.phone || '').trim(),
      designation: (staffData.designation || 'Pilgrimage Coordinator').trim(),
      role: 'STAFF',
      isActive: staffData.isActive !== undefined ? Boolean(staffData.isActive) : true,
      isBlocked: false,
      permissions: {
        canViewInquiries: staffData.permissions?.canViewInquiries ?? true,
        canUpdateStatus: staffData.permissions?.canUpdateStatus ?? true,
        canAddNotes: staffData.permissions?.canAddNotes ?? true,
      },
      assignedLeadsCount: 0,
      contactedCount: 0,
      closedCount: 0,
      notesCount: 0,
      isCurrentlyLoggedIn: false,
      createdAt: new Date().toISOString(),
    };

    this.data.staff.unshift(newStaff);

    // Audit log
    this.addStaffLog({
      staffId: newStaff.id,
      staffName: newStaff.name,
      staffEmail: newStaff.email,
      action: 'LOGIN',
      description: `New staff account provisioned by administrator: ${newStaff.name} (${newStaff.email})`,
      details: `Role: STAFF, Designation: ${newStaff.designation}`,
      ipAddress: adminInfo?.ip || '127.0.0.1',
      device: adminInfo?.device || 'Admin Console',
    });

    this.save();
    return newStaff;
  }

  public updateStaffMember(id: string, updates: Partial<StaffMember>) {
    const index = this.data.staff.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Staff member not found');

    const prevStaff = this.data.staff[index];
    const passwordChanged = Boolean(updates.password && updates.password.trim() !== prevStaff.password);

    this.data.staff[index] = {
      ...this.data.staff[index],
      ...updates,
      permissions: {
        ...this.data.staff[index].permissions,
        ...(updates.permissions || {}),
      },
    };

    if (passwordChanged) {
      this.addStaffLog({
        staffId: prevStaff.id,
        staffName: prevStaff.name,
        staffEmail: prevStaff.email,
        action: 'PASSWORD_RESET',
        description: `Staff password updated by Administrator`,
      });
    }

    this.save();
    return this.getStaffMemberById(id)!;
  }

  public blockStaffMember(
    id: string,
    isBlocked: boolean,
    reason?: string,
    adminInfo?: { name?: string; ip?: string; device?: string }
  ) {
    const index = this.data.staff.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Staff member not found');

    const staff = this.data.staff[index];
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

    // Add immediate audit log
    this.addStaffLog({
      staffId: staff.id,
      staffName: staff.name,
      staffEmail: staff.email,
      action: isBlocked ? 'BLOCKED' : 'UNBLOCKED',
      description: isBlocked
        ? `Administrator revoked access and terminated all active sessions. Reason: ${staff.blockedReason}`
        : `Administrator restored access and unblocked staff account`,
      details: reason,
      ipAddress: adminInfo?.ip || '127.0.0.1',
      device: adminInfo?.device || 'Admin Console',
    });

    this.save();
    return this.getStaffMemberById(id)!;
  }

  public toggleStaffStatus(id: string) {
    const index = this.data.staff.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Staff member not found');

    const currentActive = Boolean(this.data.staff[index].isActive && !this.data.staff[index].isBlocked);
    return this.blockStaffMember(id, currentActive, currentActive ? 'Status toggled to Inactive by Admin' : undefined);
  }

  public deleteStaffMember(id: string) {
    if (!this.data.staff) this.data.staff = [...INITIAL_STAFF];
    const target = id.trim().toLowerCase();
    const index = this.data.staff.findIndex(
      (s) => s.id === id || s.email.toLowerCase() === target
    );
    if (index === -1) {
      // Already removed or ID matched - return true safely
      return true;
    }
    const staff = this.data.staff[index];
    this.data.staff.splice(index, 1);
    
    this.addStaffLog({
      staffId: staff.id,
      staffName: staff.name,
      staffEmail: staff.email,
      action: 'BLOCKED',
      description: `Staff account permanently deleted by Administrator: ${staff.name} (${staff.email})`,
    });

    this.save();
    return true;
  }

  public recordStaffLogin(staffId: string, ip: string, device: string) {
    const index = this.data.staff.findIndex((s) => s.id === staffId);
    if (index === -1) return;

    const staff = this.data.staff[index];
    const now = new Date().toISOString();
    staff.lastLogin = now;
    staff.lastActiveAt = now;
    staff.lastLoginIp = ip;
    staff.lastLoginDevice = device;
    staff.isCurrentlyLoggedIn = true;

    this.addStaffLog({
      staffId: staff.id,
      staffName: staff.name,
      staffEmail: staff.email,
      action: 'LOGIN',
      description: `Staff member authenticated successfully into Operations Desk`,
      ipAddress: ip,
      device: device,
    });

    this.save();
  }

  public recordStaffLogout(staffId: string) {
    const index = this.data.staff.findIndex((s) => s.id === staffId);
    if (index === -1) return;

    const staff = this.data.staff[index];
    staff.isCurrentlyLoggedIn = false;
    staff.lastActiveAt = new Date().toISOString();

    this.addStaffLog({
      staffId: staff.id,
      staffName: staff.name,
      staffEmail: staff.email,
      action: 'LOGOUT',
      description: `Staff member logged out from session`,
      ipAddress: staff.lastLoginIp,
      device: staff.lastLoginDevice,
    });

    this.save();
  }

  public addStaffLog(logData: Omit<StaffActivityLog, 'id' | 'timestamp'> & { timestamp?: string }) {
    if (!this.data.staffLogs) this.data.staffLogs = [];
    const newLog: StaffActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: logData.timestamp || new Date().toISOString(),
      ...logData,
    };
    this.data.staffLogs.unshift(newLog);
    if (this.data.staffLogs.length > 250) {
      this.data.staffLogs = this.data.staffLogs.slice(0, 250);
    }
    this.save();
    return newLog;
  }

  public getStaffLogs(staffId?: string) {
    if (!this.data.staffLogs) this.data.staffLogs = [...INITIAL_STAFF_LOGS];
    if (staffId) {
      return this.data.staffLogs.filter((l) => l.staffId === staffId);
    }
    return this.data.staffLogs;
  }

  public getStaffSessionMonitor(): StaffSessionMonitor {
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
  }

  public findStaffByEmail(email: string) {
    if (!this.data.staff) this.data.staff = [...INITIAL_STAFF];
    return this.data.staff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
  }

  public toggleInquiryStatus(id: string) {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inquiry not found');
    this.data.inquiries[index].isResolved = !this.data.inquiries[index].isResolved;
    this.data.inquiries[index].status = this.data.inquiries[index].isResolved ? 'CONFIRMED' : 'NEW';
    this.save();
    return this.data.inquiries[index];
  }

  public deleteInquiry(id: string) {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inquiry not found');
    this.data.inquiries.splice(index, 1);
    this.save();
    return true;
  }

  // Reviews / Traveller Stories
  public getReviews(onlyFeatured = false) {
    let list = [...(this.data.reviews || [])];
    if (onlyFeatured) {
      list = list.filter((r) => r.isFeatured);
    }
    return list.sort((a, b) => (a.order || 0) - (b.order || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getReviewById(id: string) {
    return (this.data.reviews || []).find((r) => r.id === id) || null;
  }

  public createReview(reviewData: Partial<Review>) {
    if (!this.data.reviews) this.data.reviews = [];
    const authorName = reviewData.authorName || 'Devotee';
    const computedInitials = reviewData.authorInitials || 
      authorName.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'TT';

    const newReview: Review = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      authorName: authorName,
      authorLocation: reviewData.authorLocation || 'Sacred Dham',
      authorInitials: computedInitials,
      rating: Number(reviewData.rating) || 5.0,
      reviewText: reviewData.reviewText || '',
      destinationImage: reviewData.destinationImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
      isVerified: reviewData.isVerified !== undefined ? Boolean(reviewData.isVerified) : true,
      googleReviewUrl: reviewData.googleReviewUrl || undefined,
      isFeatured: reviewData.isFeatured !== undefined ? Boolean(reviewData.isFeatured) : true,
      order: Number(reviewData.order) || (this.data.reviews.length + 1),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.reviews.unshift(newReview);
    this.save();
    return newReview;
  }

  public updateReview(id: string, updateData: Partial<Review>) {
    if (!this.data.reviews) this.data.reviews = [];
    const index = this.data.reviews.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Review not found');

    const existing = this.data.reviews[index];
    const authorName = updateData.authorName !== undefined ? updateData.authorName : existing.authorName;
    const computedInitials = updateData.authorInitials !== undefined && updateData.authorInitials.trim()
      ? updateData.authorInitials.trim()
      : (authorName.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'TT');

    const updated: Review = {
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

    this.data.reviews[index] = updated;
    this.save();
    return updated;
  }

  public toggleReviewFeatured(id: string) {
    if (!this.data.reviews) this.data.reviews = [];
    const index = this.data.reviews.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Review not found');
    this.data.reviews[index].isFeatured = !this.data.reviews[index].isFeatured;
    this.data.reviews[index].updatedAt = new Date().toISOString();
    this.save();
    return this.data.reviews[index];
  }

  public deleteReview(idOrName: string) {
    if (!this.data.reviews) this.data.reviews = [];
    if (!idOrName) return true;
    const raw = String(idOrName).trim();
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {}
    const target = decoded.toLowerCase();

    const index = this.data.reviews.findIndex((r) => {
      const rId = (r.id || '').toLowerCase();
      const rName = (r.authorName || '').toLowerCase();
      return (
        rId === target ||
        rName === target ||
        rId === `rev-${target}` ||
        `rev-${rId}` === target ||
        target.includes(rId) ||
        (target.length > 4 && rName.includes(target)) ||
        (rName.length > 4 && target.includes(rName))
      );
    });

    if (index !== -1) {
      this.data.reviews.splice(index, 1);
      this.save();
    }
    return true;
  }
}

export const db = new DatabaseStore();
