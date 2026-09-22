import React, { useMemo, useState, useEffect } from 'react';
import { PackagesPage } from '../pages/PackagesPage.js';
import { Package } from '../types.js';
import { localStore } from '../services/localStore.js';

/**
 * Utility hook to extract dynamic category pills matching the unified schema:
 * ['All Packages', ...uniqueCategoriesAcrossPackages, ...customSavedCategories]
 */
export const useDynamicPackageCategories = (allPackages: Package[], externalCustomCategories: string[] = []) => {
  const [storedCustom, setStoredCustom] = useState<string[]>(() => localStore.getCustomCategories());

  useEffect(() => {
    const handleCategoryUpdate = () => {
      setStoredCustom(localStore.getCustomCategories());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tirth-categories-changed', handleCategoryUpdate);
      window.addEventListener('tirth-package-changed', handleCategoryUpdate);
      window.addEventListener('storage', handleCategoryUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('tirth-categories-changed', handleCategoryUpdate);
        window.removeEventListener('tirth-package-changed', handleCategoryUpdate);
        window.removeEventListener('storage', handleCategoryUpdate);
      }
    };
  }, []);

  return useMemo(() => {
    const defaults = ['All Packages', 'Pilgrimage', 'Char Dham', 'Varanasi Ayodhya', 'South India', 'Jyotirlinga'];
    const fromData = Array.from(new Set((allPackages || []).map((p) => p.category).filter(Boolean)));
    const customList = Array.from(new Set([...storedCustom, ...externalCustomCategories].filter(Boolean)));
    return Array.from(new Set([...defaults, ...fromData, ...customList]));
  }, [allPackages, storedCustom, externalCustomCategories]);
};

/**
 * PackagesView compatibility export re-exporting PackagesPage.
 * Allows consumers expecting `src/components/PackagesView.tsx` to mount the packages view seamlessly.
 */
export const PackagesView: React.FC = () => {
  return <PackagesPage />;
};

export default PackagesView;

