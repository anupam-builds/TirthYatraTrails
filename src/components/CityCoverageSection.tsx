import React, { useMemo } from 'react';
import { City, Hotel } from '../types.js';

export interface CityCoverageSectionProps {
  cities: City[];
  allHotels?: Hotel[];
  onSelectCity?: (cityId: string) => void;
}

export const CityCoverageSection: React.FC<CityCoverageSectionProps> = ({
  cities,
  allHotels = [],
  onSelectCity,
}) => {
  // Requirement: Compute live hotel/accommodation counts per city dynamically using useMemo
  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (allHotels || []).forEach((hotel: any) => {
      const keys = new Set<string>();

      // Check standard fields: city, cityName, location
      const rawCity = hotel.city || hotel.cityName || hotel.location || '';
      const normalized = rawCity.trim().toLowerCase();
      if (normalized) {
        keys.add(normalized);
      }

      // Also index by cityId and clean cityId (e.g. 'city-varanasi' and 'varanasi')
      const rawId = (hotel.cityId || '').trim().toLowerCase();
      if (rawId) {
        keys.add(rawId);
        const stripped = rawId.replace(/^city-/, '');
        if (stripped) {
          keys.add(stripped);
        }
      }

      keys.forEach((key) => {
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    return counts;
  }, [allHotels]);

  const getCityHotelCount = (city: City): number => {
    const normName = (city.name || '').trim().toLowerCase();
    const normId = (city.id || '').trim().toLowerCase();
    const cleanId = normId.replace(/^city-/, '');

    if (cityCounts[normName] !== undefined) return cityCounts[normName];
    if (cityCounts[normId] !== undefined) return cityCounts[normId];
    if (cityCounts[cleanId] !== undefined) return cityCounts[cleanId];

    // Compound city name e.g. "Mathura & Vrindavan", "Dwarka & Somnath"
    if (normName.includes('&')) {
      const parts = normName.split('&').map((p) => p.trim());
      let sum = 0;
      let found = false;
      for (const p of parts) {
        if (cityCounts[p] !== undefined) {
          sum += cityCounts[p];
          found = true;
        }
      }
      if (found) return sum;
    }

    // Substring matching (e.g. "Vrindavan" in "Mathura & Vrindavan")
    for (const key of Object.keys(cityCounts)) {
      if (key && (normName.includes(key) || key.includes(normName))) {
        return cityCounts[key];
      }
    }

    return 0;
  };

  return (
    <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#0f294a]">Every city we cover</h2>
        <p className="text-xs text-slate-500 mt-0.5">Explore sacred pilgrim accommodations across India</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-y-4 gap-x-6 text-xs">
        {cities.map((city) => {
          const count = getCityHotelCount(city);
          return (
            <div
              key={city.id}
              onClick={() => {
                if (onSelectCity) {
                  onSelectCity(city.id);
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer hover:text-[#ea580c] transition-colors group flex items-baseline justify-between"
            >
              <span className="font-semibold text-slate-700 group-hover:text-[#ea580c] truncate">
                {city.name}
              </span>
              <span className="text-slate-400 text-[10px] ml-1">({count})</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
