import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { api } from '../../services/api.js';
import { Hotel, City, Room } from '../../types.js';
import {
  Building,
  Plus,
  Search,
  Edit2,
  Trash2,
  Star,
  MapPin,
  X,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const AdminHotels: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [cityId, setCityId] = useState('');
  const [cityName, setCityName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [starRating, setStarRating] = useState(4);
  const [googleRating, setGoogleRating] = useState(4.8);
  const [reviewCount, setReviewCount] = useState(120);
  const [basePrice, setBasePrice] = useState(4500);
  const [distanceToTemple, setDistanceToTemple] = useState('200m from Sanctum');
  const [darshanType, setDarshanType] = useState('VIP Darshan Pass Desk Available');
  const [isTopRated, setIsTopRated] = useState(true);
  const [amenitiesString, setAmenitiesString] = useState('24/7 Hot Water, Pure Sattvic Restaurant, Free Temple Shuttle, Luggage Cloakroom');
  const [imagesString, setImagesString] = useState('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80');

  useEffect(() => {
    loadData();
  }, [selectedCityId, searchQuery]);

  async function loadData() {
    setLoading(true);
    try {
      const [cList, hList] = await Promise.all([
        api.getCities(),
        api.getHotels(selectedCityId, searchQuery),
      ]);
      setCities(cList);
      setHotels(hList);
      if (cList.length > 0 && !cityId) {
        setCityId(cList[0].id);
        setCityName(cList[0].name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = () => {
    setEditingHotel(null);
    setName('');
    const defaultCity = cities[0] || { id: 'varanasi', name: 'Varanasi' };
    setCityId(defaultCity.id);
    setCityName(defaultCity.name);
    setAddress('Near Main Temple Gate');
    setDescription('Serene pilgrimage stay offering pure vegetarian dining, warm hospitalities, and walking distance to sacred morning aarti.');
    setStarRating(4);
    setGoogleRating(4.8);
    setReviewCount(95);
    setBasePrice(4200);
    setDistanceToTemple('300m from Temple');
    setDarshanType('VIP Darshan & Priest Assistance Available');
    setIsTopRated(true);
    setAmenitiesString('Pure Sattvic Food, Free Wi-Fi, 24hr Hot Water, Temple Drop & Pickup');
    setImagesString('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80\nhttps://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (h: Hotel) => {
    setEditingHotel(h);
    setName(h.name);
    setCityId(h.cityId);
    setCityName(h.cityName);
    setAddress(h.address);
    setDescription(h.description);
    setStarRating(h.starRating);
    setGoogleRating(h.googleRating);
    setReviewCount(h.reviewCount);
    setBasePrice(h.basePrice);
    setDistanceToTemple(h.distanceToTemple || '');
    setDarshanType(h.darshanType || '');
    setIsTopRated(h.isTopRated || false);
    setAmenitiesString(h.amenities.join(', '));
    setImagesString(h.images.join('\n'));
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, hName: string) => {
    if (window.confirm(`Are you sure you want to delete "${hName}"?`)) {
      try {
        await api.deleteHotel(id);
        setHotels((prev) => prev.filter((h) => h.id !== id));
      } catch (err) {
        alert('Failed to delete hotel');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amenities = amenitiesString.split(',').map((s) => s.trim()).filter(Boolean);
    const images = imagesString.split('\n').map((s) => s.trim()).filter(Boolean);
    const selectedCity = cities.find((c) => c.id === cityId);

    const hotelData: Partial<Hotel> = {
      name,
      cityId,
      cityName: selectedCity?.name || cityName,
      address,
      description,
      starRating: Number(starRating),
      googleRating: Number(googleRating),
      reviewCount: Number(reviewCount),
      basePrice: Number(basePrice),
      distanceToTemple,
      darshanType,
      isTopRated,
      amenities,
      images,
      rooms: editingHotel?.rooms || [
        {
          id: 'room-1',
          name: 'Deluxe Sanctum Room',
          bedType: '1 King Bed',
          capacity: '2 Adults + 1 Child',
          roomOnlyPrice: Number(basePrice),
          breakfastPrice: Number(basePrice) + 800,
          halfBoardPrice: Number(basePrice) + 1600,
          fullBoardPrice: Number(basePrice) + 2400,
          imageUrl: images[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
        },
      ],
    };

    try {
      if (editingHotel) {
        const updated = await api.updateHotel(editingHotel.id, hotelData);
        setHotels((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      } else {
        const created = await api.createHotel(hotelData);
        setHotels((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert('Failed saving hotel');
    }
  };

  return (
    <AdminLayout activeTab="hotels">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Building className="w-6 h-6 text-orange-400" />
              <span>Hotels &amp; Sacred Accommodations Inventory</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage pilgrim stays, pricing tiers, photos, and darshan proximity.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Hotel</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#0d1d33] border border-slate-700 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="bg-[#081220] border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="">All Sacred Cities</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.hotelCount})
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search hotel name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#081220] border border-slate-700 text-white text-xs rounded-xl focus:outline-none w-56"
            />
          </div>
        </div>

        {/* Hotels Table */}
        <div className="bg-[#0d1d33] border border-slate-700/80 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800 bg-[#081220]/50 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Hotel</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Ratings</th>
                  <th className="py-3 px-4">Starting Price</th>
                  <th className="py-3 px-4">Proximity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {hotels.map((hotel) => (
                  <tr key={hotel.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={hotel.images[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=150&q=80'}
                          alt={hotel.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 bg-slate-800"
                        />
                        <div>
                          <p className="font-bold text-white leading-snug">{hotel.name}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{hotel.address}</p>
                          {hotel.isTopRated && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-orange-950 text-orange-400 border border-orange-800 rounded">
                              Top Rated
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-300">
                      {hotel.cityName}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <span>G {hotel.googleRating.toFixed(1)}</span>
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span className="text-slate-400 text-[10px]">({hotel.reviewCount})</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{hotel.starRating} Star Stay</div>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-white">
                      ₹{hotel.basePrice.toLocaleString('en-IN')}{' '}
                      <span className="text-[10px] font-normal text-slate-400">/nt</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-[11px]">
                      {hotel.distanceToTemple || 'Steps from temple'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(hotel)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                        title="Edit Hotel"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(hotel.id, hotel.name)}
                        className="p-2 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-lg transition-colors"
                        title="Delete Hotel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ADD / EDIT HOTEL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0d1d33] border border-slate-700 rounded-3xl p-6 max-w-2xl w-full my-8 text-slate-200 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">
                {editingHotel ? 'Edit Hotel Listing' : 'Add New Sacred Hotel Listing'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Hotel Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Sacred City</label>
                  <select
                    value={cityId}
                    onChange={(e) => {
                      setCityId(e.target.value);
                      const c = cities.find((ci) => ci.id === e.target.value);
                      if (c) setCityName(c.name);
                    }}
                    className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                  >
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Full Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">About / Description</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Base Price (₹/night)</label>
                  <input
                    type="number"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Star Rating (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    required
                    value={starRating}
                    onChange={(e) => setStarRating(Number(e.target.value))}
                    className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Google Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    max={5}
                    required
                    value={googleRating}
                    onChange={(e) => setGoogleRating(Number(e.target.value))}
                    className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Distance to Temple</label>
                  <input
                    type="text"
                    value={distanceToTemple}
                    onChange={(e) => setDistanceToTemple(e.target.value)}
                    placeholder="e.g. 200m from Kashi Vishwanath"
                    className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Darshan Assistance</label>
                  <input
                    type="text"
                    value={darshanType}
                    onChange={(e) => setDarshanType(e.target.value)}
                    placeholder="e.g. Morning Aarti VIP Pass desk"
                    className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  Amenities (comma-separated)
                </label>
                <input
                  type="text"
                  value={amenitiesString}
                  onChange={(e) => setAmenitiesString(e.target.value)}
                  className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  Image URLs (one URL per line)
                </label>
                <textarea
                  rows={3}
                  value={imagesString}
                  onChange={(e) => setImagesString(e.target.value)}
                  className="w-full bg-[#081220] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="top-rated-check"
                  checked={isTopRated}
                  onChange={(e) => setIsTopRated(e.target.checked)}
                  className="rounded border-slate-700 bg-[#081220] text-[#ea580c] focus:ring-0"
                />
                <label htmlFor="top-rated-check" className="text-slate-300 font-semibold cursor-pointer">
                  Feature in "Top Rated / Hand-picked Stays" on Homepage
                </label>
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
                  {editingHotel ? 'Save Changes' : 'Publish Hotel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
