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

export const api = {
  // Authentication
  async login(email: string, password: string, portal: 'customer' | 'admin' = 'customer'): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, portal }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to login');
    return data;
  },

  async register(name: string, email: string, password: string, phone?: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register');
    return data;
  },

  async getGoogleAuthUrl(): Promise<{ url: string; isConfigured: boolean }> {
    const res = await fetch(`${API_BASE}/auth/google/url`);
    if (!res.ok) throw new Error('Failed to retrieve Google Auth configuration');
    return res.json();
  },

  async googleDirectLogin(payload: { email: string; name?: string; image?: string; sub?: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/google/direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google Sign-In failed');
    return data;
  },

  async getMe(tokenKey = 'tyt_auth_token'): Promise<User | null> {
    const token = localStorage.getItem(tokenKey);
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  },

  // Cities
  async getCities(): Promise<City[]> {
    const res = await fetch(`${API_BASE}/cities`);
    if (!res.ok) throw new Error('Failed to fetch cities');
    return res.json();
  },

  // Hotels
  async getHotels(cityId?: string, query?: string): Promise<Hotel[]> {
    const params = new URLSearchParams();
    if (cityId) params.append('cityId', cityId);
    if (query) params.append('query', query);
    const res = await fetch(`${API_BASE}/hotels?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch hotels');
    return res.json();
  },

  async getHotelById(id: string): Promise<Hotel> {
    const res = await fetch(`${API_BASE}/hotels/${id}`);
    if (!res.ok) throw new Error('Hotel not found');
    return res.json();
  },

  // Packages
  async getPackages(category?: string, query?: string): Promise<Package[]> {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (query) params.append('query', query);
    const res = await fetch(`${API_BASE}/packages?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch packages');
    return res.json();
  },

  async getPackageById(id: string): Promise<Package> {
    const res = await fetch(`${API_BASE}/packages/${id}`);
    if (!res.ok) throw new Error('Package not found');
    return res.json();
  },

  // Inquiries
  async submitInquiry(inquiryData: Partial<Inquiry>): Promise<Inquiry> {
    const res = await fetch(`${API_BASE}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiryData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit inquiry');
    return data;
  },

  async getInquiries(userId?: string): Promise<Inquiry[]> {
    const url = userId ? `${API_BASE}/my-inquiries?userId=${encodeURIComponent(userId)}` : `${API_BASE}/inquiries`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load inquiries');
    return res.json();
  },

  async getMyInquiries(userId: string): Promise<Inquiry[]> {
    const res = await fetch(`${API_BASE}/my-inquiries?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to load inquiries');
    return res.json();
  },

  // ================= ADMIN API =================
  async getAdminInquiries(): Promise<Inquiry[]> {
    const res = await fetch(`${API_BASE}/admin/inquiries`, {
      headers: getAdminAuthHeader(),
    });
    if (!res.ok) throw new Error('Unauthorized or failed to fetch inquiries');
    return res.json();
  },

  async updateInquiryStatus(id: string, status: Inquiry['status']): Promise<Inquiry> {
    const res = await fetch(`${API_BASE}/admin/inquiries/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update inquiry status');
    return res.json();
  },

  async toggleInquiryStatus(id: string): Promise<Inquiry> {
    const res = await fetch(`${API_BASE}/admin/inquiries/${id}/status`, {
      method: 'PATCH',
      headers: getAdminAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to toggle inquiry status');
    return res.json();
  },

  async deleteInquiry(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/admin/inquiries/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to delete inquiry');
    return true;
  },

  // Admin Hotels
  async createHotel(hotel: Partial<Hotel>): Promise<Hotel> {
    const res = await fetch(`${API_BASE}/admin/hotels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(hotel),
    });
    if (!res.ok) throw new Error('Failed to create hotel');
    return res.json();
  },

  async updateHotel(id: string, hotel: Partial<Hotel>): Promise<Hotel> {
    const res = await fetch(`${API_BASE}/admin/hotels/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(hotel),
    });
    if (!res.ok) throw new Error('Failed to update hotel');
    return res.json();
  },

  async deleteHotel(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/admin/hotels/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to delete hotel');
    return true;
  },

  // Admin Packages
  async createPackage(pkg: Partial<Package>): Promise<Package> {
    const res = await fetch(`${API_BASE}/admin/packages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(pkg),
    });
    if (!res.ok) throw new Error('Failed to create package');
    return res.json();
  },

  async updatePackage(id: string, pkg: Partial<Package>): Promise<Package> {
    const res = await fetch(`${API_BASE}/admin/packages/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(pkg),
    });
    if (!res.ok) throw new Error('Failed to update package');
    return res.json();
  },

  async deletePackage(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/admin/packages/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to delete package');
    return true;
  },

  // Admin Cities
  async createCity(city: Partial<City>): Promise<City> {
    const res = await fetch(`${API_BASE}/admin/cities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(city),
    });
    if (!res.ok) throw new Error('Failed to create destination hub');
    return res.json();
  },

  async updateCity(id: string, city: Partial<City>): Promise<City> {
    const res = await fetch(`${API_BASE}/admin/cities/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(city),
    });
    if (!res.ok) throw new Error('Failed to update destination hub');
    return res.json();
  },

  async deleteCity(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/admin/cities/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to delete city');
    return true;
  },

  // Reviews / Traveller Stories
  async getReviews(featuredOnly = false): Promise<Review[]> {
    const params = new URLSearchParams();
    if (featuredOnly) params.append('featured', 'true');
    const res = await fetch(`${API_BASE}/reviews?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  async getAdminReviews(): Promise<Review[]> {
    const res = await fetch(`${API_BASE}/admin/reviews`, {
      headers: getAdminAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin reviews');
    return res.json();
  },

  async createReview(review: Partial<Review>): Promise<Review> {
    const res = await fetch(`${API_BASE}/admin/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(review),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create review');
    return data;
  },

  async updateReview(id: string, review: Partial<Review>): Promise<Review> {
    const res = await fetch(`${API_BASE}/admin/reviews/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify(review),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update review');
    return data;
  },

  async toggleReviewFeatured(id: string): Promise<Review> {
    const res = await fetch(`${API_BASE}/admin/reviews/${id}/featured`, {
      method: 'PATCH',
      headers: getAdminAuthHeader(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle featured status');
    return data;
  },

  async deleteReview(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to delete review');
    return true;
  },

  async resetData(): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/reset-data`, {
      method: 'POST',
      headers: getAdminAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to reset data');
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
