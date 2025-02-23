'use client';

import { FC, ReactNode } from 'react';
import { LoadScript } from '@react-google-maps/api';

interface GoogleMapsWrapperProps {
  children: ReactNode;
}

const GoogleMapsWrapper: FC<GoogleMapsWrapperProps> = ({ children }) => {
  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
      libraries={['places']}
    >
      {children}
    </LoadScript>
  );
};

export default GoogleMapsWrapper;
