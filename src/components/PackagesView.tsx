import React from 'react';
import { PackagesPage } from '../pages/PackagesPage.js';

/**
 * PackagesView compatibility export re-exporting PackagesPage.
 * Allows consumers expecting `src/components/PackagesView.tsx` to mount the packages view seamlessly.
 */
export const PackagesView: React.FC = () => {
  return <PackagesPage />;
};

export default PackagesView;
