import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { useAuth } from '../context/AuthContext.js';
import { api, generateWhatsAppLink } from '../services/api.js';
import { Package } from '../types.js';
import confetti from 'canvas-confetti';
import { LocationAutocompleteInput } from '../components/common/LocationAutocompleteInput.js';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Users,
  Compass,
  Building2,
  Star,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  MessageCircle,
  ArrowRight,
  ChevronRight,
  HeartHandshake,
  Send,
  Plus,
  Minus,
  AlertCircle,
  HelpCircle,
  Lock,
  RotateCcw,
} from 'lucide-react';

const ACCOMMODATION_TIERS = [
  {
    id: '3 Star',
    name: '3 Star Standard',
    tagline: 'Clean, verified boutique pilgrim hotels',
    desc: 'Attached bath, AC, hygienic pure-veg dining & proximity to temple ghats.',
    badge: 'Popular for budget Yatris',
    iconColor: 'text-amber-500',
  },
  {
    id: '3 Star Premium',
    name: '3 Star Premium',
    tagline: 'Superior spacious rooms & VIP service',
    desc: 'Upgraded modern amenities, priority check-in, complimentary satvik breakfast & evening aarti assistance.',
    badge: 'Best Value',
    iconColor: 'text-orange-500',
  },
  {
    id: '4 Star',
    name: '4 Star Luxury',
    tagline: 'Deluxe hospitality & temple transfers',
    desc: 'Full-service luxury pilgrimage resort, on-call doctor, temple chauffeur, puja coordination & sattvic buffet.',
    badge: 'Recommended for Families & Elders',
    iconColor: 'text-orange-600',
  },
  {
    id: '5 Star',
    name: '5 Star Heritage',
    tagline: 'Opulent palace suites & private Pandit',
    desc: 'Ultra-luxury suites, dedicated private Pandit for rituals, helipad transfer coordination & VIP fast-track darshan escorts.',
    badge: 'Ultimate Sacred Luxury',
    iconColor: 'text-purple-600',
  },
];

const DURATION_OPTIONS = [
  { value: '3 Days', label: '3 Days (Short Darshan)' },
  { value: '5 Days', label: '5 Days (Circuit Tour)' },
  { value: '7 Days', label: '7 Days (Complete Yatra)' },
  { value: '9-10 Days', label: '9–10 Days (Grand Pilgrimage)' },
  { value: '12+ Days', label: '12+ Days (Full Circuit / Char Dham)' },
];

const SPECIAL_REQUEST_SUGGESTIONS = [
  'Senior citizen traveling with us',
  'Wheelchair assistance needed',
  'Pure Jain / Sattvic meals (no onion/garlic)',
  'Ground floor room preferred',
  'Helicopter darshan booking required',
  'Special puja / Rudrabhishek arrangements',
];

