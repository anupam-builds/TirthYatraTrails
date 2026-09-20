import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { api, mapCityRow, mapHubRow } from '../../services/api.js';
import { City, TransitHub, HubType } from '../../types.js';
import { ImageUploadField } from '../../components/admin/ImageUploadField.js';
import { reconcileRealtimeList } from '../../hooks/useRealtimeSync.js';
import { supabase } from '../../lib/supabase.js';
import { BaseInput, BaseSelect } from '../../components/FormField.js';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  X,
  Building,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Plane,
  Train,
  Bus,
  Compass,
  Radio,
} from 'lucide-react';

interface ToastAlert {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  undoCity?: City;
}

export const AdminCities: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'cities' | 'hubs'>('cities');
  const [cities, setCities] = useState<City[]>([]);
  const [hubs, setHubs] = useState<TransitHub[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);
  const [lastSyncMsg, setLastSyncMsg] = useState<string | null>(null);

  // City Modal State
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [hotelCount, setHotelCount] = useState(10);
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80');
  const [popularFor, setPopularFor] = useState('Sacred Temple Darshan & Ghats');

  // Hub Modal State
  const [isHubModalOpen, setIsHubModalOpen] = useState(false);
  const [editingHub, setEditingHub] = useState<TransitHub | null>(null);
  const [hubName, setHubName] = useState('');
  const [hubCityId, setHubCityId] = useState('');
  const [hubType, setHubType] = useState<HubType>('AIRPORT');
  const [hubCode, setHubCode] = useState('');
  const [hubDistance, setHubDistance] = useState<number>(10);
  const [hubIsPrimary, setHubIsPrimary] = useState(true);

  // Floating confirmation toast alert
  const [toast, setToast] = useState<ToastAlert | null>(null);

  useEffect(() => {
    loadData();

    const handleDataChange = () => {
      loadData();
    };
    window.addEventListener('tirth-hotel-changed', handleDataChange);
    window.addEventListener('tirth-city-changed', handleDataChange);
    window.addEventListener('tirth-hub-changed', handleDataChange);
    window.addEventListener('storage', handleDataChange);

    return () => {
      window.removeEventListener('tirth-hotel-changed', handleDataChange);
      window.removeEventListener('tirth-city-changed', handleDataChange);
      window.removeEventListener('tirth-hub-changed', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
    };
  }, []);

  // Real-time subscription multiplexed on 'public:content-sync-channel'
  useEffect(() => {
    const channelName = 'public:content-sync-channel';
    const channel = supabase.channel(channelName);

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cities' }, (payload: any) => {
        const eventType = payload.eventType || payload.event || 'UPDATE';
        if (eventType === 'DELETE') {
          const id = String(payload.old?.id || payload.new?.id);
          setCities((prev) => {
            const nextCities = prev.filter((c) => c.id !== id);
            setHubs((currHubs) => currHubs.filter((h) => h.cityId !== id));
            return nextCities;
          });
          setLastSyncMsg(`City removed live`);
        } else {
          const raw = payload.new || payload.old;
          if (raw) {
            const mapped = mapCityRow(raw);
            setCities((prev) => {
              const updated = reconcileRealtimeList(prev, eventType, mapped);
              const allHubs: TransitHub[] = [];
              updated.forEach((c) => {
                if (Array.isArray(c.transitHubs)) {
                  c.transitHubs.forEach((h) => {
                    allHubs.push({ ...h, cityId: h.cityId || c.id, cityName: h.cityName || c.name });
                  });
                }
              });
              if (allHubs.length > 0) {
                setHubs(allHubs);
              }
              return updated;
            });
            setLastSyncMsg(`Realtime: Destination "${mapped.name}" synced`);
          }
        }
        setTimeout(() => setLastSyncMsg(null), 4000);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cList, hList] = await Promise.all([api.getCities(), api.getHubs()]);
      setCities(cList);
      setHubs(hList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // City Handlers
  const handleOpenAddCity = () => {
    setEditingCity(null);
    setName('');
    setState('Uttar Pradesh');
    setHotelCount(6);
    setImageUrl('https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80');
    setPopularFor('Sacred Temple & Spiritual Yatra');
    setIsCityModalOpen(true);
  };

  const handleOpenEditCity = (c: City) => {
    setEditingCity(c);
    setName(c.name);
    setState(c.state || 'India');
    setHotelCount(c.hotelCount);
    setImageUrl(c.imageUrl);
    setPopularFor(c.popularFor || '');
    setIsCityModalOpen(true);
  };

  const handleDeleteDestination = async (id: string, cName?: string) => {
    const cityName = cName || id;
    const deletedRecord = cities.find(
      (c) => c.id === id || c.name.toLowerCase() === cityName.toLowerCase()
    );

    setCities((prev) =>
      prev.filter((c) => c.id !== id && c.name.toLowerCase() !== cityName.toLowerCase())
    );

    const toastId = String(Date.now());
    setToast({
      id: toastId,
      type: 'success',
      title: 'Destination Removed',
      message: `"${cityName}" was successfully removed from the database and directory listings.`,
      undoCity: deletedRecord,
    });

    setTimeout(() => {
      setToast((curr) => (curr?.id === toastId ? null : curr));
    }, 6000);

    try {
      await api.deleteCity(id);
      if (cName && cName !== id) {
        api.deleteCity(cName).catch(() => {});
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: { action: 'delete', id } }));
        window.dispatchEvent(new Event('tirth-hotel-changed'));
      }
    } catch (err: any) {
      console.error('Failed to delete city', err);
      setToast({
        id: String(Date.now()),
        type: 'error',
        title: 'Deletion Failed',
        message: `Could not delete "${cityName}". Please verify connection.`,
      });
      loadData();
    }
  };

  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cityData: Partial<City> = {
      name: name.trim(),
      state: state.trim(),
      hotelCount: Number(hotelCount) || 1,
      imageUrl: imageUrl.trim(),
      popularFor: popularFor.trim(),
    };

    try {
      if (editingCity) {
        const updated = await api.updateCity(editingCity.id, cityData);
        setCities((prev) => reconcileRealtimeList(prev, 'UPDATE', updated));
        setToast({
          id: String(Date.now()),
          type: 'success',
          title: 'Destination Updated',
          message: `Changes to "${updated.name}" have been saved successfully.`,
        });
      } else {
        const created = await api.createCity(cityData);
        setCities((prev) => reconcileRealtimeList(prev, 'INSERT', created));
        setToast({
          id: String(Date.now()),
          type: 'success',
          title: 'Destination Created',
          message: `"${created.name}" is now published and live in the directory.`,
        });
      }
      setIsCityModalOpen(false);
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setToast({
        id: String(Date.now()),
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save destination hub.',
      });
    }
  };

  // Hub Handlers
  const handleOpenAddHub = () => {
    setEditingHub(null);
    setHubName('');
    setHubCityId(cities[0]?.id || 'ayodhya');
    setHubType('AIRPORT');
    setHubCode('');
    setHubDistance(12);
    setHubIsPrimary(true);
    setIsHubModalOpen(true);
  };

  const handleOpenEditHub = (h: TransitHub) => {
    setEditingHub(h);
    setHubName(h.name);
    setHubCityId(h.cityId);
    setHubType(h.hubType);
    setHubCode(h.code || '');
    setHubDistance(h.distanceToTempleKm || 10);
    setHubIsPrimary(Boolean(h.isPrimary));
    setIsHubModalOpen(true);
  };

  const handleDeleteHub = async (id: string) => {
    setHubs((prev) => prev.filter((h) => h.id !== id));
    try {
      await api.deleteHub(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleHubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<TransitHub> = {
      name: hubName.trim(),
      cityId: hubCityId,
      hubType,
      code: hubCode.trim().toUpperCase(),
      distanceToTempleKm: Number(hubDistance),
      isPrimary: hubIsPrimary,
    };

    try {
      if (editingHub) {
        const updated = await api.updateHub(editingHub.id, payload);
        setHubs((prev) => reconcileRealtimeList(prev, 'UPDATE', updated));
      } else {
        const created = await api.createHub(payload);
        setHubs((prev) => reconcileRealtimeList(prev, 'INSERT', created));
      }
      setIsHubModalOpen(false);
    } catch (err) {
      alert('Failed saving transit hub');
    }
  };

  const getHubIcon = (type: HubType) => {
    switch (type) {
      case 'AIRPORT':
        return <Plane className="w-4 h-4 text-sky-500" />;
      case 'RAILWAY_STATION':
        return <Train className="w-4 h-4 text-amber-500" />;
      case 'BUS_TERMINAL':
        return <Bus className="w-4 h-4 text-emerald-500" />;
      case 'HELIPAD':
        return <Compass className="w-4 h-4 text-purple-500" />;
      default:
        return <MapPin className="w-4 h-4 text-orange-500" />;
    }
  };

  return (
    <AdminLayout activeTab="cities">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-serif">
                <MapPin className="w-6 h-6 text-orange-500 dark:text-orange-400" />
                <span>Sacred Cities &amp; Transit Hubs</span>
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Realtime Multiplexed
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>Manage sacred destinations and gateway transit hubs (Airports, Railway, Helipads).</span>
              {lastSyncMsg && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  • {lastSyncMsg}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="bg-slate-100 dark:bg-[#081220] p-1 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center">
              <button
                onClick={() => setActiveSubTab('cities')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'cities'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Destinations ({cities.length})
              </button>
              <button
                onClick={() => setActiveSubTab('hubs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'hubs'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Transit Hubs ({hubs.length})
              </button>
            </div>

            {activeSubTab === 'cities' ? (
              <button
                id="btn-add-destination"
                onClick={handleOpenAddCity}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 w-fit cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Destination</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddHub}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 w-fit cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Transit Hub</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading sacred hubs &amp; transit...</p>
          </div>
        )}

        {/* CITIES TAB */}
        {!loading && activeSubTab === 'cities' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cities.map((city) => (
              <div
                key={city.id}
                className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-800/80 rounded-3xl overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col group shadow-xs"
              >
                <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={city.imageUrl}
                    alt={city.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] font-bold bg-orange-600/90 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {city.state || 'India'}
                    </span>
                    <h3 className="text-lg font-bold leading-snug mt-1">{city.name}</h3>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                      <Building className="w-3.5 h-3.5 text-orange-500" />
                      <span>{city.hotelCount} Verified Accommodations</span>
                    </p>
                    {city.popularFor && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                        "{city.popularFor}"
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditCity(city)}
                      className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 dark:text-slate-400 dark:hover:text-orange-400 dark:hover:bg-orange-950/30 rounded-xl transition-colors cursor-pointer"
                      title="Edit Destination"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDestination(city.id, city.name)}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                      title="Delete Destination"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HUBS TAB */}
        {!loading && activeSubTab === 'hubs' && (
          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081220]/50 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Transit Hub</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Gateway City</th>
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Distance to Temple</th>
                    <th className="py-3.5 px-4">Primary Gate</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {hubs.map((hub) => {
                    const linkedCity = cities.find((c) => c.id.toLowerCase() === hub.cityId.toLowerCase());
                    return (
                      <tr key={hub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {getHubIcon(hub.hubType)}
                          <span>{hub.name}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {hub.hubType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {linkedCity ? linkedCity.name : hub.cityName || hub.cityId}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-orange-600 dark:text-orange-400">
                          {hub.code || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {hub.distanceToTempleKm ? `${hub.distanceToTempleKm} km` : 'Near Sanctum'}
                        </td>
                        <td className="py-3.5 px-4">
                          {hub.isPrimary ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Primary Gate
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Secondary</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditHub(hub)}
                              className="p-1.5 text-slate-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg cursor-pointer"
                              title="Edit Hub"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteHub(hub.id)}
                              className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                              title="Delete Hub"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* City Modal */}
        {isCityModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-lg w-full text-slate-800 dark:text-slate-200 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingCity ? 'Edit Sacred City' : 'Add Sacred City'}
                </h2>
                <button
                  onClick={() => setIsCityModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCitySubmit} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="city-name-input" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">City Name</label>
                  <BaseInput
                    id="city-name-input"
                    name="city-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Varanasi, Ayodhya, Kedarnath"
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label htmlFor="city-state-input" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">State / Region</label>
                  <BaseInput
                    id="city-state-input"
                    name="city-state-input"
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Uttar Pradesh, Uttarakhand"
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label htmlFor="city-hotel-count-input" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Estimated Stays / Hotels</label>
                  <BaseInput
                    id="city-hotel-count-input"
                    name="city-hotel-count-input"
                    type="number"
                    required
                    min={1}
                    value={hotelCount}
                    onChange={(e) => setHotelCount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <ImageUploadField
                  id="city-photo-uploader"
                  label="Destination Cover Image"
                  helpText="Upload a high-resolution photo from your device or drag & drop. Or specify a CDN photo link below."
                  images={imageUrl ? [imageUrl] : []}
                  onChange={(imgs) => setImageUrl(imgs[0] || '')}
                  multiple={false}
                />

                <div>
                  <label htmlFor="city-popular-for-input" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Popular For / Spiritual Tagline</label>
                  <BaseInput
                    id="city-popular-for-input"
                    name="city-popular-for-input"
                    type="text"
                    value={popularFor}
                    onChange={(e) => setPopularFor(e.target.value)}
                    placeholder="e.g. Kashi Vishwanath & Ganga Aarti"
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCityModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Destination
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Hub Modal */}
        {isHubModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-lg w-full text-slate-800 dark:text-slate-200 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingHub ? 'Edit Transit Hub' : 'Add Gateway Transit Hub'}
                </h2>
                <button
                  onClick={() => setIsHubModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleHubSubmit} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="hub-name-input" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Transit Hub Name</label>
                  <BaseInput
                    id="hub-name-input"
                    name="hub-name-input"
                    type="text"
                    required
                    value={hubName}
                    onChange={(e) => setHubName(e.target.value)}
                    placeholder="e.g. Maharishi Valmiki International Airport"
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="hub-type-select" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Transit Type</label>
                    <BaseSelect
                      id="hub-type-select"
                      name="hub-type-select"
                      value={hubType}
                      onChange={(e) => setHubType(e.target.value as HubType)}
                      className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="AIRPORT">Airport</option>
                      <option value="RAILWAY_STATION">Railway Station</option>
                      <option value="HELIPAD">Helipad Base</option>
                      <option value="BUS_TERMINAL">Bus Terminal</option>
                    </BaseSelect>
                  </div>

                  <div>
                    <label htmlFor="hub-code-input" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Station / IATA Code</label>
                    <BaseInput
                      id="hub-code-input"
                      name="hub-code-input"
                      type="text"
                      value={hubCode}
                      onChange={(e) => setHubCode(e.target.value.toUpperCase())}
                      placeholder="e.g. AYJ, VNS, AY"
                      className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white uppercase font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="hub-linked-city-select" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Linked Destination</label>
                    <BaseSelect
                      id="hub-linked-city-select"
                      name="hub-linked-city-select"
                      value={hubCityId}
                      onChange={(e) => setHubCityId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </BaseSelect>
                  </div>

                  <div>
                    <label htmlFor="hub-distance-input" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Distance to Temple (km)</label>
                    <BaseInput
                      id="hub-distance-input"
                      name="hub-distance-input"
                      type="number"
                      step="0.1"
                      value={hubDistance}
                      onChange={(e) => setHubDistance(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <BaseInput
                    type="checkbox"
                    id="hub-primary"
                    name="hub-primary"
                    checked={hubIsPrimary}
                    onChange={(e) => setHubIsPrimary(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="hub-primary" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                    Set as Primary Entry Gate for this City
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsHubModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Hub
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
