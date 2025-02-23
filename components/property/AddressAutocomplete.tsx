'use client';

import { useState, type FC, useCallback } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface AddressAutocompleteProps {
  onSelect?: (location: LatLngLiteral, address: string, placeDetails: google.maps.places.PlaceResult) => void;
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
      const placeDetails = results[0];

      // Call onSelect with the location data
      onSelect?.({ lat, lng }, suggestion.description, placeDetails);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error getting address details');
    } finally {
      setIsSearching(false);
    }
  }, [onSelect]);

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Enter your property address"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={value}
          onChange={handleInput}
          disabled={!ready || isSearching}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Suggestions list */}
      {showSuggestions && status === 'OK' && (
        <ul className="absolute z-10 w-full bg-white mt-1 rounded-lg shadow-xl border border-gray-200">
          {data.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              className="px-6 py-4 hover:bg-gray-100 cursor-pointer text-gray-700 border-b border-gray-100 last:border-b-0"
            >
              {suggestion.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
