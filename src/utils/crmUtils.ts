import { Inquiry, InquiryStatus } from '../types.js';
import { formatLeadId, formatSequentialLeadId, computeSequentialLeadIdMap } from './formatters.js';

export { formatLeadId, formatSequentialLeadId, computeSequentialLeadIdMap };

export interface StatusConfig {
  key: InquiryStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const CRM_STATUS_CONFIG: Record<InquiryStatus, StatusConfig> = {
  NEW: {
    key: 'NEW',
    label: 'New',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
  CONTACTED: {
    key: 'CONTACTED',
    label: 'Contacted',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800',
    dotClass: 'bg-blue-500',
  },
  CONFIRMED: {
    key: 'CONFIRMED',
    label: 'Confirmed',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  TRIP: {
    key: 'TRIP',
    label: 'Trip',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800',
    dotClass: 'bg-purple-500',
  },
  Trip: {
    key: 'TRIP',
    label: 'Trip',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800',
    dotClass: 'bg-purple-500',
  },
  CLOSED: {
    key: 'CLOSED',
    label: 'Closed',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-400',
  },
  // Legacy aliases mapped for safety and backward-compatibility
  IN_PROGRESS: {
    key: 'CONTACTED',
    label: 'Contacted',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800',
    dotClass: 'bg-blue-500',
  },
  QUOTATION_SENT: {
    key: 'CONTACTED',
    label: 'Contacted',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800',
    dotClass: 'bg-blue-500',
  },
  ONLY_QUERY: {
    key: 'NEW',
    label: 'New',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
  WON: {
    key: 'CONFIRMED',
    label: 'Confirmed',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  LOST: {
    key: 'CLOSED',
    label: 'Closed',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-400',
  },
};

/**
 * Admin status list matching the Admin Dashboard: NEW, CONTACTED, CONFIRMED, TRIP, CLOSED (5 options)
 */
export const ADMIN_CRM_STATUS_LIST: InquiryStatus[] = [
  'NEW',
  'CONTACTED',
  'CONFIRMED',
  'TRIP',
  'CLOSED',
];

/**
 * Staff status list: NEW, CONTACTED, CONFIRMED, TRIP, CLOSED (5 synchronized options)
 */
export const STAFF_CRM_STATUS_LIST: InquiryStatus[] = [
  'NEW',
  'CONTACTED',
  'CONFIRMED',
  'TRIP',
  'CLOSED',
];

export const CRM_STATUS_LIST: InquiryStatus[] = ADMIN_CRM_STATUS_LIST;

/**
 * Normalizes any legacy or arbitrary status into the standard statuses
 */
export function normalizeInquiryStatus(status?: string): InquiryStatus {
  if (!status) return 'NEW';
  const s = status.toUpperCase().trim();
  if (s === 'TRIP') return 'TRIP';
  if (s === 'CONFIRMED' || s === 'WON') return 'CONFIRMED';
  if (s === 'CLOSED' || s === 'LOST') return 'CLOSED';
  if (s === 'CONTACTED' || s === 'IN_PROGRESS' || s === 'QUOTATION_SENT') return 'CONTACTED';
  return 'NEW';
}

/**
 * Calculates reminder due status and human-friendly time label
 */
export function getLeadReminderStatus(reminderAt?: string): {
  isSet: boolean;
  isDue: boolean;
  isOverdue: boolean;
  label: string;
  diffMinutes: number;
} {
  if (!reminderAt) {
    return { isSet: false, isDue: false, isOverdue: false, label: '', diffMinutes: 0 };
  }
  try {
    const target = new Date(reminderAt);
    if (isNaN(target.getTime())) {
      return { isSet: false, isDue: false, isOverdue: false, label: '', diffMinutes: 0 };
    }
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));

    const formattedTime = target.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const formattedDate = target.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });

    if (diffMs <= 0) {
      const overdueMinutes = Math.abs(diffMinutes);
      return {
        isSet: true,
        isDue: true,
        isOverdue: true,
        diffMinutes,
        label: overdueMinutes < 2 ? 'Due now' : `${overdueMinutes}m overdue (${formattedTime})`,
      };
    } else if (diffMinutes <= 30) {
      return {
        isSet: true,
        isDue: false,
        isOverdue: false,
        diffMinutes,
        label: `In ${diffMinutes}m (${formattedTime})`,
      };
    } else {
      return {
        isSet: true,
        isDue: false,
        isOverdue: false,
        diffMinutes,
        label: `${formattedDate}, ${formattedTime}`,
      };
    }
  } catch {
    return { isSet: false, isDue: false, isOverdue: false, label: '', diffMinutes: 0 };
  }
}

export const ACCOMMODATION_TIERS = [
  '2 Star Standard',
  '3 Star Standard',
  '3 Star Premium',
  '4 Star Luxury',
  '5 Star Heritage',
];

export interface AccommodationTierInfo {
  category: 'Budget Hotels' | 'Premium';
  name: string;
  stars: number;
  starString: string;
  badgeClass: string;
  chipClass: string;
  iconColor: string;
}

/**
 * Parses and categorizes any raw accommodation tier string into structured category and display metadata
 */
export function parseAccommodationTier(tierRaw?: string): AccommodationTierInfo {
  const t = (tierRaw || '').trim();
  const lower = t.toLowerCase();

  // 1. Budget Hotels
  if (lower.includes('2 star') || lower.includes('yatri niwas') || lower.includes('dharamshala') || lower.includes('economy')) {
    return {
      category: 'Budget Hotels',
      name: '2 Star Standard',
      stars: 2,
      starString: '★★',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
      chipClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
      iconColor: 'text-amber-500',
    };
  }

  if (lower === '3 star standard' || lower === '3 star' || lower === '3 star hotel' || lower.includes('standard')) {
    return {
      category: 'Budget Hotels',
      name: '3 Star Standard',
      stars: 3,
      starString: '★★★',
      badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
      chipClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
      iconColor: 'text-emerald-600',
    };
  }

  // 2. Premium
  if (lower.includes('5 star') || lower.includes('heritage') || lower.includes('palace')) {
    return {
      category: 'Premium',
      name: '5 Star Heritage',
      stars: 5,
      starString: '★★★★★',
      badgeClass: 'bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
      chipClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
      iconColor: 'text-purple-600',
    };
  }

  if (lower.includes('4 star') || lower.includes('luxury') || lower.includes('deluxe')) {
    return {
      category: 'Premium',
      name: '4 Star Luxury',
      stars: 4,
      starString: '★★★★',
      badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800',
      chipClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
      iconColor: 'text-indigo-600',
    };
  }

  // Default to 3 Star Premium
  return {
    category: 'Premium',
    name: t || '3 Star Premium',
    stars: 3,
    starString: '★★★',
    badgeClass: 'bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800',
    chipClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300',
    iconColor: 'text-orange-600',
  };
}

/**
 * Returns or generates a deterministic unique alphanumeric Lead ID formatted as TTT00000001.
 */
export function getLeadId(inquiry: Partial<Inquiry>): string {
  if (inquiry.leadId && inquiry.leadId.trim().length > 0) {
    // Migrate any legacy TTX prefix to TTT
    const raw = inquiry.leadId.startsWith('TTX') ? inquiry.leadId.replace(/^TTX/, 'TTT') : inquiry.leadId;
    return formatLeadId(raw);
  }
  if (!inquiry.id) {
    return 'TTT00000001';
  }
  const idStr = String(inquiry.id);
  if (idStr.toLowerCase().includes('e+')) {
    return formatLeadId(idStr);
  }
  // Try extracting numeric portion if id is like inq-101
  const digitsMatch = idStr.match(/\d+/g);
  if (digitsMatch) {
    const rawNumber = parseInt(digitsMatch.join(''), 10);
    if (!isNaN(rawNumber) && !rawNumber.toString().includes('e+')) {
      const padded = (rawNumber > 0 ? rawNumber : 1).toString().padStart(8, '0');
      return `TTT${padded}`;
    }
  }

  return formatLeadId(idStr);
}

/**
 * Formats guests into compact CRM Pax count (e.g. "8A 0C", "4A 2C")
 */
export function formatPaxCount(inquiry: Partial<Inquiry>): string {
  const adults = inquiry.adults !== undefined ? inquiry.adults : (inquiry.guests || 2);
  const children = inquiry.children !== undefined ? inquiry.children : 0;
  return `${adults}A ${children}C`;
}

/**
 * Formats dates cleanly for CRM tables & detail modals
 */
export function formatCrmDate(dateStr?: string): string {
  if (!dateStr) return 'Flexible / TBD';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats submission timestamp with time (e.g., "15 Sep 2026, 02:45 PM")
 */
export function formatCrmTimestamp(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

/**
 * Normalizes and cleans phone numbers for direct WhatsApp links
 * Handles 10-digit Indian numbers, international formats, and stripping extraneous symbols
 */
export function cleanPhoneNumberForWhatsApp(phone?: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Remove leading zeros (e.g. 09876543210 -> 9876543210)
  digits = digits.replace(/^0+/, '');

  // 10 digits (standard Indian mobile format) -> prepend country code 91
  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

/**
 * Generates a pre-filled direct WhatsApp link for reaching out to a customer from Admin/Staff
 */
export function generateCustomerWhatsAppLink(
  inquiry: Partial<Inquiry>,
  staffName?: string
): { url: string; phone: string; message: string } | null {
  const lead = inquiry as any;
  const rawPhone =
    lead.whatsapp_number ||
    lead.phone ||
    lead.metadata?.whatsapp_number ||
    lead.metadata?.phone ||
    inquiry.customerPhone ||
    inquiry.whatsappNumber ||
    '';
  const cleanedPhone = cleanPhoneNumberForWhatsApp(rawPhone);
  if (!cleanedPhone) return null;

  const pilgrimName = inquiry.customerName || inquiry.fullName || 'Pilgrim';
  const leadId = getLeadId(inquiry);
  const title = inquiry.title || (inquiry.type === 'HOTEL' ? 'Hotel & Stay Booking' : 'Holy Yatra Pilgrimage Package');
  const dateStr = inquiry.checkInDate ? ` for travel on ${formatCrmDate(inquiry.checkInDate)}` : '';
  const sender = staffName ? ` (${staffName})` : '';

  const message = `Namaste ${pilgrimName}, reaching out from TirthYatraTrails${sender} regarding your inquiry for ${title}${dateStr} [Lead ID: ${leadId}]. How may we assist you with your sacred journey?`;

  const url = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
  return { url, phone: cleanedPhone, message };
}

