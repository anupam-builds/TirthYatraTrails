import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerPopoverProps {
  id?: string;
  label: string;
  value: string; // 'YYYY-MM-DD' or empty string
  onChange: (value: string) => void;
  minDate?: string; // 'YYYY-MM-DD'
  placeholder?: string;
  className?: string;
  isCheckOut?: boolean;
  relatedDate?: string; // e.g. checkIn if this is checkOut, for range styling
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(monthIndex) && !isNaN(day)) {
        const monthShort = MONTH_NAMES[monthIndex]?.substring(0, 3) || '';
        return `${day} ${monthShort} ${year}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch {}
  return dateStr;
}

export const DatePickerPopover: React.FC<DatePickerPopoverProps> = ({
  id = 'date-picker',
  label,
  value,
  onChange,
  minDate,
  placeholder = 'Add date',
  className = '',
  isCheckOut = false,
  relatedDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current view month/year from value or minDate or default 2026-09
  const getInitialYearMonth = () => {
    const target = value || minDate || '2026-09-15';
    const parts = target.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m)) return { year: y, month: m };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  };

  const [viewState, setViewState] = useState(getInitialYearMonth());

  // Keep view aligned when value changes
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setViewState({ year: y, month: m });
        }
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewState((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewState((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleSelectDay = (day: number) => {
    const mm = String(viewState.month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${viewState.year}-${mm}-${dd}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Generate calendar days
  const daysInMonth = new Date(viewState.year, viewState.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewState.year, viewState.month, 1).getDay();

  const formattedDisplay = formatFriendlyDate(value);

  // Quick select helper
  const handleQuickSelect = (daysOffset: number) => {
    // Offset from today or 2026-09-12
    const base = new Date('2026-09-12T00:00:00');
    base.setDate(base.getDate() + daysOffset);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Label */}
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>

      {/* Field Trigger Display */}
      <div
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer py-1 group"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-orange-600 shrink-0 group-hover:scale-110 transition-transform" />
          {formattedDisplay ? (
            <span className="text-sm font-bold text-[#0f294a] truncate">
              {formattedDisplay}
            </span>
          ) : (
            <span className="text-sm font-medium text-slate-400 italic truncate">
              {placeholder}
            </span>
          )}
        </div>

        {value && (
          <button
            type="button"
            onClick={handleClear}
            title="Clear date"
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 ml-1"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Hidden Native Input for screen-readers & form-fallback */}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Interactive Calendar Popover */}
      {isOpen && (
        <div
          id={`${id}-calendar-popover`}
          className="absolute top-full left-0 sm:left-auto mt-2 z-50 bg-white shadow-2xl border border-slate-200 w-72 sm:w-80 rounded-2xl p-4 animate-in fade-in duration-150 text-slate-800"
        >
          {/* Calendar Header: Month + Year + Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold text-[#0f294a]">
              {MONTH_NAMES[viewState.month]} {viewState.year}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 pt-3 pb-1 text-center">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="text-[11px] font-bold text-slate-400">
                {d}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank offset for starting day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-8 w-8" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const mm = String(viewState.month + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const currentDayStr = `${viewState.year}-${mm}-${dd}`;

              const isSelected = value === currentDayStr;
              const isMinDisabled = minDate ? currentDayStr < minDate : false;

              // Range checking between checkIn and checkOut
              const isInRange =
                relatedDate &&
                value &&
                ((isCheckOut && currentDayStr > relatedDate && currentDayStr < value) ||
                  (!isCheckOut && currentDayStr > value && currentDayStr < relatedDate));

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => !isMinDisabled && handleSelectDay(day)}
                  disabled={isMinDisabled}
                  className={`h-8 w-8 mx-auto rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#ea580c] text-white font-bold shadow-sm'
                      : isInRange
                      ? 'bg-orange-100 text-orange-950 font-bold'
                      : isMinDisabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick presets & clear */}
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickSelect(0)}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-600 font-medium transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(1)}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-600 font-medium transition-colors cursor-pointer"
              >
                Tomorrow
              </button>
            </div>

            {value ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-red-500 hover:underline font-semibold cursor-pointer"
              >
                Clear
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
