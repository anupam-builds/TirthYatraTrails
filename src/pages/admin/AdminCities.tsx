import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { api } from '../../services/api.js';
import { City } from '../../types.js';
import { ImageUploadField } from '../../components/admin/ImageUploadField.js';
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
} from 'lucide-react';

interface ToastAlert {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  undoCity?: City;
}

export const AdminCities: React.FC = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);

  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [hotelCount, setHotelCount] = useState(10);
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80');
  const [popularFor, setPopularFor] = useState('Sacred Temple Darshan & Ghats');

  // Floating confirmation toast alert
  const [toast, setToast] = useState<ToastAlert | null>(null);

  useEffect(() => {
    loadCities();

    const handleHotelChange = () => {
      loadCities();
    };
    window.addEventListener('tirth-hotel-changed', handleHotelChange);
    window.addEventListener('storage', handleHotelChange);

    return () => {
      window.removeEventListener('tirth-hotel-changed', handleHotelChange);
      window.removeEventListener('storage', handleHotelChange);
    };
  }, []);

  async function loadCities() {
    setLoading(true);
    try {
      const list = await api.getCities();
      setCities(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = () => {
    setEditingCity(null);
    setName('');
    setState('Uttar Pradesh');
    setHotelCount(6);
    setImageUrl('https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80');
    setPopularFor('Sacred Temple & Spiritual Yatra');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: City) => {
    setEditingCity(c);
    setName(c.name);
    setState(c.state);
    setHotelCount(c.hotelCount);
    setImageUrl(c.imageUrl);
    setPopularFor(c.popularFor || '');
    setIsModalOpen(true);
  };

  /**
   * Dedicated Destination / Hub Deletion Handler
   * Removes from state immediately, triggers confirmation toast, and persists to DB.
   */
  const handleDeleteDestination = async (id: string, cName?: string) => {
    const cityName = cName || id;
    const deletedRecord = cities.find(
      (c) => c.id === id || c.name.toLowerCase() === cityName.toLowerCase()
    );

    // 1. Instant optimistic state update in the UI
    setCities((prev) =>
      prev.filter((c) => c.id !== id && c.name.toLowerCase() !== cityName.toLowerCase())
    );

    // 2. Trigger confirmation toast alert
    const toastId = String(Date.now());
    setToast({
      id: toastId,
      type: 'success',
      title: 'Destination Removed',
      message: `"${cityName}" was successfully removed from the database and directory listings.`,
      undoCity: deletedRecord,
    });

    // Auto dismiss toast after 6 seconds
    setTimeout(() => {
      setToast((curr) => (curr?.id === toastId ? null : curr));
    }, 6000);

    // 3. Persist deletion to backend and local store
    try {
      await api.deleteCity(id);
      if (cName && cName !== id) {
        api.deleteCity(cName).catch(() => {});
      }
    } catch (err: any) {
      console.error('Failed to delete destination:', err);
      setToast({
        id: String(Date.now()),
        type: 'error',
        title: 'Deletion Failed',
        message: `Could not delete "${cityName}". Please check connection.`,
      });
      loadCities();
    }
  };

  // Backwards compatibility alias
  const handleDelete = handleDeleteDestination;

  // Undo deletion handler
  const handleUndoDelete = async (cityToRestore: City) => {
    try {
      const restored = await api.createCity(cityToRestore);
      setCities((prev) => [...prev, restored]);
      setToast({
        id: String(Date.now()),
        type: 'info',
        title: 'Destination Restored',
        message: `"${cityToRestore.name}" has been restored to the directory listings.`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error('Failed to restore destination:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        setCities((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setToast({
          id: String(Date.now()),
          type: 'success',
          title: 'Destination Updated',
          message: `Changes to "${updated.name}" have been saved successfully.`,
        });
      } else {
        const created = await api.createCity(cityData);
        setCities((prev) => [...prev, created]);
        setToast({
          id: String(Date.now()),
          type: 'success',
          title: 'Destination Created',
          message: `"${created.name}" is now published and live in the directory.`,
        });
      }
      setIsModalOpen(false);
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

  return (
    <AdminLayout activeTab="cities">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-serif">
              <MapPin className="w-6 h-6 text-orange-500 dark:text-orange-400" />
              <span>Sacred Cities &amp; Pilgrimage Hubs</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage destination cards displayed across homepage and directory search filters.
            </p>
          </div>

          <button
            id="btn-add-destination"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 w-fit cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Destination</span>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading destination hubs...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && cities.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
            <MapPin className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No destinations found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">Click below to add your first sacred city hub.</p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl"
            >
              Add First Destination
            </button>
          </div>
        )}

        {/* Grid of Cities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cities.map((city) => (
            <div
              key={city.id}
              id={`city-card-${city.id}`}
              className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 rounded-3xl overflow-hidden shadow-xs group flex flex-col justify-between transition-colors"
            >
              <div>
                <div className="h-44 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={city.imageUrl}
                    alt={city.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 dark:from-[#0d1d33] via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 bg-white/90 dark:bg-[#081220]/90 backdrop-blur-md px-2.5 py-1 rounded-full text-slate-900 dark:text-white text-[10px] font-extrabold shadow-xs">
                    {city.hotelCount} {city.hotelCount === 1 ? 'Stay' : 'Stays'}
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{city.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{city.state}</p>
                  {city.popularFor && (
                    <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium truncate pt-1">
                      {city.popularFor}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#081220]/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  id={`btn-edit-city-${city.id}`}
                  onClick={() => handleOpenEdit(city)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  id={`btn-delete-city-${city.id}`}
                  onClick={() => handleDeleteDestination(city.id, city.name)}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/60 dark:hover:bg-red-900 dark:text-red-300 rounded-lg cursor-pointer transition-colors"
                  title={`Delete ${city.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Floating Confirmation Toast Alert */}
      {toast && (
        <div
          id="city-action-toast"
          role="alert"
          className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100vw-3rem)] sm:w-auto sm:min-w-[340px] bg-slate-900/95 dark:bg-[#071322]/95 backdrop-blur-md border border-slate-700/80 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3.5 transition-all duration-300"
        >
          <div className={`p-2 rounded-xl shrink-0 ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : toast.type === 'error'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {toast.title}
              </h4>
              <button
                onClick={() => setToast(null)}
                className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{toast.message}</p>
            
            {toast.undoCity && (
              <button
                onClick={() => {
                  if (toast.undoCity) handleUndoDelete(toast.undoCity);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-orange-300 hover:text-orange-200 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo Deletion</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-lg w-full text-slate-800 dark:text-slate-200 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingCity ? 'Edit Sacred City' : 'Add Sacred City'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">City Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Varanasi, Ayodhya, Kedarnath"
                  className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">State / Region</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Uttar Pradesh, Uttarakhand"
                  className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Estimated Stays / Hotels</label>
                <input
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
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Popular For / Spiritual Tagline</label>
                <input
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
                  onClick={() => setIsModalOpen(false)}
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
    </AdminLayout>
  );
};
