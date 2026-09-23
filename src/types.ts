export type UserRole = 'USER' | 'ADMIN' | 'STAFF';

export interface StaffPermissions {
  canViewInquiries: boolean;
  canUpdateStatus: boolean;
  canAddNotes: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  designation?: string;
  role: 'STAFF' | 'ADMIN';
  isActive: boolean;
  isBlocked?: boolean;
  blockedAt?: string;
  blockedReason?: string;
  permissions: StaffPermissions;
  assignedLeadsCount?: number;
  lastLogin?: string;
  lastLoginIp?: string;
  lastLoginDevice?: string;
  lastActiveAt?: string;
  isCurrentlyLoggedIn?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  contactedCount?: number;
  closedCount?: number;
  notesCount?: number;
  createdAt: string;
}

export interface StaffActivityLog {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  action: 'LOGIN' | 'LOGOUT' | 'STATUS_UPDATE' | 'NOTE_ADDED' | 'BLOCKED' | 'UNBLOCKED' | 'PASSWORD_RESET';
  description: string;
  inquiryId?: string;
  details?: string;
  ipAddress?: string;
  device?: string;
  timestamp: string;
}

export interface StaffSessionMonitor {
  totalStaff: number;
  activeStaffCount: number;
  blockedStaffCount: number;
  currentlyLoggedInCount: number;
  sessions: Array<{
    staffId: string;
    staffName: string;
    staffEmail: string;
    designation?: string;
    isCurrentlyLoggedIn: boolean;
    lastActiveAt?: string;
    lastLogin?: string;
    ipAddress?: string;
    device?: string;
    isBlocked: boolean;
    contactedCount: number;
    closedCount: number;
    notesCount: number;
  }>;
}

export interface InquiryNote {
  id: string;
  authorId?: string;
  authorName: string;
  authorRole: 'ADMIN' | 'STAFF';
  text: string;
  createdAt: string;
}

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
  transitHubs?: TransitHub[];
  createdAt?: string;
  updatedAt?: string;
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
  createdAt?: string;
  updatedAt?: string;
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
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type HubType = 'AIRPORT' | 'RAILWAY_STATION' | 'BUS_TERMINAL' | 'HELIPAD';

export interface TransitHub {
  id: string;
  cityId: string;
  cityName?: string;
  name: string;
  hubType: HubType;
  code?: string; // e.g. "AYJ", "VNS", "DED"
  distanceToTempleKm?: number;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type InventoryStatus = 'AVAILABLE' | 'FAST_FILLING' | 'SOLD_OUT' | 'BLOCKED';

export interface HotelInventory {
  id: string;
  hotelId: string;
  hotelName?: string;
  roomId?: string;
  roomType: string;
  date: string; // YYYY-MM-DD
  totalInventory: number;
  bookedCount: number;
  blockedCount: number;
  availableCount: number;
  priceOverride?: number;
  status: InventoryStatus;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TravelStory {
  id: string;
  title: string;
  slug: string;
  authorName: string;
  authorRole?: string;
  excerpt?: string;
  content: string;
  destination?: string;
  coverImage?: string;
  tags?: string[];
  readTimeMinutes?: number;
  isPublished: boolean;
  publishedAt?: string;
  likesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type InquiryStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'QUOTATION_SENT'
  | 'ONLY_QUERY'
  | 'CONTACTED'
  | 'CONFIRMED'
  | 'WON'
  | 'LOST'
  | 'CLOSED';

export interface Inquiry {
  id: string;
  leadId?: string; // Unique alphanumeric Lead ID (e.g. "TTT00000001")
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
  phone?: string;
  whatsapp_number?: string;
  metadata?: Record<string, any>;
  userCity?: string;
  checkInDate: string;
  guests: number;
  adults: number;
  children?: number;
  childAges?: string | number[];
  planChosen?: string;
  selectedPlan?: string;
  plan?: string;
  accommodationTier?: string; // e.g. "3 Star Hotel", "4 Star Deluxe", "5 Star Luxury"
  pickupLocation?: string;
  dropoffLocation?: string;
  specialRequests?: string;
  status: InquiryStatus | string;
  isResolved: boolean;
  assignedStaffId?: string;
  assigned_staff_id?: string | null;
  assignedStaffName?: string;
  assigned_staff_name?: string | null;
  isLockedForStaff?: boolean;
  closedAt?: string;
  closedBy?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  notes?: string;
  followUpNotes?: InquiryNote[];
  customerRating?: number;
  tags?: string[];
  tourDuration?: string;
  companionMatchingOptIn?: boolean;
  companionPilgrimType?: 'SOLO_TRAVELER' | 'ELDERLY_PILGRIM' | 'MOTHER_DAUGHTER' | 'FAMILY_GROUP' | 'SPIRITUAL_SEEKER';
  companionNotes?: string;
  createdAt: string;
  updatedAt?: string;
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
  audioUrl?: string; // Base64 data URL or external audio URL
  audioDuration?: number; // duration in seconds
  audioTitle?: string; // short audio summary
  language?: string; // devotee voice language, e.g. "Hindi", "English", "Gujarati"
  createdAt: string;
  updatedAt?: string;
}

export type PilgrimType =
  | 'SOLO_TRAVELER'
  | 'ELDERLY_PILGRIM'
  | 'MOTHER_DAUGHTER'
  | 'FAMILY_GROUP'
  | 'SPIRITUAL_SEEKER'
  | 'elderly_pilgrim'
  | 'solo_traveler'
  | 'family_seeking_company'
  | 'spiritual_seeker'
  | 'specially_abled_companion';

export interface CompanionProfile {
  id: string;
  userId?: string;
  pilgrimName: string;
  fullName?: string;
  age?: number;
  gender?: 'MALE' | 'FEMALE' | 'ANY' | 'FAMILY' | 'male' | 'female' | 'other';
  pilgrimType: PilgrimType;
  cityOfOrigin: string;
  originCity?: string;
  destination: string; // e.g. "Kedarnath & Badrinath", "Kashi Vishwanath & Ayodhya", "Tirupati Balaji", etc.
  destinationCity?: string;
  travelMonth: string; // e.g. "October 2026", "November 2026"
  travelDates?: string;
  startDate?: string;
  endDate?: string;
  datesFlexible?: boolean;
  groupSize?: number;
  languages: string[];
  languagesSpoken?: string[];
  seekingDescription: string;
  description?: string;
  assistanceNeeded?: string[]; // e.g. ["Luggage Assistance", "Slow Walking Pace", "Shared Cab/Helicopter", "Pooja Coordination"]
  dietaryPreference?: string; // e.g. "Strict Sattvic", "Jain Food", "Vegetarian"
  contactPhone?: string;
  contactWhatsApp?: string;
  contactEmail?: string;
  contactPreference?: 'WHATSAPP' | 'IN_APP_MESSAGE' | 'PHONE_CALL';
  isVerified: boolean;
  emergencyContactListed?: boolean;
  status: 'OPEN' | 'MATCHED' | 'CLOSED' | 'active' | 'matched' | 'closed';
  avatarInitials?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CompanionConnection {
  id: string;
  companionProfileId?: string;
  targetProfileId?: string;
  senderName: string;
  senderPhone?: string;
  senderContact?: string;
  senderEmail?: string;
  senderCity?: string;
  senderType?: PilgrimType;
  message: string;
  proposedDates?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface CompanionSearchFilters {
  destination?: string;
  pilgrimType?: PilgrimType | 'ALL';
  travelMonth?: string;
  language?: string;
  assistanceNeeded?: string;
  searchQuery?: string;
}
