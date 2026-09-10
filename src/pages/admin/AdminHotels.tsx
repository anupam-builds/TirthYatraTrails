import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { api } from '../../services/api.js';
import { Hotel, City, Room } from '../../types.js';
import { ImageUploadField } from '../../components/admin/ImageUploadField.js';
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
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface ToastAlert {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  undoHotel?: Hotel;
}

export const AdminHotels: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');

  // Floating confirmation toast alert
  const [toast, setToast] = useState<ToastAlert | null>(null);

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
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
  ]);

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
    setImages([
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    ]);
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
    setImages(h.images && h.images.length > 0 ? h.images : [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
    ]);
    setIsModalOpen(true);
  };

  /**
   * Dedicated Hotel Deletion Handler
   * Removes from table state immediately, triggers confirmation toast, and persists to DB and local storage.
   */
  const handleDeleteHotel = async (id: string, hName?: string) => {
    const hotelName = hName || id;
    const deletedRecord = hotels.find(
      (h) => h.id === id || h.name.toLowerCase() === hotelName.toLowerCase()
    );

    // 1. Instant optimistic state update in the UI
    setHotels((prev) =>
      prev.filter((h) => h.id !== id && h.name.toLowerCase() !== hotelName.toLowerCase())
    );

    // 2. Trigger confirmation toast alert
    const toastId = String(Date.now());
    setToast({
      id: toastId,
      type: 'success',
      title: 'Hotel Removed',
      message: `"${hotelName}" was successfully removed from inventory and database.`,
      undoHotel: deletedRecord,
    });

    // Auto dismiss toast after 6 seconds
    setTimeout(() => {
      setToast((curr) => (curr?.id === toastId ? null : curr));
    }, 6000);

    // 3. Persist deletion to backend and local store
    try {
      await api.deleteHotel(id);
      if (hName && hName !== id) {
        api.deleteHotel(hName).catch(() => {});
      }
    } catch (err: any) {
      console.error('Failed to delete hotel:', err);
      setToast({
        id: String(Date.now()),
        type: 'error',
        title: 'Deletion Failed',
        message: `Could not delete "${hotelName}". Please check connection.`,
      });
      loadData();
    }
  };

  // Backwards compatibility alias
  const handleDelete = handleDeleteHotel;

  // Undo deletion handler
  const handleUndoDelete = async (hotelToRestore: Hotel) => {
    try {
      const restored = await api.createHotel(hotelToRestore);
      setHotels((prev) => [restored, ...prev]);
      setToast({
        id: String(Date.now()),
        type: 'info',
        title: 'Hotel Restored',
        message: `"${hotelToRestore.name}" has been restored to the inventory.`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error('Failed to restore hotel:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amenities = amenitiesString.split(',').map((s) => s.trim()).filter(Boolean);
    const validImages = images.length > 0 ? images : [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
    ];
    const selectedCity = cities.find((c) => c.id === cityId);

    const hotelData: Partial<Hotel> = {
      name: name.trim(),
      cityId,
      cityName: selectedCity?.name || cityName,
      address: address.trim(),
      description: description.trim(),
      starRating: Number(starRating),
      googleRating: Number(googleRating),
      reviewCount: Number(reviewCount),
      basePrice: Number(basePrice),
      distanceToTemple: distanceToTemple.trim(),
      darshanType: darshanType.trim(),
      isTopRated,
      amenities,
      images: validImages,
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
          imageUrl: validImages[0],
        },
      ],
    };

    try {
      if (editingHotel) {
        const updated = await api.updateHotel(editingHotel.id, hotelData);
        setHotels((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
        setToast({
          id: String(Date.now()),
          type: 'success',
          title: 'Hotel Updated',
          message: `Changes to "${updated.name}" have been saved successfully.`,
        });
      } else {
        const created = await api.createHotel(hotelData);
        setHotels((prev) => [created, ...prev]);
        setToast({
          id: String(Date.now()),
          type: 'success',
          title: 'Hotel Published',
          message: `"${created.name}" is now live in the accommodations inventory.`,
        });
      }
      setIsModalOpen(false);
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setToast({
        id: String(Date.now()),
        type: 'error',
        title: 'Save Failed',
        message: 'Failed saving hotel details.',
      });
    }
  };

  return (
    <AdminLayout activeTab="hotels">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-serif">
              <Building className="w-6 h-6 text-orange-500 dark:text-orange-400" />
              <span>Hotels &amp; Sacred Accommodations Inventory</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage pilgrim stays, pricing tiers, photos, and darshan proximity.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 w-fit cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Hotel</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
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
              className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 w-56"
            />
          </div>
        </div>

        {/* Hotels Table */}
        <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081220]/50 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Hotel</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Ratings</th>
                  <th className="py-3 px-4">Starting Price</th>
                  <th className="py-3 px-4">Proximity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs">Loading accommodations inventory...</p>
                    </td>
                  </tr>
                ) : hotels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Building className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No hotels found</p>
                      <p className="text-xs text-slate-400 mt-1">Try changing your search query or city filter.</p>
                      <button
                        onClick={handleOpenAdd}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-xs cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Hotel
                      </button>
                    </td>
                  </tr>
                ) : (
                  hotels.map((hotel) => (
                    <tr
                      key={hotel.id}
                      id={`hotel-row-${hotel.id}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={hotel.images[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=150&q=80'}
                            alt={hotel.name}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-snug">{hotel.name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{hotel.address}</p>
                            {hotel.isTopRated && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800 rounded">
                                Top Rated
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {hotel.cityName}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <span>G {hotel.googleRating.toFixed(1)}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-slate-400 text-[10px]">({hotel.reviewCount})</span>
                        </div>
                        <div className="text-[10px] text-slate-500">{hotel.starRating} Star Stay</div>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                        ₹{hotel.basePrice.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/nt</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-[11px]">
                        {hotel.distanceToTemple || 'Steps from temple'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          id={`btn-edit-hotel-${hotel.id}`}
                          onClick={() => handleOpenEdit(hotel)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                          title={`Edit ${hotel.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-hotel-${hotel.id}`}
                          onClick={() => handleDeleteHotel(hotel.id, hotel.name)}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/60 dark:hover:bg-red-900 dark:text-red-300 rounded-lg transition-colors cursor-pointer"
                          title={`Delete ${hotel.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ADD / EDIT HOTEL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-2xl w-full my-8 text-slate-800 dark:text-slate-200 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingHotel ? 'Edit Hotel Listing' : 'Add New Sacred Hotel Listing'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Hotel Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Sacred City</label>
                  <select
                    value={cityId}
                    onChange={(e) => {
                      setCityId(e.target.value);
                      const c = cities.find((ci) => ci.id === e.target.value);
                      if (c) setCityName(c.name);
                    }}
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
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
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Full Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">About / Description</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Base Price (₹/night)</label>
                  <input
                    type="number"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Star Rating (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    required
                    value={starRating}
                    onChange={(e) => setStarRating(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Google Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    max={5}
                    required
                    value={googleRating}
                    onChange={(e) => setGoogleRating(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Distance to Temple</label>
                  <input
                    type="text"
                    value={distanceToTemple}
                    onChange={(e) => setDistanceToTemple(e.target.value)}
                    placeholder="e.g. 200m from Kashi Vishwanath"
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Darshan Assistance</label>
                  <input
                    type="text"
                    value={darshanType}
                    onChange={(e) => setDarshanType(e.target.value)}
                    placeholder="e.g. Morning Aarti VIP Pass desk"
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">
                  Amenities (comma-separated)
                </label>
                <input
                  type="text"
                  value={amenitiesString}
                  onChange={(e) => setAmenitiesString(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <ImageUploadField
                id="hotel-images-uploader"
                label="Hotel Photos & Gallery"
                helpText="Upload hotel images directly from your computer or drag & drop files. The first photo is the main card cover."
                images={images}
                onChange={setImages}
                multiple={true}
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="top-rated-check"
                  checked={isTopRated}
                  onChange={(e) => setIsTopRated(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#081220] text-orange-600 focus:ring-0"
                />
                <label htmlFor="top-rated-check" className="text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  Feature in "Top Rated / Hand-picked Stays" on Homepage
                </label>
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
                  {editingHotel ? 'Save Changes' : 'Publish Hotel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* FLOATING ACTION TOAST WITH UNDO OPTION */}
      {toast && (
        <div
          id="hotel-action-toast"
          className="fixed bottom-6 right-6 z-50 max-w-md bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-4 flex items-start gap-3 transition-all animate-in slide-in-from-bottom-5"
        >
          <div
            className={`p-2 rounded-xl shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                : toast.type === 'error'
                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{toast.title}</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">{toast.message}</p>
            {toast.undoHotel && (
              <button
                id="btn-undo-delete-hotel"
                onClick={() => {
                  if (toast.undoHotel) {
                    handleUndoDelete(toast.undoHotel);
                  }
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo Deletion</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </AdminLayout>
  );
};
