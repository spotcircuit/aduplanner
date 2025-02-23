'use client';

import { useState, type FC, type ChangeEvent, useCallback } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface AddressAutocompleteProps {
  onSelect: (location: LatLngLiteral, address: string) => void;
}

const AddressAutocomplete: FC<AddressAutocompleteProps> = ({ onSelect }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions
  } = usePlacesAutocomplete({
    debounce: 300,
    cache: 86400,
    requestOptions: {
      types: ['address'],
      componentRestrictions: { country: 'us' }
    }
  });

  const checkPropertyType = useCallback(async (placeId: string): Promise<{
    isResidential: boolean;
    propertyType: string;
    disqualifyingReasons: string[];
  }> => {
    try {
      // Get detailed place information
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      
      return new Promise((resolve, reject) => {
        service.getDetails({
          placeId,
          fields: ['types', 'address_components', 'formatted_address']
        }, (place, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
            reject(new Error('Failed to get place details'));
            return;
          }

          const types = place.types || [];
          const addressComponents = place.address_components || [];
          
          const disqualifyingReasons: string[] = [];
          let isResidential = false;
          let propertyType = 'unknown';

          // Check place types
          if (types.includes('residential')) {
            isResidential = true;
          }
          
          // Look for apartment/condo indicators
          if (types.includes('apartment') || types.includes('condominium')) {
            propertyType = 'apartment/condo';
            disqualifyingReasons.push('Property appears to be an apartment or condominium');
          }

          // Check address components for unit numbers
          const hasUnitNumber = addressComponents.some(component => {
            const value = component.long_name.toLowerCase();
            return (
              component.types.includes('subpremise') || // Unit numbers
              /^(unit|apt|suite|#)\s*\d+/i.test(value) || // Unit indicators
              /^[a-z]-\d+$/i.test(value) // Pattern like "A-1"
            );
          });

          if (hasUnitNumber) {
            propertyType = 'multi-unit';
            disqualifyingReasons.push('Address contains a unit number');
          }

          // Check for commercial zones
          if (types.includes('store') || types.includes('business_park') || types.includes('shopping_mall')) {
            propertyType = 'commercial';
            disqualifyingReasons.push('Property is in a commercial zone');
          }

          resolve({
            isResidential,
            propertyType,
            disqualifyingReasons
          });
        });
      });
    } catch (error) {
      console.error('Error checking property type:', error);
      return {
        isResidential: false,
        propertyType: 'unknown',
        disqualifyingReasons: ['Failed to verify property type']
      };
    }
  }, []);

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelect = useCallback(async (address: string) => {
    if (!address) return;
    
    setIsSearching(true);
    setShowSuggestions(false);
    setValue(address, false);
    clearSuggestions();

    try {
      const propertyCheck = await checkPropertyType(address);
      
      if (propertyCheck.disqualifyingReasons.length > 0) {
        toast.error(
          <div>
            <p className="font-medium">Property may not qualify for ADU:</p>
            <ul className="list-disc pl-4 mt-1">
              {propertyCheck.disqualifyingReasons.map((reason, i) => (
                <li key={i} className="text-sm">{reason}</li>
              ))}
            </ul>
          </div>,
          { duration: 6000 }
        );
      }

      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      onSelect({ lat, lng }, address);
    } catch (error) {
      console.error('Error selecting address:', error);
      toast.error('Error processing address. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [setValue, clearSuggestions, onSelect]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={handleInput}
            onFocus={() => setShowSuggestions(true)}
            disabled={!ready}
            placeholder="Enter your property address"
            className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {status === "OK" && showSuggestions && (
            <ul className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
              {data.map(({ place_id, description }) => (
                <li
                  key={place_id}
                  onClick={() => handleSelect(description)}
                  className="cursor-pointer py-3 px-4 hover:bg-blue-500 hover:text-white"
                >
                  {description}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={() => {
            if (value) {
              handleSelect(value);
              setShowSuggestions(false);
            }
          }}
          disabled={!ready || isSearching || !value}
          className={`px-6 py-3 rounded-lg flex items-center justify-center ${
            !ready || isSearching || !value
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white transition-colors`}
        >
          {isSearching ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <MagnifyingGlassIcon className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default AddressAutocomplete;
