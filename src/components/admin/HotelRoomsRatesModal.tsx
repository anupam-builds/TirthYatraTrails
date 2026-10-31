import React, { useState, useEffect } from 'react';
import { Hotel, Room } from '../../types.js';
import { api, mapRoomRow } from '../../services/api.js';
import { supabase } from '../../lib/supabase.js';
import { BaseInput, BaseTextarea } from '../FormField.js';
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
  DollarSign,
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

  // Form Fields
  const [roomName, setRoomName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [bedConfiguration, setBedConfiguration] = useState<string>('1 King Bed');
  const [maxOccupancy, setMaxOccupancy] = useState<string>('2 Adults + 1 Child');
  const [cancellationPolicy, setCancellationPolicy] = useState<string>(
    'Free cancellation up to 48 hrs before check-in'
  );
  const [imageUrl, setImageUrl] = useState<string>('');
  const [epPrice, setEpPrice] = useState<number>(4200);
  const [bbPrice, setBbPrice] = useState<number>(5000);
  const [mapPrice, setMapPrice] = useState<number>(5800);
  const [apPrice, setApPrice] = useState<number>(6600);

  // Load rooms for this hotel
  const loadRooms = React.useCallback(async () => {
    if (!hotel?.id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const roomList = await api.getHotelRooms(hotel.id);
      setRooms(roomList);
      if (roomList.length > 0) {
        // If current selected room is still in list, keep it; otherwise select first
        setSelectedRoomId((prev) => {
          const exists = roomList.some((r) => r.id === prev);
          return exists ? prev : roomList[0].id;
        });
      } else {
        // Prepare blank room template
        handleAddNewRoom();
      }
    } catch (err: any) {
      console.error('[HotelRoomsRatesModal] Error loading rooms:', err);
      setErrorMsg('Failed to load room details from database.');
    } finally {
      setLoading(false);
    }
  }, [hotel?.id]);

  useEffect(() => {
    if (isOpen) {
      loadRooms();
    }
  }, [isOpen, loadRooms]);

  // Supabase Realtime channel subscription for rooms
  useEffect(() => {
    if (!isOpen || !hotel?.id) return;

    const channelName = `realtime-hotel-rooms-${hotel.id}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hotel_rooms', filter: `hotel_id=eq.${hotel.id}` },
        (payload) => {
          console.log('[HotelRoomsRatesModal] Realtime room change detected:', payload);
          loadRooms();
        }
      )
      .on('broadcast', { event: 'room_updated' }, ({ payload }) => {
        if (payload?.hotelId === hotel.id) {
          loadRooms();
        }
      })
      .on('broadcast', { event: 'room_deleted' }, ({ payload }) => {
        if (payload?.hotelId === hotel.id) {
          loadRooms();
        }
      })
      .subscribe();

    const handleWindowRoomChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail?.hotelId === hotel.id) {
        loadRooms();
      }
    };
    window.addEventListener('tirth-room-changed', handleWindowRoomChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('tirth-room-changed', handleWindowRoomChange);
    };
  }, [isOpen, hotel?.id, loadRooms]);

  // When selected room changes, populate form fields
  useEffect(() => {
    if (!selectedRoomId) return;
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (room) {
      setRoomName(room.name || room.roomName || 'Deluxe Room');
      setDescription(room.description || '');
      setBedConfiguration(room.bedConfiguration || room.bedType || '1 King Bed');
      setMaxOccupancy(room.maxOccupancy || room.capacity || '2 Adults + 1 Child');
      setCancellationPolicy(
        room.cancellationPolicy || 'Free cancellation up to 48 hrs before check-in'
      );
      setImageUrl(
        room.imageUrl ||
          hotel.images?.[0] ||
          'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80'
      );
      setEpPrice(room.roomOnlyPrice ?? 4200);
      setBbPrice(room.breakfastPrice ?? (room.roomOnlyPrice ?? 4200) + 800);
      setMapPrice(room.halfBoardPrice ?? (room.roomOnlyPrice ?? 4200) + 1600);
      setApPrice(room.fullBoardPrice ?? (room.roomOnlyPrice ?? 4200) + 2400);
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
      name: 'New Sanctum Room',
      description: 'Air-conditioned holy sanctuary room with comfortable bedding and attached modern bathroom.',
      bedConfiguration: '1 King Bed',
      bedType: '1 King Bed',
      maxOccupancy: '2 Adults + 1 Child',
      capacity: '2 Adults + 1 Child',
      cancellationPolicy: 'Free cancellation up to 48 hrs before check-in',
      imageUrl: hotel.images?.[0] || 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
      roomOnlyPrice: base,
      breakfastPrice: base + 800,
      halfBoardPrice: base + 1600,
      fullBoardPrice: base + 2400,
      isAvailable: true,
      displayOrder: rooms.length,
    };

    setRooms((prev) => [...prev, newRoom]);
    setSelectedRoomId(newId);
    setRoomName(newRoom.name);
    setDescription(newRoom.description || '');
    setBedConfiguration(newRoom.bedConfiguration || '1 King Bed');
    setMaxOccupancy(newRoom.maxOccupancy || '2 Adults + 1 Child');
    setCancellationPolicy(newRoom.cancellationPolicy || 'Free cancellation up to 48 hrs before check-in');
    setImageUrl(newRoom.imageUrl);
    setEpPrice(newRoom.roomOnlyPrice);
    setBbPrice(newRoom.breakfastPrice);
    setMapPrice(newRoom.halfBoardPrice);
    setApPrice(newRoom.fullBoardPrice);
    setSuccessMsg('New room template created. Fill in details and click Save Room.');
  };

  // Quick preset calculation based on European Plan price
  const handleApplyRatePreset = (base: number) => {
    setEpPrice(base);
    setBbPrice(base + 800);
    setMapPrice(base + 1600);
    setApPrice(base + 2400);
  };

  // Save current room to Supabase
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setErrorMsg('Room title/name is required');
      return;
    }
    if (epPrice <= 0) {
      setErrorMsg('European Plan (Room Only) rate must be greater than ₹0');
      return;
    }

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
      cancellationPolicy: cancellationPolicy.trim(),
      imageUrl: imageUrl.trim() || hotel.images?.[0] || 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
      roomOnlyPrice: Number(epPrice),
      breakfastPrice: Number(bbPrice),
      halfBoardPrice: Number(mapPrice),
      fullBoardPrice: Number(apPrice),
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
      setSuccessMsg(`"${savedRoom.name}" and rate plans saved successfully!`);
      if (onRoomsUpdated) {
        onRoomsUpdated(rooms);
      }
    } catch (err: any) {
      console.error('[HotelRoomsRatesModal] Save failed:', err);
      setErrorMsg(err.message || 'Failed to persist room rates to database.');
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
      setSuccessMsg('Room removed successfully.');
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
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081220]/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#ea580c] dark:text-orange-400">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#0f294a] dark:text-white">
                  Rooms &amp; Rates Manager
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Supabase Realtime
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

        {/* Content Body: Left Column (Room List), Right Column (Edit Form) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Room Tabs */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-[#081220]/30 shrink-0 flex flex-col gap-2 overflow-y-auto max-h-48 md:max-h-none">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Room Types ({rooms.length})
              </span>
              <button
                type="button"
                onClick={handleAddNewRoom}
                className="px-2 py-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900/60 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Room</span>
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading room plans...</span>
              </div>
            ) : rooms.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                <p>No room types configured yet.</p>
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
                        {r.name || 'Untitled Room'}
                      </p>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {r.bedConfiguration || r.bedType || '1 King Bed'}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                      <span className="text-slate-400 text-[10px]">Room Only (EP):</span>
                      <span className="font-extrabold text-[#0f294a] dark:text-orange-400">
                        ₹{(r.roomOnlyPrice ?? 4200).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Edit Form */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveRoom} className="space-y-5">
              
              {/* Section 1: Room Identity & Specs */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-orange-500" />
                  <span>Room Identity &amp; Setup</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Room Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Room Title / Name <span className="text-rose-500">*</span>
                    </label>
                    <BaseInput
                      id="room-title-name"
                      name="room-title-name"
                      type="text"
                      required
                      placeholder="e.g. Executive Deluxe Room, Deluxe Sanctum Room"
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
                    <BaseInput
                      id="room-bed-configuration"
                      name="room-bed-configuration"
                      type="text"
                      placeholder="e.g. 1 King Bed, 2 Queen Beds"
                      value={bedConfiguration}
                      onChange={(e) => setBedConfiguration(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Max Occupancy */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Max Occupancy
                    </label>
                    <BaseInput
                      id="room-max-occupancy"
                      name="room-max-occupancy"
                      type="text"
                      placeholder="e.g. 2 Adults + 1 Child, 4 Adults"
                      value={maxOccupancy}
                      onChange={(e) => setMaxOccupancy(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Cancellation Policy */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cancellation Policy
                    </label>
                    <BaseInput
                      id="room-cancellation-policy"
                      name="room-cancellation-policy"
                      type="text"
                      placeholder="e.g. Free cancellation up to 48 hrs before check-in"
                      value={cancellationPolicy}
                      onChange={(e) => setCancellationPolicy(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
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
                      placeholder="Spacious spiritual sanctuary room overlooking temple spire with soundproof glazing..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Room Image URL */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Room Photo URL
                    </label>
                    <div className="flex gap-2">
                      <BaseInput
                        id="room-photo-url"
                        name="room-photo-url"
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 bg-slate-50 dark:bg-[#081220] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                      {imageUrl && (
                        <div className="w-10 h-9 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                          <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: 4-Tier Rate Plans */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-orange-500" />
                      <span>Meal Plan Rates (Per Night in INR)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Configure rates for all 4 standardized hospitality tiers.
                    </p>
                  </div>

                  {/* Quick preset buttons */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="text-[10px] text-slate-400">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyRatePreset(4200)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-950 rounded cursor-pointer transition-colors"
                    >
                      ₹4,200
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyRatePreset(5500)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-950 rounded cursor-pointer transition-colors"
                    >
                      ₹5,500
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyRatePreset(7500)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-950 rounded cursor-pointer transition-colors"
                    >
                      ₹7,500
                    </button>
                  </div>
                </div>

                {/* 4 Rate Plan Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* Tier 1: European Plan (Room Only) */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#081220]/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        European Plan
                      </span>
                      <Bed className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Room Only (EP)
                    </p>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                      <BaseInput
                        id="plan-ep-price"
                        name="plan-ep-price"
                        type="number"
                        min="0"
                        step="50"
                        value={epPrice}
                        onChange={(e) => setEpPrice(Number(e.target.value))}
                        className="w-full text-xs font-extrabold pl-6 pr-2 py-1.5 bg-white dark:bg-[#0d1d33] border border-slate-300 dark:border-slate-700 rounded-xl text-[#0f294a] dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                    <span className="block text-[10px] text-slate-400">Base room rate</span>
                  </div>

                  {/* Tier 2: Bed & Breakfast */}
                  <div className="p-3.5 rounded-2xl border border-orange-200 dark:border-orange-800/80 bg-orange-50/30 dark:bg-orange-950/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#ea580c]">
                        Bed &amp; Breakfast
                      </span>
                      <Coffee className="w-3.5 h-3.5 text-[#ea580c]" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      With B’fast (BB)
                    </p>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-[#ea580c]">₹</span>
                      <BaseInput
                        id="plan-bb-price"
                        name="plan-bb-price"
                        type="number"
                        min="0"
                        step="50"
                        value={bbPrice}
                        onChange={(e) => setBbPrice(Number(e.target.value))}
                        className="w-full text-xs font-extrabold pl-6 pr-2 py-1.5 bg-white dark:bg-[#0d1d33] border border-orange-300 dark:border-orange-700 rounded-xl text-[#0f294a] dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                    <span className="block text-[10px] text-slate-400">Includes buffet breakfast</span>
                  </div>

                  {/* Tier 3: Modified American Plan */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#081220]/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Modified Plan
                      </span>
                      <Utensils className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Half Board (MAP)
                    </p>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                      <BaseInput
                        id="plan-map-price"
                        name="plan-map-price"
                        type="number"
                        min="0"
                        step="50"
                        value={mapPrice}
                        onChange={(e) => setMapPrice(Number(e.target.value))}
                        className="w-full text-xs font-extrabold pl-6 pr-2 py-1.5 bg-white dark:bg-[#0d1d33] border border-slate-300 dark:border-slate-700 rounded-xl text-[#0f294a] dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                    <span className="block text-[10px] text-slate-400">Breakfast + Dinner</span>
                  </div>

                  {/* Tier 4: American Plan */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#081220]/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        American Plan
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Full Board (AP)
                    </p>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                      <BaseInput
                        id="plan-ap-price"
                        name="plan-ap-price"
                        type="number"
                        min="0"
                        step="50"
                        value={apPrice}
                        onChange={(e) => setApPrice(Number(e.target.value))}
                        className="w-full text-xs font-extrabold pl-6 pr-2 py-1.5 bg-white dark:bg-[#0d1d33] border border-slate-300 dark:border-slate-700 rounded-xl text-[#0f294a] dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                    <span className="block text-[10px] text-slate-400">All 3 meals included</span>
                  </div>

                </div>
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
                        <span>Saving to Supabase...</span>
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
