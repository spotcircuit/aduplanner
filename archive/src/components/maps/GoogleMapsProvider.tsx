'use client';

import { useLoadScript } from '@react-google-maps/api';
import type { FC, ReactNode } from 'react';
import LoadingSpinner from '../LoadingSpinner';

const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ['places', 'drawing', 'geometry'];

interface GoogleMapsProviderProps {
  children: ReactNode;
}

const GoogleMapsProvider: FC<GoogleMapsProviderProps> = ({ children }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error loading Google Maps</h2>
        <p className="text-gray-600">Please check your API key and try again.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return <LoadingSpinner size="lg" />;
  }

  return <>{children}</>;
};

export default GoogleMapsProvider;
