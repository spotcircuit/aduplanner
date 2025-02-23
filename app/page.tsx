'use client';

import { useState } from 'react';
import { HomeModernIcon } from '@heroicons/react/24/outline';
import AddressAutocomplete from '@/components/property/AddressAutocomplete';
import dynamic from 'next/dynamic';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';
import { analyzePropertyByAddress } from '@/lib/propertyAnalysis';

// Import PropertyPlanner dynamically to avoid SSR issues
const PropertyPlanner = dynamic(() => import('@/components/property/PropertyPlanner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<{
    location: LatLngLiteral;
    address: string;
    placeDetails: google.maps.places.PlaceResult;
    analysis: {
      isEligible: boolean;
      zoning: string;
      maxSize: number;
      restrictions: string[];
      disclaimers: string[];
    };
  } | null>(null);

  const handleAddressSelect = async (
    location: LatLngLiteral,
    address: string,
    placeDetails: google.maps.places.PlaceResult
  ) => {
    // Get the initial analysis using the place details
    const analysis = await analyzePropertyByAddress(address, placeDetails);
    setSelectedLocation({ location, address, placeDetails, analysis });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Hero Section - Always visible */}
      <div className="relative overflow-hidden min-h-[80vh]">
        <div className="absolute inset-0 bg-blue-500 opacity-5 pattern-grid-lg"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center space-y-8">
            {/* Logo and Title */}
            <div className="flex justify-center items-center space-x-3 mb-6">
              <HomeModernIcon className="w-12 h-12 text-blue-500 animate-pulse" />
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
                ADU Planner
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto">
              Design your perfect Accessory Dwelling Unit with our intelligent planning assistant
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium">
                Instant Eligibility Check
              </span>
              <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium">
                Visual Property Planning
              </span>
              <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium">
                Zoning Analysis
              </span>
              <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium">
                Size Recommendations
              </span>
            </div>

            {/* Address Search */}
            <div className="max-w-xl mx-auto">
              <AddressAutocomplete onSelect={handleAddressSelect} />
            </div>
          </div>
        </div>
      </div>

      {/* Property Planner Section - Flows below hero when address is selected */}
      {selectedLocation && selectedLocation.analysis && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Property Results for <span className="text-blue-600">{selectedLocation.address}</span>
          </h2>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <PropertyPlanner
              location={selectedLocation.location}
              address={selectedLocation.address}
              placeDetails={selectedLocation.placeDetails}
              initialAnalysis={selectedLocation.analysis}
            />
          </div>
        </div>
      )}
    </main>
  );
}