export const EnquiryPage: React.FC = () => {
  const { path, navigate } = useRouter();
  const { customerUser } = useAuth();

  // Load packages for dropdown
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  // URL query params extraction
  const getParam = (key: string): string => {
    try {
      const search = path.includes('?') ? path.split('?')[1] : '';
      const params = new URLSearchParams(search);
      return params.get(key) || '';
    } catch {
      return '';
    }
  };

  // 1. Your Details
  const [fullName, setFullName] = useState(customerUser?.name || '');
  const [email, setEmail] = useState(customerUser?.email || '');
  const [whatsappNumber, setWhatsappNumber] = useState(customerUser?.phone || '+91 ');
  const [userCity, setUserCity] = useState('');

  // 2. Trip Details
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [customPackageTitle, setCustomPackageTitle] = useState('');
  const [tourStartDate, setTourStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [tourDuration, setTourDuration] = useState('7 Days');
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [pickupCity, setPickupCity] = useState('');
  const [dropCity, setDropCity] = useState('');
  const [sameDropCity, setSameDropCity] = useState(true);

  // 3. Accommodation Tier
  const [accommodationTier, setAccommodationTier] = useState<string>('3 Star Premium');

  // 4. Additional Notes
  const [specialRequests, setSpecialRequests] = useState('');

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState<any>(null);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load packages & populate initial parameters
  useEffect(() => {
    async function init() {
      try {
        const list = await api.getPackages();
        setPackages(list);

        const paramPkgId = getParam('packageId');
        const paramPkgTitle = getParam('package');
        const paramCity = getParam('city');
        const paramCheckIn = getParam('checkIn');
        const paramAdults = getParam('adults');

        if (paramPkgId) {
          setSelectedPackageId(paramPkgId);
        } else if (paramPkgTitle) {
          const match = list.find((p) => p.title.toLowerCase().includes(paramPkgTitle.toLowerCase()));
          if (match) setSelectedPackageId(match.id);
          else setCustomPackageTitle(paramPkgTitle);
        } else if (list.length > 0) {
          setSelectedPackageId(list[0].id);
        }

        if (paramCity) {
          setPickupCity(paramCity);
          setDropCity(paramCity);
        }
        if (paramCheckIn) {
          setTourStartDate(paramCheckIn);
        }
        if (paramAdults && Number(paramAdults) > 0) {
          setAdults(Number(paramAdults));
        }
      } catch (err) {
        console.error('Failed to load packages:', err);
      } finally {
        setLoadingPackages(false);
      }
    }
    init();
  }, []);

  // Autofill user profile if logged in
  useEffect(() => {
    if (customerUser) {
      if (!fullName && customerUser.name) setFullName(customerUser.name);
      if (!email && customerUser.email) setEmail(customerUser.email);
      if (customerUser.phone && (!whatsappNumber || whatsappNumber === '+91 ')) {
        setWhatsappNumber(customerUser.phone);
      }
    }
  }, [customerUser]);

  // Keep dropCity in sync if sameDropCity is enabled
  useEffect(() => {
    if (sameDropCity && pickupCity) {
      setDropCity(pickupCity);
    }
  }, [sameDropCity, pickupCity]);

  // Handle Child Age modifications
  const handleAddChild = () => {
    setChildren((c) => c + 1);
    setChildAges((prev) => [...prev, 5]);
  };

  const handleRemoveChild = () => {
    if (children > 0) {
      setChildren((c) => c - 1);
      setChildAges((prev) => (prev.length > 0 ? prev.slice(0, -1) : []));
    }
  };

  const handleChildAgeChange = (index: number, newAge: number) => {
    setChildAges((prev) => {
      const copy = [...prev];
      copy[index] = newAge;
      return copy;
    });
  };

  const handleInsertTag = (tag: string) => {
    if (specialRequests.includes(tag)) return;
    setSpecialRequests((prev) => (prev ? `${prev.trim()}, ${tag}` : tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Form Validations
    if (!fullName.trim()) {
      setErrorMessage('Please provide your Full Name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please provide a valid Email Address for your quotation.');
      return;
    }
    const cleanPhone = whatsappNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please provide a valid 10-digit WhatsApp number.');
      return;
    }
    if (!tourStartDate) {
      setErrorMessage('Please select an estimated Tour Start Date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const chosenPackage = packages.find((p) => p.id === selectedPackageId);
      const yatraTitle = chosenPackage ? chosenPackage.title : (customPackageTitle || 'Custom Sacred Pilgrimage');
      const totalGuests = adults + children;

      const fullNotes = [
        `Duration: ${tourDuration}`,
        `Accommodation Tier: ${accommodationTier}`,
        pickupCity ? `Pickup: ${pickupCity}` : '',
        dropCity ? `Drop: ${dropCity}` : '',
        userCity ? `Devotee Resident City: ${userCity}` : '',
        specialRequests ? `Special Requests: ${specialRequests}` : '',
      ].filter(Boolean).join(' | ');

      // 1. Submit to API backend and persistent store
      const createdInquiry = await api.submitInquiry({
        userId: customerUser?.id,
        type: 'PACKAGE',
        referenceId: selectedPackageId || 'custom-pkg',
        referenceName: yatraTitle,
        title: yatraTitle,
        fullName: fullName.trim(),
        customerName: fullName.trim(),
        email: email.trim(),
        customerEmail: email.trim(),
        whatsappNumber: whatsappNumber.trim(),
        customerPhone: whatsappNumber.trim(),
        userCity: userCity.trim(),
        pickupLocation: pickupCity.trim(),
        dropoffLocation: dropCity.trim(),
        checkInDate: tourStartDate,
        guests: totalGuests,
        adults: adults,
        children: children,
        childAges: JSON.stringify(childAges),
        planChosen: accommodationTier,
        selectedPlan: accommodationTier,
        specialRequests: fullNotes,
      });

      // 2. Generate WhatsApp direct message link
      const waLink = generateWhatsAppLink({
        title: yatraTitle,
        type: 'PACKAGE',
        fullName: fullName.trim(),
        phone: whatsappNumber.trim(),
        checkInDate: tourStartDate,
        pickupLocation: pickupCity.trim() || 'Not specified',
        dropoffLocation: dropCity.trim() || 'Not specified',
        adults: adults,
        children: children,
        childAges: childAges,
        plan: accommodationTier,
        specialRequests: `Duration: ${tourDuration}. ${specialRequests.trim()}`,
      });

      setSubmittedInquiry(createdInquiry);
      setWhatsappLink(waLink);
      setIsSuccess(true);

      // 3. Trigger festive celebration confetti
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#ea580c', '#f97316', '#fbbf24', '#10b981'],
        });
      } catch {}

      window.scrollTo({ top: 120, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Inquiry submission error:', err);
      setErrorMessage(err.message || 'Unable to submit your enquiry. Please check your connection or contact our WhatsApp desk directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="enquire-page" className="min-h-screen bg-[#faf8f5] pb-24 text-[#0f294a]">
      {/* ================================================================ */}
      {/* 1. HERO HEADER                                                   */}
      {/* ================================================================ */}
      <section className="bg-[#0f294a] text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-4">
          {/* Breadcrumbs */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-300 font-medium mb-2">
            <button onClick={() => navigate('/')} className="hover:text-orange-400 transition-colors">Home</button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button onClick={() => navigate('/packages')} className="hover:text-orange-400 transition-colors">Packages</button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-orange-400 font-semibold">Custom Trip Enquiry</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-orange-300 text-xs font-bold uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Dedicated Pilgrimage Travel Desk</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-serif text-white max-w-3xl mx-auto leading-tight">
            Plan Your Sacred <span className="text-[#ea580c]">Pilgrimage</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-normal">
            Fill in your preferred yatra details below to receive a personalized day-by-day darshan itinerary, verified hotel options, and transparent quotation within 15–30 minutes.
          </p>

          {/* Quick trust metrics banner */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero Service or Booking Fees</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Pure-Veg &amp; Sattvic Meals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>VIP Temple Darshan Passes</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 2. MAIN ENQUIRY FORM & SIDEBAR                                   */}
      {/* ================================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        
        {/* SUCCESS STATE */}
        {isSuccess ? (
          <div id="enquiry-success-view" className="bg-white rounded-3xl border border-orange-200/90 shadow-2xl p-6 sm:p-12 max-w-3xl mx-auto text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                Enquiry Reference: {submittedInquiry?.id || 'TYT-INQ-SUCCESS'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f294a] font-serif">
                Har Har Mahadev! Your Yatra Enquiry Has Been Received
              </h2>
              <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                Thank you, <span className="font-bold text-[#0f294a]">{fullName}</span>. Our Senior Pilgrimage Officer is already preparing your custom itinerary and transparent quote for:
              </p>
            </div>

            {/* Quick recap box */}
            <div className="bg-orange-50/60 border border-orange-200/80 rounded-2xl p-5 text-left max-w-xl mx-auto space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between pb-2 border-b border-orange-200/50">
                <span className="font-semibold text-slate-500">Yatra / Circuit:</span>
                <span className="font-bold text-[#0f294a] text-sm">{submittedInquiry?.title || 'Pilgrimage Yatra'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Estimated Start Date:</span>
                <span className="font-bold text-slate-800">{tourStartDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Pilgrim Count:</span>
                <span className="font-bold text-slate-800">{adults} Adults {children > 0 ? `+ ${children} Children` : ''}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Accommodation Tier:</span>
                <span className="font-bold text-orange-700">{accommodationTier}</span>
              </div>
              {pickupCity && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Pickup &amp; Drop:</span>
                  <span className="font-bold text-slate-800">{pickupCity} → {dropCity || pickupCity}</span>
                </div>
              )}
            </div>

            {/* Direct WhatsApp Call to Action */}
            <div className="pt-2 space-y-3 max-w-md mx-auto">
              <a
                id="success-whatsapp-btn"
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all active:scale-95"
              >
                <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
                <span>Chat with Pilgrimage Officer on WhatsApp Now</span>
              </a>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => navigate('/my-inquiries')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                >
                  View My Inquiries
                </button>
                <button
                  onClick={() => navigate('/packages')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold transition-all"
                >
                  Explore More Packages
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* FORM & SIDEBAR GRID */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT 8 COLUMNS: MULTI-SECTION FORM */}
            <form
              id="yatra-enquiry-form"
              onSubmit={handleSubmit}
              className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-10 space-y-10"
            >
              
              {/* ERROR MESSAGE NOTIFICATION */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Please check the following:</span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------ */}
              {/* SECTION 1: YOUR DETAILS                                      */}
              {/* ------------------------------------------------------------ */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#ea580c] flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0f294a]">Your Contact Details</h2>
                    <p className="text-xs text-slate-500">Where should we deliver your customized itinerary &amp; quote?</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        id="enquire-full-name"
                        type="text"
                        required
                        placeholder="e.g. Rajesh Sharma"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-[#0f294a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                  </div>

                  {/* WhatsApp Phone */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      WhatsApp Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5" />
                      <input
                        id="enquire-whatsapp-number"
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-[#0f294a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block pl-1">
                      Our pilgrimage officers share instant PDF itineraries via WhatsApp.
                    </span>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        id="enquire-email"
                        type="email"
                        required
                        placeholder="rajesh.sharma@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-[#0f294a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                  </div>

                  {/* Devotee's Resident City */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Your Resident City / State
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        id="enquire-user-city"
                        type="text"
                        placeholder="e.g. Mumbai, Maharashtra"
                        value={userCity}
                        onChange={(e) => setUserCity(e.target.value)}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-[#0f294a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* SECTION 2: TRIP DETAILS                                      */}
              {/* ------------------------------------------------------------ */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#ea580c] flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0f294a]">Pilgrimage Trip Details</h2>
                    <p className="text-xs text-slate-500">Dates, destinations, duration, and travelling group size.</p>
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  {/* Interested In: Yatra Package Dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Interested In (Yatra Package / Sacred Circuit) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Compass className="w-4 h-4 text-orange-500 absolute left-3.5 top-3.5 pointer-events-none" />
                      <select
                        id="enquire-package-select"
                        value={selectedPackageId}
                        onChange={(e) => {
                          setSelectedPackageId(e.target.value);
                          if (e.target.value !== 'custom') {
                            setCustomPackageTitle('');
                          }
                        }}
                        className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-8 py-2.5 text-sm font-bold text-[#0f294a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer"
                      >
                        {loadingPackages ? (
                          <option value="">Loading packages...</option>
                        ) : (
                          <>
                            {packages.map((pkg) => (
                              <option key={pkg.id} value={pkg.id}>
                                {pkg.title} ({pkg.duration} • from ₹{pkg.startingPrice.toLocaleString('en-IN')})
                              </option>
                            ))}
                            <option value="custom">★ Custom Pilgrimage Circuit / Other Sacred Destination</option>
                          </>
                        )}
                      </select>
                      <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  {/* If custom selected, show input */}
                  {selectedPackageId === 'custom' && (
                    <div className="space-y-1.5 animate-in fade-in">
                      <label className="block text-xs font-semibold text-slate-600">
                        Specify Your Desired Sacred Destination or Circuit
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Amarnath Yatra, Ujjain Mahakaleshwar & Omkareshwar, or Rameswaram"
                        value={customPackageTitle}
                        onChange={(e) => setCustomPackageTitle(e.target.value)}
                        className="w-full bg-orange-50/50 border border-orange-200 rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f294a] focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                  )}

                  {/* Date and Duration row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tour Start Date */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Estimated Tour Start Date <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-orange-500 absolute left-3.5 top-3.5" />
                        <input
                          id="enquire-start-date"
                          type="date"
                          required
                          value={tourStartDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setTourStartDate(e.target.value)}
                          className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-[#0f294a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        />
                      </div>
                    </div>

                    {/* Tour Duration Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Desired Tour Duration
                      </label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-orange-500 absolute left-3.5 top-3.5 pointer-events-none" />
                        <select
                          id="enquire-duration-select"
                          value={tourDuration}
                          onChange={(e) => setTourDuration(e.target.value)}
                          className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-8 py-2.5 text-sm font-bold text-[#0f294a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer"
                        >
                          {DURATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Adults and Children Counters */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Pilgrims &amp; Travellers (Group Size)
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Adults counter */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-xs font-bold text-[#0f294a] block">Adults</span>
                          <span className="text-[10px] text-slate-400">Ages 18 and above</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setAdults((a) => Math.max(1, a - 1))}
                            disabled={adults <= 1}
                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-extrabold text-[#0f294a] w-4 text-center">
                            {adults}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAdults((a) => a + 1)}
                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Children counter */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-xs font-bold text-[#0f294a] block">Children</span>
                          <span className="text-[10px] text-slate-400">Ages 0 to 17 years</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleRemoveChild}
                            disabled={children <= 0}
                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-extrabold text-[#0f294a] w-4 text-center">
                            {children}
                          </span>
                          <button
                            type="button"
                            onClick={handleAddChild}
                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Child Age selectors if children > 0 */}
                    {children > 0 && (
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <span className="text-[11px] font-semibold text-slate-600 block">
                          Specify child ages (helps calculate child bed &amp; vehicle requirements):
                        </span>
                        <div className="flex flex-wrap gap-2.5">
                          {childAges.map((age, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                              <span className="text-slate-500 font-medium">Child {idx + 1}:</span>
                              <select
                                value={age}
                                onChange={(e) => handleChildAgeChange(idx, Number(e.target.value))}
                                className="font-bold text-orange-600 bg-transparent focus:outline-none cursor-pointer"
                              >
                                <option value={0}>Infant (&lt;1 yr)</option>
                                <option value={1}>1 year</option>
                                <option value={2}>2 years</option>
                                <option value={3}>3 years</option>
                                <option value={4}>4 years</option>
                                <option value={5}>5 years</option>
                                <option value={7}>7 years</option>
                                <option value={10}>10 years</option>
                                <option value={12}>12 years</option>
                                <option value={15}>15 years</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pickup and Drop Cities */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Pickup City */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                          Pickup City / Airport / Station
                        </label>
                        <LocationAutocompleteInput
                          id="enquire-pickup-city"
                          label="Pickup City"
                          placeholder="e.g. Delhi, Haridwar, Dehradun, Lucknow..."
                          value={pickupCity}
                          onChange={setPickupCity}
                          accentColor="orange"
                          iconType="pickup"
                        />
                      </div>

                      {/* Drop City */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                            Drop City / Airport / Station
                          </label>
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={sameDropCity}
                              onChange={(e) => {
                                setSameDropCity(e.target.checked);
                                if (e.target.checked) setDropCity(pickupCity);
                              }}
                              className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-orange-500"
                            />
                            <span>Same as Pickup</span>
                          </label>
                        </div>
                        <LocationAutocompleteInput
                          id="enquire-drop-city"
                          label="Drop City"
                          placeholder="e.g. Delhi, Rishikesh, Varanasi..."
                          value={dropCity}
                          onChange={(val) => {
                            setDropCity(val);
                            if (val !== pickupCity) setSameDropCity(false);
                          }}
                          accentColor="blue"
                          iconType="dropoff"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* SECTION 3: ACCOMMODATION TIERS                               */}
              {/* ------------------------------------------------------------ */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#ea580c] flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0f294a]">Preferred Accommodation Tier</h2>
                    <p className="text-xs text-slate-500">Select hotel comfort grade for your pilgrimage stay.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {ACCOMMODATION_TIERS.map((tier) => {
                    const isSelected = accommodationTier === tier.id;
                    return (
                      <div
                        key={tier.id}
                        id={`tier-card-${tier.id.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => setAccommodationTier(tier.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/40 shadow-md ring-1 ring-orange-500/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Building2 className={`w-5 h-5 ${isSelected ? 'text-[#ea580c]' : 'text-slate-400'}`} />
                            <h3 className="font-extrabold text-sm text-[#0f294a]">
                              {tier.name}
                            </h3>
                          </div>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                            isSelected ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'border-slate-300 text-transparent'
                          }`}>
                            ✓
                          </div>
                        </div>

                        <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-orange-100 text-[#c2410c]">
                          {tier.badge}
                        </span>

                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                          {tier.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* SECTION 4: ADDITIONAL NOTES & SUBMISSION                     */}
              {/* ------------------------------------------------------------ */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#ea580c] flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0f294a]">Special Requests &amp; Rituals</h2>
                    <p className="text-xs text-slate-500">Tell us about dietary needs, senior citizen care, or special puja bookings.</p>
                  </div>
                </div>

                {/* Quick suggestion tag pills */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Quick tap to add preferences:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SPECIAL_REQUEST_SUGGESTIONS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleInsertTag(tag)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          specialRequests.includes(tag)
                            ? 'bg-orange-100 border-orange-300 text-orange-800 font-bold'
                            : 'bg-slate-50 hover:bg-orange-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <div className="space-y-1.5 pt-1">
                  <textarea
                    id="enquire-special-requests"
                    rows={4}
                    placeholder="e.g. My parents are 70+ and require wheelchair logistics, ground-floor rooms without steep steps, and pure satvik meals without onion/garlic..."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-[#0f294a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>

                {/* Submit button & Trust badge */}
                <div className="pt-4 space-y-3">
                  <button
                    id="enquire-submit-quote-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-8 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-base shadow-xl shadow-orange-600/30 transition-all flex items-center justify-center gap-2.5 active:scale-98 disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RotateCcw className="w-5 h-5 animate-spin" />
                        <span>Sending Your Enquiry to Pilgrimage Desk...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Get My Free Quote &amp; Itinerary</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>100% Privacy Protected</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                      <span>Zero Spam Guarantee</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Assigned Senior Officer Response in 15–30 Mins</span>
                    </div>
                  </div>
                </div>

              </div>

            </form>

            {/* RIGHT 4 COLUMNS: STICKY TRUST & WHATSAPP SIDEBAR */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
              
              {/* Card 1: Prefer to chat? WhatsApp us */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-6 shadow-sm space-y-3 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <MessageCircle className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-emerald-950">Prefer to chat?</h3>
                    <p className="text-xs text-emerald-800">Instant responses on WhatsApp</p>
                  </div>
                </div>

                <p className="text-xs text-emerald-900/90 leading-relaxed">
                  Connect live with an experienced pilgrimage specialist who can answer queries about temple crowds, weather, helicopter availability, and hotel proximity.
                </p>

                <a
                  id="sidebar-whatsapp-direct-btn"
                  href="https://wa.me/919876543210?text=Namaste%20TirthYatraTrails%20Team%2C%20I%20would%20like%20to%20get%20a%20pilgrimage%20quote%20for%20our%20family"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>WhatsApp Us Directly (+91 98765 43210)</span>
                </a>
              </div>

              {/* Card 2: What happens next */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-md space-y-4 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-[#0f294a]">What happens next?</h3>
                </div>

                <div className="space-y-3.5 text-xs text-slate-600">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ea580c] font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-[#0f294a]">Fast Review (15–30 Mins)</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Our pilgrimage officer inspects temple schedules, darshan slot openings, and verified hotel room blocks for your dates.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ea580c] font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-[#0f294a]">Transparent Itinerary &amp; Quote</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        You receive a complete PDF breakdown on WhatsApp &amp; Email with stay photos, private vehicle transfers, and clear per-person pricing.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ea580c] font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-[#0f294a]">100% Customized to Your Comfort</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tweak dates, meal preferences, or upgrade room tiers with your dedicated officer until you are completely satisfied.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Why travellers trust us */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-md space-y-4 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-[#0f294a]">Why travellers trust us</h3>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong className="text-[#0f294a]">10,000+ Blessed Pilgrims</strong> guided across Kedarnath, Kashi, Tirupati, Puri &amp; Ayodhya.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong className="text-[#0f294a]">Verified Stays Steps from Sanctum</strong> with guaranteed hot water, clean linens, &amp; pure-veg kitchens.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong className="text-[#0f294a]">Official VIP Darshan Passes</strong> &amp; priority queues coordinated with temple boards.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong className="text-[#0f294a]">24x7 Ground Support &amp; Medical Care</strong> with on-call oxygen kits in high-altitude Himalayan routes.</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Govt. Registered Pilgrimage Agency</span>
                  <span className="font-bold text-emerald-700">4.9 ★ (1,840+ Reviews)</span>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
