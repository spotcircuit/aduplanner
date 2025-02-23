'use client';

import { FC, ReactNode } from 'react';
import { LoadScript, Libraries } from '@react-google-maps/api';

interface GoogleMapsWrapperProps {
  children: ReactNode;
}

const libraries: Libraries = ["places", "drawing"];

const GoogleMapsWrapper: FC<GoogleMapsWrapperProps> = ({ children }) => {
  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
      libraries={libraries}
    >
      {children}
    </LoadScript>
  );
};

export default GoogleMapsWrapper;
