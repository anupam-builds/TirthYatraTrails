import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Train,
  Plane,
  Building2,
  Landmark,
  X,
  Loader2,
  Check,
  Search,
} from 'lucide-react';

export interface LocationSuggestion {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  postcode?: string;
  type?: 'station' | 'airport' | 'temple' | 'postal' | 'place';
}

interface LocationAutocompleteInputProps {
  id?: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  accentColor?: 'emerald' | 'orange' | 'blue';
  iconType?: 'pickup' | 'dropoff';
  required?: boolean;
}

export const LocationAutocompleteInput: React.FC<LocationAutocompleteInputProps> = ({
  id,
  label,
  placeholder = 'Search address, landmark, station or PIN code...',
  value,
  onChange,
  accentColor = 'emerald',
  iconType = 'pickup',
  required = false,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPinCodeMode, setIsPinCodeMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state when parent value changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Click outside listener to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Fetch suggestions logic with debounce (350ms)
  useEffect(() => {
    const query = inputValue.trim();

    // Reset suggestions if empty or too short (and not a pincode query)
    if (!query || (query.length < 3 && !/^\d{1,6}$/.test(query))) {
      setSuggestions([]);
      setIsLoading(false);
      setIsPinCodeMode(false);
      return;
    }

    // Check if query is exactly a 6-digit Indian Postal PIN code
    const isSixDigitPin = /^\d{6}$/.test(query);
    setIsPinCodeMode(isSixDigitPin);

    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce 350ms as per user specification
    debounceTimerRef.current = setTimeout(async () => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setIsLoading(true);

      try {
        if (isSixDigitPin) {
          // Direct Postal PIN code API Query
          const res = await fetch(`https://api.postalpincode.in/pincode/${query}`, {
            signal: abortController.signal,
          });

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice)) {
              const items: LocationSuggestion[] = data[0].PostOffice.slice(0, 8).map((po: any, idx: number) => {
                const primary = po.Name || 'Post Office';
                const district = po.District || po.Division || '';
                const state = po.State || '';
                const pin = po.Pincode || query;
                const subtitle = `${district ? `${district}, ` : ''}${state} - ${pin}`;
                const fullAddress = `${primary}, ${district ? `${district}, ` : ''}${state} - ${pin}`;

                return {
                  id: `po-${idx}-${pin}-${primary}`,
                  title: `${primary} (PIN ${pin})`,
                  subtitle,
                  fullAddress,
                  postcode: pin,
                  type: 'postal',
                };
              });

              setSuggestions(items);
              setIsOpen(items.length > 0);
              setIsLoading(false);
              return;
            }
          }
        }

        // If not a 6-digit PIN code or PIN code had 0 post offices, perform Nominatim Address Autocomplete with India country code filtering
        let foundSuggestions: LocationSuggestion[] = [];

        try {
          // Attempt direct OpenStreetMap Nominatim API with countrycodes=in
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&q=${encodeURIComponent(query)}`;
          const nomRes = await fetch(nominatimUrl, {
            signal: abortController.signal,
            headers: {
              'Accept': 'application/json',
            },
          });

          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (Array.isArray(nomData) && nomData.length > 0) {
              foundSuggestions = nomData.slice(0, 8).map((item: any) => {
                const addr = item.address || {};
                const primary = item.name || addr.railway || addr.aeroway || addr.tourism || addr.amenity || addr.suburb || item.display_name.split(',')[0].trim();
                const locality = addr.suburb || addr.neighbourhood || addr.road || '';
                const city = addr.city || addr.town || addr.village || addr.state_district || addr.county || '';
                const state = addr.state || '';
                const postcode = addr.postcode ? String(addr.postcode).trim() : '';

                const subtitleParts: string[] = [];
                if (locality && locality.toLowerCase() !== primary.toLowerCase()) {
                  subtitleParts.push(locality);
                }
                if (city && city.toLowerCase() !== primary.toLowerCase() && !subtitleParts.includes(city)) {
                  subtitleParts.push(city);
                }
                if (state && !subtitleParts.includes(state)) {
                  subtitleParts.push(state);
                }

                const locationText = subtitleParts.join(', ');
                const subtitle = locationText
                  ? (postcode ? `${locationText} - ${postcode}` : locationText)
                  : (postcode ? `PIN - ${postcode}` : 'India');

                const fullAddress = `${primary}${locationText ? `, ${locationText}` : ''}${postcode ? ` - ${postcode}` : ''}`;

                let type: LocationSuggestion['type'] = 'place';
                if (addr.railway || item.class === 'railway' || /station|junction|railway/i.test(primary)) {
                  type = 'station';
                } else if (addr.aeroway || item.class === 'aeroway' || /airport|aerodrome|terminal/i.test(primary)) {
                  type = 'airport';
                } else if (addr.tourism || addr.historic || addr.religion || /mandir|temple|ghat|ashram|yatra/i.test(primary)) {
                  type = 'temple';
                }

                return {
                  id: `nom-${item.place_id || Math.random()}`,
                  title: primary,
                  subtitle,
                  fullAddress,
                  postcode,
                  type,
                };
              });
            }
          }
        } catch (nomErr: any) {
          // If browser CORS or rate-limit intercepted Nominatim, fall through to proxy/photon
        }

        // Fallback 1: Backend proxy endpoint /api/geo/autocomplete?q=...
        if (foundSuggestions.length === 0) {
          try {
            const proxyRes = await fetch(`/api/geo/autocomplete?q=${encodeURIComponent(query)}`, {
              signal: abortController.signal,
            });
            if (proxyRes.ok) {
              const resJson = await proxyRes.json();
              if (resJson.type === 'pincode' && Array.isArray(resJson.data) && resJson.data[0]?.PostOffice) {
                foundSuggestions = resJson.data[0].PostOffice.slice(0, 8).map((po: any, idx: number) => ({
                  id: `proxy-po-${idx}`,
                  title: `${po.Name} (PIN ${po.Pincode || query})`,
                  subtitle: `${po.District ? `${po.District}, ` : ''}${po.State} - ${po.Pincode}`,
                  fullAddress: `${po.Name}, ${po.District ? `${po.District}, ` : ''}${po.State} - ${po.Pincode}`,
                  postcode: po.Pincode,
                  type: 'postal',
                }));
              } else if (resJson.type === 'nominatim' && Array.isArray(resJson.data)) {
                foundSuggestions = resJson.data.slice(0, 8).map((item: any) => {
                  const addr = item.address || {};
                  const primary = item.name || addr.railway || addr.aeroway || addr.tourism || item.display_name.split(',')[0].trim();
                  const city = addr.city || addr.town || addr.state_district || '';
                  const state = addr.state || '';
                  const postcode = addr.postcode ? String(addr.postcode).trim() : '';
                  const subtitle = `${city ? `${city}, ` : ''}${state}${postcode ? ` - ${postcode}` : ''}`;
                  const fullAddress = `${primary}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${postcode ? ` - ${postcode}` : ''}`;
                  return {
                    id: `proxy-nom-${item.place_id || Math.random()}`,
                    title: primary,
                    subtitle,
                    fullAddress,
                    postcode,
                    type: 'place',
                  };
                });
              }
            }
          } catch {}
        }

        // Fallback 2: Photon OSM Geocoding API with CORS support
        if (foundSuggestions.length === 0) {
          try {
            const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`, {
              signal: abortController.signal,
            });
            if (photonRes.ok) {
              const photonData = await photonRes.json();
              if (photonData?.features && Array.isArray(photonData.features)) {
                foundSuggestions = photonData.features
                  .filter((f: any) => f.properties?.countrycode === 'IN' || f.properties?.country === 'India' || !f.properties?.countrycode)
                  .slice(0, 8)
                  .map((feat: any) => {
                    const p = feat.properties || {};
                    const primary = p.name || p.street || p.city || query;
                    const city = p.city || p.district || p.county || '';
                    const state = p.state || '';
                    const postcode = p.postcode ? String(p.postcode) : '';
                    const subtitle = `${city ? `${city}, ` : ''}${state}${postcode ? ` - ${postcode}` : ''}`;
                    const fullAddress = `${primary}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${postcode ? ` - ${postcode}` : ''}`;

                    let type: LocationSuggestion['type'] = 'place';
                    if (p.osm_key === 'railway' || /station|junction/i.test(primary)) type = 'station';
                    else if (p.osm_key === 'aeroway' || /airport/i.test(primary)) type = 'airport';
                    else if (p.osm_key === 'tourism' || /temple|ghat/i.test(primary)) type = 'temple';

                    return {
                      id: `pho-${p.osm_id || Math.random()}`,
                      title: primary,
                      subtitle,
                      fullAddress,
                      postcode,
                      type,
                    };
                  });
              }
            }
          } catch {}
        }

        setSuggestions(foundSuggestions);
        setIsOpen(foundSuggestions.length > 0 || (query.length >= 3 && isSixDigitPin));
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Address autocomplete search error:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputValue]);

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setInputValue(suggestion.fullAddress);
    onChange(suggestion.fullAddress);
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    if (!isOpen && val.trim().length >= 3) {
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  // Helper render for icons based on category
  const renderItemIcon = (type?: LocationSuggestion['type']) => {
    switch (type) {
      case 'station':
        return <Train className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
      case 'airport':
        return <Plane className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />;
      case 'temple':
        return <Landmark className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
      case 'postal':
        return <Building2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />;
      default:
        return <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
        <span>{label}</span>
        {isPinCodeMode && (
          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
            PIN Code Detected
          </span>
        )}
      </label>

      <div className="relative">
        {/* Left Indicator Icon */}
        <div className="absolute left-3.5 top-3 pointer-events-none flex items-center">
          {iconType === 'pickup' ? (
            <MapPin className="w-4 h-4 text-emerald-600" />
          ) : (
            <MapPin className="w-4 h-4 text-orange-600" />
          )}
        </div>

        {/* Input */}
        <input
          id={id}
          type="text"
          required={required}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-10 pr-9 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none placeholder:text-slate-400 bg-white shadow-2xs transition-all"
        />

        {/* Right Status / Action Icons */}
        <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
          {isLoading && (
            <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
          )}

          {inputValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestion Dropdown List */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-400" />
              {isPinCodeMode ? 'Postal Directory Matches' : 'Address & Landmark Suggestions'}
            </span>
            <span className="text-[10px] text-slate-400">OpenStreetMap / Postal PIN</span>
          </div>

          {suggestions.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {suggestions.map((item, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 transition-colors ${
                      isActive ? 'bg-orange-50/80 text-orange-950' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    {renderItemIcon(item.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {item.title}
                        </div>
                        {item.postcode && (
                          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {item.postcode}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-slate-500">
              {isPinCodeMode
                ? 'No post office found for this 6-digit PIN code. You can still use it directly.'
                : 'No matching verified locations found. You can enter any custom address.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
