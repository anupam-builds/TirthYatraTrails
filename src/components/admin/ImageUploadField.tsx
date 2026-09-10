import React, { useState, useRef } from 'react';
import {
  Upload,
  ImagePlus,
  Trash2,
  Star,
  Loader2,
  Plus,
  Link2,
  X,
  Check,
  RefreshCw,
} from 'lucide-react';
import { processAndOptimizeImage } from '../../utils/imageUtils.js';

interface ImageUploadFieldProps {
  id?: string;
  label?: string;
  helpText?: string;
  images: string[];
  onChange: (images: string[]) => void;
  multiple?: boolean;
  maxImages?: number;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  id = 'image-upload-field',
  label = 'Photos & Images',
  helpText = 'Upload high-resolution image files directly from your device, or drag and drop files here.',
  images = [],
  onChange,
  multiple = true,
  maxImages = 15,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const files = Array.from(fileList).filter((file) =>
        file.type.startsWith('image/')
      );

      if (files.length === 0) {
        setErrorMessage('Please select valid image files (JPG, PNG, WebP, etc.)');
        setIsProcessing(false);
        return;
      }

      const remainingSlots = multiple ? maxImages - images.length : 1;
      if (remainingSlots <= 0) {
        setErrorMessage(`Maximum limit of ${maxImages} images reached.`);
        setIsProcessing(false);
        return;
      }

      const filesToProcess = files.slice(0, remainingSlots);
      const processedPromises = filesToProcess.map((file) =>
        processAndOptimizeImage(file, 1600, 0.85)
      );
      const newImages = await Promise.all(processedPromises);

      if (multiple) {
        onChange([...images, ...newImages]);
      } else {
        onChange([newImages[0]]);
      }
    } catch (err: any) {
      console.error('Error processing images:', err);
      setErrorMessage('Failed to process image files. Please try again.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleSetCover = (index: number) => {
    if (index === 0) return;
    const target = images[index];
    const rest = images.filter((_, idx) => idx !== index);
    onChange([target, ...rest]);
  };

  const handleAddManualUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = manualUrl.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image')) {
      setErrorMessage('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setErrorMessage(null);
    if (multiple) {
      onChange([...images, trimmed]);
    } else {
      onChange([trimmed]);
    }
    setManualUrl('');
    setShowUrlInput(false);
  };

  return (
    <div id={id} className="space-y-3">
      {/* Label & Counter */}
      <div className="flex items-center justify-between">
        <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {images.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/40 text-[#ea580c] dark:text-orange-400">
              {images.length} {images.length === 1 ? 'image' : 'images'}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#ea580c] dark:hover:text-orange-400 font-medium flex items-center gap-1 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{showUrlInput ? 'Hide URL' : 'Add by URL'}</span>
          </button>
        </div>
      </div>

      {helpText && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {helpText}
        </p>
      )}

      {/* Optional Manual URL Input */}
      {showUrlInput && (
        <div className="p-3 bg-slate-50 dark:bg-[#0c1a2c] rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            placeholder="https://example.com/photo.jpg"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddManualUrl())}
            className="flex-1 bg-white dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            type="button"
            onClick={() => handleAddManualUrl()}
            disabled={!manualUrl.trim()}
            className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            Add URL
          </button>
        </div>
      )}

      {/* If single image mode and an image is selected, render high-clarity live preview with Change and Remove buttons */}
      {!multiple && images.length > 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative group rounded-2xl overflow-hidden border transition-all ${
            isDragging
              ? 'border-orange-500 ring-2 ring-orange-500/30'
              : 'border-slate-200 dark:border-slate-700 bg-slate-900 shadow-md'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={false}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            id={`${id}-file-input`}
          />

          <div className="relative w-full h-56 sm:h-64 bg-slate-950 flex items-center justify-center overflow-hidden">
            <img
              src={images[0]}
              alt={label || 'Uploaded preview'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80';
              }}
            />

            {/* Badges Overlay */}
            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
              <span className="inline-flex items-center gap-1.5 bg-emerald-600/90 backdrop-blur-xs text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                <Check className="w-3.5 h-3.5" />
                <span>Photo Selected</span>
              </span>
              {images[0].startsWith('data:image') && (
                <span className="inline-flex items-center gap-1 bg-orange-600/90 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
                  <span>Device Upload (Base64)</span>
                </span>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex items-center justify-between gap-2 z-10">
              <p className="text-xs text-slate-300 truncate font-medium">
                {images[0].startsWith('data:image') ? 'Stored as high-fidelity Base64' : 'Photo ready'}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id={`${id}-btn-change`}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-900 text-xs font-bold shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-orange-600" />
                  <span>Change Photo</span>
                </button>

                <button
                  type="button"
                  id={`${id}-btn-remove`}
                  onClick={() => onChange([])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              </div>
            </div>

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20 text-white">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                <p className="text-xs font-bold">Optimizing and encoding image file...</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Drag and Drop Upload Zone for single empty mode OR multi mode */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-[#ea580c] bg-orange-50/50 dark:bg-orange-950/20 scale-[0.99]'
              : 'border-slate-300 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-500 bg-slate-50/60 dark:bg-[#0a1628]/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            id={`${id}-file-input`}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            {isProcessing ? (
              <>
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-[#ea580c] animate-spin">
                  <Loader2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Optimizing and loading image file...
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/40 text-[#ea580c] dark:text-orange-400 flex items-center justify-center shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    <span className="text-[#ea580c] dark:text-orange-400 underline underline-offset-2">
                      Click to browse device
                    </span>{' '}
                    or drag and drop photo here
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Supports JPG, PNG, WEBP, and GIF files (Automatic compression & Base64 encoding applied)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-900/40">
          {errorMessage}
        </div>
      )}

      {/* Multiple Thumbnails Preview Grid (Used when multiple={true}) */}
      {multiple && images.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Uploaded Thumbnails (First image is the Main Cover):</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-red-500 hover:text-red-600 font-medium text-[11px] transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((imgSrc, idx) => (
              <div
                key={idx}
                className={`relative group rounded-xl overflow-hidden border bg-slate-900 aspect-video shadow-xs transition-all ${
                  idx === 0
                    ? 'border-orange-500 ring-2 ring-orange-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <img
                  src={imgSrc}
                  alt={`Upload preview ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80';
                  }}
                />

                {/* Gradient shade for controls readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                {/* Cover Badge or Index */}
                <div className="absolute top-2 left-2 z-10">
                  {idx === 0 ? (
                    <span className="inline-flex items-center gap-1 bg-[#ea580c] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      <span>COVER</span>
                    </span>
                  ) : (
                    <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      #{idx + 1}
                    </span>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  id={`btn-remove-image-${idx}`}
                  aria-label="Remove image"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(idx);
                  }}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-md bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-sm"
                  title="Remove image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Bottom Controls: Make Cover */}
                {idx !== 0 && (
                  <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between">
                    <button
                      type="button"
                      id={`btn-set-cover-${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetCover(idx);
                      }}
                      className="w-full text-center bg-white/90 hover:bg-white text-slate-900 text-[10px] font-bold py-1 px-2 rounded-md shadow-xs transition-colors truncate"
                    >
                      Make Cover Photo
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
