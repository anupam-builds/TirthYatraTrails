import React, { useState, useEffect } from 'react';
import { Hotel, Room } from '../../types.js';
import { api, mapRoomRow } from '../../services/api.js';
import { supabase } from '../../lib/supabase.js';
import { BaseInput, BaseSelect, BaseTextarea } from '../FormField.js';
import { ImageUploadField } from './ImageUploadField.js';
import {
  Bed,
  Sparkles,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Utensils,
  Coffee,
  ShieldCheck,
  Users,
  Image as ImageIcon,
  Radio,
  Layers,
  Info,
} from 'lucide-react';

interface HotelRoomsRatesModalProps {
  hotel: Hotel;
  isOpen: boolean;
  onClose: () => void;
  onRoomsUpdated?: (updatedRooms: Room[]) => void;
}

const MEAL_OPTION_PRESETS = [
  'Bed & Breakfast',
  'Room Only',
  'Half Board (Breakfast + Dinner)',
  'Full Board (All Meals)',
  'Complimentary Breakfast & Temple Shuttle',
  'Pure Vegetarian Buffet Included',
];

const CANCELLATION_PRESETS = [
  'Free cancellation up to 48 hrs before check-in',
  'Free cancellation up to 24 hrs before check-in',
  'Free cancellation up to 7 days before check-in',
  'Non-refundable pilgrim special rate',
];

const BED_PRESETS = [
  '1 King Bed',
  '2 Queen Beds',
  '1 Queen Bed',
  '2 Twin Beds',
  '1 King Bed + 1 Single Bed',
  '4 Single Beds (Family Hall)',
];

const OCCUPANCY_PRESETS = [
  '2 Adults + 1 Child',
  '2 Adults',
  '3 Adults',
  '4 Adults (Family)',
  '1 Adult',
];

