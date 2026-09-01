import { City, Hotel, Package, Inquiry, User, AuthResponse, Review } from '../types.js';

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
    throw new Error(err.message || 'Network connection error. Please check your internet.');
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
    // Response is text or HTML (e.g. server error page or 404)
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    if (!res.ok) {
      if (text.startsWith('<') || text.includes('The page c') || text.includes('<!DOCTYPE')) {
        throw new Error(`Server returned error (${res.status}): Please check endpoint availability.`);
      }
      throw new Error(text || `${fallbackError} (${res.status})`);
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
    return safeFetch<AuthResponse>(
      `${API_BASE}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal }),
      },
      'Failed to login'
    );
  },

  async register(name: string, email: string, password: string, phone?: string): Promise<AuthResponse> {
    return safeFetch<AuthResponse>(
      `${API_BASE}/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      },
      'Failed to register'
    );
  },

  async getGoogleAuthUrl(): Promise<{ url: string; isConfigured: boolean }> {
    return safeFetch<{ url: string; isConfigured: boolean }>(
      `${API_BASE}/auth/google/url`,
      undefined,
      'Failed to retrieve Google Auth configuration'
    );
  },

  async googleDirectLogin(payload: { email: string; name?: string; image?: string; sub?: string }): Promise<AuthResponse> {
    return safeFetch<AuthResponse>(
      `${API_BASE}/auth/google/direct`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Google Sign-In failed'
    );
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
      return null;
    }
  },

  // Cities
  async getCities(): Promise<City[]> {
    return safeFetch<City[]>(`${API_BASE}/cities`, undefined, 'Failed to fetch cities');
  },

  // Hotels
  async getHotels(cityId?: string, query?: string): Promise<Hotel[]> {
    const params = new URLSearchParams();
    if (cityId) params.append('cityId', cityId);
    if (query) params.append('query', query);
    return safeFetch<Hotel[]>(`${API_BASE}/hotels?${params.toString()}`, undefined, 'Failed to fetch hotels');
  },

  async getHotelById(id: string): Promise<Hotel> {
    return safeFetch<Hotel>(`${API_BASE}/hotels/${id}`, undefined, 'Hotel not found');
  },

  // Packages
  async getPackages(category?: string, query?: string): Promise<Package[]> {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (query) params.append('query', query);
    return safeFetch<Package[]>(`${API_BASE}/packages?${params.toString()}`, undefined, 'Failed to fetch packages');
  },

  async getPackageById(id: string): Promise<Package> {
    return safeFetch<Package>(`${API_BASE}/packages/${id}`, undefined, 'Package not found');
  },

  // Inquiries
  async submitInquiry(inquiryData: Partial<Inquiry>): Promise<Inquiry> {
    return safeFetch<Inquiry>(
      `${API_BASE}/inquiries`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inquiryData),
      },
      'Failed to submit inquiry'
    );
  },

  async getInquiries(userId?: string): Promise<Inquiry[]> {
    const url = userId ? `${API_BASE}/my-inquiries?userId=${encodeURIComponent(userId)}` : `${API_BASE}/inquiries`;
    return safeFetch<Inquiry[]>(url, undefined, 'Failed to load inquiries');
  },

  async getMyInquiries(userId: string): Promise<Inquiry[]> {
    return safeFetch<Inquiry[]>(`${API_BASE}/my-inquiries?userId=${encodeURIComponent(userId)}`, undefined, 'Failed to load inquiries');
  },

  // ================= ADMIN API =================
  async getAdminInquiries(): Promise<Inquiry[]> {
    return safeFetch<Inquiry[]>(
      `${API_BASE}/admin/inquiries`,
      { headers: getAdminAuthHeader() },
      'Unauthorized or failed to fetch inquiries'
    );
  },

  async updateInquiryStatus(id: string, status: Inquiry['status']): Promise<Inquiry> {
    return safeFetch<Inquiry>(
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
  },

  async toggleInquiryStatus(id: string): Promise<Inquiry> {
    return safeFetch<Inquiry>(
      `${API_BASE}/admin/inquiries/${id}/status`,
      {
        method: 'PATCH',
        headers: getAdminAuthHeader(),
      },
      'Failed to toggle inquiry status'
    );
  },

  async deleteInquiry(id: string): Promise<boolean> {
    await safeFetch(
      `${API_BASE}/admin/inquiries/${id}`,
      {
        method: 'DELETE',
        headers: getAdminAuthHeader(),
      },
      'Failed to delete inquiry'
    );
    return true;
  },

  // Admin Hotels
  async createHotel(hotel: Partial<Hotel>): Promise<Hotel> {
    return safeFetch<Hotel>(
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
  },

  async updateHotel(id: string, hotel: Partial<Hotel>): Promise<Hotel> {
    return safeFetch<Hotel>(
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
  },

  async deleteHotel(id: string): Promise<boolean> {
    await safeFetch(
      `${API_BASE}/admin/hotels/${id}`,
      {
        method: 'DELETE',
        headers: getAdminAuthHeader(),
      },
      'Failed to delete hotel'
    );
    return true;
  },

  // Admin Packages
  async createPackage(pkg: Partial<Package>): Promise<Package> {
    return safeFetch<Package>(
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
  },

  async updatePackage(id: string, pkg: Partial<Package>): Promise<Package> {
    return safeFetch<Package>(
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
  },

  async deletePackage(id: string): Promise<boolean> {
    await safeFetch(
      `${API_BASE}/admin/packages/${id}`,
      {
        method: 'DELETE',
        headers: getAdminAuthHeader(),
      },
      'Failed to delete package'
    );
    return true;
  },

  // Admin Cities
  async createCity(city: Partial<City>): Promise<City> {
    return safeFetch<City>(
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
  },

  async updateCity(id: string, city: Partial<City>): Promise<City> {
    return safeFetch<City>(
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
  },

  async deleteCity(id: string): Promise<boolean> {
    await safeFetch(
      `${API_BASE}/admin/cities/${id}`,
      {
        method: 'DELETE',
        headers: getAdminAuthHeader(),
      },
      'Failed to delete city'
    );
    return true;
  },

  // Reviews / Traveller Stories
  async getReviews(featuredOnly = false): Promise<Review[]> {
    const params = new URLSearchParams();
    if (featuredOnly) params.append('featured', 'true');
    return safeFetch<Review[]>(`${API_BASE}/reviews?${params.toString()}`, undefined, 'Failed to fetch reviews');
  },

  async getAdminReviews(): Promise<Review[]> {
    return safeFetch<Review[]>(
      `${API_BASE}/admin/reviews`,
      { headers: getAdminAuthHeader() },
      'Failed to fetch admin reviews'
    );
  },

  async createReview(review: Partial<Review>): Promise<Review> {
    return safeFetch<Review>(
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
  },

  async updateReview(id: string, review: Partial<Review>): Promise<Review> {
    return safeFetch<Review>(
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
  },

  async toggleReviewFeatured(id: string): Promise<Review> {
    return safeFetch<Review>(
      `${API_BASE}/admin/reviews/${id}/featured`,
      {
        method: 'PATCH',
        headers: getAdminAuthHeader(),
      },
      'Failed to toggle featured status'
    );
  },

  async deleteReview(id: string): Promise<boolean> {
    await safeFetch(
      `${API_BASE}/admin/reviews/${id}`,
      {
        method: 'DELETE',
        headers: getAdminAuthHeader(),
      },
      'Failed to delete review'
    );
    return true;
  },

  async resetData(): Promise<void> {
    await safeFetch(
      `${API_BASE}/admin/reset-data`,
      {
        method: 'POST',
        headers: getAdminAuthHeader(),
      },
      'Failed to reset data'
    );
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
      // Map 0 to "Under 1" if displayed or numerical age
      const formattedAges = parsedAges.map((a) => (Number(a) === 0 ? 'Under 1' : a));
      guestsFormatted += ` (Ages: ${formattedAges.join(', ')})`;
    }
  }

  const displayPlan = details.plan || '';
  const displayNotes = details.specialRequests || details.notes || '';

  const text = encodeURIComponent(
    `*Namaste TirthYatraTrails Travel Desk!*\n\n` +
    `I would like to check availability and get an instant quote for:\n` +
    `🛕 *${details.type === 'HOTEL' ? 'Hotel Booking' : 'Pilgrimage Package'}*: ${displayTitle}\n` +
    `👤 *Name*: ${displayName}\n` +
    `📱 *WhatsApp*: ${displayPhone}\n` +
    `📅 *Check-In / Travel Date*: ${displayDate}\n` +
    `👥 *Guests*: ${guestsFormatted}\n` +
    (displayPlan ? `🍽️ *Chosen Plan*: ${displayPlan}\n` : '') +
    (displayNotes ? `📝 *Notes/Puja Requests*: ${displayNotes}\n\n` : '\n') +
    `Please share the customized quotation and verified darshan availability at your earliest convenience.`
  );
  return `https://wa.me/${travelDeskNumber}?text=${text}`;
}
