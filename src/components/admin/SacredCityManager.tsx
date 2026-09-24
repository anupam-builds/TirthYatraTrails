/**
 * ============================================================================
 * 1. SUPABASE SQL DDL SCRIPT
 * Run this directly in the Supabase SQL Editor:
 * ============================================================================
 *
 * create table if not exists public.sacred_cities (
 *   id uuid primary key default gen_random_uuid(),
 *   name text not null unique check (char_length(trim(name)) > 0),
 *   state text not null default 'India',
 *   temple_significance text,
 *   is_active boolean not null default true,
 *   created_at timestamptz not null default timezone('utc'::text, now()),
 *   updated_at timestamptz not null default timezone('utc'::text, now())
 * );
 *
 * -- Enable full replica identity so Realtime DELETE events carry the full old row
 * alter table public.sacred_cities replica identity full;
 *
 * -- Enable Row Level Security (RLS)
 * alter table public.sacred_cities enable row level security;
 *
 * -- Public policies for demo / admin access
 * create policy "Allow read sacred_cities" on public.sacred_cities for select using (true);
 * create policy "Allow insert sacred_cities" on public.sacred_cities for insert with check (true);
 * create policy "Allow update sacred_cities" on public.sacred_cities for update using (true) with check (true);
 * create policy "Allow delete sacred_cities" on public.sacred_cities for delete using (true);
 *
 * -- Add to Realtime publication
 * alter publication supabase_realtime add table public.sacred_cities;
 *
 * -- Optional Initial Seed
 * insert into public.sacred_cities (name, state, temple_significance) values
 *   ('Varanasi', 'Uttar Pradesh', 'Kashi Vishwanath Jyotirlinga, Ganga Aarti & Sacred Ghats'),
 *   ('Ayodhya', 'Uttar Pradesh', 'Shri Ram Janmabhoomi & Holy Saryu River'),
 *   ('Kedarnath', 'Uttarakhand', 'Kedarnath Dham & Himalayas'),
 *   ('Rishikesh & Haridwar', 'Uttarakhand', 'Har Ki Pauri & Ganga Aarti'),
 *   ('Tirupati', 'Andhra Pradesh', 'Lord Sri Venkateswara Swamy Temple (Tirumala)'),
 *   ('Rameshwaram', 'Tamil Nadu', 'Ramanathaswamy Jyotirlinga & 22 Theerthams')
 * on conflict (name) do nothing;
 * ============================================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { BaseInput, BaseTextarea } from '../FormField.js';
import {
  MapPin,
  Plus,
  Radio,
  Search,
  Check,
  ChevronDown,
  X,
  Sparkles,
  Building,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// ==========================================
// 2. SUPABASE CLIENT INITIALIZATION
// ==========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ [TirthYatraTrails] Supabase credentials missing! Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ==========================================
// 3. TYPES & DATA CONTRACTS
// ==========================================
export interface SacredCity {
  id: string;
  name: string;
  state: string;
  temple_significance: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SacredCityManagerProps {
  /** If true, renders only the compact dropdown for hotel inventory tagging */
  selectorOnly?: boolean;
  /** Currently selected city name or ID (for selector mode) */
  value?: string;
  /** Callback when city is selected (for selector mode) */
  onChange?: (city: { id: string; name: string; state: string }) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

// Popular states quick-chips for inline creation
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
];

