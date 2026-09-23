import fs from 'fs';
import path from 'path';
import { City, Hotel, Package, User, Inquiry, Room, Review, Account, StaffMember, InquiryNote, StaffActivityLog, StaffSessionMonitor, CompanionProfile, CompanionConnection, CompanionSearchFilters } from '../types.js';
import {
  getInitialSeedData,
  INITIAL_CITIES,
  INITIAL_HOTELS,
  INITIAL_PACKAGES,
  INITIAL_INQUIRIES,
  INITIAL_REVIEWS,
  INITIAL_STAFF,
  INITIAL_STAFF_LOGS,
  INITIAL_COMPANIONS,
} from './seedData.js';
import bcrypt from 'bcryptjs';

export interface AdminAllowlistEntry {
  id: string;
  email: string;
  role: string;
  created_at: string;
  status?: string;
}

export const INITIAL_ADMIN_ALLOWLIST: AdminAllowlistEntry[] = [
  {
    id: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
    email: 'anupamsaxena.dev@gmail.com',
    role: 'Super Admin',
    created_at: '2026-01-01T00:00:00.000Z',
    status: 'Active & Authorized',
  },
  {
    id: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
    email: 'admin@tirthyatratrails.com',
    role: 'Admin (Enterprise Operations)',
    created_at: '2026-02-15T00:00:00.000Z',
    status: 'Active & Authorized',
  },
];

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
  companions?: CompanionProfile[];
  companionConnections?: CompanionConnection[];
  admin_allowlist?: AdminAllowlistEntry[];
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
    companions: [...INITIAL_COMPANIONS],
    companionConnections: [],
    admin_allowlist: [...INITIAL_ADMIN_ALLOWLIST],
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
          this.data.reviews = [...INITIAL_REVIEWS];
        } else {
          // Check if existing reviews need audio notes from INITIAL_REVIEWS
          this.data.reviews.forEach((r) => {
            if (!r.audioUrl) {
              const matchedSeed = INITIAL_REVIEWS.find((sr) => sr.id === r.id);
              if (matchedSeed && matchedSeed.audioUrl) {
                r.audioUrl = matchedSeed.audioUrl;
                r.audioDuration = matchedSeed.audioDuration;
                r.audioTitle = matchedSeed.audioTitle;
                r.language = matchedSeed.language;
              }
            }
          });
        }

        // Ensure companions array exists
        if (!this.data.companions || this.data.companions.length === 0) {
          this.data.companions = [...INITIAL_COMPANIONS];
        }
        if (!this.data.companionConnections) {
          this.data.companionConnections = [];
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

  public async provisionAdminUser(email: string, passwordPlain: string, provisionedBy: string) {
    const cleanEmail = email.toLowerCase().trim();
    if (!this.data.users) this.data.users = [];
    const existingIndex = this.data.users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    if (existingIndex >= 0) {
      this.data.users[existingIndex].role = 'ADMIN';
      this.data.users[existingIndex].password = passwordHash;
      this.save();
      const { password, ...safeUser } = this.data.users[existingIndex];
      return safeUser;
    } else {
      const newUser = {
        id: `usr-admin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: '',
        password: passwordHash,
        role: 'ADMIN' as const,
        createdAt: new Date().toISOString(),
      };
      this.data.users.push(newUser);
      this.save();
      const { password, ...safeUser } = newUser;
      return safeUser;
    }
  }

  public getAdminUsers() {
    if (!this.data.users) this.data.users = [];
    return this.data.users
      .filter((u) => u.role === 'ADMIN')
      .map(({ password, ...safeUser }) => safeUser);
  }

  public getAdminAllowlist(): AdminAllowlistEntry[] {
    if (!this.data.admin_allowlist || this.data.admin_allowlist.length === 0) {
      this.data.admin_allowlist = [...INITIAL_ADMIN_ALLOWLIST];
    }
    return [...this.data.admin_allowlist];
  }

  public addAdminAllowlistEntry(email: string, role: string = 'Admin (Enterprise Operations)', status: string = 'Active & Authorized'): AdminAllowlistEntry {
    const cleanEmail = email.toLowerCase().trim();
    if (!this.data.admin_allowlist) {
      this.data.admin_allowlist = [...INITIAL_ADMIN_ALLOWLIST];
    }
    const existing = this.data.admin_allowlist.find((e) => e.email.toLowerCase() === cleanEmail);
    if (existing) {
      existing.role = role || existing.role || 'Admin (Enterprise Operations)';
      existing.status = status || existing.status || 'Active & Authorized';
      this.save();
      return existing;
    }
    const newEntry: AdminAllowlistEntry = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr-allow-${Date.now()}`,
      email: cleanEmail,
      role: role || 'Admin (Enterprise Operations)',
      created_at: new Date().toISOString(),
      status: status || 'Active & Authorized',
    };
    this.data.admin_allowlist.push(newEntry);
    this.save();
    return newEntry;
  }

  public removeAdminAllowlistEntry(idOrEmail: string): boolean {
    if (!this.data.admin_allowlist) return false;
    const clean = idOrEmail.toLowerCase().trim();
    // Do not remove root admin
    if (clean === 'anupamsaxena.dev@gmail.com') return false;
    const initialLen = this.data.admin_allowlist.length;
    this.data.admin_allowlist = this.data.admin_allowlist.filter(
      (e) => e.id !== clean && e.email.toLowerCase() !== clean
    );
    if (this.data.admin_allowlist.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public isEmailInAdminAllowlist(email: string): boolean {
    const clean = email.toLowerCase().trim();
    if (clean === 'anupamsaxena.dev@gmail.com' || clean === 'admin@tirthyatratrails.com') return true;
    const list = this.getAdminAllowlist();
    return list.some((e) => e.email.toLowerCase() === clean);
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
    const cleanName = (cityData.name || 'Sacred Destination').trim();
    const id = cityData.id || cleanName.toLowerCase().replace(/\s+/g, '-');

    // Check if city already exists
    const existingIndex = this.data.cities.findIndex(
      (c) =>
        c.name.toLowerCase().trim() === cleanName.toLowerCase() ||
        c.id.toLowerCase() === id.toLowerCase()
    );

    if (existingIndex !== -1) {
      const existing = this.data.cities[existingIndex];
      const merged: City = {
        ...existing,
        ...cityData,
        name: cleanName,
        id: existing.id,
      };
      merged.hotelCount = this.countHotelsForCity(merged);
      this.data.cities[existingIndex] = merged;
      this.save();
      return merged;
    }

    const newCity: City = {
      id,
      name: cleanName,
      state: (cityData.state || 'India').trim(),
      hotelCount: 0,
      imageUrl: cityData.imageUrl || 'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80',
      popularFor: (cityData.popularFor || 'Sacred Pilgrimage & Aarti').trim(),
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
    if (category && category !== 'All' && category !== 'All Packages') {
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

  // Inquiries & CRM Leads
  public generateLeadId(): string {
    const existingNumbers = (this.data.inquiries || [])
      .map((i) => {
        if (i.leadId) {
          const cleaned = i.leadId.replace(/^(TTT|TTX)/, '');
          const num = parseInt(cleaned, 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter((n) => n > 0);

    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNum = maxNum + 1;
    return `TTT${nextNum.toString().padStart(8, '0')}`;
  }

  public getInquiries(userId?: string, includeDeleted = false) {
    let list = [...(this.data.inquiries || [])];

    if (!includeDeleted) {
      list = list.filter((inq) => !inq.isDeleted);
    }

    // Ensure all inquiries have a leadId populated with TTT prefix & default assigned staff
    let modified = false;
    const defaultStaff = (this.data.staff && this.data.staff.length > 0) ? this.data.staff[0] : null;

    list.forEach((inq, idx) => {
      // Migrate legacy TTX to TTT
      if (inq.leadId && inq.leadId.startsWith('TTX')) {
        inq.leadId = inq.leadId.replace(/^TTX/, 'TTT');
        modified = true;
      } else if (!inq.leadId) {
        const fallbackNum = (idx + 1).toString().padStart(8, '0');
        inq.leadId = `TTT${fallbackNum}`;
        modified = true;
      }

      // Ensure every lead defaults to having an assigned staff member
      if (!inq.assignedStaffId && defaultStaff) {
        inq.assignedStaffId = defaultStaff.id;
        inq.assignedStaffName = defaultStaff.name;
        modified = true;
      }
    });

    if (modified) {
      this.save();
    }

    list.sort(
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
    const phone =
      inquiryData.whatsapp_number ||
      inquiryData.phone ||
      inquiryData.metadata?.whatsapp_number ||
      inquiryData.whatsappNumber ||
      inquiryData.customerPhone ||
      '';
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
    const generatedLeadId = inquiryData.leadId || this.generateLeadId();

    const defaultStaff = (this.data.staff && this.data.staff.length > 0) ? this.data.staff[0] : null;
    const finalStaffId = inquiryData.assignedStaffId || defaultStaff?.id || 'stf-1';
    const finalStaffName = inquiryData.assignedStaffName || defaultStaff?.name || 'Priya Sharma';

    const newInquiry: Inquiry = {
      id: `inq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      leadId: generatedLeadId,
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
      phone: phone,
      whatsapp_number: phone,
      metadata: {
        whatsapp_number: phone,
        phone: phone,
        full_name: fullName,
        email: email,
        resident_state: inquiryData.resident_state || inquiryData.residentState || inquiryData.userCity || 'New Delhi',
        package_interest: title,
        start_date: inquiryData.checkInDate || '',
        duration: inquiryData.tourDuration || '',
        adults: adultsCount,
        children: childrenCount,
        pickup_city: inquiryData.pickupLocation || '',
        drop_city: inquiryData.dropoffLocation || '',
        accommodation_tier: inquiryData.planChosen || inquiryData.selectedPlan || inquiryData.accommodationTier || '3 Star Hotel',
        special_requests: inquiryData.specialRequests || '',
        ...(inquiryData.metadata || {}),
      },
      userCity: inquiryData.userCity || 'New Delhi',
      checkInDate: inquiryData.checkInDate || '',
      guests: totalGuests,
      adults: adultsCount,
      children: childrenCount,
      childAges: childAgesStr || undefined,
      planChosen: inquiryData.planChosen || inquiryData.selectedPlan || '',
      selectedPlan: inquiryData.selectedPlan || inquiryData.planChosen || '',
      accommodationTier: inquiryData.accommodationTier || '3 Star Hotel',
      pickupLocation: inquiryData.pickupLocation || '',
      dropoffLocation: inquiryData.dropoffLocation || '',
      specialRequests: inquiryData.specialRequests || '',
      status: inquiryData.status || 'NEW',
      isResolved: false,
      assignedStaffId: finalStaffId,
      assignedStaffName: finalStaffName,
      tags: inquiryData.tags || (inquiryData.type === 'PACKAGE' ? ['Package Yatra'] : ['Hotel Stay']),
      tourDuration: inquiryData.tourDuration,
      customerRating: inquiryData.customerRating || 5,
      createdAt: new Date().toISOString(),
    };
    this.data.inquiries.unshift(newInquiry);
    this.save();
    return newInquiry;
  }

  public updateInquiry(id: string, updates: Partial<Inquiry>) {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inquiry not found');

    const current = this.data.inquiries[index];
    const newStatus = updates.status || current.status;
    const isResolved = newStatus === 'CONFIRMED' || newStatus === 'WON' || newStatus === 'CLOSED';

    const merged: Inquiry = {
      ...current,
      ...updates,
      id: current.id,
      leadId: current.leadId || updates.leadId || this.generateLeadId(),
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

    this.data.inquiries[index] = merged;
    this.save();
    return merged;
  }

  public updateInquiryStatus(id: string, status: Inquiry['status']) {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inquiry not found');
    this.data.inquiries[index].status = status;
    this.data.inquiries[index].isResolved = status === 'CONFIRMED' || status === 'WON' || status === 'CLOSED';
    if (status !== 'CLOSED') {
      this.data.inquiries[index].isLockedForStaff = false;
      this.data.inquiries[index].closedAt = undefined;
      this.data.inquiries[index].closedBy = undefined;
    } else {
      this.data.inquiries[index].isLockedForStaff = true;
      this.data.inquiries[index].closedAt = new Date().toISOString();
    }
    this.data.inquiries[index].updatedAt = new Date().toISOString();
    this.save();
    return this.data.inquiries[index];
  }

  public updateInquiryStatusByStaff(
    id: string,
    status: Inquiry['status'],
    staff: { id: string; name: string }
  ) {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inquiry not found');

    const inq = this.data.inquiries[index];
    if (inq.isLockedForStaff && inq.status === 'CLOSED') {
      throw new Error('This inquiry is permanently locked. Only an Administrator can reopen closed leads.');
    }

    if (status !== 'NEW' && status !== 'CONTACTED' && status !== 'CLOSED') {
      throw new Error('Staff members can only set status to NEW, CONTACTED, or CLOSED.');
    }

    inq.status = status;
    inq.updatedAt = new Date().toISOString();

    if (status === 'CLOSED') {
      inq.isResolved = true;
      inq.isLockedForStaff = true;
      inq.closedAt = new Date().toISOString();
      inq.closedBy = `${staff.name} (Staff)`;
    } else {
      inq.isResolved = false;
      inq.isLockedForStaff = false;
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
      description: `Marked lead ${inq.leadId || inq.id.slice(-4)} (${inq.title}) as ${status}`,
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

    const isStaffAdmin = staffData.role === 'ADMIN' || Boolean(staffData.designation && staffData.designation.toLowerCase().includes('admin'));

    const newStaff: StaffMember = {
      id: `stf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: (staffData.name || (isStaffAdmin ? 'Enterprise Admin' : 'Staff Specialist')).trim(),
      email: email,
      password: staffData.password.trim(),
      phone: (staffData.phone || '').trim(),
      designation: (staffData.designation || (isStaffAdmin ? 'Admin (Enterprise Operations)' : 'Pilgrimage Coordinator')).trim(),
      role: isStaffAdmin ? 'ADMIN' : 'STAFF',
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

    if (isStaffAdmin) {
      this.addAdminAllowlistEntry(email, newStaff.designation, 'Active & Authorized');
    }

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

    // Synchronize with admin allowlist if this is an administrator account
    if (this.data.admin_allowlist) {
      const allowMatch = this.data.admin_allowlist.find((a) => a.email.toLowerCase() === staff.email.toLowerCase());
      if (allowMatch) {
        allowMatch.status = isBlocked ? 'Blocked' : 'Active & Authorized';
      }
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
    if (staff.email.toLowerCase() === 'anupamsaxena.dev@gmail.com') {
      throw new Error('Root administrator account cannot be deleted.');
    }

    this.data.staff.splice(index, 1);

    // Also remove from admin allowlist if administrator
    if (this.data.admin_allowlist) {
      this.data.admin_allowlist = this.data.admin_allowlist.filter(
        (a) => a.id !== staff.id && a.email.toLowerCase() !== staff.email.toLowerCase()
      );
    }
    
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

  public getDeletedInquiries() {
    return (this.data.inquiries || [])
      .filter((i) => i.isDeleted === true)
      .sort(
        (a, b) =>
          new Date(b.deletedAt || b.createdAt).getTime() -
          new Date(a.deletedAt || a.createdAt).getTime()
      );
  }

  public deleteInquiry(id: string) {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inquiry not found');
    this.data.inquiries[index].isDeleted = true;
    this.data.inquiries[index].deletedAt = new Date().toISOString();
    this.data.inquiries[index].deletedBy = 'Administrator';
    this.save();
    return this.data.inquiries[index];
  }

  public restoreInquiry(id: string, staffId?: string, staffName?: string) {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inquiry not found');
    const inq = this.data.inquiries[index];
    inq.isDeleted = false;
    inq.deletedAt = undefined;
    inq.deletedBy = undefined;
    if (staffId) {
      inq.assignedStaffId = staffId;
      inq.assignedStaffName =
        staffName ||
        (this.data.staff?.find((s) => s.id === staffId)?.name || 'Staff Member');
    }
    this.save();
    return inq;
  }

  public permanentlyDeleteInquiry(id: string) {
    const index = this.data.inquiries.findIndex((i) => i.id === id);
    if (index !== -1) {
      this.data.inquiries.splice(index, 1);
      this.save();
    }
    return true;
  }

  public emptyTrash() {
    this.data.inquiries = (this.data.inquiries || []).filter((i) => !i.isDeleted);
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
      audioUrl: reviewData.audioUrl || undefined,
      audioDuration: reviewData.audioDuration ? Number(reviewData.audioDuration) : undefined,
      audioTitle: reviewData.audioTitle || undefined,
      language: reviewData.language || undefined,
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
      audioUrl: updateData.audioUrl !== undefined ? updateData.audioUrl : existing.audioUrl,
      audioDuration: updateData.audioDuration !== undefined ? (updateData.audioDuration ? Number(updateData.audioDuration) : undefined) : existing.audioDuration,
      audioTitle: updateData.audioTitle !== undefined ? updateData.audioTitle : existing.audioTitle,
      language: updateData.language !== undefined ? updateData.language : existing.language,
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

  // ==========================================
  // PILGRIMAGE COMPANION MATCHING SYSTEM
  // ==========================================
  public getCompanions(filters?: CompanionSearchFilters) {
    let list = [...(this.data.companions || [])];

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
            c.seekingDescription.toLowerCase().includes(q) ||
            (c.dietaryPreference && c.dietaryPreference.toLowerCase().includes(q))
        );
      }
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getCompanionById(id: string) {
    return (this.data.companions || []).find((c) => c.id === id) || null;
  }

  public createCompanion(data: Partial<CompanionProfile>) {
    if (!this.data.companions) this.data.companions = [];
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
      id: `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

    this.data.companions.unshift(newCompanion);
    this.save();
    return newCompanion;
  }

  public updateCompanion(id: string, updates: Partial<CompanionProfile>) {
    if (!this.data.companions) this.data.companions = [];
    const index = this.data.companions.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Companion post not found');

    const existing = this.data.companions[index];
    const updated: CompanionProfile = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.data.companions[index] = updated;
    this.save();
    return updated;
  }

  public deleteCompanion(id: string) {
    if (!this.data.companions) this.data.companions = [];
    const index = this.data.companions.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.data.companions.splice(index, 1);
      this.save();
    }
    return true;
  }

  public createCompanionConnection(connData: Partial<CompanionConnection>) {
    if (!this.data.companionConnections) this.data.companionConnections = [];
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

    this.data.companionConnections.unshift(newConn);
    this.save();
    return newConn;
  }

  public getCompanionConnections(companionProfileId?: string) {
    let list = [...(this.data.companionConnections || [])];
    if (companionProfileId) {
      list = list.filter((c) => c.companionProfileId === companionProfileId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public updateCompanionConnectionStatus(connectionId: string, status: 'PENDING' | 'ACCEPTED' | 'DECLINED') {
    if (!this.data.companionConnections) this.data.companionConnections = [];
    const index = this.data.companionConnections.findIndex((c) => c.id === connectionId);
    if (index === -1) throw new Error('Connection request not found');

    this.data.companionConnections[index].status = status;
    this.save();
    return this.data.companionConnections[index];
  }
}

export const db = new DatabaseStore();
