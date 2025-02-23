'use client';

import { useState } from 'react';
import AddressAutocomplete from './address/AddressAutocomplete';
import PropertyPlanner from './PropertyPlanner';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';
import { analyzePropertyByAddress } from '@/lib/propertyAnalysis';
import { toast } from 'react-hot-toast';

export default function HomeContent() {
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
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">ADU Planner</h1>
        <p className="text-gray-600 mb-8">
          Enter your address to analyze your property's ADU potential
        </p>
        <AddressAutocomplete onSelect={handleAddressSelect} />
      </div>

      {initialAnalysis && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-lg">
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
          {initialAnalysis.isEligible && (
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <p className="text-blue-700">
                Draw your property boundaries on the map below to get a detailed analysis and possible ADU layouts.
              </p>
            </div>
          )}
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
  );
}
