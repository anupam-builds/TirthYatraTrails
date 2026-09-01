import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { api } from '../../services/api.js';
import { City } from '../../types.js';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  X,
  Building,
} from 'lucide-react';

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

  useEffect(() => {
    loadCities();
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

  const handleDelete = async (id: string, cName: string) => {
    if (window.confirm(`Delete destination hub "${cName}"?`)) {
      try {
        await api.deleteCity(id);
        setCities((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        alert('Failed to delete city');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cityData: Partial<City> = {
      name,
      state,
      hotelCount: Number(hotelCount),
      imageUrl,
      popularFor,
    };

    try {
      if (editingCity) {
        const updated = await api.updateCity(editingCity.id, cityData);
        setCities((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await api.createCity(cityData);
        setCities((prev) => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert('Failed saving destination hub');
    }
  };

  return (
    <AdminLayout activeTab="cities">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <MapPin className="w-6 h-6 text-orange-400" />
              <span>Sacred Cities &amp; Pilgrimage Hubs</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage destination cards displayed across homepage and directory search filters.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Add Destination</span>
          </button>
        </div>

        {/* Grid of Cities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cities.map((city) => (
            <div
              key={city.id}
              className="bg-[#0d1d33] border border-slate-700/80 rounded-3xl overflow-hidden shadow-lg group flex flex-col justify-between"
            >
              <div>
                <div className="h-44 w-full relative overflow-hidden bg-slate-800">
                  <img
                    src={city.imageUrl}
                    alt={city.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1d33] via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 bg-[#081220]/90 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-extrabold">
                    {city.hotelCount} Stays
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <h3 className="font-extrabold text-base text-white">{city.name}</h3>
                  <p className="text-xs text-slate-400">{city.state}</p>
                  {city.popularFor && (
                    <p className="text-[11px] text-orange-400 font-medium truncate pt-1">
                      {city.popularFor}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-[#081220]/60 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(city)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(city.id, city.name)}
                  className="p-2 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-lg"
                  title="Delete destination"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0d1d33] border border-slate-700 rounded-3xl p-6 max-w-md w-full text-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">
                {editingCity ? 'Edit Sacred City' : 'Add Sacred City'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">City Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">State</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Hotel Count</label>
                <input
                  type="number"
                  required
                  value={hotelCount}
                  onChange={(e) => setHotelCount(Number(e.target.value))}
                  className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Photo Image URL</label>
                <input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Popular For / Tagline</label>
                <input
                  type="text"
                  value={popularFor}
                  onChange={(e) => setPopularFor(e.target.value)}
                  placeholder="e.g. Kashi Vishwanath &amp; Ganga Aarti"
                  className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-xl shadow-md"
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
