import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { api } from '../../services/api.js';
import { Package } from '../../types.js';
import { ImageUploadField } from '../../components/admin/ImageUploadField.js';
import {
  Compass,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

const CATEGORIES = ['Pilgrimage', 'Char Dham', 'Varanasi Ayodhya', 'South India', 'Jyotirlinga'];

export const AdminPackages: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Toast Notification State
  const [toast, setToast] = useState<{
    id: string;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    undoPackage?: Package;
  } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Char Dham');
  const [duration, setDuration] = useState('9 Days / 8 Nights');
  const [location, setLocation] = useState('Haridwar • Yamunotri • Gangotri • Kedarnath • Badrinath');
  const [startingPrice, setStartingPrice] = useState(38000);
  const [bookedRank, setBookedRank] = useState('#1 Most Booked Yatra');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80');
  const [packageImages, setPackageImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
  ]);
  const [overview, setOverview] = useState('Embark on the sacred Himalayan journey covering the four revered shrines with helicopter coordination, VIP darshan assistance, and deluxe stays.');
  const [highlightsString, setHighlightsString] = useState('VIP Darshan passes included, Dedicated Pilgrim Officer, Wholesome Vegetarian Meals Buffet, Oxygen Cylinder and Doctor Support');
  const [cancellationPolicy, setCancellationPolicy] = useState('Full refund up to 15 days before yatra commencement. 50% refund between 7-14 days.');

  useEffect(() => {
    loadData();
  }, [selectedCategory, searchQuery]);

  async function loadData() {
    setLoading(true);
    try {
      const list = await api.getPackages(selectedCategory, searchQuery);
      setPackages(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = () => {
    setEditingPackage(null);
    setTitle('');
    setCategory('Char Dham');
    setDuration('6 Days / 5 Nights');
    setLocation('Sacred Circuit');
    setStartingPrice(24000);
    setBookedRank('Popular Divine Yatra');
    const defaultImg = 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80';
    setImageUrl(defaultImg);
    setPackageImages([defaultImg]);
    setOverview('All-inclusive pilgrimage package with VIP darshan passes, private AC coach, and wholesome culinary arrangements.');
    setHighlightsString('VIP Darshan Pass included, Dedicated Guide, Wholesome Buffet Meals, Deluxe Verified Accommodations');
    setCancellationPolicy('100% refund up to 14 days before departure.');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Package) => {
    setEditingPackage(p);
    setTitle(p.title);
    setCategory(p.category);
    setDuration(p.duration);
    setLocation(p.location);
    setStartingPrice(p.startingPrice);
    setBookedRank(p.bookedRank || '');
    const existing = (p.galleryImages && p.galleryImages.length > 0)
      ? p.galleryImages
      : (p.imageUrl ? [p.imageUrl] : []);
    setImageUrl(p.imageUrl || existing[0] || '');
    setPackageImages(existing.length > 0 ? existing : [
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80'
    ]);
    setOverview(p.overview);
    setHighlightsString(p.highlights.join(', '));
    setCancellationPolicy(p.cancellationPolicy);
    setIsModalOpen(true);
  };

  /**
   * Package Deletion Handler
   * Instantly removes from state (optimistic update), shows toast notification with Undo,
   * and synchronizes persistent storage across API and localStore.
   */
  const handleDeletePackage = async (id: string, pTitle?: string) => {
    const pkgTitle = pTitle || id;
    const deletedRecord = packages.find(
      (p) => p.id === id || p.title.toLowerCase() === pkgTitle.toLowerCase()
    );

    // 1. Instant optimistic state update
    setPackages((prev) =>
      prev.filter((p) => p.id !== id && p.title.toLowerCase() !== pkgTitle.toLowerCase())
    );

    // 2. Trigger confirmation toast alert with undo
    const toastId = String(Date.now());
    setToast({
      id: toastId,
      type: 'success',
      title: 'Package Removed',
      message: `"${pkgTitle}" was successfully removed from packages inventory and database.`,
      undoPackage: deletedRecord,
    });

    // Auto dismiss toast after 6 seconds
    setTimeout(() => {
      setToast((curr) => (curr?.id === toastId ? null : curr));
    }, 6000);

    // 3. Persist deletion to backend and local storage
    try {
      await api.deletePackage(id);
      if (pTitle && pTitle !== id) {
        api.deletePackage(pTitle).catch(() => {});
      }
    } catch (err: any) {
      console.error('Failed to delete package', err);
      setToast({
        id: String(Date.now()),
        type: 'error',
        title: 'Deletion Failed',
        message: `Could not delete "${pkgTitle}". Please check connection.`,
      });
      loadData();
    }
  };

  const handleUndoDelete = async (packageToRestore: Package) => {
    try {
      const restored = await api.createPackage(packageToRestore);
      setPackages((prev) => [restored, ...prev]);
      setToast({
        id: String(Date.now()),
        type: 'info',
        title: 'Package Restored',
        message: `"${packageToRestore.title}" has been restored to packages inventory.`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error('Failed to restore package:', err);
    }
  };

  const handleDelete = handleDeletePackage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const highlights = highlightsString.split(',').map((s) => s.trim()).filter(Boolean);
    const validImages = packageImages.length > 0 ? packageImages : (imageUrl ? [imageUrl] : [
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80'
    ]);
    const primaryCover = validImages[0];

    const packageData: Partial<Package> = {
      title,
      category,
      duration,
      location,
      startingPrice: Number(startingPrice),
      bookedRank,
      imageUrl: primaryCover,
      galleryImages: validImages,
      overview,
      highlights,
      cancellationPolicy,
      packageType: 'All-Inclusive Guided Yatra',
      experienceLevel: 'Comfortable • Senior Friendly',
      hotelsLevel: '3 & 4 Star Deluxe Stays',
      transfers: 'Private AC Coach / Helicopter Support',
      itinerary: editingPackage?.itinerary || [
        { day: 1, title: 'Arrival & Welcome Puja', desc: 'Arrival at holy base, check-in to deluxe hotel, evening Ganga Aarti blessing.' },
        { day: 2, title: 'Sacred Temple Darshan', desc: 'Early morning VIP Abhishek and Darshan with temple priest facilitation.' },
        { day: 3, title: 'Return & Farewell Blessings', desc: 'Wholesome breakfast and airport drop with sacred Prasad box.' },
      ],
    };

    try {
      if (editingPackage) {
        const updated = await api.updatePackage(editingPackage.id, packageData);
        setPackages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await api.createPackage(packageData);
        setPackages((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert('Failed saving package');
    }
  };

  return (
    <AdminLayout activeTab="packages">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-serif">
              <Compass className="w-6 h-6 text-orange-500 dark:text-orange-400" />
              <span>Sacred Pilgrimage Packages Manager</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Create, edit, and publish all-inclusive yatra itineraries.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 w-fit cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Package</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="">All Pilgrimage Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search package title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 w-56"
            />
          </div>
        </div>

        {/* Packages Table */}
        <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081220]/50 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Yatra Package</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Starting Price</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={pkg.imageUrl}
                          alt={pkg.title}
                          className="w-14 h-12 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-snug">{pkg.title}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]">{pkg.location}</p>
                          {pkg.bookedRank && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800 rounded">
                              {pkg.bookedRank}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {pkg.category}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {pkg.duration}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                      ₹{pkg.startingPrice.toLocaleString('en-IN')}{' '}
                      <span className="text-[10px] font-normal text-slate-400">/ person</span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(pkg)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                        title="Edit Package"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-delete-package-${pkg.id}`}
                        onClick={() => handleDeletePackage(pkg.id, pkg.title)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/60 dark:hover:bg-red-900 dark:text-red-300 rounded-lg transition-colors cursor-pointer"
                        title="Delete Package"
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

      {/* ADD / EDIT PACKAGE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-2xl w-full my-8 text-slate-800 dark:text-slate-200 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingPackage ? 'Edit Pilgrimage Package' : 'Create New Yatra Package'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Package Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Complete Char Dham Yatra with Helicopter"
                  className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Duration</label>
                  <input
                    type="text"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 5 Days / 4 Nights"
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Locations / Route</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Varanasi • Prayagraj • Ayodhya"
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Starting Price (₹/person)</label>
                  <input
                    type="number"
                    required
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <ImageUploadField
                id="package-images-uploader"
                label="Package Cover & Gallery Photos"
                helpText="Upload yatra photos directly from your computer or drag & drop files. The first photo will be used as the package cover banner."
                images={packageImages}
                onChange={(imgs) => {
                  setPackageImages(imgs);
                  if (imgs.length > 0) {
                    setImageUrl(imgs[0]);
                  }
                }}
                multiple={true}
              />

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Overview / Description</label>
                <textarea
                  rows={3}
                  required
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">
                  Highlights (comma-separated)
                </label>
                <input
                  type="text"
                  value={highlightsString}
                  onChange={(e) => setHighlightsString(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Cancellation Policy</label>
                <input
                  type="text"
                  value={cancellationPolicy}
                  onChange={(e) => setCancellationPolicy(e.target.value)}
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
                  {editingPackage ? 'Save Changes' : 'Publish Yatra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* FLOATING ACTION TOAST NOTIFICATION */}
      {toast && (
        <div
          id="package-toast-notification"
          className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl flex items-start justify-between gap-3 animate-fade-in transition-all duration-300"
        >
          <div className="flex items-start gap-3">
            {toast.type === 'success' && (
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            {toast.type === 'error' && (
              <div className="p-2 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
            {toast.type === 'info' && (
              <div className="p-2 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{toast.title}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{toast.message}</p>
              {toast.undoPackage && (
                <button
                  id="btn-undo-package-delete"
                  onClick={() => handleUndoDelete(toast.undoPackage!)}
                  className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/50 dark:hover:bg-orange-900/60 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-lg border border-orange-200 dark:border-orange-800/80 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Undo Deletion
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </AdminLayout>
  );
};
