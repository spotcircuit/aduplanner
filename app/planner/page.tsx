'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';

// Dynamically import the PropertyPlanner component to avoid SSR issues with Google Maps
const PropertyPlanner = dynamic(() => import('@/components/property/PropertyPlanner'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export default function PlannerPage() {
  const searchParams = useSearchParams();
  
  // Get location from URL params
  const lat = searchParams?.get('lat');
  const lng = searchParams?.get('lng');
  const address = searchParams?.get('address');
  
  if (!lat || !lng || !address) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div>Missing required parameters. Please start from the home page.</div>
      </main>
    );
  }

  const location: LatLngLiteral = {
    lat: parseFloat(lat),
    lng: parseFloat(lng)
  };

  const initialAnalysis = {
    isEligible: true,
    zoning: 'R-1',
    maxSize: 100,
    restrictions: [],
    disclaimers: []
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Suspense fallback={<div>Loading...</div>}>
        <PropertyPlanner 
          location={location}
          address={address}
          initialAnalysis={initialAnalysis}
        />
      </Suspense>
    </main>
  );
}
