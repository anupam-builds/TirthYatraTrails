import { Inquiry, InquiryStatus } from '../types.js';

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
 * Admin status list matching the Admin Dashboard: NEW, CONTACTED, CONFIRMED, CLOSED (4 options)
 */
export const ADMIN_CRM_STATUS_LIST: InquiryStatus[] = [
  'NEW',
  'CONTACTED',
  'CONFIRMED',
  'CLOSED',
];

/**
 * Staff status list strictly restricted to: NEW, CONTACTED, CLOSED (3 options)
 */
export const STAFF_CRM_STATUS_LIST: InquiryStatus[] = [
  'NEW',
  'CONTACTED',
  'CLOSED',
];

export const CRM_STATUS_LIST: InquiryStatus[] = ADMIN_CRM_STATUS_LIST;

/**
 * Normalizes any legacy or arbitrary status into the standard statuses
 */
export function normalizeInquiryStatus(status?: string): InquiryStatus {
  if (!status) return 'NEW';
  const s = status.toUpperCase().trim();
  if (s === 'CONFIRMED' || s === 'WON') return 'CONFIRMED';
  if (s === 'CLOSED' || s === 'LOST') return 'CLOSED';
  if (s === 'CONTACTED' || s === 'IN_PROGRESS' || s === 'QUOTATION_SENT') return 'CONTACTED';
  return 'NEW';
}

export const ACCOMMODATION_TIERS = [
  '3 Star Hotel',
  '3 Star Premium',
  '4 Star Deluxe',
  '5 Star Luxury',
  'Heritage Palace',
  'Budget Yatri Niwas',
];

/**
 * Returns or generates a deterministic unique alphanumeric Lead ID formatted as TTT00000001.
 */
export function getLeadId(inquiry: Partial<Inquiry>): string {
  if (inquiry.leadId && inquiry.leadId.trim().length > 0) {
    // Migrate any legacy TTX prefix to TTT
    return inquiry.leadId.startsWith('TTX') ? inquiry.leadId.replace(/^TTX/, 'TTT') : inquiry.leadId;
  }
  if (!inquiry.id) {
    return 'TTT00000001';
  }
  // Try extracting numeric portion if id is like inq-101
  const digitsMatch = inquiry.id.match(/\d+/g);
  if (digitsMatch) {
    const rawNumber = parseInt(digitsMatch.join(''), 10);
    const padded = (rawNumber > 0 ? rawNumber : 1).toString().padStart(8, '0');
    return `TTT${padded}`;
  }

  // Fallback hash from string id
  let hash = 0;
  for (let i = 0; i < inquiry.id.length; i++) {
    hash = (hash * 31 + inquiry.id.charCodeAt(i)) >>> 0;
  }
  const counter = 1 + (hash % 99999999);
  return `TTT${counter.toString().padStart(8, '0')}`;
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
