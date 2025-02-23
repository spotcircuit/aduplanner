'use client';

import { useState, type FC, useCallback } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import type { LatLngLiteral } from '@react-google-maps/api';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface AddressAutocompleteProps {
  onSelect: (location: LatLngLiteral, address: string, placeDetails: google.maps.places.PlaceResult) => void;
}

const AddressAutocomplete: FC<AddressAutocompleteProps> = ({ onSelect }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelect = useCallback(async (suggestion: { description: string, place_id: string }) => {
    setIsSearching(true);
    setValue(suggestion.description, false);
    clearSuggestions();
    setShowSuggestions(false);

    try {
      // Get geocode data
      const results = await getGeocode({ placeId: suggestion.place_id });
      const { lat, lng } = await getLatLng(results[0]);

      // Get detailed place information
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      
      service.getDetails(
        {
          placeId: suggestion.place_id,
          fields: ['address_components', 'types', 'name', 'formatted_address']
        },
        (placeResult, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && placeResult) {
            onSelect({ lat, lng }, suggestion.description, placeResult);
          } else {
            toast.error('Error getting property details. Please try again.');
          }
          setIsSearching(false);
        }
      );
    } catch (error) {
      console.error('Error selecting address:', error);
      toast.error('Error selecting address. Please try again.');
      setIsSearching(false);
    }
  }, [onSelect, setValue, clearSuggestions]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInput}
          disabled={!ready}
          placeholder="Enter your property address..."
          className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onFocus={() => setShowSuggestions(true)}
        />
        <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      {showSuggestions && status === "OK" && (
        <ul className="absolute z-10 w-full bg-white mt-1 rounded-lg shadow-lg border border-gray-200">
          {data.map(suggestion => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900"
            >
              {suggestion.description}
            </li>
          ))}
        </ul>
      )}

      {isSearching && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
