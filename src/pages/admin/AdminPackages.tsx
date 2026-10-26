import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AdminLayout } from './AdminLayout.js';
import { api, mapPackageRow } from '../../services/api.js';
import { Package } from '../../types.js';
import { localStore } from '../../services/localStore.js';
import { ImageUploadField } from '../../components/admin/ImageUploadField.js';
import { reconcileRealtimeList } from '../../hooks/useRealtimeSync.js';
import { supabase } from '../../lib/supabase.js';
import { BaseInput, BaseSelect, BaseTextarea } from '../../components/FormField.js';
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
  Radio,
  ArrowUp,
  ArrowDown,
  Check,
  XCircle,
  Calendar,
  ListPlus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

export interface FormItineraryDay {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
}

export interface FormQuickSummaryItem {
  id: string;
  label: string;
  value: string;
}

const DEFAULT_CATEGORIES = ['Pilgrimage', 'Char Dham', 'Varanasi Ayodhya', 'South India', 'Jyotirlinga'];

export const AdminPackages: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isRealtimeActive, setIsRealtimeActive] = useState(true);
  const [lastSyncEvent, setLastSyncEvent] = useState<string | null>(null);

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
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
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
  const [itineraryDays, setItineraryDays] = useState<FormItineraryDay[]>([]);
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [newInclusionText, setNewInclusionText] = useState('');
  const [newExclusionText, setNewExclusionText] = useState('');
  const [quickSummaryItems, setQuickSummaryItems] = useState<FormQuickSummaryItem[]>([]);
  const [packageType, setPackageType] = useState('All-Inclusive Guided Yatra');
  const [experienceLevel, setExperienceLevel] = useState('Comfortable • Senior Friendly');
  const [hotelsLevel, setHotelsLevel] = useState('3 & 4 Star Deluxe Stays');
  const [transfers, setTransfers] = useState('Private AC Coach / Helicopter Support');

  // Helper to suggest standard day/night duration string from day count
  const calculateDuration = (daysCount: number): string => {
    if (daysCount <= 0) return '1 Day / Same Day Return';
    if (daysCount === 1) return '1 Day / Same Day Return';
    const nights = Math.max(1, daysCount - 1);
    return `${daysCount} Days / ${nights} Night${nights > 1 ? 's' : ''}`;
  };

  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = React.useCallback(async (showLoading = true) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (showLoading) setLoading(true);
    try {
      const list = await api.getPackages(selectedCategory, searchQuery);
      if (isMountedRef.current) {
        setPackages(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('[AdminPackages] Failed to load packages:', err);
      if (isMountedRef.current) {
        setPackages([]);
      }
    } finally {
      if (isMountedRef.current && showLoading) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadData(true);

    const handlePackageChange = (e?: Event) => {
      if (e instanceof CustomEvent && e.detail?.action === 'delete') {
        const delId = String(e.detail.id || e.detail.target || '');
        if (delId) {
          setPackages((prev) => prev.filter((p) => p.id !== delId && (p.title || '').toLowerCase() !== delId.toLowerCase()));
          return;
        }
      }
      loadData(false);
    };

    window.addEventListener('tirth-package-changed', handlePackageChange);

    return () => {
      window.removeEventListener('tirth-package-changed', handlePackageChange);
    };
  }, [loadData]);

  // Real-time multi-admin synchronization via isolated unique channel
  useEffect(() => {
    const channelName = `content-sync-packages-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const channel = supabase.channel(channelName);

    const handlePayload = (payload: any) => {
      const eventType = payload.eventType || payload.event || 'UPDATE';
      const raw = payload.new || payload.old;
      if (!raw) return;

      const isDeleted =
        eventType === 'DELETE' ||
        Boolean(raw.is_deleted === true || raw.is_deleted === 'true' || raw.is_deleted === 1) ||
        Boolean(raw.isDeleted === true || raw.isDeleted === 'true');

      const mapped = mapPackageRow(raw);

      if (isDeleted) {
        const idToRemove = String(raw.id || mapped.id);
        setPackages((prev) => prev.filter((p) => p.id !== idToRemove));
        setLastSyncEvent(`Realtime DELETE: "${mapped.title || idToRemove}" removed`);
      } else {
        setPackages((prev) => reconcileRealtimeList(prev, eventType, mapped));
        setLastSyncEvent(`Realtime ${eventType}: "${mapped.title || mapped.id}" synced`);
      }
      setTimeout(() => setLastSyncEvent(null), 4000);
    };

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, handlePayload)
      .on('broadcast', { event: 'package_deleted' }, ({ payload }: any) => {
        const deletedId = String(payload?.id || '');
        if (deletedId) {
          setPackages((prev) => prev.filter((p) => p.id !== deletedId));
          setLastSyncEvent(`Realtime DELETE: "${deletedId}" removed`);
          setTimeout(() => setLastSyncEvent(null), 4000);
        }
      })
      .on('broadcast', { event: 'package_updated' }, ({ payload }: any) => {
        if (payload?.package) {
          setPackages((prev) => reconcileRealtimeList(prev, 'UPDATE', payload.package));
          setLastSyncEvent(`Realtime UPDATE: "${payload.package.title || payload.package.id}" synced`);
          setTimeout(() => setLastSyncEvent(null), 4000);
        }
      })
      .on('broadcast', { event: 'package_created' }, ({ payload }: any) => {
        if (payload?.package) {
          setPackages((prev) => reconcileRealtimeList(prev, 'INSERT', payload.package));
          setLastSyncEvent(`Realtime INSERT: "${payload.package.title || payload.package.id}" synced`);
          setTimeout(() => setLastSyncEvent(null), 4000);
        }
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

  // Dynamic Category Pills/Options derived from packages unioned with defaults & custom saved categories
  const [customCategories, setCustomCategories] = useState<string[]>(() => localStore.getCustomCategories());

  useEffect(() => {
    const handleCategoryUpdate = () => {
      setCustomCategories(localStore.getCustomCategories());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tirth-categories-changed', handleCategoryUpdate);
      window.addEventListener('storage', handleCategoryUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('tirth-categories-changed', handleCategoryUpdate);
        window.removeEventListener('storage', handleCategoryUpdate);
      }
    };
  }, []);

  const dynamicCategories = useMemo(() => {
    const fromData = Array.from(new Set(packages.map((p) => p.category).filter(Boolean)));
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...fromData, ...customCategories]));
  }, [packages, customCategories]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      const customCat = window.prompt('Enter new category/tag name:');
      if (customCat && customCat.trim()) {
        const normalized = customCat.trim();
        localStore.addCustomCategory(normalized);
        setCustomCategories((prev) => Array.from(new Set([...prev, normalized])));
        setCategory(normalized);
      }
    } else {
      setCategory(val);
    }
  };

  const handleOpenAdd = () => {
    setEditingPackage(null);
    setTitle('');
    setCategory('Char Dham');
    setIsCustomCategoryMode(false);
    setCustomCategoryInput('');
    setDuration(calculateDuration(3));
    setLocation('Sacred Circuit');
    setStartingPrice(24000);
    setBookedRank('Popular Divine Yatra');
    setPackageType('All-Inclusive Guided Yatra');
    setExperienceLevel('Comfortable • Senior Friendly');
    setHotelsLevel('3 & 4 Star Deluxe Stays');
    setTransfers('Private AC Coach / Helicopter Support');
    const defaultImg = 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80';
    setImageUrl(defaultImg);
    setPackageImages([defaultImg]);
    setOverview('All-inclusive pilgrimage package with VIP darshan passes, private AC coach, and wholesome culinary arrangements.');
    setHighlightsString('VIP Darshan Pass included, Dedicated Guide, Wholesome Buffet Meals, Deluxe Verified Accommodations');

    // Initialize Default Itinerary Days template
    setItineraryDays([
      { id: 'day-1', dayNumber: 1, title: 'Arrival & Welcome Puja', description: 'Arrival at holy base, check-in to deluxe hotel, evening Ganga Aarti blessing.' },
      { id: 'day-2', dayNumber: 2, title: 'Sacred Temple Darshan & Rituals', description: 'Early morning VIP Abhishek and Darshan with temple priest facilitation.' },
      { id: 'day-3', dayNumber: 3, title: 'Return & Farewell Blessings', description: 'Wholesome breakfast and airport/station drop with sacred Prasad box.' },
    ]);

    // Initialize Default Inclusions
    setInclusions([
      'VIP Darshan entry and queue assistance where permissible',
      '3 & 4 Star verified pilgrimage hotel accommodations',
      'Daily wholesome pure vegetarian breakfast and dinner buffet',
      'All transfers & sightseeing by dedicated private AC vehicle',
      'Experienced local pilgrimage coordinator & temple priest guide',
      'All parking, toll taxes, driver allowance and fuel charges',
    ]);

    // Initialize Default Exclusions
    setExclusions([
      'Personal expenses, laundry, telephone calls and tips',
      'Flight / Train tickets unless explicitly requested',
      'Special personal puja ceremonies or individual priest Dakshina',
      'Any camera/video permits at monuments or shrines',
      'Travel insurance and medical emergency expenses',
    ]);

    // Initialize Default Quick Summary Key-Value Rows
    setQuickSummaryItems([
      { id: 'qs-1', label: 'Duration', value: '6 Days / 5 Nights' },
      { id: 'qs-2', label: 'Category', value: 'Pilgrimage' },
      { id: 'qs-3', label: 'Meals', value: '100% Pure Vegetarian' },
      { id: 'qs-4', label: 'Medical', value: 'Oxygen & Doctor on Call' },
    ]);

    setNewInclusionText('');
    setNewExclusionText('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Package) => {
    setEditingPackage(p);
    setTitle(p.title);
    setCategory(p.category);
    setIsCustomCategoryMode(false);
    setDuration(p.duration || calculateDuration(p.itinerary && p.itinerary.length > 0 ? p.itinerary.length : 3));
    setLocation(p.location);
    setStartingPrice(p.startingPrice);
    setBookedRank(p.bookedRank || '');
    setPackageType(p.packageType || 'All-Inclusive Guided Yatra');
    setExperienceLevel(p.experienceLevel || 'Comfortable • Senior Friendly');
    setHotelsLevel(p.hotelsLevel || '3 & 4 Star Deluxe Stays');
    setTransfers(p.transfers || 'Private AC Coach / Helicopter Support');
    const existing = (p.galleryImages && p.galleryImages.length > 0)
      ? p.galleryImages
      : (p.imageUrl ? [p.imageUrl] : []);
    setImageUrl(p.imageUrl || existing[0] || '');
    setPackageImages(existing.length > 0 ? existing : [
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80'
    ]);
    setOverview(p.overview);
    setHighlightsString(p.highlights.join(', '));

    // Itinerary days from package
    const rawItin = p.itinerary || [];
    if (rawItin.length > 0) {
      setItineraryDays(
        rawItin.map((item, idx) => ({
          id: `day-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
          dayNumber: Number(item.dayNumber ?? item.day ?? (idx + 1)),
          title: item.title || '',
          description: item.description || item.desc || '',
        }))
      );
    } else {
      setItineraryDays([
        { id: 'day-1', dayNumber: 1, title: 'Arrival & Welcome Puja', description: 'Arrival at holy base, check-in to deluxe hotel, evening Ganga Aarti blessing.' },
        { id: 'day-2', dayNumber: 2, title: 'Sacred Temple Darshan', description: 'Early morning VIP Abhishek and Darshan with temple priest facilitation.' },
        { id: 'day-3', dayNumber: 3, title: 'Return & Farewell Blessings', description: 'Wholesome breakfast and departure transfers.' },
      ]);
    }

    // Inclusions
    const rawInc = p.inclusions || [];
    setInclusions(
      rawInc.length > 0
        ? rawInc
        : [
            'VIP Darshan entry and queue assistance where permissible',
            '3 & 4 Star verified pilgrimage hotel accommodations',
            'Daily wholesome pure vegetarian breakfast and dinner buffet',
            'All transfers & sightseeing by dedicated private AC vehicle',
            'Experienced local pilgrimage coordinator & temple priest guide',
          ]
    );

    // Exclusions
    const rawExc = p.exclusions || [];
    setExclusions(
      rawExc.length > 0
        ? rawExc
        : [
            'Personal expenses, laundry, telephone calls and tips',
            'Flight / Train tickets unless explicitly requested',
            'Special personal puja ceremonies or priest Dakshina',
            'Any camera/video permits at monuments or shrines',
          ]
    );

    // Quick Summary rows from package
    const rawQs = p.quickSummary || [];
    if (rawQs.length > 0) {
      setQuickSummaryItems(
        rawQs.map((item, idx) => ({
          id: `qs-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
          label: item.label,
          value: item.value,
        }))
      );
    } else {
      setQuickSummaryItems([
        { id: 'qs-1', label: 'Duration', value: p.duration || '6 Days / 5 Nights' },
        { id: 'qs-2', label: 'Category', value: p.category || 'Pilgrimage' },
        { id: 'qs-3', label: 'Meals', value: '100% Pure Vegetarian' },
        { id: 'qs-4', label: 'Medical', value: 'Oxygen & Doctor on Call' },
      ]);
    }

    setNewInclusionText('');
    setNewExclusionText('');
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

  // Itinerary Handlers
  const handleAddItineraryDay = () => {
    setItineraryDays((prev) => [
      ...prev,
      {
        id: `day-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        dayNumber: prev.length + 1,
        title: '',
        description: '',
      },
    ]);
  };

  const handleRemoveItineraryDay = (index: number) => {
    setItineraryDays((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    });
  };

  const handleMoveDayUp = (index: number) => {
    if (index <= 0) return;
    setItineraryDays((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    });
  };

  const handleMoveDayDown = (index: number) => {
    setItineraryDays((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    });
  };

  const handleUpdateDay = (index: number, field: 'title' | 'description', val: string) => {
    setItineraryDays((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Inclusions & Exclusions Handlers
  const handleAddInclusion = (text?: string) => {
    const val = (text !== undefined ? text : newInclusionText).trim();
    if (!val) return;
    if (!inclusions.includes(val)) {
      setInclusions((prev) => [...prev, val]);
    }
    setNewInclusionText('');
  };

  const handleRemoveInclusion = (index: number) => {
    setInclusions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddExclusion = (text?: string) => {
    const val = (text !== undefined ? text : newExclusionText).trim();
    if (!val) return;
    if (!exclusions.includes(val)) {
      setExclusions((prev) => [...prev, val]);
    }
    setNewExclusionText('');
  };

  const handleRemoveExclusion = (index: number) => {
    setExclusions((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Yatra Quick Summary Handlers
  const handleAddQuickSummaryItem = (defaultLabel = '', defaultValue = '') => {
    setQuickSummaryItems((prev) => [
      ...prev,
      {
        id: `qs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: defaultLabel,
        value: defaultValue,
      },
    ]);
  };

  const handleRemoveQuickSummaryItem = (index: number) => {
    setQuickSummaryItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateQuickSummaryItem = (index: number, field: 'label' | 'value', value: string) => {
    setQuickSummaryItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const highlights = highlightsString.split(',').map((s) => s.trim()).filter(Boolean);
    const validImages = packageImages.length > 0 ? packageImages : (imageUrl ? [imageUrl] : [
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80'
    ]);
    const primaryCover = validImages[0];

    const cleanedItinerary = itineraryDays
      .map((item, idx) => ({
        dayNumber: idx + 1,
        day: idx + 1,
        title: item.title.trim(),
        description: item.description.trim(),
        desc: item.description.trim(),
      }))
      .filter((item) => item.title || item.description);

    const cleanedInclusions = inclusions.map((s) => s.trim()).filter(Boolean);
    const cleanedExclusions = exclusions.map((s) => s.trim()).filter(Boolean);
    const finalDuration = duration.trim() || 'Custom Duration';
    const cleanedQuickSummary = quickSummaryItems
      .map((item) => ({
        label: item.label.trim(),
        value: item.label.trim().toLowerCase() === 'duration' ? finalDuration : item.value.trim(),
      }))
      .filter((item) => item.label || item.value);

    if (finalDuration && !cleanedQuickSummary.some((i) => i.label.toLowerCase() === 'duration')) {
      cleanedQuickSummary.unshift({ label: 'Duration', value: finalDuration });
    }

    const packageData: Partial<Package> = {
      title,
      category,
      duration: finalDuration,
      location,
      startingPrice: Number(startingPrice),
      bookedRank,
      imageUrl: primaryCover,
      galleryImages: validImages,
      overview,
      packageType: packageType.trim() || 'All-Inclusive Guided Yatra',
      experienceLevel: experienceLevel.trim() || 'Comfortable • Senior Friendly',
      hotelsLevel: hotelsLevel.trim() || '3 & 4 Star Deluxe Stays',
      transfers: transfers.trim() || 'Private AC Coach / Helicopter Support',
      itinerary: cleanedItinerary,
      inclusions: cleanedInclusions,
      exclusions: cleanedExclusions,
      quickSummary: cleanedQuickSummary,
    };

    try {
      if (category && category.trim()) {
        const norm = category.trim();
        localStore.addCustomCategory(norm);
        setCustomCategories((prev) => Array.from(new Set([...prev, norm])));
      }
      if (editingPackage) {
        const targetId = editingPackage.id || (editingPackage as any)._id || '';
        const updated = await api.updatePackage(targetId, { ...packageData, id: targetId });
        setPackages((prev) => reconcileRealtimeList(prev, 'UPDATE', updated));
        setToast({
          id: String(Date.now()),
          type: 'success',
          title: 'Package Updated',
          message: `Package "${updated.title}" was updated successfully.`,
        });
      } else {
        const created = await api.createPackage(packageData);
        setPackages((prev) => reconcileRealtimeList(prev, 'INSERT', created));
        setToast({
          id: String(Date.now()),
          type: 'success',
          title: 'Package Published',
          message: `Package "${created.title}" is now published and live.`,
        });
      }
      setIsModalOpen(false);
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      console.error('Error saving package:', err);
      const isTimeout = err?.message?.includes('timeout') || err?.message?.includes('57014');
      setToast({
        id: String(Date.now()),
        type: isTimeout ? 'info' : 'error',
        title: isTimeout ? 'Saved Locally (Database Busy)' : 'Save Failed',
        message: isTimeout
          ? 'Remote database statement timed out. Your package changes were safely saved locally.'
          : (err?.message || 'Failed saving package. Please check the fields and try again.'),
      });
      setTimeout(() => setToast(null), 6000);
    }
  };

  return (
    <AdminLayout activeTab="packages">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-serif">
                <Compass className="w-6 h-6 text-orange-500 dark:text-orange-400" />
                <span>Sacred Pilgrimage Packages Manager</span>
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active (Postgres WAL)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>Create, edit, and publish all-inclusive yatra itineraries. Multiplexed cross-admin sync.</span>
              {lastSyncEvent && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in">
                  • {lastSyncEvent}
                </span>
              )}
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
            <BaseSelect
              id="admin-packages-category-filter"
              name="admin-packages-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="">All Pilgrimage Categories</option>
              {dynamicCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </BaseSelect>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <BaseInput
              id="admin-packages-search-input"
              name="admin-packages-search-input"
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
          <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 max-w-4xl w-full my-8 text-slate-800 dark:text-slate-200 space-y-5 shadow-2xl">
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

            <form onSubmit={handleSubmit} className="space-y-5 max-h-[82vh] overflow-y-auto pr-2 text-xs">
              <div>
                <label htmlFor="package-title-input" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Package Title</label>
                <BaseInput
                  id="package-title-input"
                  name="package-title-input"
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
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="package-category-select" className="block text-slate-700 dark:text-slate-400 font-bold">Category</label>
                    {!isCustomCategoryMode ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategoryMode(true);
                          setCustomCategoryInput('');
                        }}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 cursor-pointer"
                      >
                        + Add Custom
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsCustomCategoryMode(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                      >
                        Choose existing
                      </button>
                    )}
                  </div>
                  {!isCustomCategoryMode ? (
                    <div className="space-y-1.5">
                      <BaseSelect
                        id="package-category-select"
                        name="package-category-select"
                        value={category}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__custom_trigger__') {
                            setIsCustomCategoryMode(true);
                            setCustomCategoryInput('');
                          } else {
                            setCategory(val);
                          }
                        }}
                        className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                      >
                        {dynamicCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="__custom_trigger__">＋ Add Custom Category / Tag...</option>
                      </BaseSelect>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <BaseInput
                        id="package-custom-category-input"
                        name="package-custom-category-input"
                        type="text"
                        placeholder="Type custom category name..."
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-[#081220] border border-orange-300 dark:border-orange-500/50 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customCategoryInput.trim()) {
                              const val = customCategoryInput.trim();
                              localStore.addCustomCategory(val);
                              setCustomCategories((prev) => Array.from(new Set([...prev, val])));
                              setCategory(val);
                              setIsCustomCategoryMode(false);
                              setCustomCategoryInput('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customCategoryInput.trim()) {
                            const val = customCategoryInput.trim();
                            localStore.addCustomCategory(val);
                            setCustomCategories((prev) => Array.from(new Set([...prev, val])));
                            setCategory(val);
                            setIsCustomCategoryMode(false);
                            setCustomCategoryInput('');
                          }
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCustomCategoryMode(false)}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 text-xs px-2 cursor-pointer shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="package-duration-input" className="block text-slate-700 dark:text-slate-400 font-bold">Duration</label>
                    {itineraryDays.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const suggested = calculateDuration(itineraryDays.length);
                          setDuration(suggested);
                          setQuickSummaryItems((prev) =>
                            prev.map((item) =>
                              item.label.toLowerCase() === 'duration' ? { ...item, value: suggested } : item
                            )
                          );
                        }}
                        title={`Click to auto-fill duration based on ${itineraryDays.length} itinerary days`}
                        className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800/80 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-orange-500" />
                        <span>Auto-suggest: {calculateDuration(itineraryDays.length)}</span>
                      </button>
                    )}
                  </div>
                  <BaseInput
                    id="package-duration-input"
                    name="package-duration-input"
                    type="text"
                    value={duration}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDuration(val);
                      setQuickSummaryItems((prev) =>
                        prev.map((item) =>
                          item.label.toLowerCase() === 'duration' ? { ...item, value: val } : item
                        )
                      );
                    }}
                    placeholder="e.g. 9 Days / 8 Nights, 3 Days / 2 Nights, Weekend Gateway"
                    className="w-full bg-white dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* PACKAGE SPECIFICATIONS (Editable Quick Info Bar Specs) */}
              <div className="bg-slate-50 dark:bg-[#071322]/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      Package Specifications (Customer Quick Info Bar)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Edit key specifications displayed in the prominent quick info bar of the public package details page.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Package Type */}
                  <div>
                    <label htmlFor="package-type-input" className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1">
                      Package Type
                    </label>
                    <BaseInput
                      id="package-type-input"
                      name="package-type-input"
                      type="text"
                      list="package-type-presets"
                      required
                      value={packageType}
                      onChange={(e) => setPackageType(e.target.value)}
                      placeholder="e.g. All-Inclusive Guided Yatra"
                      className="w-full bg-white dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                    <datalist id="package-type-presets">
                      <option value="All-Inclusive Guided Yatra" />
                      <option value="Custom Package" />
                      <option value="VIP Helicopter Yatra" />
                      <option value="Spiritual & Cultural Circuit" />
                      <option value="Group Departure Yatra" />
                      <option value="Luxury Pilgrimage Tour" />
                    </datalist>
                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['All-Inclusive Guided Yatra', 'Custom Package', 'VIP Helicopter Yatra'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setPackageType(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            packageType === preset
                              ? 'bg-orange-500 text-white border-orange-500 font-bold'
                              : 'bg-white dark:bg-[#0d1d33] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Experience Level */}
                  <div>
                    <label htmlFor="package-experience-input" className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1">
                      Experience Level
                    </label>
                    <BaseInput
                      id="package-experience-input"
                      name="package-experience-input"
                      type="text"
                      list="package-experience-presets"
                      required
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      placeholder="e.g. Comfortable • Senior Friendly"
                      className="w-full bg-white dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                    <datalist id="package-experience-presets">
                      <option value="Comfortable • Senior Friendly" />
                      <option value="Moderate Adventure" />
                      <option value="Easy Pilgrimage • Family Friendly" />
                      <option value="VIP Helicopter & Palki Support" />
                      <option value="Challenging Himalayan Trek" />
                    </datalist>
                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['Comfortable • Senior Friendly', 'Moderate Adventure', 'VIP Helicopter & Palki Support'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setExperienceLevel(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            experienceLevel === preset
                              ? 'bg-orange-500 text-white border-orange-500 font-bold'
                              : 'bg-white dark:bg-[#0d1d33] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Stays & Meals */}
                  <div>
                    <label htmlFor="package-hotels-level-input" className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1">
                      Stays &amp; Meals
                    </label>
                    <BaseInput
                      id="package-hotels-level-input"
                      name="package-hotels-level-input"
                      type="text"
                      list="package-hotels-presets"
                      required
                      value={hotelsLevel}
                      onChange={(e) => setHotelsLevel(e.target.value)}
                      placeholder="e.g. 3 & 4 Star Deluxe Stays"
                      className="w-full bg-white dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                    <datalist id="package-hotels-presets">
                      <option value="3 & 4 Star Deluxe Stays" />
                      <option value="5 Star Luxury & Heritage Stays" />
                      <option value="Deluxe Ashram & Verified Hotels" />
                      <option value="Deluxe Camps & Swiss Tents" />
                      <option value="Standard Clean Pilgrim Lodges" />
                    </datalist>
                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['3 & 4 Star Deluxe Stays', '5 Star Luxury & Heritage Stays', 'Deluxe Ashram & Verified Hotels'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setHotelsLevel(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            hotelsLevel === preset
                              ? 'bg-orange-500 text-white border-orange-500 font-bold'
                              : 'bg-white dark:bg-[#0d1d33] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Transfers */}
                  <div>
                    <label htmlFor="package-transfers-input" className="block text-slate-700 dark:text-slate-300 text-xs font-bold mb-1">
                      Transfers
                    </label>
                    <BaseInput
                      id="package-transfers-input"
                      name="package-transfers-input"
                      type="text"
                      list="package-transfers-presets"
                      required
                      value={transfers}
                      onChange={(e) => setTransfers(e.target.value)}
                      placeholder="e.g. Private AC Coach / Helicopter Support"
                      className="w-full bg-white dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                    <datalist id="package-transfers-presets">
                      <option value="Private AC Coach / Helicopter Support" />
                      <option value="Dedicated Private AC SUV (Innova/Crysta)" />
                      <option value="Direct Helicopter Shuttle & Priority Darshan" />
                      <option value="AC Tempo Traveller for Group" />
                      <option value="Private AC Sedan (Dzire / Etios)" />
                      <option value="Flights + AC Road Transfers Included" />
                    </datalist>
                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['Private AC Coach / Helicopter Support', 'Dedicated Private AC SUV (Innova/Crysta)', 'Direct Helicopter Shuttle & Priority Darshan'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTransfers(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            transfers === preset
                              ? 'bg-orange-500 text-white border-orange-500 font-bold'
                              : 'bg-white dark:bg-[#0d1d33] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="package-location-input" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Locations / Route</label>
                  <BaseInput
                    id="package-location-input"
                    name="package-location-input"
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Varanasi • Prayagraj • Ayodhya"
                    className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label htmlFor="package-starting-price-input" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Starting Price (₹/person)</label>
                  <BaseInput
                    id="package-starting-price-input"
                    name="package-starting-price-input"
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
                folder="packages"
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
                <label htmlFor="package-overview-textarea" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Overview / Description</label>
                <BaseTextarea
                  id="package-overview-textarea"
                  name="package-overview-textarea"
                  rows={3}
                  required
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label htmlFor="package-highlights-input" className="block text-slate-700 dark:text-slate-400 font-bold mb-1">
                  Highlights (comma-separated)
                </label>
                <BaseInput
                  id="package-highlights-input"
                  name="package-highlights-input"
                  type="text"
                  value={highlightsString}
                  onChange={(e) => setHighlightsString(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* YATRA QUICK SUMMARY BUILDER */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      <ListPlus className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                        <span>Yatra Quick Summary</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold">
                          {quickSummaryItems.length} {quickSummaryItems.length === 1 ? 'Row' : 'Rows'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Custom key-value summary points displayed in the booking card (e.g. Meals, Medical, Stay Category, Guide).
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddQuickSummaryItem('', '')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Summary Row</span>
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-0.5">
                  <span className="text-slate-400">Quick Presets:</span>
                  {[
                    { label: 'Meals', value: '100% Pure Vegetarian' },
                    { label: 'Medical', value: 'Oxygen & Doctor on Call' },
                    { label: 'Stay Category', value: '3 & 4 Star Deluxe Stays' },
                    { label: 'Guide', value: 'Dedicated Temple Priest' },
                    { label: 'Darshan', value: 'VIP Escorted Priority Pass' },
                    { label: 'Transport', value: 'Private Sanitized AC Coach' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleAddQuickSummaryItem(preset.label, preset.value)}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 transition-colors cursor-pointer"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>

                {quickSummaryItems.length === 0 ? (
                  <div className="p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                    <p className="text-slate-500 dark:text-slate-400 text-xs">No quick summary rows added yet.</p>
                    <button
                      type="button"
                      onClick={() => handleAddQuickSummaryItem('Meals', '100% Pure Vegetarian')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Default Row</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {quickSummaryItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-[#081220] border border-slate-200 dark:border-slate-800"
                      >
                        <span className="text-[11px] font-bold text-slate-400 w-5 text-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="w-1/3 min-w-[110px]">
                          <BaseInput
                            id={`quick-summary-label-${idx}`}
                            name={`quick-summary-label-${idx}`}
                            type="text"
                            value={item.label}
                            onChange={(e) => handleUpdateQuickSummaryItem(idx, 'label', e.target.value)}
                            placeholder="Label (e.g. Meals)"
                            className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <BaseInput
                            id={`quick-summary-value-${idx}`}
                            name={`quick-summary-value-${idx}`}
                            type="text"
                            value={item.value}
                            onChange={(e) => handleUpdateQuickSummaryItem(idx, 'value', e.target.value)}
                            placeholder="Value (e.g. 100% Pure Vegetarian)"
                            className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuickSummaryItem(idx)}
                          title="Delete row"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ITINERARY BUILDER */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                        <span>Day-by-Day Sacred Itinerary</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 font-extrabold">
                          {itineraryDays.length} {itineraryDays.length === 1 ? 'Day' : 'Days'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Add, remove, and reorder each day's schedule, darshan milestones, and stays.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItineraryDay}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:hover:bg-orange-900/60 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Itinerary Day</span>
                  </button>
                </div>

                {itineraryDays.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                    <p className="text-slate-500 dark:text-slate-400 text-xs">No itinerary days added yet.</p>
                    <button
                      type="button"
                      onClick={handleAddItineraryDay}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Day 1</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itineraryDays.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#081220] border border-slate-200 dark:border-slate-800 space-y-2.5 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-[#0f294a] text-white dark:bg-orange-600 text-xs font-extrabold shrink-0">
                            Day {idx + 1}
                          </span>
                          <div className="flex-1">
                            <BaseInput
                              id={`itinerary-day-title-${idx}`}
                              name={`itinerary-day-title-${idx}`}
                              type="text"
                              required
                              value={item.title}
                              onChange={(e) => handleUpdateDay(idx, 'title', e.target.value)}
                              placeholder={`Day ${idx + 1} Title (e.g. Arrival in Ayodhya & Evening Saryu Aarti)`}
                              className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveDayUp(idx)}
                              disabled={idx === 0}
                              title="Move day up"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1a2e] text-slate-500 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDayDown(idx)}
                              disabled={idx === itineraryDays.length - 1}
                              title="Move day down"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1a2e] text-slate-500 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItineraryDay(idx)}
                              title="Delete day"
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/80 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <BaseTextarea
                            id={`itinerary-day-desc-${idx}`}
                            name={`itinerary-day-desc-${idx}`}
                            rows={2}
                            value={item.description}
                            onChange={(e) => handleUpdateDay(idx, 'description', e.target.value)}
                            placeholder={`Describe activities for Day ${idx + 1}: morning temple darshans, holy snan, special puja, stays, buffet meals...`}
                            className="w-full bg-white dark:bg-[#0c1a2e] border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* INCLUSIONS & EXCLUSIONS BUILDER */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                      Inclusions &amp; Exclusions
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Specify transparent inclusions (✓) and exclusions (✗) displayed to pilgrims.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* INCLUSIONS BOX */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Included in Package ({inclusions.length})</span>
                      </span>
                    </div>

                    {/* Quick input */}
                    <div className="flex gap-2 items-center">
                      <BaseInput
                        id="package-new-inclusion-input"
                        name="package-new-inclusion-input"
                        type="text"
                        value={newInclusionText}
                        onChange={(e) => setNewInclusionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInclusion();
                          }
                        }}
                        placeholder="Add an inclusion (e.g. VIP Darshan passes)..."
                        className="flex-1 bg-white dark:bg-[#081220] border border-emerald-300 dark:border-emerald-700/80 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddInclusion()}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Add
                      </button>
                    </div>

                    {/* Quick Suggestions Pills */}
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="text-slate-400 self-center text-[10px]">Suggestions:</span>
                      {[
                        'VIP Darshan Entry',
                        'Deluxe Stays',
                        'Pure Veg Buffet',
                        'AC Coach Transfers',
                        'Temple Priest Guide',
                        'Emergency Oxygen Kit',
                      ].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleAddInclusion(item)}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                        >
                          + {item}
                        </button>
                      ))}
                    </div>

                    {/* Inclusions List */}
                    {inclusions.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No inclusions listed yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {inclusions.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white dark:bg-[#0c1a2e] border border-emerald-100 dark:border-emerald-900/60 text-slate-800 dark:text-slate-200 text-xs"
                          >
                            <div className="flex items-start gap-2 flex-1">
                              <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
                                ✓
                              </span>
                              <span className="leading-snug">{item}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveInclusion(idx)}
                              title="Remove inclusion"
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 shrink-0 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* EXCLUSIONS BOX */}
                  <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>Not Included / Exclusions ({exclusions.length})</span>
                      </span>
                    </div>

                    {/* Quick input */}
                    <div className="flex gap-2 items-center">
                      <BaseInput
                        id="package-new-exclusion-input"
                        name="package-new-exclusion-input"
                        type="text"
                        value={newExclusionText}
                        onChange={(e) => setNewExclusionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddExclusion();
                          }
                        }}
                        placeholder="Add an exclusion (e.g. Flight / Train tickets)..."
                        className="flex-1 bg-white dark:bg-[#081220] border border-rose-300 dark:border-rose-700/80 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddExclusion()}
                        className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Add
                      </button>
                    </div>

                    {/* Quick Suggestions Pills */}
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="text-slate-400 self-center text-[10px]">Suggestions:</span>
                      {[
                        'Flight / Train Tickets',
                        'Personal Expenses',
                        'Priest Dakshina',
                        'Camera / Video Permits',
                        'Travel Insurance',
                      ].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleAddExclusion(item)}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                        >
                          + {item}
                        </button>
                      ))}
                    </div>

                    {/* Exclusions List */}
                    {exclusions.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No exclusions listed yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {exclusions.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white dark:bg-[#0c1a2e] border border-rose-100 dark:border-rose-900/60 text-slate-800 dark:text-slate-200 text-xs"
                          >
                            <div className="flex items-start gap-2 flex-1">
                              <span className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
                                ✗
                              </span>
                              <span className="leading-snug">{item}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveExclusion(idx)}
                              title="Remove exclusion"
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 shrink-0 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
