export type UserRole = 'USER' | 'ADMIN';

export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  emailVerified?: string;
  image?: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
  accounts?: Account[];
}

export interface City {
  id: string;
  name: string;
  imageUrl: string;
  hotelCount: number;
  popularFor?: string;
  state?: string;
}

export interface Room {
  id: string;
  hotelId?: string;
  name: string;
  roomOnlyPrice: number;
  breakfastPrice: number;
  halfBoardPrice: number;
  fullBoardPrice: number;
  imageUrl: string;
  bedType?: string;
  capacity?: string;
}

export interface Hotel {
  id: string;
  cityId: string;
  cityName: string;
  name: string;
  starRating: number; // 1-5
  googleRating: number; // decimal e.g. 4.8
  reviewCount: number;
  address: string;
  description: string;
  images: string[];
  amenities: string[];
  basePrice: number;
  isTopRated: boolean;
  rooms: Room[];
  distanceToTemple?: string;
  darshanType?: string;
}

export interface PackageItineraryItem {
  day: number;
  title: string;
  desc: string;
}

export interface Package {
  id: string;
  title: string;
  location: string;
  duration: string; // e.g. "9 Nights 10 Days"
  bookedRank?: string; // e.g. "#1 Best Seller" or "Top Rated"
  imageUrl: string;
  galleryImages?: string[];
  startingPrice: number;
  overview: string;
  highlights: string[];
  cancellationPolicy: string;
  category: string; // "Char Dham" | "Varanasi Ayodhya" | "Jyotirlinga" | "South India" | "Pilgrimage" | "Himalayan"
  packageType?: string; // "Spiritual & Cultural"
  experienceLevel?: string; // "Comfort & Guided"
  hotelsLevel?: string; // "3 & 4 Star Deluxe"
  transfers?: string; // "AC Private Vehicle & Flights Included"
  itinerary?: PackageItineraryItem[];
}

export interface Inquiry {
  id: string;
  userId?: string;
  type: 'HOTEL' | 'PACKAGE';
  referenceId: string;
  referenceName: string;
  title: string;
  fullName: string;
  customerName: string;
  email: string;
  customerEmail: string;
  whatsappNumber: string;
  customerPhone: string;
  userCity?: string;
  checkInDate: string;
  guests: number;
  adults: number;
  children?: number;
  childAges?: string | number[];
  planChosen?: string;
  selectedPlan?: string;
  specialRequests?: string;
  status: 'NEW' | 'CONTACTED' | 'CONFIRMED' | 'CLOSED';
  isResolved: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SearchFilters {
  cityId?: string;
  checkIn?: string;
  checkOut?: string;
  adults: number;
  children: number;
  childAges?: number[];
  rooms: number;
  priceRange?: [number, number];
  starRating?: number;
  amenity?: string;
}

export interface Review {
  id: string;
  authorName: string;
  authorLocation: string;
  authorInitials?: string;
  rating: number;
  reviewText: string;
  destinationImage: string;
  isVerified: boolean;
  googleReviewUrl?: string;
  isFeatured: boolean;
  order: number;
  createdAt: string;
  updatedAt?: string;
}
