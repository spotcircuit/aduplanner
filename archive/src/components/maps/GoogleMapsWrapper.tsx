'use client';

import { useLoadScript } from '@react-google-maps/api';
import type { FC, ReactNode } from 'react';

interface GoogleMapsWrapperProps {
  children: ReactNode;
}

const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ['places', 'drawing', 'geometry'];

const GoogleMapsWrapper: FC<GoogleMapsWrapperProps> = ({ children }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries
  });

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading maps...</div>;
  }

  return <>{children}</>;
};

export default GoogleMapsWrapper;
