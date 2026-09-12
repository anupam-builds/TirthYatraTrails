import React, { useRef, useEffect } from 'react';
import { Plus, Minus, ChevronRight, Users, Info } from 'lucide-react';

export interface GuestsRoomsState {
  adults: number;
  childAges: number[];
  rooms: number;
}

interface GuestsRoomsPopoverProps {
  adults: number;
  onAdultsChange: (adults: number) => void;
  childAges: number[];
  onChildAgesChange: (ages: number[]) => void;
  rooms: number;
  onRoomsChange: (rooms: number) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  className?: string;
  triggerClassName?: string;
}

export function formatGuestsSummary(adults: number, childAges: number[], rooms: number): string {
  const adultStr = `${adults} Adult${adults > 1 ? 's' : ''}`;
  const childrenCount = childAges.length;
  const childStr = childrenCount > 0 ? `, ${childrenCount} ${childrenCount === 1 ? 'Child' : 'Children'}` : '';
  const roomStr = `, ${rooms} Room${rooms > 1 ? 's' : ''}`;
  return `${adultStr}${childStr}${roomStr}`;
}

export const GuestsRoomsPopover: React.FC<GuestsRoomsPopoverProps> = ({
  adults,
  onAdultsChange,
  childAges,
  onChildAgesChange,
  rooms,
  onRoomsChange,
  isOpen,
  onToggle,
  onClose,
  className = '',
  triggerClassName = '',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleAddChild = () => {
    // Push default age 0
    onChildAgesChange([...childAges, 0]);
  };

  const handleRemoveChild = () => {
    if (childAges.length > 0) {
      // Pop last age
      onChildAgesChange(childAges.slice(0, -1));
    }
  };

  const handleAgeChange = (index: number, newAge: number) => {
    const updated = [...childAges];
    updated[index] = newAge;
    onChildAgesChange(updated);
  };

  const summaryText = formatGuestsSummary(adults, childAges, rooms);

  return (
    <div ref={popoverRef} className={`relative ${className}`}>
      {/* Trigger Area */}
      <div
        id="guests-rooms-trigger"
        onClick={onToggle}
        className={`flex items-center justify-between cursor-pointer py-0.5 select-none ${triggerClassName}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Users className="w-3.5 h-3.5 text-[#ea580c] shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-[#0f294a] truncate">
            {summaryText}
          </span>
        </div>
        <ChevronRight
          className={`w-3.5 h-3.5 text-gray-400 transform transition-transform shrink-0 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
      </div>

      {/* Popover Card */}
      {isOpen && (
        <div
          id="guests-rooms-popover"
          className="absolute top-full left-0 mt-2 z-50 bg-white shadow-xl border border-gray-200 w-72 sm:w-80 rounded-2xl p-4 space-y-4 animate-in fade-in duration-150 text-left"
        >
          {/* 1. Adults Counter Row */}
          <div className="flex items-center justify-between py-1 border-b border-gray-100">
            <div>
              <p className="text-xs font-bold text-[#0f294a]">Adults</p>
              <p className="text-[10px] text-gray-500 font-medium">Ages 18+</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="adults-minus-btn"
                onClick={() => onAdultsChange(Math.max(1, adults - 1))}
                disabled={adults <= 1}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                aria-label="Decrease Adults"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-extrabold text-[#0f294a] w-5 text-center">
                {adults}
              </span>
              <button
                type="button"
                id="adults-plus-btn"
                onClick={() => onAdultsChange(adults + 1)}
                className="w-7 h-7 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center text-[#ea580c] font-bold transition-colors cursor-pointer"
                aria-label="Increase Adults"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Children Counter Row */}
          <div className="flex items-center justify-between py-1 border-b border-gray-100">
            <div>
              <p className="text-xs font-bold text-[#0f294a]">Children</p>
              <p className="text-[10px] text-gray-500 font-medium">Ages 0-17</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="children-minus-btn"
                onClick={handleRemoveChild}
                disabled={childAges.length === 0}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                aria-label="Decrease Children"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-extrabold text-[#0f294a] w-5 text-center">
                {childAges.length}
              </span>
              <button
                type="button"
                id="children-plus-btn"
                onClick={handleAddChild}
                className="w-7 h-7 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center text-[#ea580c] font-bold transition-colors cursor-pointer"
                aria-label="Increase Children"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dynamic Age Selectors Section (Rendered if children >= 1) */}
          {childAges.length > 0 && (
            <div
              id="age-of-children-section"
              className="bg-orange-50/70 rounded-xl p-3 border border-orange-200/60 space-y-2.5 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#0f294a]">Age of children</p>
                <span className="text-[10px] font-semibold text-[#ea580c] bg-orange-100 px-2 py-0.5 rounded-full">
                  {childAges.length} {childAges.length === 1 ? 'Child' : 'Children'}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 leading-tight">
                Please specify the exact age of each child at the time of check-in.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {childAges.map((age, index) => (
                  <div key={index} className="space-y-1">
                    <label
                      htmlFor={`child-age-select-${index}`}
                      className="block text-[11px] font-bold text-[#0f294a]"
                    >
                      Child {index + 1} Age
                    </label>
                    <select
                      id={`child-age-select-${index}`}
                      value={age}
                      onChange={(e) => handleAgeChange(index, Number(e.target.value))}
                      className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-[#0f294a] focus:ring-2 focus:ring-orange-500 focus:outline-none shadow-xs cursor-pointer"
                    >
                      <option value={0}>0 (Under 1)</option>
                      {Array.from({ length: 17 }, (_, i) => i + 1).map((val) => (
                        <option key={val} value={val}>
                          {val} {val === 1 ? 'year' : 'years'}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Rooms Counter Row */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs font-bold text-[#0f294a]">Rooms</p>
              <p className="text-[10px] text-gray-500 font-medium">Room units</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="rooms-minus-btn"
                onClick={() => onRoomsChange(Math.max(1, rooms - 1))}
                disabled={rooms <= 1}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                aria-label="Decrease Rooms"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-extrabold text-[#0f294a] w-5 text-center">
                {rooms}
              </span>
              <button
                type="button"
                id="rooms-plus-btn"
                onClick={() => onRoomsChange(rooms + 1)}
                className="w-7 h-7 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center text-[#ea580c] font-bold transition-colors cursor-pointer"
                aria-label="Increase Rooms"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Done Action Button */}
          <button
            type="button"
            id="guests-rooms-done-btn"
            onClick={onClose}
            className="w-full py-2.5 bg-[#ea580c] hover:bg-[#c2410c] active:scale-98 text-white text-xs font-bold rounded-xl shadow-md transition-all text-center cursor-pointer"
          >
            Apply &amp; Done
          </button>
        </div>
      )}
    </div>
  );
};
