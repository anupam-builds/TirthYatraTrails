import React, { useState, useRef, useEffect } from 'react';
import { useSacredCities, SacredCity } from '../../hooks/useSacredCities.js';
import { BaseInput } from '../FormField.js';
import {
  MapPin,
  Search,
  Check,
  ChevronDown,
  X,
  Plus,
  Sparkles,
  AlertCircle,
  Building,
} from 'lucide-react';

export interface SacredCitySelection {
  id: string;
  name: string;
  state: string;
}

export interface SacredCitySelectorProps {
  value?: string;
  onChange?: (selection: SacredCitySelection) => void;
  onValueChange?: (cityName: string) => void;
  label?: string;
  required?: boolean;
  allowQuickAdd?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
  id?: string;
}

export const SacredCitySelector: React.FC<SacredCitySelectorProps> = ({
  value = '',
  onChange,
  onValueChange,
  label = 'Sacred City / Dham',
  required = false,
  allowQuickAdd = true,
  placeholder = 'Select pilgrimage city...',
  className = '',
  error,
  id = 'sacred-city-selector',
}) => {
  const { cities, loading, addCity } = useSacredCities();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newState, setNewState] = useState('Uttar Pradesh');
  const [newSignificance, setNewSignificance] = useState('');
  const [savingNew, setSavingNew] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
        setAddError(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !isAdding) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, isAdding]);

  // Find matched city
  const selectedCity = cities.find(
    (c) =>
      c.id.toLowerCase() === value.toLowerCase() ||
      c.name.toLowerCase() === value.toLowerCase()
  );

  const filteredCities = cities.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      (c.temple_significance && c.temple_significance.toLowerCase().includes(q))
    );
  });

  const notifyChange = (c: SacredCity | { id: string; name: string; state: string }) => {
    const payload: SacredCitySelection = {
      id: c.id,
      name: c.name,
      state: c.state,
    };
    if (onChange) {
      // Support both object receiver and string receiver
      (onChange as any)(payload);
    }
    if (onValueChange) {
      onValueChange(c.name);
    }
  };

  const handleSelect = (c: SacredCity) => {
    notifyChange(c);
    setIsOpen(false);
    setIsAdding(false);
    setSearch('');
  };

  const handleSaveQuickCity = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const nameClean = newCityName.trim();
    if (!nameClean) {
      setAddError('City name is required.');
      return;
    }

    try {
      setSavingNew(true);
      setAddError(null);

      const created = await addCity({
        name: nameClean,
        state: newState.trim() || 'India',
        popularFor: newSignificance.trim() || 'Sacred Temple & Spiritual Yatra',
      });

      notifyChange({
        id: created.id,
        name: created.name,
        state: created.state || 'India',
      });

      setIsAdding(false);
      setIsOpen(false);
      setSearch('');
    } catch (err: any) {
      console.error('Quick add city failed:', err);
      setAddError(err.message || 'Failed to create sacred city.');
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} id={id}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {label} {required && <span className="text-orange-500">*</span>}
          </label>
          {allowQuickAdd && !isOpen && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setIsAdding(true);
                setNewCityName('');
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Add City</span>
            </button>
          )}
        </div>
      )}

      {/* Select Box Trigger */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setIsAdding(false);
        }}
        className={`w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white cursor-pointer transition-all ${
          error
            ? 'border-red-500 ring-1 ring-red-500'
            : isOpen
            ? 'ring-2 ring-orange-500 border-orange-500'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <div className="p-1 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 shrink-0">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="truncate text-left">
            <span className="font-semibold text-slate-900 dark:text-white">
              {selectedCity ? selectedCity.name : value || placeholder}
            </span>
            {selectedCity?.state && (
              <span className="ml-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                • {selectedCity.state}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}

      {/* Dropdown Container */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100">
          {!isAdding ? (
            <div className="p-2 space-y-2">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <BaseInput
                  ref={searchInputRef}
                  id="sacred-city-search"
                  name="sacred-city-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sacred destinations..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Add Trigger Button */}
              {allowQuickAdd && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(true);
                    setNewCityName(search.trim());
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-orange-50 hover:bg-orange-100/80 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-semibold border border-orange-200/80 dark:border-orange-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-orange-500 text-white">
                      <Plus className="w-3 h-3" />
                    </div>
                    <span>
                      {search.trim()
                        ? `Register "${search.trim()}" as Sacred City`
                        : '+ Add New Destination'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase opacity-80">Quick Add</span>
                </button>
              )}

              {/* City List */}
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {loading ? (
                  <div className="py-6 text-center text-slate-400">Loading cities...</div>
                ) : filteredCities.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 space-y-2">
                    <p>No sacred city matches &quot;{search}&quot;.</p>
                  </div>
                ) : (
                  filteredCities.map((c) => {
                    const isSelected =
                      selectedCity?.id === c.id ||
                      value.toLowerCase() === c.name.toLowerCase() ||
                      value.toLowerCase() === c.id.toLowerCase();

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelect(c)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-orange-500 text-white font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate text-xs font-semibold">{c.name}</p>
                          <p
                            className={`text-[10px] truncate ${
                              isSelected ? 'text-orange-100' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {c.state} {c.temple_significance && `• ${c.temple_significance}`}
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 shrink-0 text-white ml-2" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Inline Quick Register (Using <div> to strictly prevent <form> nesting warnings) */
            <div
              className="p-3 space-y-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveQuickCity(e);
                }
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Quick Add Sacred City</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {addError && (
                <div className="p-2 rounded-xl bg-red-50 text-red-600 text-[11px] flex items-center gap-1.5 border border-red-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label htmlFor="quick-add-city-name" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  City / Dham Name *
                </label>
                <BaseInput
                  id="quick-add-city-name"
                  name="quick-add-city-name"
                  type="text"
                  required
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="e.g. Ujjain, Dwarka, Madurai"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="quick-add-state" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  State / Region
                </label>
                <BaseInput
                  id="quick-add-state"
                  name="quick-add-state"
                  type="text"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  placeholder="e.g. Madhya Pradesh"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label htmlFor="quick-add-significance" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Temple Significance / Highlights
                </label>
                <BaseInput
                  id="quick-add-significance"
                  name="quick-add-significance"
                  type="text"
                  value={newSignificance}
                  onChange={(e) => setNewSignificance(e.target.value)}
                  placeholder="e.g. Mahakaleshwar Jyotirlinga"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickCity}
                  disabled={savingNew || !newCityName.trim()}
                  className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingNew ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SacredCitySelector;
