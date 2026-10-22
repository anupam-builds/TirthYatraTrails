import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useRouter } from '../../context/RouterContext.js';
import { SECURE_ADMIN_PORTAL_PATH } from '../../constants/routes.js';
import {
  WHATSAPP_BUSINESS_PHONE,
  WHATSAPP_DEFAULT_MESSAGE,
  getWhatsAppUrl,
} from '../../utils/whatsapp.js';

export const WhatsAppFloatingButton: React.FC = () => {
  const { path } = useRouter();
  const cleanPath = (path.split('?')[0].split('#')[0].replace(/\/+$/, '')) || '/';

  // Completely hide floating WhatsApp widget in admin panel and staff portal
  if (
    cleanPath.startsWith(SECURE_ADMIN_PORTAL_PATH) ||
    cleanPath.startsWith('/portal') ||
    cleanPath.startsWith('/management') ||
    cleanPath.startsWith('/admin') ||
    cleanPath.startsWith('/staff')
  ) {
    return null;
  }

  const [showTooltip, setShowTooltip] = useState(false);
  const whatsappUrl = getWhatsAppUrl(WHATSAPP_DEFAULT_MESSAGE);

  return (
    <div
      id="whatsapp-floating-widget"
      className="fixed bottom-6 right-6 z-50 flex items-center group select-none"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Expanded pill / tooltip */}
      <div
        className={`hidden sm:flex items-center gap-2 mr-3 px-3.5 py-2 bg-white dark:bg-[#0c1a2e] text-[#0f294a] dark:text-white rounded-full shadow-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold transition-all duration-300 pointer-events-none ${
          showTooltip
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-2'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
        <span>Chat with us • {WHATSAPP_BUSINESS_PHONE}</span>
      </div>

      {/* Main Circular Floating Anchor */}
      <a
        id="whatsapp-floating-button"
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Tirth Yatra Trails on WhatsApp"
        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#25D366]/40 cursor-pointer"
      >
        {/* Pulsing beacon glow ring */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366]/30 animate-ping opacity-75 pointer-events-none" />

        <MessageCircle className="w-7 h-7 relative z-10 fill-current" />
      </a>
    </div>
  );
};

export default WhatsAppFloatingButton;
