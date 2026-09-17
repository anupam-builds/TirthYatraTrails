import { useMemo } from 'react';
import { useCitiesMaster } from '../context/CitiesContext.js';
import { City } from '../types.js';

export interface SacredCity {
  id: string;
  name: string;
  state: string;
  temple_significance: string | null;
  is_active: boolean;
  imageUrl?: string;
  hotelCount?: number;
  created_at?: string;
}

export function useSacredCities() {
  const { cities, loading, error, refreshCities, addCity, updateCity, deleteCity } = useCitiesMaster();

  // Normalize cities to SacredCity structure
  const sacredCities: SacredCity[] = useMemo(() => {
    return (cities || []).map((c: City) => ({
      id: c.id,
      name: c.name,
      state: c.state || 'India',
      temple_significance: c.popularFor || 'Sacred Temple & Spiritual Yatra',
      is_active: true,
      imageUrl: c.imageUrl,
      hotelCount: c.hotelCount,
    }));
  }, [cities]);

  return {
    cities: sacredCities,
    loading,
    error,
    refetch: refreshCities,
    addCity,
    updateCity,
    deleteCity,
  };
}
