import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api, generateWhatsAppLink } from '../../services/api.js';
import confetti from 'canvas-confetti';
import { LocationAutocompleteInput } from './LocationAutocompleteInput.js';
import {
  X,
  MessageCircle,
  Calendar,
  Users,
  MapPin,
  CheckCircle2,
  Sparkles,
  Phone,
  User as UserIcon,
  Mail,
  FileText,
  Plus,
  Minus,
} from 'lucide-react';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'HOTEL' | 'PACKAGE';
  referenceId: string;
  defaultPlan?: string;
  price?: number;
  defaultAdults?: number;
  defaultChildren?: number;
  defaultChildAges?: number[];
  defaultCheckInDate?: string;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  title,
  type,
  referenceId,
  defaultPlan = '',
  price,
  defaultAdults = 2,
  defaultChildren = 0,
  defaultChildAges = [],
  defaultCheckInDate,
}) => {
  const { customerUser } = useAuth();
  const [fullName, setFullName] = useState(customerUser?.name || '');
  const [email, setEmail] = useState(customerUser?.email || '');
  const [whatsappNumber, setWhatsappNumber] = useState(customerUser?.phone || '+91 ');
  const [userCity, setUserCity] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [checkInDate, setCheckInDate] = useState(() => {
    if (defaultCheckInDate) return defaultCheckInDate;
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const [adults, setAdults] = useState<number>(defaultAdults);
  const [childAges, setChildAges] = useState<number[]>(() => {
    if (defaultChildAges && defaultChildAges.length > 0) {
      return [...defaultChildAges];
    }
    if (defaultChildren > 0) {
      return Array(defaultChildren).fill(0);
    }
    return [];
  });

  const [planChosen, setPlanChosen] = useState(defaultPlan);
  const [specialRequests, setSpecialRequests] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedLink, setSubmittedLink] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (customerUser) {
        if (!fullName) setFullName(customerUser.name || '');
        if (!email) setEmail(customerUser.email || '');
        if (customerUser.phone && whatsappNumber === '+91 ') setWhatsappNumber(customerUser.phone);
      }
      if (defaultAdults) setAdults(defaultAdults);
      if (defaultChildAges && defaultChildAges.length > 0) {
        setChildAges([...defaultChildAges]);
      } else if (defaultChildren > 0) {
        setChildAges(Array(defaultChildren).fill(0));
      }
      if (defaultCheckInDate) setCheckInDate(defaultCheckInDate);
    }
  }, [isOpen, defaultAdults, defaultChildren, defaultChildAges, defaultCheckInDate, customerUser]);

  if (!isOpen) return null;

  const handleAddChild = () => {
    setChildAges((prev) => [...prev, 0]);
  };

  const handleRemoveChild = () => {
    setChildAges((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  };

  const handleChildAgeChange = (index: number, newAge: number) => {
    setChildAges((prev) => {
      const updated = [...prev];
      updated[index] = newAge;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !whatsappNumber.trim()) {
      setErrorMsg('Please enter your full name and WhatsApp number.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const totalGuests = adults + childAges.length;

      // 1. Submit to database store
      await api.submitInquiry({
        userId: customerUser?.id,
        type,
        referenceId,
        referenceName: title,
        fullName: fullName.trim(),
        email: email.trim(),
        whatsappNumber: whatsappNumber.trim(),
        userCity: userCity.trim(),
        pickupLocation: pickupLocation.trim(),
        dropoffLocation: dropoffLocation.trim(),
        checkInDate,
        guests: totalGuests,
        adults: adults,
        children: childAges.length,
        childAges: JSON.stringify(childAges),
        planChosen: planChosen || defaultPlan,
        specialRequests: specialRequests.trim(),
      });

      // 2. Generate WhatsApp link with child ages
      const waLink = generateWhatsAppLink({
        title,
        type,
        fullName,
        phone: whatsappNumber,
        checkInDate,
        pickupLocation: pickupLocation.trim(),
        dropoffLocation: dropoffLocation.trim(),
        adults,
        children: childAges.length,
        childAges: childAges,
        plan: planChosen || defaultPlan,
        specialRequests,
      });

      setSubmittedLink(waLink);
      setSuccess(true);

      // 3. Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ea580c', '#0f294a', '#fbbf24', '#ffffff'],
        });
      } catch {}
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalPilgrims = adults + childAges.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-orange-100 overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0f294a] text-white p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-white shadow-xs p-0.5 aspect-square flex items-center justify-center shrink-0">
              <img
                src="/logo.svg"
                alt="TirthYatraTrails.in Logo"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instant Travel Desk Coordination</span>
            </div>
          </div>

          <h3 className="text-xl font-extrabold text-white leading-snug">{title}</h3>
          {price && (
            <p className="text-xs text-slate-300 mt-1">
              Starting from <span className="text-orange-400 font-bold">₹{price.toLocaleString('en-IN')}</span> per person/night
            </p>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto">
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-bold text-[#0f294a]">Booking Request Logged!</h4>
                <p className="text-sm text-slate-600 max-w-sm mx-auto">
                  Your inquiry has been successfully registered in our enterprise desk system. Click below to connect with our Pilgrimage Officer on WhatsApp for live confirmation.
                </p>
              </div>

              <div className="pt-3 space-y-2">
                <a
                  href={submittedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition-all text-base"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Open WhatsApp Travel Desk</span>
                </a>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Done / Close Window
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                  {errorMsg}
                </div>
              )}

              {/* Full Name & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Email & Home City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your City / Origin</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Mumbai / Delhi"
                      value={userCity}
                      onChange={(e) => setUserCity(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Pickup & Drop-off Locations with Real-Time Address & PIN Autocomplete */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LocationAutocompleteInput
                  id="inquiry-pickup-location"
                  label="Pickup Location"
                  placeholder="e.g., Station, Airport, or PIN"
                  value={pickupLocation}
                  onChange={(val) => setPickupLocation(val)}
                  iconType="pickup"
                  accentColor="emerald"
                />

                <LocationAutocompleteInput
                  id="inquiry-dropoff-location"
                  label="Drop-off Location"
                  placeholder="e.g., Temple, Hotel, or PIN"
                  value={dropoffLocation}
                  onChange={(val) => setDropoffLocation(val)}
                  iconType="dropoff"
                  accentColor="orange"
                />
              </div>

              {/* Travel Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estimated Travel / Check-in Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="date"
                    required
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Adults & Children Selection Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs font-bold text-[#0f294a]">Guests Breakdown</span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Total: {totalPilgrims} {totalPilgrims === 1 ? 'Pilgrim' : 'Pilgrims'}
                  </span>
                </div>

                {/* Adults Counter */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#0f294a]">Adults</p>
                    <p className="text-[10px] text-slate-400">Ages 18+</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                      disabled={adults <= 1}
                      className="w-7 h-7 rounded-full bg-white border border-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-700"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-[#0f294a] w-5 text-center">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults((prev) => prev + 1)}
                      className="w-7 h-7 rounded-full bg-orange-100 text-[#ea580c] flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Children Counter */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#0f294a]">Children</p>
                    <p className="text-[10px] text-slate-400">Ages 0 to 17 years</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRemoveChild}
                      disabled={childAges.length === 0}
                      className="w-7 h-7 rounded-full bg-white border border-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-700"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-[#0f294a] w-5 text-center">
                      {childAges.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddChild}
                      className="w-7 h-7 rounded-full bg-orange-100 text-[#ea580c] flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dynamic Age Selectors Section */}
                {childAges.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#0f294a]">Age of children</p>
                      <span className="text-[10px] font-semibold text-[#ea580c] bg-orange-100 px-2 py-0.5 rounded-full">
                        {childAges.length} {childAges.length === 1 ? 'Child' : 'Children'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {childAges.map((age, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700">
                            Child {idx + 1} Age
                          </label>
                          <select
                            value={age}
                            onChange={(e) => handleChildAgeChange(idx, Number(e.target.value))}
                            className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                          >
                            <option value={0}>0 (Under 1)</option>
                            {Array.from({ length: 17 }, (_, i) => i + 1).map((val) => (
                              <option key={val} value={val}>
                                {val}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Special Puja / Senior Citizen / Wheelchair / Meal Requests
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. VIP darshan passes needed, senior citizens traveling, pure Jain meals..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full font-bold bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-lg shadow-orange-500/25 transition-all text-sm disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{loading ? 'Submitting...' : 'Send Inquiry & Connect on WhatsApp'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