// ==========================================
// 4. MAIN REALTIME COMPONENT
// ==========================================
export const SacredCityManager: React.FC<SacredCityManagerProps> = ({
  selectorOnly = false,
  value = '',
  onChange,
  label = 'Sacred City / Dham',
  placeholder = 'Select sacred destination...',
  className = '',
}) => {
  // Cities State & Realtime Channel
  const [cities, setCities] = useState<SacredCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelStatus, setChannelStatus] = useState<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'JOINING'>('JOINING');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Admin Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Add City Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [stateInput, setStateInput] = useState('Uttar Pradesh');
  const [significanceInput, setSignificanceInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Selector Mode Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Initial Fetch ---
  const fetchCities = useCallback(async () => {
    try {
      setLoading(true);
      setGlobalError(null);

      const { data, error } = await supabase
        .from('sacred_cities')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCities(data || []);
    } catch (err: any) {
      console.error('Error fetching sacred cities:', err);
      setGlobalError(err.message || 'Failed to load sacred cities.');
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Realtime Subscription (Cross-Browser Live Sync) ---
  useEffect(() => {
    fetchCities();

    const channel: RealtimeChannel = supabase
      .channel('sacred-cities-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'sacred_cities',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCity = payload.new as SacredCity;
            setCities((prev) => {
              if (prev.some((c) => c.id === newCity.id)) return prev;
              return [...prev, newCity].sort((a, b) => a.name.localeCompare(b.name));
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as SacredCity;
            setCities((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setCities((prev) => prev.filter((c) => c.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        setChannelStatus(status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCities]);

  // Click outside to close selector dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // --- Handle Add City Submission ---
  const handleAddCity = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFormError(null);

    const cleanName = nameInput.trim();
    if (!cleanName) {
      setFormError('City / Destination name is required.');
      return;
    }

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase
        .from('sacred_cities')
        .insert([
          {
            name: cleanName,
            state: stateInput.trim() || 'India',
            temple_significance: significanceInput.trim() || null,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // If in selector mode, auto-select the newly added city
      if (onChange && data) {
        onChange({ id: data.id, name: data.name, state: data.state });
      }

      // Reset form and close modal
      setNameInput('');
      setStateInput('Uttar Pradesh');
      setSignificanceInput('');
      setIsModalOpen(false);
      setIsDropdownOpen(false);
      fetchCities();
    } catch (err: any) {
      console.error('Failed to create city:', err);
      setFormError(err.message || 'Failed to save city. It might already exist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handle Delete City ---
  const handleDeleteCity = async (id: string, cityName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${cityName}" from the sacred master directory?`)) return;

    try {
      const { error } = await supabase.from('sacred_cities').delete().eq('id', id);
      if (error) throw error;
      fetchCities();
    } catch (err: any) {
      console.error('Failed to delete city:', err);
      alert(`Deletion failed: ${err.message}`);
    }
  };

  // Find currently active city for selector mode
  const activeCity = cities.find(
    (c) => c.id === value || c.name.toLowerCase() === value.toLowerCase()
  );

  // Filtered cities list
  const filteredCities = cities.filter((c) => {
    const q = (selectorOnly ? dropdownSearch : searchQuery).toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      (c.temple_significance && c.temple_significance.toLowerCase().includes(q))
    );
  });

  // ==========================================
  // VIEW A: SELECTOR MODE (For Hotel Inventory)
  // ==========================================
  if (selectorOnly) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        {label && (
          <div className="flex items-center justify-between mb-1">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {label}
            </span>
            <button
              type="button"
              onClick={() => {
                setNameInput(dropdownSearch);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Add City</span>
            </button>
          </div>
        )}

        {/* Trigger Box */}
        <div
          id="sacred-city-manager-trigger"
          role="button"
          tabIndex={0}
          aria-label={label || 'Select Sacred City'}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsDropdownOpen(!isDropdownOpen);
            }
          }}
          className={`w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white cursor-pointer transition-all ${isDropdownOpen
            ? 'ring-2 ring-orange-500 border-orange-500'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
            }`}
        >
          <div className="flex items-center gap-2 truncate">
            <div className="p-1 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="truncate text-left">
              <span className="font-semibold">
                {activeCity ? activeCity.name : value || placeholder}
              </span>
              {activeCity?.state && (
                <span className="ml-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  • {activeCity.state}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <BaseInput
                  id="sacred-city-manager-dropdown-search-input"
                  name="sacred-city-manager-dropdown-search-input"
                  ref={searchInputRef}
                  type="text"
                  value={dropdownSearch}
                  onChange={(e) => setDropdownSearch(e.target.value)}
                  placeholder="Search sacred destinations..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {dropdownSearch && (
                  <button
                    type="button"
                    onClick={() => setDropdownSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Add Button */}
              <button
                type="button"
                onClick={() => {
                  setNameInput(dropdownSearch);
                  setIsModalOpen(true);
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-semibold border border-orange-200 dark:border-orange-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {dropdownSearch.trim()
                      ? `Register "${dropdownSearch.trim()}" as City`
                      : '+ Register New Sacred City'}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase">Quick Add</span>
              </button>

              {/* Dropdown City List */}
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {loading ? (
                  <div className="py-6 text-center text-slate-400">Loading cities...</div>
                ) : filteredCities.length === 0 ? (
                  <div className="py-6 text-center text-slate-500">No matching sacred city found.</div>
                ) : (
                  filteredCities.map((c) => {
                    const isSelected = activeCity?.id === c.id || value === c.name;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          if (onChange) onChange({ id: c.id, name: c.name, state: c.state });
                          setIsDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${isSelected
                          ? 'bg-orange-500 text-white font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                          }`}
                      >
                        <div className="truncate">
                          <p className="truncate font-semibold">{c.name}</p>
                          <p
                            className={`text-[10px] truncate ${isSelected ? 'text-orange-100' : 'text-slate-400 dark:text-slate-500'
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
          </div>
        )}

        {renderAddModal()}
      </div>
    );
  }

  // ==========================================
  // VIEW B: FULL ADMIN MANAGEMENT DASHBOARD
  // ==========================================
  return (
    <div className={`p-6 max-w-7xl mx-auto font-sans ${className}`}>
      {/* Top Header & Realtime Pulse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
              <Building className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Sacred Cities & Yatra Hubs Master
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 pl-10">
            Real-time pilgrimage destination directory synchronizing customer search and hotel inventory tags.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Realtime Live Pulse Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <Radio
              className={`w-3.5 h-3.5 ${channelStatus === 'SUBSCRIBED'
                ? 'text-emerald-500 animate-pulse'
                : 'text-amber-500'
                }`}
            />
            <span className="text-slate-700 dark:text-slate-300">
              {channelStatus === 'SUBSCRIBED' ? 'Realtime Connected' : channelStatus}
            </span>
          </div>

          <button
            onClick={fetchCities}
            title="Refresh Directory"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setNameInput('');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Sacred City</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {globalError && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <BaseInput
            id="sacred-city-manager-list-search-input"
            name="sacred-city-manager-list-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city, state, or temple..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Total Registered Destinations: <span className="font-bold text-orange-600">{cities.length}</span>
        </div>
      </div>

      {/* Cities Master Table */}
      <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Sacred Destination</th>
                <th className="px-6 py-3.5">State / Region</th>
                <th className="px-6 py-3.5">Temple Significance & Yatra Highlights</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400">
                    <div className="flex justify-center items-center gap-2.5">
                      <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span>Syncing sacred cities with Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400">
                    No sacred destinations found. Click &quot;Add Sacred City&quot; to create one.
                  </td>
                </tr>
              ) : (
                filteredCities.map((city) => (
                  <tr
                    key={city.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {city.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {city.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {city.temple_significance || 'Pilgrimage Darshan & Holy Yatra'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Live in Directory
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteCity(city.id, city.name)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Sacred City"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {renderAddModal()}
    </div>
  );

  // --- Helper: Accessible Add City Modal ---
  function renderAddModal() {
    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <form
          onSubmit={handleAddCity}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-500 text-white rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Register Sacred Destination
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="mt-3 p-2.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-1.5 border border-red-200 dark:border-red-900/60">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="mt-4 space-y-4 text-xs">
            <div>
              <label htmlFor="sacred-city-manager-modal-name-input" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sacred City / Dham Name <span className="text-orange-500">*</span>
              </label>
              <BaseInput
                id="sacred-city-manager-modal-name-input"
                name="sacred-city-manager-modal-name-input"
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Ujjain, Dwarka, Somnath, Madurai"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="sacred-city-manager-modal-state-input" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                State / Territory
              </label>
              <BaseInput
                id="sacred-city-manager-modal-state-input"
                name="sacred-city-manager-modal-state-input"
                type="text"
                value={stateInput}
                onChange={(e) => setStateInput(e.target.value)}
                placeholder="e.g. Madhya Pradesh"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 mb-1.5"
              />
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                {POPULAR_STATES.slice(0, 6).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStateInput(st)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${stateInput === st
                      ? 'bg-orange-500 text-white border-orange-500 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="sacred-city-manager-modal-significance-textarea" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Temple Significance & Yatra Highlights
              </label>
              <BaseTextarea
                id="sacred-city-manager-modal-significance-textarea"
                name="sacred-city-manager-modal-significance-textarea"
                rows={2}
                value={significanceInput}
                onChange={(e) => setSignificanceInput(e.target.value)}
                placeholder="e.g. Mahakaleshwar Jyotirlinga, Bhasma Aarti, & Shipra River Ghats"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !nameInput.trim()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Register City</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }
};

export default SacredCityManager;