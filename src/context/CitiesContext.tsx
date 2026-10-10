import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { City } from '../types.js';
import { api } from '../services/api.js';
import { localStore } from '../services/localStore.js';

export interface CitiesContextType {
  cities: City[];
  loading: boolean;
  error: string | null;
  refreshCities: () => Promise<City[]>;
  addCity: (cityData: Partial<City>) => Promise<City>;
  updateCity: (id: string, updates: Partial<City>) => Promise<City>;
  deleteCity: (id: string, name?: string) => Promise<boolean>;
  getCityById: (idOrName: string) => City | undefined;
}

const CitiesContext = createContext<CitiesContextType | null>(null);

export const CitiesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCities = useCallback(async (showLoading = false, forceFresh = false): Promise<City[]> => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const [list, hotelList] = await Promise.all([
        api.getCities({ forceFresh }).catch(() => localStore.getCities() || []),
        api.getHotels().catch(() => []),
      ]);
      const safeList = Array.isArray(list) ? list : [];
      const enriched = safeList.map((c) => ({
        ...c,
        hotelCount: localStore.countHotelsForCity(c, hotelList),
        transitHubs: Array.isArray(c?.transitHubs) ? c.transitHubs : [],
      }));
      setCities(enriched);
      return enriched;
    } catch (err: any) {
      console.debug('Handled cities refresh notice (fallback to localStore):', err?.message || err);
      const fallback = localStore.getCities() || [];
      const safeFallback = Array.isArray(fallback) ? fallback : [];
      setCities(safeFallback);
      return safeFallback;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCities(true);

    const handleCitySync = () => {
      refreshCities(false, true);
    };

    window.addEventListener('tirth-city-changed', handleCitySync);
    window.addEventListener('tirth-hotel-changed', handleCitySync);
    window.addEventListener('storage', handleCitySync);

    return () => {
      window.removeEventListener('tirth-city-changed', handleCitySync);
      window.removeEventListener('tirth-hotel-changed', handleCitySync);
      window.removeEventListener('storage', handleCitySync);
    };
  }, [refreshCities]);

  const addCity = useCallback(async (cityData: Partial<City>): Promise<City> => {
    const cityName = (cityData.name || '').trim();
    if (!cityName) {
      throw new Error('City / Destination name is required.');
    }

    // Check if already in master list
    const currentCities = Array.isArray(cities) ? cities : [];
    const existing = currentCities.find(
      (c) =>
        c &&
        (c.name?.toLowerCase().trim() === cityName.toLowerCase() ||
          (cityData.id && c.id?.toLowerCase() === cityData.id.toLowerCase()))
    );
    if (existing) {
      return existing;
    }

    const payload: Partial<City> = {
      name: cityName,
      state: (cityData.state || 'India').trim(),
      imageUrl:
        (cityData.imageUrl || '').trim() ||
        'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80',
      popularFor: (cityData.popularFor || 'Sacred Temple & Spiritual Yatra').trim(),
      hotelCount: Number(cityData.hotelCount) || 0,
      transitHubs: Array.isArray(cityData.transitHubs) ? cityData.transitHubs : [],
    };

    const created = await api.createCity(payload);
    const safeCreated: City = {
      ...created,
      transitHubs: Array.isArray(created.transitHubs) ? created.transitHubs : [],
    };

    setCities((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const idx = safePrev.findIndex(
        (c) => c && (c.id === safeCreated.id || c.name?.toLowerCase() === safeCreated.name?.toLowerCase())
      );
      if (idx !== -1) {
        const next = [...safePrev];
        next[idx] = safeCreated;
        return next;
      }
      return [...safePrev, safeCreated];
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: { action: 'create', city: safeCreated } }));
      window.dispatchEvent(new Event('tirth-hotel-changed'));
    }

    return safeCreated;
  }, [cities]);

  const updateCity = useCallback(async (id: string, updates: Partial<City>): Promise<City> => {
    const updated = await api.updateCity(id, updates);
    const safeUpdated: City = {
      ...updated,
      transitHubs: Array.isArray(updated.transitHubs) ? updated.transitHubs : [],
    };
    setCities((prev) => (Array.isArray(prev) ? prev : []).map((c) => (c?.id === safeUpdated.id ? safeUpdated : c)));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: { action: 'update', city: safeUpdated } }));
      window.dispatchEvent(new Event('tirth-hotel-changed'));
    }

    return safeUpdated;
  }, []);

  const deleteCity = useCallback(async (id: string, name?: string): Promise<boolean> => {
    const targetName = (name || id).toLowerCase();
    setCities((prev) =>
      (Array.isArray(prev) ? prev : []).filter(
        (c) => c && c.id !== id && c.name?.toLowerCase() !== targetName
      )
    );

    const ok = await api.deleteCity(id, name);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tirth-city-changed', { detail: { action: 'delete', id, name } }));
      window.dispatchEvent(new Event('tirth-hotel-changed'));
    }

    return ok;
  }, []);

  const getCityById = useCallback((idOrName: string): City | undefined => {
    if (!idOrName) return undefined;
    const target = idOrName.toLowerCase().trim();
    return (Array.isArray(cities) ? cities : []).find(
      (c) =>
        c &&
        (c.id?.toLowerCase() === target ||
          c.name?.toLowerCase() === target ||
          c.id?.toLowerCase().replace(/-/g, ' ') === target.replace(/-/g, ' '))
    );
  }, [cities]);

  return (
    <CitiesContext.Provider
      value={{
        cities,
        loading,
        error,
        refreshCities,
        addCity,
        updateCity,
        deleteCity,
        getCityById,
      }}
    >
      {children}
    </CitiesContext.Provider>
  );
};

export function useCitiesMaster(): CitiesContextType {
  const context = useContext(CitiesContext);
  if (!context) {
    throw new Error('useCitiesMaster must be used within a CitiesProvider');
  }
  return context;
}

export const useCities = useCitiesMaster;
