"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';
import { analyzePropertyByAddress } from '@/lib/propertyAnalysis';

// Dynamically import components that use browser APIs
const AddressAutocomplete = dynamic(() => import('@/components/address/AddressAutocomplete'), {
  ssr: false
});

const PropertyPlanner = dynamic(() => import('@/components/PropertyPlanner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<LatLngLiteral | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [initialAnalysis, setInitialAnalysis] = useState<{
    isEligible: boolean;
    zoning: string;
    maxSize: number;
    restrictions: string[];
  } | null>(null);

  const handleAddressSelect = async (location: LatLngLiteral, address: string) => {
    setSelectedLocation(location);
    setSelectedAddress(address);

    try {
      // Do initial analysis based on address before property bounds are drawn
      const analysis = await analyzePropertyByAddress(address);
      setInitialAnalysis(analysis);
      
      if (analysis.isEligible) {
        toast.success('Your property is in an ADU-eligible zone! Draw your property boundaries to continue.');
      } else {
        toast.error('This property may have zoning restrictions. Check the analysis for details.');
      }
    } catch (error) {
      console.error('Error analyzing property:', error);
      toast.error('Error analyzing property. Please try a different address.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">ADU Planner</h1>
          <p className="text-xl text-gray-600">Design your Accessory Dwelling Unit</p>
        </div>

        <div className="w-full">
          <AddressAutocomplete onSelect={handleAddressSelect} />
        </div>

        {initialAnalysis && (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Initial Property Analysis</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <span className={`text-lg ${initialAnalysis.isEligible ? 'text-green-600' : 'text-red-600'}`}>
                  {initialAnalysis.isEligible ? '✓' : '✗'} Zoning Status
                </span>
              </div>
              <div>
                <p className="text-gray-700">Zone: {initialAnalysis.zoning}</p>
                <p className="text-gray-700">Maximum ADU Size: {initialAnalysis.maxSize} sq ft</p>
              </div>
              {initialAnalysis.restrictions.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Restrictions to Consider:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {initialAnalysis.restrictions.map((restriction, index) => (
                      <li key={index} className="text-gray-700">{restriction}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedLocation && selectedAddress && (
          <PropertyPlanner
            location={selectedLocation}
            address={selectedAddress}
            initialAnalysis={initialAnalysis}
          />
        )}
      </div>
    </main>
  );
}
