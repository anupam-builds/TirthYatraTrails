import React, { useState } from 'react';
import { X, Star, CheckCircle2, Mic, MapPin, Sparkles, Send } from 'lucide-react';
import { api } from '../../services/api.js';
import { Review } from '../../types.js';
import { AudioVoiceNoteWidget } from './AudioVoiceNoteWidget.js';
import { BaseInput, BaseTextarea } from '../FormField.js';
import confetti from 'canvas-confetti';

interface SubmitReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReview: Review) => void;
  defaultDestination?: string;
}

export const SubmitReviewModal: React.FC<SubmitReviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDestination = 'Kashi · Ayodhya',
}) => {
  const [authorName, setAuthorName] = useState('');
  const [authorLocation, setAuthorLocation] = useState(defaultDestination);
  const [authorHomeCity, setAuthorHomeCity] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [destinationImage, setDestinationImage] = useState(
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80'
  );
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioTitle, setAudioTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!authorName.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }

    if (!reviewText.trim() && !audioUrl) {
      setErrorMsg('Please write your pilgrimage experience or record an audio voice note.');
      return;
    }

    try {
      setIsSubmitting(true);
      const initials = authorName
        .split(' ')
        .map((p) => p.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const reviewPayload: Partial<Review> = {
        authorName: authorName.trim(),
        authorLocation: authorHomeCity ? `${authorLocation} (from ${authorHomeCity})` : authorLocation,
        authorInitials: initials,
        rating,
        reviewText: reviewText.trim() || 'Devotee shared an authentic voice note recording of their sacred journey.',
        destinationImage: destinationImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
        isVerified: true,
        isFeatured: true,
        audioUrl,
        audioDuration: audioDuration || undefined,
        audioTitle: audioTitle || (audioUrl ? `${authorName}'s Darshan Reflection` : undefined),
        language: 'Hindi & English',
      };

      const created = await api.createReview(reviewPayload);

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ea580c', '#f59e0b', '#10b981', '#3b82f6'],
        });
      } catch (e) {}

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess(created);
        setIsSuccess(false);
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setErrorMsg(err.message || 'Failed to submit devotee review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#0f294a] text-white p-6 sm:p-7 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-400 mb-1">
            <Mic className="w-3.5 h-3.5" />
            <span>Devotee Experiences & Voice Notes</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white">
            Share Your <span className="text-orange-400 italic font-serif">Spiritual</span> Journey
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Record a short voice note or write your heartfelt darshan reflection for the global devotee sangha.
          </p>
        </div>

        {/* Success Banner */}
        {isSuccess ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-2xl font-bold text-slate-900">
              Jai Shree Ram! Thank You
            </h4>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Your heartfelt testimonial and audio voice note have been recorded and added to our community traveller stories.
            </p>
          </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 max-h-[75vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Author Name & Home City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="submit-review-author-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Your Full Name *
                </label>
                <BaseInput
                  id="submit-review-author-name"
                  name="submit-review-author-name"
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra Sharma"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#ea580c] focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="submit-review-author-city" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Your Home City / State
                </label>
                <BaseInput
                  id="submit-review-author-city"
                  name="submit-review-author-city"
                  type="text"
                  value={authorHomeCity}
                  onChange={(e) => setAuthorHomeCity(e.target.value)}
                  placeholder="e.g. Ahmedabad, Gujarat"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#ea580c] focus:bg-white"
                />
              </div>
            </div>

            {/* Sacred Destination Visited & Rating */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="submit-review-destination" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sacred Destination / Yatra
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-orange-500 absolute left-3 top-3" />
                  <BaseInput
                    id="submit-review-destination"
                    name="submit-review-destination"
                    type="text"
                    required
                    value={authorLocation}
                    onChange={(e) => setAuthorLocation(e.target.value)}
                    placeholder="e.g. Kedarnath Dham, Kashi Vishwanath"
                    className="w-full text-sm pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#ea580c] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pilgrimage Satisfaction Rating
                </label>
                <div className="flex items-center gap-1.5 pt-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">
                    {rating}.0 / 5.0
                  </span>
                </div>
              </div>
            </div>

            {/* 1. DEVOTEE AUDIO RECORDING / UPLOAD WIDGET */}
            <div className="pt-1">
              <AudioVoiceNoteWidget
                onAudioChange={(url, dur, title) => {
                  setAudioUrl(url);
                  setAudioDuration(dur);
                  if (title) setAudioTitle(title);
                }}
                initialAudioUrl={audioUrl}
                initialDuration={audioDuration}
                initialTitle={audioTitle}
              />
            </div>

            {/* Written Review */}
            <div>
              <label htmlFor="submit-review-story-text" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Written Reflection / Traveller Story
              </label>
              <BaseTextarea
                id="submit-review-story-text"
                name="submit-review-story-text"
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share the details of your darshan, temple proximity, cleanliness, food, and the peace you experienced..."
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#ea580c] focus:bg-white resize-none"
              />
            </div>

            {/* Verification Note */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50/70 border border-orange-200/60 text-xs text-orange-950">
              <Sparkles className="w-4 h-4 text-[#ea580c] shrink-0" />
              <span>
                Verified pilgrim testimonials help elderly and solo travelers choose trusted spiritual itineraries with confidence.
              </span>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#d44e0a] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Submitting Testimonial...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Spiritual Experience</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
