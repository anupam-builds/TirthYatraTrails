import { City, Hotel, Package, Inquiry, User, AuthResponse, Review } from '../types.js';
import { localStore } from './localStore.js';
import { broadcastNewInquiry } from './soundNotification.js';

const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('tyt_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getAdminAuthHeader() {
  const token = localStorage.getItem('tyt_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Safely executes a fetch request and parses JSON responses.
 * Robustly handles non-JSON responses (e.g., HTML error pages) without syntax crashes.
 */
async function safeFetch<T = any>(url: string, options?: RequestInit, fallbackError = 'Request failed'): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err: any) {
    throw new Error(err.message || 'Network connection error.');
  }

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    if (!res.ok || text.startsWith('<') || text.includes('The page c') || text.includes('<!DOCTYPE')) {
      throw new Error(`Server returned status ${res.status}: fallback to local store`);
    }
    return text as unknown as T;
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `${fallbackError} (${res.status})`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Authentication
  async login(email: string, password: string, portal: 'customer' | 'admin' = 'customer'): Promise<AuthResponse> {
    try {
      return await safeFetch<AuthResponse>(
        `${API_BASE}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, portal }),
        },
        'Failed to login'
      );
    } catch (err: any) {
      // If server error / 404 on Vercel static routing, fallback to localStore
      console.warn('Backend login unavailable, using local authentication store:', err.message);
      return localStore.login(email, password, portal);
    }
  },

  async register(name: string, email: string, password: string, phone?: string): Promise<AuthResponse> {
    try {
      return await safeFetch<AuthResponse>(
        `${API_BASE}/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, phone }),
        },
        'Failed to register'
      );
    } catch (err: any) {
      console.warn('Backend register unavailable, using local authentication store:', err.message);
      return localStore.register(name, email, password, phone);
    }
  },

  async getGoogleAuthUrl(): Promise<{ url: string; isConfigured: boolean }> {
    try {
      return await safeFetch<{ url: string; isConfigured: boolean }>(
        `${API_BASE}/auth/google/url`,
        undefined,
        'Failed to retrieve Google Auth configuration'
      );
    } catch {
      return { url: '', isConfigured: false };
    }
  },

  async googleDirectLogin(payload: { email: string; name?: string; image?: string; sub?: string }): Promise<AuthResponse> {
    try {
      return await safeFetch<AuthResponse>(
        `${API_BASE}/auth/google/direct`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        'Google Sign-In failed'
      );
    } catch {
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
    }
  },

  async getMe(tokenKey = 'tyt_auth_token'): Promise<User | null> {
    const token = localStorage.getItem(tokenKey);
    if (!token) return null;
    try {
      const data = await safeFetch<{ user: User }>(
        `${API_BASE}/auth/me`,
        { headers: { Authorization: `Bearer ${token}` } },
        'Failed to get current user'
      );
      return data?.user || null;
    } catch {
      try {
        const parsed = JSON.parse(atob(token));
        if (parsed && parsed.email) return parsed;
      } catch {}
      return null;
    }
  },

  // Cities
  async getCities(): Promise<City[]> {
    try {
      return await safeFetch<City[]>(`${API_BASE}/cities`, undefined, 'Failed to fetch cities');
    } catch {
      return localStore.getCities();
    }
  },

  // Hotels
  async getHotels(cityId?: string, query?: string): Promise<Hotel[]> {
    try {
      const params = new URLSearchParams();
      if (cityId) params.append('cityId', cityId);
      if (query) params.append('query', query);
      return await safeFetch<Hotel[]>(`${API_BASE}/hotels?${params.toString()}`, undefined, 'Failed to fetch hotels');
    } catch {
      return localStore.getHotels(cityId, query);
    }
  },

  async getHotelById(id: string): Promise<Hotel> {
    try {
      return await safeFetch<Hotel>(`${API_BASE}/hotels/${id}`, undefined, 'Hotel not found');
    } catch {
      const h = localStore.getHotelById(id);
      if (!h) throw new Error('Hotel not found');
      return h;
    }
  },

  // Packages
  async getPackages(category?: string, query?: string): Promise<Package[]> {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.append('category', category);
      if (query) params.append('query', query);
      return await safeFetch<Package[]>(`${API_BASE}/packages?${params.toString()}`, undefined, 'Failed to fetch packages');
    } catch {
      return localStore.getPackages(category, query);
    }
  },

  async getPackageById(id: string): Promise<Package> {
    try {
      return await safeFetch<Package>(`${API_BASE}/packages/${id}`, undefined, 'Package not found');
    } catch {
      const p = localStore.getPackageById(id);
      if (!p) throw new Error('Package not found');
      return p;
    }
  },

  // Inquiries
  async submitInquiry(inquiryData: Partial<Inquiry>): Promise<Inquiry> {
    try {
      const created = await safeFetch<Inquiry>(
        `${API_BASE}/inquiries`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inquiryData),
        },
        'Failed to submit inquiry'
      );
      // Sync local storage copy and trigger audio/visual broadcast alert
      localStore.submitInquiry(created);
      broadcastNewInquiry(created);
      return created;
    } catch {
      const fallback = localStore.submitInquiry(inquiryData);
      broadcastNewInquiry(fallback);
      return fallback;
    }
  },

  async getInquiries(userId?: string): Promise<Inquiry[]> {
    try {
      const url = userId ? `${API_BASE}/my-inquiries?userId=${encodeURIComponent(userId)}` : `${API_BASE}/inquiries`;
      return await safeFetch<Inquiry[]>(url, undefined, 'Failed to load inquiries');
    } catch {
      return localStore.getInquiries(userId);
    }
  },

  async getMyInquiries(userId: string): Promise<Inquiry[]> {
    try {
      return await safeFetch<Inquiry[]>(`${API_BASE}/my-inquiries?userId=${encodeURIComponent(userId)}`, undefined, 'Failed to load inquiries');
    } catch {
      return localStore.getInquiries(userId);
    }
  },

  // ================= ADMIN API =================
  async getAdminInquiries(): Promise<Inquiry[]> {
    try {
      return await safeFetch<Inquiry[]>(
        `${API_BASE}/admin/inquiries`,
        { headers: getAdminAuthHeader() },
        'Unauthorized or failed to fetch inquiries'
      );
    } catch {
      return localStore.getInquiries();
    }
  },

  async updateInquiryStatus(id: string, status: Inquiry['status']): Promise<Inquiry> {
    try {
      return await safeFetch<Inquiry>(
        `${API_BASE}/admin/inquiries/${id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeader(),
          },
          body: JSON.stringify({ status }),
        },
        'Failed to update inquiry status'
      );
    } catch {
      return localStore.updateInquiryStatus(id, status);
    }
  },

  async toggleInquiryStatus(id: string): Promise<Inquiry> {
    try {
      return await safeFetch<Inquiry>(
        `${API_BASE}/admin/inquiries/${id}/status`,
        {
          method: 'PATCH',
          headers: getAdminAuthHeader(),
        },
        'Failed to toggle inquiry status'
      );
    } catch {
      return localStore.toggleInquiryStatus(id);
    }
  },

  async deleteInquiry(id: string): Promise<boolean> {
    try {
      await safeFetch(
        `${API_BASE}/admin/inquiries/${id}`,
        {
          method: 'DELETE',
          headers: getAdminAuthHeader(),
        },
        'Failed to delete inquiry'
      );
      return true;
    } catch {
      return localStore.deleteInquiry(id);
    }
  },

  // Admin Hotels
  async createHotel(hotel: Partial<Hotel>): Promise<Hotel> {
    try {
      return await safeFetch<Hotel>(
        `${API_BASE}/admin/hotels`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeader(),
          },
          body: JSON.stringify(hotel),
        },
        'Failed to create hotel'
      );
    } catch {
      return localStore.createHotel(hotel);
    }
  },

  async updateHotel(id: string, hotel: Partial<Hotel>): Promise<Hotel> {
    try {
      return await safeFetch<Hotel>(
        `${API_BASE}/admin/hotels/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeader(),
          },
          body: JSON.stringify(hotel),
        },
        'Failed to update hotel'
      );
    } catch {
      return localStore.updateHotel(id, hotel);
    }
  },

  async deleteHotel(id: string): Promise<boolean> {
    try {
      await safeFetch(
        `${API_BASE}/admin/hotels/${id}`,
        {
          method: 'DELETE',
          headers: getAdminAuthHeader(),
        },
        'Failed to delete hotel'
      );
      return true;
    } catch {
      return localStore.deleteHotel(id);
    }
  },

  // Admin Packages
  async createPackage(pkg: Partial<Package>): Promise<Package> {
    try {
      return await safeFetch<Package>(
        `${API_BASE}/admin/packages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeader(),
          },
          body: JSON.stringify(pkg),
        },
        'Failed to create package'
      );
    } catch {
      return localStore.createPackage(pkg);
    }
  },

  async updatePackage(id: string, pkg: Partial<Package>): Promise<Package> {
    try {
      return await safeFetch<Package>(
        `${API_BASE}/admin/packages/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeader(),
          },
          body: JSON.stringify(pkg),
        },
        'Failed to update package'
      );
    } catch {
      return localStore.updatePackage(id, pkg);
    }
  },

  async deletePackage(id: string): Promise<boolean> {
    try {
      await safeFetch(
        `${API_BASE}/admin/packages/${id}`,
        {
          method: 'DELETE',
          headers: getAdminAuthHeader(),
        },
        'Failed to delete package'
      );
      return true;
    } catch {
      return localStore.deletePackage(id);
    }
  },

  // Admin Cities
  async createCity(city: Partial<City>): Promise<City> {
    try {
      return await safeFetch<City>(
        `${API_BASE}/admin/cities`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeader(),
          },
          body: JSON.stringify(city),
        },
        'Failed to create destination hub'
      );
    } catch {
      return localStore.createCity(city);
    }
  },

  async updateCity(id: string, city: Partial<City>): Promise<City> {
    try {
      return await safeFetch<City>(
        `${API_BASE}/admin/cities/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeader(),
          },
          body: JSON.stringify(city),
        },
        'Failed to update destination hub'
      );
    } catch {
      return localStore.updateCity(id, city);
    }
  },

  async deleteCity(id: string): Promise<boolean> {
    try {
      await safeFetch(
        `${API_BASE}/admin/cities/${id}`,
        {
          method: 'DELETE',
          headers: getAdminAuthHeader(),
        },
        'Failed to delete city'
      );
      return true;
    } catch {
      return localStore.deleteCity(id);
    }
  },

  // Reviews / Traveller Stories
  async getReviews(featuredOnly = false): Promise<Review[]> {
    try {
      const params = new URLSearchParams();
      if (featuredOnly) params.append('featured', 'true');
      return await safeFetch<Review[]>(`${API_BASE}/reviews?${params.toString()}`, undefined, 'Failed to fetch reviews');
    } catch {
      return localStore.getReviews(featuredOnly);
    }
  },

  async getAdminReviews(): Promise<Review[]> {
    try {
      return await safeFetch<Review[]>(
        `${API_BASE}/admin/reviews`,
        { headers: getAdminAuthHeader() },
        'Failed to fetch admin reviews'
      );
    } catch {
      return localStore.getReviews();
    }
  },

  async createReview(review: Partial<Review>): Promise<Review> {
    try {
      return await safeFetch<Review>(
        `${API_BASE}/admin/reviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeader(),
          },
          body: JSON.stringify(review),
        },
        'Failed to create review'
      );
    } catch {
      return localStore.createReview(review);
    }
  },

  async updateReview(id: string, review: Partial<Review>): Promise<Review> {
    try {
      return await safeFetch<Review>(
        `${API_BASE}/admin/reviews/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeader(),
          },
          body: JSON.stringify(review),
        },
        'Failed to update review'
      );
    } catch {
      return localStore.updateReview(id, review);
    }
  },

  async toggleReviewFeatured(id: string): Promise<Review> {
    try {
      return await safeFetch<Review>(
        `${API_BASE}/admin/reviews/${id}/featured`,
        {
          method: 'PATCH',
          headers: getAdminAuthHeader(),
        },
        'Failed to toggle featured status'
      );
    } catch {
      return localStore.toggleReviewFeatured(id);
    }
  },

  async deleteReview(id: string): Promise<boolean> {
    try {
      await safeFetch(
        `${API_BASE}/admin/reviews/${id}`,
        {
          method: 'DELETE',
          headers: getAdminAuthHeader(),
        },
        'Failed to delete review'
      );
      return true;
    } catch {
      return localStore.deleteReview(id);
    }
  },

  async resetData(): Promise<void> {
    try {
      await safeFetch(
        `${API_BASE}/admin/reset-data`,
        {
          method: 'POST',
          headers: getAdminAuthHeader(),
        },
        'Failed to reset data'
      );
    } catch {
      localStore.resetData();
    }
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
  const travelDeskNumber = '919876543210'; // Enterprise TirthYatraTrails Travel Desk WhatsApp
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
