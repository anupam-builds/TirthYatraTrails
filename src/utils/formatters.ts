/**
 * Utility formatters for CRM, Leads, and Inquiries
 */

export function formatSequentialLeadId(index: number): string {
  const safeIndex = Math.max(1, Math.floor(index || 1));
  return `TTT${String(safeIndex).padStart(8, '0')}`;
}

/**
 * Pre-computes deterministic sequential lead IDs (TTT00000001, TTT00000002, ...)
 * based on ascending chronological order of creation.
 * Returns a map from inquiry/lead id string to formatted sequential ID string.
 */
export function computeSequentialLeadIdMap(items: Array<{ id: string | number; createdAt?: string; created_at?: string }>): Map<string, string> {
  const map = new Map<string, string>();
  if (!items || items.length === 0) return map;

  // Sort chronologically ascending (oldest first gets TTT00000001, next gets TTT00000002, etc.)
  const sorted = [...items].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
    const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return String(a.id).localeCompare(String(b.id));
  });

  sorted.forEach((item, idx) => {
    const seqId = formatSequentialLeadId(idx + 1);
    map.set(String(item.id), seqId);
  });

  return map;
}

export function formatLeadId(rawId: any): string {
  if (!rawId) return 'TTT00000001';
  let str = String(rawId);

  // If already an 8-digit sequence like TTT00000001
  if (/^TTT\d{8}$/i.test(str)) {
    return str.toUpperCase();
  }

  // If numeric (e.g. integer 1, 2, 42)
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    if (!isNaN(num) && num > 0 && num < 100000000) {
      return formatSequentialLeadId(num);
    }
  }

  // Handle JS scientific notation conversion like 8.373...e+21 or TTT8.373...e+21
  if (str.toLowerCase().includes('e+')) {
    try {
      const stripped = str.replace(/^TTT/i, '');
      const numericVal = Number(stripped);
      if (!isNaN(numericVal)) {
        str = BigInt(Math.round(numericVal)).toString();
      } else {
        const directNum = Number(str);
        if (!isNaN(directNum)) {
          str = BigInt(Math.round(directNum)).toString();
        }
      }
    } catch {
      // fallback to original string
    }
  }

  return str.startsWith('TTT') ? str : `TTT${str}`;
}
