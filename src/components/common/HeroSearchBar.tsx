import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext.js';
import { City } from '../../types.js';
import { GuestsRoomsPopover } from './GuestsRoomsPopover.js';
import { DatePickerPopover } from './DatePickerPopover.js';
import { MapPin, Search, ChevronRight, Building2, Check, X } from 'lucide-react';

export interface HeroSearchBarProps {
  cities: City[];
  initialCityId?: string;
  initialCityName?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildAges?: number[];
  initialRooms?: number;
  onSearch?: (params: {
    cityId: string;
    cityName: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    childAges: number[];
    rooms: number;
  }) => void;
  className?: string;
  showPopularChips?: boolean;
}

export const HeroSearchBar: React.FC<HeroSearchBarProps> = ({
  cities = [],
  initialCityId = '',
  initialCityName = '',
  initialCheckIn = '2026-09-15',
  initialCheckOut = '2026-09-18',
  initialAdults = 2,
  initialChildAges = [],
  initialRooms = 1,
  onSearch,
  className = '',
  showPopularChips = true,
}) => {
  const { navigate } = useRouter();

  // Selected destination state
  const [selectedCityId, setSelectedCityId] = useState<string>(initialCityId);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [cityFilterText, setCityFilterText] = useState('');
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Dates state
  const [checkIn, setCheckIn] = useState<string>(initialCheckIn);
  const [checkOut, setCheckOut] = useState<string>(initialCheckOut);

  // Guests & rooms state
  const [adults, setAdults] = useState<number>(initialAdults);
  const [childAges, setChildAges] = useState<number[]>(initialChildAges);
  const [rooms, setRooms] = useState<number>(initialRooms);
  const [showGuestsPopover, setShowGuestsPopover] = useState(false);

  // Sync with prop changes if passed
  useEffect(() => {
    if (initialCityId) setSelectedCityId(initialCityId);
  }, [initialCityId]);

  // Click outside to close city dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    }
    if (showCityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCityDropdown]);

  // Find active city object
  const activeCityObj = cities.find(
    (c) =>
      c.id === selectedCityId ||
      c.name.toLowerCase() === selectedCityId.toLowerCase() ||
      c.id.toLowerCase() === selectedCityId.toLowerCase()
  );

  const selectedCityDisplay = activeCityObj
    ? activeCityObj.name
    : initialCityName || (selectedCityId ? selectedCityId : 'Select City or Area');

  // Filter cities in dropdown
  const filteredCities = cities.filter((c) => {
    if (!cityFilterText.trim()) return true;
    const q = cityFilterText.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.state && c.state.toLowerCase().includes(q)) ||
      (c.popularFor && c.popularFor.toLowerCase().includes(q))
    );
  });

  const handleSelectCity = (city: City | null) => {
    if (!city) {
      setSelectedCityId('');
    } else {
      setSelectedCityId(city.id);
    }
    setShowCityDropdown(false);
  };

  const handleExecuteSearch = (overrideCityId?: string, overrideCityName?: string) => {
    const targetCityId = overrideCityId !== undefined ? overrideCityId : selectedCityId;
    const targetObj = cities.find((c) => c.id === targetCityId);
    const targetCityName =
      overrideCityName !== undefined
        ? overrideCityName
        : targetObj?.name || (activeCityObj?.name || (targetCityId || ''));

    if (onSearch) {
      onSearch({
        cityId: targetCityId,
        cityName: targetCityName,
        checkIn,
        checkOut,
        adults,
        childAges,
        rooms,
      });
      return;
    }

    // Default redirect to /hotels
    const params = new URLSearchParams();
    if (targetCityName) {
      params.set('city', targetCityName);
    }
    if (targetCityId) {
      params.set('cityId', targetCityId);
    }
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    params.set('adults', String(adults));
    if (childAges.length > 0) {
      params.set('childAges', childAges.join(','));
    }
    params.set('rooms', String(rooms));

    navigate(`/hotels?${params.toString()}`);
  };

  return (
    <div className={`w-full max-w-5xl mx-auto ${className}`}>
      {/* Main Pill-Shaped Multi-Field Search Card */}
      <div
        id="multi-field-search-bar"
        className="bg-white text-[#0f294a] rounded-3xl lg:rounded-full p-2.5 sm:p-3 shadow-2xl border border-orange-200/60 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 relative z-30 transition-all"
      >
        {/* 1. City / Area Selector */}
        <div
          ref={cityDropdownRef}
          className="relative flex-1 border-b lg:border-b-0 lg:border-r border-slate-100 px-3.5 py-2"
        >
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            City / Area
          </label>
          <div
            id="city-area-selector-trigger"
            onClick={() => setShowCityDropdown(!showCityDropdown)}
            className="flex items-center justify-between cursor-pointer py-1 group"
          >
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-orange-600 shrink-0 group-hover:scale-110 transition-transform" />
              <span
                className={`text-sm font-bold truncate ${
                  activeCityObj || (selectedCityId && selectedCityId !== 'Select City or Area')
                    ? 'text-[#0f294a]'
                    : 'text-slate-400 font-medium'
                }`}
              >
                {selectedCityDisplay}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {selectedCityId && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCityId('');
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Clear destination"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <ChevronRight
                className={`w-4 h-4 text-slate-400 transform transition-transform ${
                  showCityDropdown ? 'rotate-90' : ''
                }`}
              />
            </div>
          </div>

          {/* City / Area Dropdown Menu */}
          {showCityDropdown && (
            <div
              id="city-area-dropdown-menu"
              className="absolute top-full left-0 mt-2 z-50 bg-white shadow-2xl border border-slate-200 w-80 sm:w-96 rounded-2xl p-3 max-h-84 overflow-y-auto animate-in fade-in duration-150 text-[#0f294a]"
            >
              {/* Search text input */}
              <div className="relative mb-2.5">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search Varanasi, Kedarnath, Puri, Ayodhya..."
                  value={cityFilterText}
                  onChange={(e) => setCityFilterText(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium placeholder:text-slate-400"
                  autoFocus
                />
              </div>

              {/* All Sacred Cities Option */}
              <div
                id="city-option-all"
                onClick={() => handleSelectCity(null)}
                className={`p-2.5 rounded-xl hover:bg-orange-50 cursor-pointer text-xs font-bold text-slate-700 flex items-center justify-between transition-colors ${
                  !selectedCityId ? 'bg-orange-50 text-orange-600' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>All Sacred Destinations</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  All India
                </span>
              </div>

              <div className="border-t border-slate-100 my-1.5" />

              {/* Sacred Cities List with Active Stay Counts */}
              <div className="space-y-1">
                {filteredCities.map((c) => {
                  const isSelected =
                    selectedCityId === c.id ||
                    (activeCityObj && activeCityObj.id === c.id);
                  return (
                    <div
                      key={c.id}
                      id={`city-option-${c.id}`}
                      onClick={() => handleSelectCity(c)}
                      className={`p-2.5 rounded-xl hover:bg-orange-50 cursor-pointer flex items-center justify-between border border-transparent transition-all ${
                        isSelected
                          ? 'bg-orange-50/80 border-orange-200 font-bold text-orange-600 shadow-2xs'
                          : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 pr-2">
                        <MapPin
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            isSelected ? 'text-orange-600' : 'text-slate-400'
                          }`}
                        />
                        <div className="truncate">
                          <p className="text-xs font-bold text-[#0f294a] truncate">
                            {c.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {c.popularFor || c.state}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold bg-orange-100 text-[#ea580c] px-2.5 py-0.5 rounded-full">
                          {c.hotelCount} {c.hotelCount === 1 ? 'stay' : 'stays'}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredCities.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No sacred destination found matching "{cityFilterText}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Check-In Date Picker */}
        <div className="flex-1 border-b lg:border-b-0 lg:border-r border-slate-100 px-3.5 py-2">
          <DatePickerPopover
            id="checkin-date-picker"
            label="Check-in"
            value={checkIn}
            onChange={(val) => {
              setCheckIn(val);
              // Auto-advance check-out if check-in is past check-out
              if (val && checkOut && val >= checkOut) {
                const nextDay = new Date(val);
                nextDay.setDate(nextDay.getDate() + 2);
                const y = nextDay.getFullYear();
                const m = String(nextDay.getMonth() + 1).padStart(2, '0');
                const d = String(nextDay.getDate()).padStart(2, '0');
                setCheckOut(`${y}-${m}-${d}`);
              }
            }}
            minDate="2026-09-12"
            placeholder="Add date"
            relatedDate={checkOut}
          />
        </div>

        {/* 3. Check-Out Date Picker */}
        <div className="flex-1 border-b lg:border-b-0 lg:border-r border-slate-100 px-3.5 py-2">
          <DatePickerPopover
            id="checkout-date-picker"
            label="Check-out"
            value={checkOut}
            onChange={(val) => setCheckOut(val)}
            minDate={checkIn || '2026-09-12'}
            placeholder="Add date"
            isCheckOut={true}
            relatedDate={checkIn}
          />
        </div>

        {/* 4. Guests & Rooms Selector Popup */}
        <div className="flex-1 px-3.5 py-2 relative">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Guests &amp; Rooms
          </label>
          <GuestsRoomsPopover
            adults={adults}
            onAdultsChange={setAdults}
            childAges={childAges}
            onChildAgesChange={setChildAges}
            rooms={rooms}
            onRoomsChange={setRooms}
            isOpen={showGuestsPopover}
            onToggle={() => setShowGuestsPopover(!showGuestsPopover)}
            onClose={() => setShowGuestsPopover(false)}
          />
        </div>

        {/* 5. Orange Search Action Button */}
        <div className="p-1 shrink-0">
          <button
            type="button"
            id="search-action-btn"
            onClick={() => handleExecuteSearch()}
            className="w-full lg:w-auto px-7 py-3.5 rounded-2xl lg:rounded-full bg-[#ea580c] hover:bg-[#c2410c] active:scale-95 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition-all text-sm cursor-pointer"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Quick Destination Pills for Instant Search */}
      {showPopularChips && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-3.5 text-xs text-slate-300">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Popular Pilgrimages:
          </span>
          {[
            { name: 'Varanasi', id: 'city-varanasi' },
            { name: 'Kedarnath', id: 'city-kedarnath' },
            { name: 'Tirupati', id: 'city-tirupati' },
            { name: 'Puri', id: 'city-puri' },
            { name: 'Ayodhya', id: 'city-ayodhya' },
            { name: 'Rishikesh', id: 'city-rishikesh' },
          ].map((dest) => (
            <button
              key={dest.id}
              type="button"
              id={`popular-chip-${dest.name.toLowerCase()}`}
              onClick={() => handleExecuteSearch(dest.id, dest.name)}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-[#ea580c] hover:text-white text-slate-200 text-xs font-medium border border-white/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <MapPin className="w-3 h-3 text-orange-400" />
              <span>{dest.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
