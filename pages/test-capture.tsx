'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import html2canvas from 'html2canvas';

const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

// Initial map options that don't depend on Google Maps API
const initialMapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  mapTypeId: 'satellite',
  tilt: 0,
  zoom: 20,
  center: {
    lat: 39.0686093,
    lng: -77.5054202
  },
  gestureHandling: 'cooperative',
  streetViewControl: true
};

// Exact coordinates from Google Maps API response
const propertyData = {
  address: '43229 Somerset Hills Terrace, Ashburn, VA 20147, USA',
  location: {
    lat: 39.0686093,
    lng: -77.5054202
  },
  bounds: {
    south: 39.0685412,
    west: -77.5055087,
    north: 39.0686773,
    east: -77.50533159999999
  }
};

const TestCapture = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<google.maps.Map>();

  useEffect(() => {
    if (map) {
      console.log('Map instance available, centering on property');
      
      // Set additional options that depend on Google Maps API
      map.setOptions({
        mapTypeControlOptions: {
          position: google.maps.ControlPosition.TOP_RIGHT
        }
      });
      
      // Create bounds from the property data
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(propertyData.bounds.south, propertyData.bounds.west),
        new google.maps.LatLng(propertyData.bounds.north, propertyData.bounds.east)
      );
      
      // Fit the map to the property bounds
      map.fitBounds(bounds);
      
      // After fitting bounds, zoom in slightly more
      google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        map.setZoom(20);
      });
    }
  }, [map]);

  const onLoad = useCallback((map: google.maps.Map) => {
    console.log('Map loaded');
    mapRef.current = map;
    setMap(map);
    
    // Wait for tiles to load
    google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
      console.log('Tiles loaded');
      setMapReady(true);
    });
  }, []);

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);

      if (!mapRef.current) {
        throw new Error('Map not initialized');
      }

      // Get the map div and try to capture it
      const mapDiv = mapRef.current.getDiv();
      console.log('Map div found:', mapDiv);

      // Wait a bit for the map to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(mapDiv, {
        useCORS: true,
        allowTaint: true,
        logging: true,
        backgroundColor: null,
        scale: 2 // Higher quality
      });

      console.log('Canvas captured, size:', canvas.width, 'x', canvas.height);
      const imageUrl = canvas.toDataURL('image/jpeg', 0.95);
      console.log('Image URL length:', imageUrl.length);
      
      // Send to Vision API
      const response = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          address: propertyData.address
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze property');
      }

      try {
        // Try to parse the response as JSON if it's a string
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        setAnalysisResults(parsedData);
      } catch (e) {
        console.log('Raw response:', data);
        setAnalysisResults(data);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze property');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Property Analysis Test</h1>
      <p className="mb-4">{propertyData.address}</p>
      
      {/* Map */}
      <div className="mb-6 relative rounded-lg overflow-hidden border-2 border-gray-300">
        <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            options={initialMapOptions}
            onLoad={onLoad}
          >
            <Marker 
              position={propertyData.location}
              title={propertyData.address}
            />
          </GoogleMap>
        </LoadScript>
      </div>

      {/* Controls */}
      <div className="mb-6">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !mapReady}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isAnalyzing ? 'Analyzing...' : !mapReady ? 'Map Loading...' : 'Analyze Property'}
        </button>
      </div>

      {/* Status */}
      <div className="mb-4">
        <p>Map Status: {mapReady ? 'Ready' : 'Loading...'}</p>
        <p>Location: {propertyData.location.lat}, {propertyData.location.lng}</p>
        <p className="text-sm text-gray-600">Address: {propertyData.address}</p>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {analysisResults && (
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Analysis Results:</h2>
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
              {JSON.stringify(analysisResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestCapture;
