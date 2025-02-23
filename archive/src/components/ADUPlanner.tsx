'use client';

import { useState, useCallback, type FC } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { toast } from 'react-hot-toast';
import AddressAutocomplete from './address/AddressAutocomplete';
import ADUOverlay from './ADUOverlay';
import type { ADULayout } from '@/types/property';
import { generateADULayouts, getLocalSetbacks, getBuildableArea, calculatePropertyDimensions } from '@/lib/utils/propertyAnalysis';

const mapContainerStyle: google.maps.MapOptions['styles'] = {
  width: '100%',
  height: 'calc(100vh - 200px)', // Adjust for header
};

const defaultCenter: google.maps.LatLngLiteral = {
  lat: 37.7749,
  lng: -122.4194,
};

interface PropertyBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const ADUPlanner: FC = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<google.maps.LatLng | null>(null);
  const [layouts, setLayouts] = useState<ADULayout[]>([]);
  const [currentLayoutIndex, setCurrentLayoutIndex] = useState<number>(0);
  const [propertyBounds, setPropertyBounds] = useState<google.maps.Rectangle | null>(null);

  const onAddressSelect = useCallback(async (address: string, lat: number, lng: number): Promise<void> => {
    if (!map) return;

    // Clear previous overlays
    if (propertyBounds) {
      propertyBounds.setMap(null);
    }

    const location = new google.maps.LatLng(lat, lng);
    setSelectedLocation(location);
    map.panTo(location);
    map.setZoom(20);

    // Create a rectangle for the property bounds
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(lat - 0.0003, lng - 0.0003),
      new google.maps.LatLng(lat + 0.0003, lng + 0.0003)
    );

    const rectangle = new google.maps.Rectangle({
      bounds: bounds,
      editable: true,
      draggable: true,
      map: map,
      fillColor: '#4CAF50',
      fillOpacity: 0.2,
      strokeColor: '#4CAF50',
      strokeWeight: 2
    });

    setPropertyBounds(rectangle);

    // Get property bounds
    const propertyBoundsObj: PropertyBounds = {
      north: bounds.getNorthEast().lat(),
      south: bounds.getSouthWest().lat(),
      east: bounds.getNorthEast().lng(),
      west: bounds.getSouthWest().lng(),
    };

    // Get local setbacks based on address
    const zipCode = address.match(/\d{5}(?:[-\s]\d{4})?/)?.[0] || '';
    const setbacks = getLocalSetbacks(zipCode);

    // Calculate buildable area
    const dimensions = calculatePropertyDimensions(propertyBoundsObj);
    const buildableArea = getBuildableArea(propertyBoundsObj, dimensions, setbacks);

    // Generate possible ADU layouts
    const newLayouts = generateADULayouts(buildableArea);
    setLayouts(newLayouts);
    setCurrentLayoutIndex(0);

    toast.success('Property analysis complete! Adjust the property bounds if needed.');
  }, [map, propertyBounds]);

  const onMapLoad = useCallback((map: google.maps.Map): void => {
    setMap(map);
  }, []);

  const nextLayout = useCallback((): void => {
    setCurrentLayoutIndex((current) => (current + 1) % layouts.length);
  }, [layouts.length]);

  const previousLayout = useCallback((): void => {
    setCurrentLayoutIndex((current) => (current - 1 + layouts.length) % layouts.length);
  }, [layouts.length]);

  return (
    <div className="p-4 space-y-4">
      <div className="max-w-2xl mx-auto">
        <AddressAutocomplete
          onAddressSelect={onAddressSelect}
          className="w-full"
        />
      </div>

      <div className="relative rounded-lg overflow-hidden shadow-lg">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={12}
          onLoad={onMapLoad}
          options={{
            mapTypeId: 'satellite',
            tilt: 0,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
          }}
        />

        {layouts.length > 0 && selectedLocation && (
          <>
            <ADUOverlay
              map={map}
              layout={layouts[currentLayoutIndex]}
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-4 rounded-lg shadow-lg">
              <div className="flex items-center space-x-4">
                <button
                  onClick={previousLayout}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  type="button"
                >
                  Previous
                </button>
                <div className="text-center">
                  <p className="font-bold">{layouts[currentLayoutIndex].style}</p>
                  <p>{layouts[currentLayoutIndex].squareFootage} sq ft</p>
                  <p className="text-sm text-gray-600">
                    {layouts[currentLayoutIndex].width}' × {layouts[currentLayoutIndex].depth}'
                  </p>
                </div>
                <button
                  onClick={nextLayout}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {layouts.length > 0 && (
        <div className="max-w-2xl mx-auto bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Property Analysis</h2>
          <p>
            Found {layouts.length} possible ADU layouts for your property. Use the buttons above
            to explore different options. You can drag the red ADU overlay to try different positions.
          </p>
        </div>
      )}
    </div>
  );
};

export default ADUPlanner;
