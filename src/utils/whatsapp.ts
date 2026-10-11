export const WHATSAPP_BUSINESS_PHONE = '+91 9235703798';
export const WHATSAPP_BUSINESS_PHONE_DIGITS = '919235703798';
export const WHATSAPP_DEFAULT_MESSAGE = 'Hello! I want to know more about Tirth Yatra Trails packages.';

/**
 * Builds a direct wa.me link with encoded pre-filled text.
 * Strips formatting symbols so WhatsApp opens cleanly on both mobile and web.
 */
export function getWhatsAppUrl(
  message: string = WHATSAPP_DEFAULT_MESSAGE,
  phone: string = WHATSAPP_BUSINESS_PHONE_DIGITS
): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '') || WHATSAPP_BUSINESS_PHONE_DIGITS;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds a pre-filled inquiry link tailored to a specific tour package.
 */
export function getPackageWhatsAppUrl(
  packageName: string,
  phone: string = WHATSAPP_BUSINESS_PHONE_DIGITS
): string {
  const title = packageName || 'Sacred Pilgrimage';
  const message = `Hi, I am interested in booking/learning more about the package: ${title}. Please share details.`;
  return getWhatsAppUrl(message, phone);
}
