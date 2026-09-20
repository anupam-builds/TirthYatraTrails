import React, { useState, useRef, useEffect } from 'react';
import { useCitiesMaster } from '../../context/CitiesContext.js';
import { City } from '../../types.js';
import { BaseInput } from '../FormField.js';
import {
  MapPin,
  Plus,
  Search,
  Check,
  ChevronDown,
  X,
  Sparkles,
  Building,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export interface SacredCityHybridSelectorProps {
  selectedCityId: string;
  selectedCityName: string;
  onChange: (city: { id: string; name: string }) => void;
  label?: string;
  required?: boolean;
}

const POPULAR_STATES = [
  'Uttar Pradesh',
  'Uttarakhand',
  'Tamil Nadu',
  'Gujarat',
  'Madhya Pradesh',
  'Odisha',
  'Andhra Pradesh',
  'Maharashtra',
  'Karnataka',
  'Rajasthan',
  'Himachal Pradesh',
  'Assam',
];

const PRESET_TEMPLE_IMAGES = [
  {
    name: 'Ghats & Rivers',
    url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Himalayan Shrine',
    url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Sacred Mandir',
    url: 'https://images.unsplash.com/photo-1706857053427-4c3e8006bbca?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Temple Sanctum',
    url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
  },
];

export const SacredCityHybridSelector: React.FC<SacredCityHybridSelectorProps> = ({
  selectedCityId,
  selectedCityName,
  onChange,
  label = 'Sacred City',
  required = true,
}) => {
  const { cities, addCity, loading } = useCitiesMaster();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New City Inline Form State
  const [newCityName, setNewCityName] = useState('');
  const [newState, setNewState] = useState('Uttar Pradesh');
  const [newPopularFor, setNewPopularFor] = useState('Sacred Temple Darshan & Holy Yatra');
  const [newImageUrl, setNewImageUrl] = useState(PRESET_TEMPLE_IMAGES[0].url);
  const [isSavingCity, setIsSavingCity] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAddingNew(false);
        setInlineError(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && !isAddingNew) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isAddingNew]);

  // Find active city object
  const activeCity = cities.find(
    (c) =>
      c.id.toLowerCase() === (selectedCityId || '').toLowerCase() ||
      c.name.toLowerCase() === (selectedCityName || selectedCityId || '').toLowerCase()
  );

  // Filtered cities list
  const filteredCities = cities.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.state && c.state.toLowerCase().includes(q)) ||
      (c.popularFor && c.popularFor.toLowerCase().includes(q))
    );
  });

  const handleOpenDropdown = () => {
    setIsOpen(true);
    setIsAddingNew(false);
    setSearchQuery('');
    setInlineError(null);
  };

  const handleSelectCity = (c: City) => {
    onChange({ id: c.id, name: c.name });
    setIsOpen(false);
    setIsAddingNew(false);
  };

  const handleStartAddNew = (initialName: string = '') => {
    setIsAddingNew(true);
    setNewCityName(initialName || searchQuery.trim());
    setNewState('Uttar Pradesh');
    setNewPopularFor('Sacred Temple Darshan & Holy Yatra');
    setNewImageUrl(PRESET_TEMPLE_IMAGES[0].url);
    setInlineError(null);
  };

  const handleCancelAddNew = () => {
    setIsAddingNew(false);
    setInlineError(null);
  };

  const handleSaveNewCity = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const cleanName = newCityName.trim();
    if (!cleanName) {
      setInlineError('Please enter a destination or city name.');
      return;
    }

    try {
      setIsSavingCity(true);
      setInlineError(null);

      const created = await addCity({
        name: cleanName,
        state: newState.trim() || 'India',
        popularFor: newPopularFor.trim(),
        imageUrl: newImageUrl.trim() || PRESET_TEMPLE_IMAGES[0].url,
        hotelCount: 1,
      });

      // Automatically select the newly registered city for the hotel
      onChange({ id: created.id, name: created.name });

      setSuccessNotice(`"${created.name}" registered to Master Directory!`);
      setTimeout(() => setSuccessNotice(null), 4000);

      setIsAddingNew(false);
      setIsOpen(false);
      setSearchQuery('');
    } catch (err: any) {
      console.error('Failed to create city from selector:', err);
      setInlineError(err?.message || 'Failed to save new city. Please try again.');
    } finally {
      setIsSavingCity(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Label and Inline Add Trigger */}
      <div className="flex items-center justify-between mb-1">
        <label className="block text-slate-700 dark:text-slate-300 font-bold text-xs">
          {label} {required && <span className="text-orange-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            handleStartAddNew();
          }}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Add New City</span>
        </button>
      </div>

      {/* Main Trigger Button */}
      <div
        onClick={handleOpenDropdown}
        className={`w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#081220] border rounded-xl p-2.5 text-xs text-slate-900 dark:text-white cursor-pointer transition-all ${
          isOpen
            ? 'ring-2 ring-orange-500 border-orange-500'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <div className="p-1 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 shrink-0">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="truncate text-left">
            <span className="font-semibold text-slate-900 dark:text-white">
              {activeCity ? activeCity.name : selectedCityName || 'Select or Add Sacred City...'}
            </span>
            {activeCity?.state && (
              <span className="ml-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                • {activeCity.state}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {activeCity && (
            <span className="hidden sm:inline-block text-[10px] bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
              {activeCity.hotelCount || 0} stays
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Success Notice Notification */}
      {successNotice && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Dropdown / Popover Container */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
          {!isAddingNew ? (
            /* MODE 1: SEARCHABLE COMBOBOX LIST */
            <div className="p-2 space-y-2">
              {/* Search Bar Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <BaseInput
                  id="sacred-city-selector-search-input"
                  name="sacred-city-selector-search-input"
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search existing sacred cities or type new..."
                  className="w-full bg-slate-50 dark:bg-[#071322] border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Action Banner: Add New City Trigger */}
              <button
                type="button"
                onClick={() => handleStartAddNew(searchQuery)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-orange-50 hover:bg-orange-100/80 dark:bg-orange-950/40 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-semibold border border-orange-200/80 dark:border-orange-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-orange-500 text-white">
                    <Plus className="w-3 h-3" />
                  </div>
                  <span>
                    {searchQuery.trim()
                      ? `Register "${searchQuery.trim()}" as New City`
                      : '+ Add New Sacred Destination'}
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">
                  Quick Register
                </span>
              </button>

              {/* Cities Master List */}
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                {filteredCities.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 dark:text-slate-400 space-y-2">
                    <p className="text-xs">No sacred city found matching &quot;{searchQuery}&quot;.</p>
                    <button
                      type="button"
                      onClick={() => handleStartAddNew(searchQuery)}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      + Create &quot;{searchQuery}&quot; Now
                    </button>
                  </div>
                ) : (
                  filteredCities.map((c) => {
                    const isSelected =
                      c.id.toLowerCase() === (selectedCityId || '').toLowerCase() ||
                      c.name.toLowerCase() === (selectedCityName || selectedCityId || '').toLowerCase();
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCity(c)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-orange-500 text-white font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            className="w-7 h-7 rounded-lg object-cover shrink-0 border border-black/10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PRESET_TEMPLE_IMAGES[0].url;
                            }}
                          />
                          <div className="truncate">
                            <p className="text-xs truncate">{c.name}</p>
                            <p
                              className={`text-[10px] truncate ${
                                isSelected ? 'text-orange-100' : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {c.state} • {c.popularFor || 'Sacred Pilgrimage'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {c.hotelCount || 0} stays
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* MODE 2: INLINE QUICK ADD NEW SACRED CITY */
            <div
              className="p-3 space-y-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveNewCity();
                }
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-orange-500 text-white rounded-lg">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    Add New Sacred City to Master
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelAddNew}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {inlineError && (
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{inlineError}</span>
                </div>
              )}

              {/* City Name */}
              <div>
                <label htmlFor="sacred-city-selector-new-name-input" className="block text-slate-700 dark:text-slate-300 font-semibold text-[11px] mb-1">
                  City / Destination Name <span className="text-orange-500">*</span>
                </label>
                <BaseInput
                  id="sacred-city-selector-new-name-input"
                  name="sacred-city-selector-new-name-input"
                  type="text"
                  required
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="e.g. Rameshwaram, Dwarka, Ujjain, Madurai"
                  className="w-full bg-slate-50 dark:bg-[#071322] border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
              </div>

              {/* State Selection */}
              <div>
                <label htmlFor="sacred-city-selector-new-state-input" className="block text-slate-700 dark:text-slate-300 font-semibold text-[11px] mb-1">
                  State / Territory
                </label>
                <BaseInput
                  id="sacred-city-selector-new-state-input"
                  name="sacred-city-selector-new-state-input"
                  type="text"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  placeholder="e.g. Tamil Nadu, Gujarat, Madhya Pradesh"
                  className="w-full bg-slate-50 dark:bg-[#071322] border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 mb-1.5"
                />
                {/* Popular State Quick Pick Chips */}
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                  {POPULAR_STATES.slice(0, 8).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewState(st)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        newState === st
                          ? 'bg-orange-500 text-white border-orange-500 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spiritual Essence / Popular For */}
              <div>
                <label htmlFor="sacred-city-selector-new-popular-for-input" className="block text-slate-700 dark:text-slate-300 font-semibold text-[11px] mb-1">
                  Spiritual Highlight / Popular For
                </label>
                <BaseInput
                  id="sacred-city-selector-new-popular-for-input"
                  name="sacred-city-selector-new-popular-for-input"
                  type="text"
                  value={newPopularFor}
                  onChange={(e) => setNewPopularFor(e.target.value)}
                  placeholder="e.g. Ramanathaswamy Temple & Agni Theertham"
                  className="w-full bg-slate-50 dark:bg-[#071322] border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Destination Cover Image */}
              <div>
                <label htmlFor="sacred-city-selector-new-image-url-input" className="block text-slate-700 dark:text-slate-300 font-semibold text-[11px] mb-1">
                  Destination Cover Photo URL
                </label>
                <div className="flex items-center gap-2">
                  <img
                    src={newImageUrl}
                    alt="Preview"
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PRESET_TEMPLE_IMAGES[0].url;
                    }}
                  />
                  <BaseInput
                    id="sacred-city-selector-new-image-url-input"
                    name="sacred-city-selector-new-image-url-input"
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-slate-50 dark:bg-[#071322] border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                {/* Preset Photo Choices */}
                <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1">
                  {PRESET_TEMPLE_IMAGES.map((img) => (
                    <button
                      key={img.name}
                      type="button"
                      onClick={() => setNewImageUrl(img.url)}
                      className={`text-[9px] px-2 py-0.5 rounded-md border whitespace-nowrap transition-colors ${
                        newImageUrl === img.url
                          ? 'bg-orange-100 text-orange-700 border-orange-400 font-bold dark:bg-orange-950/60 dark:text-orange-300'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {img.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCancelAddNew}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveNewCity}
                  disabled={isSavingCity || !newCityName.trim()}
                  className="px-4 py-1.5 rounded-xl bg-[#ea580c] hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-600/30 transition-all cursor-pointer"
                >
                  {isSavingCity ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save & Select City</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
