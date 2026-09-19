/**
 * Utility formatters for CRM, Leads, and Inquiries
 */

export function formatLeadId(rawId: any): string {
  if (!rawId) return 'N/A';
  let str = String(rawId);
  
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