export const HotelRoomsRatesModal: React.FC<HotelRoomsRatesModalProps> = ({
  hotel,
  isOpen,
  onClose,
  onRoomsUpdated,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Primary Customizable Form Fields
  const [roomName, setRoomName] = useState<string>('');
  const [bedConfiguration, setBedConfiguration] = useState<string>('1 King Bed');
  const [maxOccupancy, setMaxOccupancy] = useState<string>('2 Adults + 1 Child');
  const [pricePerNight, setPricePerNight] = useState<number>(4200);
  const [mealOption, setMealOption] = useState<string>('Bed & Breakfast');
  const [isCustomMeal, setIsCustomMeal] = useState<boolean>(false);
  const [customMealText, setCustomMealText] = useState<string>('');
  const [cancellationPolicy, setCancellationPolicy] = useState<string>(
    'Free cancellation up to 48 hrs before check-in'
  );
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');

  // Load rooms for this hotel
  const loadRooms = React.useCallback(async () => {
    if (!hotel?.id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const roomList = await api.getHotelRooms(hotel.id);
      setRooms(roomList);
      if (roomList.length > 0) {
        setSelectedRoomId((prev) => {
          const exists = roomList.some((r) => r.id === prev);
          return exists ? prev : roomList[0].id;
        });
      } else {
        handleAddNewRoom();
      }
    } catch (err: any) {
      console.error('[HotelRoomsRatesModal] Error loading rooms:', err);
      setErrorMsg('Failed to load room configurations from database.');
    } finally {
      setLoading(false);
    }
  }, [hotel?.id]);

  useEffect(() => {
    if (isOpen) {
      loadRooms();
    }
  }, [isOpen, loadRooms]);

  // Realtime subscription via Supabase channel and window event
  useEffect(() => {
    if (!isOpen || !hotel?.id) return;

    const channelName = `realtime-hotel-rooms-${hotel.id}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hotel_rooms', filter: `hotel_id=eq.${hotel.id}` },
        () => {
          loadRooms();
        }
      )
      .on('broadcast', { event: 'room_updated' }, ({ payload }) => {
        if (payload?.hotelId === hotel.id) loadRooms();
      })
      .on('broadcast', { event: 'room_deleted' }, ({ payload }) => {
        if (payload?.hotelId === hotel.id) loadRooms();
      })
      .subscribe();

    const handleRoomEvent = (e: Event) => {
      if (e instanceof CustomEvent && e.detail?.hotelId === hotel.id) {
        loadRooms();
      }
    };
    window.addEventListener('tirth-room-changed', handleRoomEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('tirth-room-changed', handleRoomEvent);
    };
  }, [isOpen, hotel?.id, loadRooms]);

  // Populate form when selected room changes
  useEffect(() => {
    if (!selectedRoomId) return;
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (room) {
      const p = Number(room.pricePerNight ?? room.price_per_night ?? room.roomOnlyPrice ?? 4200);
      const m = room.mealOption || room.meal_option || 'Bed & Breakfast';

      setRoomName(room.name || room.roomName || 'Executive Deluxe Room');
      setBedConfiguration(room.bedConfiguration || room.bedType || '1 King Bed');
      setMaxOccupancy(room.maxOccupancy || room.capacity || '2 Adults + 1 Child');
      setPricePerNight(p);

      if (MEAL_OPTION_PRESETS.includes(m)) {
        setMealOption(m);
        setIsCustomMeal(false);
        setCustomMealText('');
      } else {
        setMealOption('CUSTOM');
        setIsCustomMeal(true);
        setCustomMealText(m);
      }

      setCancellationPolicy(
        room.cancellationPolicy || 'Free cancellation up to 48 hrs before check-in'
      );
      setDescription(room.description || '');
      setImageUrl(
        room.imageUrl ||
          hotel.images?.[0] ||
          'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80'
      );

      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [selectedRoomId, rooms, hotel.images]);

  // Create a new blank room in local form
  const handleAddNewRoom = () => {
    const newId = `room-${hotel.id}-${Date.now()}`;
    const base = hotel.basePrice || 4200;
    const newRoom: Room = {
      id: newId,
      hotelId: hotel.id,
      name: 'Executive Deluxe Room',
      description: 'Comfortable air-conditioned pilgrim room featuring holy sanctuary views, ensuite bath, and warm hospitality.',
      bedConfiguration: '1 King Bed',
      bedType: '1 King Bed',
      maxOccupancy: '2 Adults + 1 Child',
      capacity: '2 Adults + 1 Child',
      pricePerNight: base,
      mealOption: 'Bed & Breakfast',
      cancellationPolicy: 'Free cancellation up to 48 hrs before check-in',
      imageUrl: hotel.images?.[0] || 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
      displayOrder: rooms.length,
    };

    setRooms((prev) => [...prev, newRoom]);
    setSelectedRoomId(newId);
    setRoomName(newRoom.name);
    setBedConfiguration(newRoom.bedConfiguration || '1 King Bed');
    setMaxOccupancy(newRoom.maxOccupancy || '2 Adults + 1 Child');
    setPricePerNight(base);
    setMealOption('Bed & Breakfast');
    setIsCustomMeal(false);
    setCustomMealText('');
    setCancellationPolicy(newRoom.cancellationPolicy || 'Free cancellation up to 48 hrs before check-in');
    setDescription(newRoom.description || '');
    setImageUrl(newRoom.imageUrl);
    setSuccessMsg('New room created. Customize the details and click Save Room.');
  };

  // Update price per night
  const handlePricePerNightChange = (val: number) => {
    setPricePerNight(val);
  };

  // Save room to Supabase
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setErrorMsg('Room Title is required');
      return;
    }
    if (pricePerNight <= 0) {
      setErrorMsg('Price per night must be greater than ₹0');
      return;
    }

    const effectiveMealOption = isCustomMeal ? (customMealText.trim() || 'Bed & Breakfast') : mealOption;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const targetRoomId = selectedRoomId || `room-${Date.now()}`;
    const payload: Partial<Room> & { hotelId: string } = {
      id: targetRoomId,
      roomId: targetRoomId,
      hotelId: hotel.id,
      hotel_id: hotel.id,
      name: roomName.trim(),
      roomName: roomName.trim(),
      description: description.trim(),
      bedConfiguration: bedConfiguration.trim(),
      bedType: bedConfiguration.trim(),
      maxOccupancy: maxOccupancy.trim(),
      capacity: maxOccupancy.trim(),
      pricePerNight: Number(pricePerNight),
      mealOption: effectiveMealOption,
      cancellationPolicy: cancellationPolicy.trim(),
      imageUrl: imageUrl.trim() || hotel.images?.[0] || 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
      isAvailable: true,
    };

    try {
      const savedRoom = await api.saveHotelRoom(payload);
      setRooms((prev) => {
        const idx = prev.findIndex((r) => r.id === savedRoom.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = savedRoom;
          return updated;
        }
        return [...prev, savedRoom];
      });
      setSelectedRoomId(savedRoom.id);
      setSuccessMsg(`"${savedRoom.name}" saved to database successfully!`);
      if (onRoomsUpdated) {
        onRoomsUpdated(rooms);
      }
    } catch (err: any) {
      console.error('[HotelRoomsRatesModal] Save error:', err);
      setErrorMsg(err.message || 'Failed to save room to Supabase database.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Room
  const handleDeleteRoom = async () => {
    if (!selectedRoomId) return;
    const roomToDelete = rooms.find((r) => r.id === selectedRoomId);
    if (!confirm(`Are you sure you want to delete "${roomToDelete?.name || 'this room'}"?`)) {
      return;
    }

    setDeleting(true);
    setErrorMsg('');
    try {
      await api.deleteHotelRoom(selectedRoomId, hotel.id);
      const remaining = rooms.filter((r) => r.id !== selectedRoomId);
      setRooms(remaining);
      if (remaining.length > 0) {
        setSelectedRoomId(remaining[0].id);
      } else {
        handleAddNewRoom();
      }
      setSuccessMsg('Room removed from database.');
      if (onRoomsUpdated) {
        onRoomsUpdated(remaining);
      }
    } catch (err: any) {
      console.error('[HotelRoomsRatesModal] Delete error:', err);
      setErrorMsg('Failed to delete room.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-[#0d1d33] border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081220]/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#ea580c] dark:text-orange-400">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#0f294a] dark:text-white">
                  Add / Edit Rooms &amp; Rates
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Supabase Live
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hotel.name} • {hotel.cityName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Sidebar (Room List) + Right Form */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Room List */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-[#081220]/30 shrink-0 flex flex-col gap-2 overflow-y-auto max-h-52 md:max-h-none">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Rooms ({rooms.length})
              </span>
              <button
                type="button"
                onClick={handleAddNewRoom}
                className="px-2.5 py-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900/60 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Room</span>
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading room inventory...</span>
              </div>
            ) : rooms.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                <p>No rooms found.</p>
                <button
                  onClick={handleAddNewRoom}
                  className="mt-2 text-orange-600 font-bold underline cursor-pointer"
                >
                  Create first room
                </button>
              </div>
            ) : (
              rooms.map((r, idx) => {
                const isSelected = r.id === selectedRoomId;
                const price = Number(r.pricePerNight ?? r.price_per_night ?? r.roomOnlyPrice ?? 4200);
                const meal = r.mealOption || r.meal_option || 'Bed & Breakfast';
                const specs = `${r.bedConfiguration || r.bedType || '1 King Bed'} • ${r.maxOccupancy || r.capacity || '2 Adults'}`;

                return (
                  <button
                    key={r.id || idx}
                    type="button"
                    onClick={() => setSelectedRoomId(r.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-700 shadow-xs'
                        : 'bg-white dark:bg-[#0d1d33] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-bold text-xs text-[#0f294a] dark:text-white line-clamp-1">
                        {r.name || 'Executive Room'}
                      </p>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1" />}
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {specs}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 truncate max-w-[130px]">
                        {meal}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <span className="text-slate-400 text-[10px]">Per Night:</span>
                      <span className="font-extrabold text-[#0f294a] dark:text-orange-400">
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Form */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
            {errorMsg && (
              <div className="mb-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{errorMsg}</span>
                </div>
                {(errorMsg.includes('hotel_rooms') || errorMsg.includes('schema cache')) && (
                  <div className="pt-2 border-t border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      The table <code className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 font-mono">public.hotel_rooms</code> needs to be created in your Supabase database.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const sql = `CREATE TABLE IF NOT EXISTS public.hotel_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id UUID NOT NULL,
    room_name TEXT NOT NULL,
    description TEXT,
    bed_configuration TEXT,
    max_occupancy TEXT,
    price_per_night NUMERIC,
    meal_option TEXT,
    cancellation_policy TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on hotel_rooms" ON public.hotel_rooms;
CREATE POLICY "Allow public read access on hotel_rooms" ON public.hotel_rooms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated staff to manage hotel_rooms" ON public.hotel_rooms;
CREATE POLICY "Allow authenticated staff to manage hotel_rooms" ON public.hotel_rooms FOR ALL USING (auth.role() = 'authenticated');
NOTIFY pgrst, 'reload schema';`;
                        navigator.clipboard?.writeText(sql);
                        setSuccessMsg('SQL script copied! Run it in the Supabase SQL editor to create the table.');
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      Copy SQL Script
                    </button>
                  </div>
                )}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveRoom} className="space-y-5">
              
              {/* 1. Room Title & Core Specs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Bed className="w-3.5 h-3.5 text-orange-500" />
                    <span>Room Details &amp; Pricing</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Preview: {bedConfiguration} • {maxOccupancy}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Room Title */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Room Title / Name <span className="text-rose-500">*</span>
                    </label>
                    <BaseInput
                      id="room-title-name"
                      name="room-title-name"
                      type="text"
                      required
                      placeholder="e.g. Executive Deluxe Room, Sanctuary Suite"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Bed Configuration */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bed Configuration
                    </label>
                    <div className="space-y-1.5">
                      <BaseInput
                        id="room-bed-configuration"
                        name="room-bed-configuration"
                        type="text"
                        placeholder="e.g. 1 King Bed, 2 Queen Beds"
                        value={bedConfiguration}
                        onChange={(e) => setBedConfiguration(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1">
                        {BED_PRESETS.slice(0, 3).map((bp) => (
                          <button
                            key={bp}
                            type="button"
                            onClick={() => setBedConfiguration(bp)}
                            className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer transition-colors"
                          >
                            {bp}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Max Occupancy */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Max Occupancy
                    </label>
                    <div className="space-y-1.5">
                      <BaseInput
                        id="room-max-occupancy"
                        name="room-max-occupancy"
                        type="text"
                        placeholder="e.g. 2 Adults + 1 Child, 4 Adults"
                        value={maxOccupancy}
                        onChange={(e) => setMaxOccupancy(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1">
                        {OCCUPANCY_PRESETS.slice(0, 3).map((op) => (
                          <button
                            key={op}
                            type="button"
                            onClick={() => setMaxOccupancy(op)}
                            className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer transition-colors"
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Price per night */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Price Per Night (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-orange-600">₹</span>
                      <BaseInput
                        id="room-price-per-night"
                        name="room-price-per-night"
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={pricePerNight || ''}
                        onChange={(e) => handlePricePerNightChange(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full text-xs font-extrabold pl-7 pr-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-[#0f294a] dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Meal Option */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Meal Option / Plan
                    </label>
                    {!isCustomMeal ? (
                      <div className="space-y-1">
                        <BaseSelect
                          id="room-meal-option"
                          name="room-meal-option"
                          value={mealOption}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setIsCustomMeal(true);
                              setCustomMealText('');
                            } else {
                              setMealOption(e.target.value);
                            }
                          }}
                          className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none cursor-pointer"
                        >
                          {MEAL_OPTION_PRESETS.map((mo) => (
                            <option key={mo} value={mo}>
                              {mo}
                            </option>
                          ))}
                          <option value="CUSTOM">+ Specify Custom Meal Option...</option>
                        </BaseSelect>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <BaseInput
                          id="room-custom-meal"
                          name="room-custom-meal"
                          type="text"
                          placeholder="e.g. Room + Satvik Breakfast"
                          value={customMealText}
                          onChange={(e) => setCustomMealText(e.target.value)}
                          className="flex-1 text-xs px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomMeal(false);
                            setMealOption('Bed & Breakfast');
                          }}
                          className="px-2.5 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 cursor-pointer"
                        >
                          Presets
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Room Description
                    </label>
                    <BaseTextarea
                      id="room-description"
                      name="room-description"
                      rows={2}
                      placeholder="Spacious spiritual sanctuary room overlooking temple spire with soundproof glazing and pristine amenities..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Cancellation Policy */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cancellation Policy
                    </label>
                    <div className="space-y-1.5">
                      <BaseInput
                        id="room-cancellation-policy"
                        name="room-cancellation-policy"
                        type="text"
                        placeholder="e.g. Free cancellation up to 48 hrs before check-in"
                        value={cancellationPolicy}
                        onChange={(e) => setCancellationPolicy(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1">
                        {CANCELLATION_PRESETS.map((cp) => (
                          <button
                            key={cp}
                            type="button"
                            onClick={() => setCancellationPolicy(cp)}
                            className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer transition-colors"
                          >
                            {cp}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Room Photo Upload & URL Entry */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <ImageUploadField
                  id="hotel-room-photo-uploader"
                  label="Room Photo (Upload from Device or enter URL)"
                  helpText="Upload a photo from your computer, or paste a public web link."
                  images={imageUrl ? [imageUrl] : []}
                  onChange={(newImgs) => setImageUrl(newImgs[0] || '')}
                  multiple={false}
                  maxImages={1}
                  folder="hotel-rooms"
                />
              </div>

              {/* Form Footer Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                {rooms.length > 1 && (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDeleteRoom}
                    className="px-3.5 py-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Room</span>
                  </button>
                )}

                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving Room...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Room &amp; Rates</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
