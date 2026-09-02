import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { api } from '../../services/api.js';
import { Review } from '../../types.js';
import {
  Quote,
  Plus,
  Search,
  Edit2,
  Trash2,
  Star,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
  MapPin,
  X,
  Image as ImageIcon,
  Check,
  AlertCircle,
} from 'lucide-react';

export const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    authorName: string;
    authorLocation: string;
    authorInitials: string;
    rating: number;
    reviewText: string;
    destinationImage: string;
    isVerified: boolean;
    googleReviewUrl: string;
    isFeatured: boolean;
    order: number;
  }>({
    authorName: '',
    authorLocation: '',
    authorInitials: '',
    rating: 5.0,
    reviewText: '',
    destinationImage: '',
    isVerified: true,
    googleReviewUrl: '',
    isFeatured: true,
    order: 0,
  });

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminReviews();
      setReviews(data);
    } catch (err: any) {
      console.error('Failed to load reviews:', err);
      setActionMessage({ text: 'Error loading traveller stories', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => {
      setActionMessage(null);
    }, 4000);
  };

  const handleOpenAddModal = () => {
    setEditingReview(null);
    setFormData({
      authorName: '',
      authorLocation: '',
      authorInitials: '',
      rating: 5.0,
      reviewText: '',
      destinationImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
      isVerified: true,
      googleReviewUrl: '',
      isFeatured: true,
      order: reviews.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (review: Review) => {
    setEditingReview(review);
    setFormData({
      authorName: review.authorName,
      authorLocation: review.authorLocation,
      authorInitials: review.authorInitials || '',
      rating: review.rating,
      reviewText: review.reviewText,
      destinationImage: review.destinationImage,
      isVerified: review.isVerified,
      googleReviewUrl: review.googleReviewUrl || '',
      isFeatured: review.isFeatured,
      order: review.order || 0,
    });
    setIsModalOpen(true);
  };

  const handleToggleFeatured = async (review: Review) => {
    try {
      const updated = await api.toggleReviewFeatured(review.id);
      setReviews((prev) => prev.map((r) => (r.id === review.id ? updated : r)));
      showNotification(`Story by "${review.authorName}" ${updated.isFeatured ? 'featured on homepage' : 'hidden from homepage'}`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to toggle featured status', 'error');
    }
  };

  const handleDelete = async (id: string, authorName: string) => {
    if (!window.confirm(`Are you sure you want to delete the review by "${authorName}"?`)) {
      return;
    }
    try {
      await api.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      showNotification(`Review by "${authorName}" deleted successfully`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete review', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.authorName.trim() || !formData.reviewText.trim()) {
      alert('Please fill in both Author Name and Review Description.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingReview) {
        const updated = await api.updateReview(editingReview.id, formData);
        setReviews((prev) => prev.map((r) => (r.id === editingReview.id ? updated : r)));
        showNotification(`Review by "${formData.authorName}" updated successfully`);
      } else {
        const created = await api.createReview(formData);
        setReviews((prev) => [created, ...prev]);
        showNotification(`New review by "${formData.authorName}" published successfully`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showNotification(err.message || 'Failed to save review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.authorName.toLowerCase().includes(q) ||
      r.authorLocation.toLowerCase().includes(q) ||
      r.reviewText.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout activeTab="reviews">
      <div id="admin-reviews-page" className="p-6 md:p-8 space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                <Quote className="w-4 h-4" />
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-serif">
                Traveller Stories &amp; Google Reviews
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage pilgrim testimonials, destination images, star ratings, and homepage featured carousel stories.
            </p>
          </div>

          <button
            id="admin-add-review-btn"
            onClick={handleOpenAddModal}
            className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Traveller Story</span>
          </button>
        </div>

        {/* Action / Notification Banner */}
        {actionMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Stats & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#0a192f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Stories</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{reviews.length}</span>
          </div>
          <div className="bg-white dark:bg-[#0a192f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Featured on Homepage</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {reviews.filter((r) => r.isFeatured).length}
            </span>
          </div>
          <div className="bg-white dark:bg-[#0a192f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Avg Rating</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              5.0 <Star className="w-4 h-4 fill-current text-amber-500 dark:text-amber-400" />
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reviews by pilgrim name, destination, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors shadow-xs"
          />
        </div>

        {/* Reviews Table */}
        <div className="bg-white dark:bg-[#0a192f] rounded-2xl border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-[#0f233f] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Destination Photo</th>
                  <th className="py-3.5 px-4">Author / Pilgrim</th>
                  <th className="py-3.5 px-4">Destination / Trip</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Review Excerpt</th>
                  <th className="py-3.5 px-4 text-center">Featured</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading stories...
                    </td>
                  </tr>
                ) : filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No traveller stories found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((review) => (
                    <tr key={review.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      {/* Destination Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 relative shrink-0">
                          <img
                            src={review.destinationImage}
                            alt={review.authorLocation}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80';
                            }}
                          />
                        </div>
                      </td>

                      {/* Author */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {review.authorInitials || review.authorName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">{review.authorName}</p>
                            {review.isVerified && (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Google Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                          <MapPin className="w-3 h-3 text-orange-500 dark:text-orange-400 shrink-0" />
                          <span>{review.authorLocation}</span>
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-bold text-amber-500 dark:text-amber-400">
                          <span>{review.rating.toFixed(1)}</span>
                          <Star className="w-3.5 h-3.5 fill-current text-amber-500 dark:text-amber-400" />
                        </div>
                      </td>

                      {/* Review Body */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-slate-600 dark:text-slate-300 line-clamp-2 text-[11px] italic leading-relaxed">
                          "{review.reviewText}"
                        </p>
                      </td>

                      {/* Featured Toggle Switch */}
                      <td className="py-3 px-4 text-center">
                        <button
                          id={`toggle-featured-${review.id}`}
                          onClick={() => handleToggleFeatured(review)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            review.isFeatured
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-400/20 dark:text-amber-300 dark:border-amber-400/40 hover:bg-amber-200 dark:hover:bg-amber-400/30'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {review.isFeatured ? '★ Featured' : 'Hidden'}
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {review.googleReviewUrl && (
                            <a
                              href={review.googleReviewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                              title="Open External Review"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            id={`edit-review-${review.id}`}
                            onClick={() => handleOpenEditModal(review)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                            title="Edit Review"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-review-${review.id}`}
                            onClick={() => handleDelete(review.id, review.authorName)}
                            className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/60 dark:text-red-300 dark:hover:text-red-200 transition-colors cursor-pointer"
                            title="Delete Review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add / Edit Review Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                    <Quote className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {editingReview ? 'Edit Traveller Story' : 'Add New Traveller Story'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure pilgrim quote, author details, temple photo, and rating.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form Content */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Author Name */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Author / Pilgrim Name <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Milind Pawar or Ramesh Sharma"
                      value={formData.authorName}
                      onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0f233f] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Destination / Trip */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Destination / Trip <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mathura · Vrindavan or Kashi · Ayodhya"
                      value={formData.authorLocation}
                      onChange={(e) => setFormData({ ...formData, authorLocation: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0f233f] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Rating Dropdown */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Star Rating</label>
                    <select
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                      className="w-full bg-slate-50 dark:bg-[#0f233f] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                    >
                      <option value={5.0}>5.0 ★★★★★ (Perfect)</option>
                      <option value={4.8}>4.8 ★★★★★ (Excellent)</option>
                      <option value={4.5}>4.5 ★★★★☆ (Great)</option>
                      <option value={4.0}>4.0 ★★★★☆ (Good)</option>
                    </select>
                  </div>

                  {/* Author Initials (Optional) */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Avatar Initials (Optional)</label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="e.g. MP (Auto from name)"
                      value={formData.authorInitials}
                      onChange={(e) => setFormData({ ...formData, authorInitials: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 dark:bg-[#0f233f] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Display Order */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Carousel Order</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-[#0f233f] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Destination Image URL */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Destination Photo Image URL <span className="text-orange-500">*</span></span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Temple or spiritual vista</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required
                      placeholder="https://images.unsplash.com/..."
                      value={formData.destinationImage}
                      onChange={(e) => setFormData({ ...formData, destinationImage: e.target.value })}
                      className="flex-1 bg-slate-50 dark:bg-[#0f233f] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {formData.destinationImage && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0">
                        <img
                          src={formData.destinationImage}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=100&q=80';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Body (Textarea) */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Review Description / Pilgrim Experience <span className="text-orange-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe the devotee's spiritual journey, proximity to sanctum, VIP darshan comfort, or Sattvic dining experience..."
                    value={formData.reviewText}
                    onChange={(e) => setFormData({ ...formData, reviewText: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0f233f] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed font-sans"
                  />
                </div>

                {/* External Link */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">External Google Review Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={formData.googleReviewUrl}
                    onChange={(e) => setFormData({ ...formData, googleReviewUrl: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0f233f] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Switches / Checkboxes */}
                <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 rounded text-orange-500 focus:ring-0 bg-white dark:bg-[#0f233f] border-slate-300 dark:border-slate-700"
                    />
                    <span className="font-bold text-slate-900 dark:text-white">Feature on Homepage Carousel</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isVerified}
                      onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                      className="w-4 h-4 rounded text-orange-500 focus:ring-0 bg-white dark:bg-[#0f233f] border-slate-300 dark:border-slate-700"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-300">Verified Google Review Badge</span>
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : editingReview ? 'Save Changes' : 'Publish Story'}
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
