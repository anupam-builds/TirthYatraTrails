import React from 'react';
import { X, User, Phone, Mail, MapPin, Calendar, Users, Hotel, Sparkles, MessageCircle } from 'lucide-react';

interface LeadDetailsModalProps {
  lead: any | null;
  onClose: () => void;
}

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ lead, onClose }) => {
  if (!lead) return null;
  const meta = lead.metadata || {};

  const fullName = lead.full_name || lead.name || lead.fullName || lead.customerName || 'N/A';
  const whatsappNum = lead.whatsapp_number || lead.phone || lead.metadata?.whatsapp_number || lead.metadata?.phone || lead.whatsappNumber || lead.customerPhone || meta.whatsapp_number || meta.phone || '';
  const email = lead.email || lead.customerEmail || 'N/A';
  const residentStateCity = meta.resident_state || lead.resident_state || lead.city || lead.userCity || 'N/A';

  const packageInterest = meta.package_interest || lead.package_name || lead.packageName || lead.title || 'N/A';
  const startDate = meta.start_date || lead.start_date || lead.checkInDate || lead.arrival_date || 'Flexible / TBD';
  const duration = meta.duration || lead.duration || 'Standard Itinerary';
  const adults = meta.adults ?? lead.adults ?? 1;
  const children = meta.children ?? lead.children ?? 0;
  const pickupCity = meta.pickup_city || lead.pickup_city || lead.pickupLocation || 'N/A';
  const dropCity = meta.drop_city || lead.drop_city || lead.dropoffLocation || 'Same as pickup';

  const accommodationTier = meta.accommodation_tier || lead.accommodation_tier || lead.accommodationTier || lead.plan || lead.selectedPlan || '3 Star Premium';
  const specialRequests = meta.special_requests || lead.special_requests || lead.specialRequests || lead.message || 'No special requests specified.';

  const handleOpenWhatsApp = () => {
    const rawPhone = whatsappNum.replace(/\D/g, '');
    if (!rawPhone) return;
    const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = `Namaste ${fullName}, regarding your sacred pilgrimage inquiry (${lead.id}) with Tirth Yatra. How may our pilgrimage desk assist you today?`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div
      id="lead-details-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="lead-details-drawer"
        className="w-full max-w-lg h-full bg-slate-900 text-slate-100 p-6 overflow-y-auto shadow-2xl border-l border-slate-800 flex flex-col justify-between"
      >
        <div>
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <h3 className="text-lg font-extrabold text-orange-400">Yatra Lead Details</h3>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Reference ID: {lead.id}</p>
            </div>
            <button
              id="close-lead-details-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5 mt-6 text-sm">
            {/* 1. Contact Details */}
            <section className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs uppercase tracking-wider text-orange-300/90 font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-400" />
                  <span>1. Contact Details</span>
                </h4>
                {whatsappNum && (
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Full Name:</span>
                  <span className="font-bold text-white text-sm">{fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> WhatsApp / Phone:
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">{whatsappNum || 'No phone'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email:
                  </span>
                  <span className="text-slate-200 truncate max-w-[220px]">{email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Resident City/State:
                  </span>
                  <span className="text-slate-200 font-medium">{residentStateCity}</span>
                </div>
              </div>
            </section>

            {/* 2. Trip Details */}
            <section className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 shadow-xs">
              <h4 className="text-xs uppercase tracking-wider text-orange-300/90 font-bold mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                <span>2. Pilgrimage Trip Details</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Package / Sacred Circuit:</span>
                  <p className="font-bold text-orange-200 text-sm">{packageInterest}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block">Start Date:</span>
                    <span className="text-white font-semibold">{startDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Duration:</span>
                    <span className="text-white font-semibold">{duration}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Group Size:
                  </span>
                  <span className="text-slate-100 font-bold">
                    {adults} Adult{adults === 1 ? '' : 's'} • {children} Child{children === 1 ? '' : 'ren'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Pickup &amp; Drop:</span>
                  <span className="text-slate-200 text-right">
                    <span className="font-semibold text-white">{pickupCity}</span> → <span>{dropCity}</span>
                  </span>
                </div>
              </div>
            </section>

            {/* 3. Accommodation & Rituals */}
            <section className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 shadow-xs">
              <h4 className="text-xs uppercase tracking-wider text-orange-300/90 font-bold mb-3 flex items-center gap-1.5">
                <Hotel className="w-3.5 h-3.5 text-orange-400" />
                <span>3. Accommodation &amp; Special Requests</span>
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Accommodation Tier:</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-950/80 border border-orange-500/40 text-orange-300 font-extrabold text-[11px]">
                    <Sparkles className="w-3 h-3 text-orange-400" />
                    {accommodationTier}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs mb-1.5">Rituals / Notes (Dietary, Senior Citizen, Puja):</span>
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-slate-300 text-xs leading-relaxed italic">
                    "{specialRequests}"
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Tirth Yatra Pilgrimage CRM</span>
          <button
            id="close-lead-drawer-footer-btn"
            onClick={onClose}
            className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
