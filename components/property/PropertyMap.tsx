'use client';

import { FC, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, Marker, Polygon } from '@react-google-maps/api';
import DrawingTools from '../map/tools/DrawingTools';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';
import { BuildingTemplate } from '@/types/building';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import ConstraintLayer from '../map/layers/ConstraintLayer';
import StructureTemplates from './StructureTemplates';
import StructureVisualizer from './StructureVisualizer';

export interface PropertyMapInstance {
  map: google.maps.Map | null;
  drawingMode: 'polygon' | null;
  setDrawingMode: (mode: 'polygon' | null) => void;
  setIsDrawingActive: (active: boolean) => void;
}

interface PropertyMapProps {
  location: google.maps.LatLngLiteral;
  address: string;
  map: google.maps.Map | null;
  setMap: (map: google.maps.Map | null) => void;
  drawingMode: 'polygon' | null;
  setDrawingMode: (mode: 'polygon' | null) => void;
  setIsDrawingActive: (active: boolean) => void;
  onAnalyze: (map: google.maps.Map, propertyMap: PropertyMapInstance) => Promise<void>;
  onDetectBoundaries: (map: google.maps.Map) => Promise<google.maps.LatLngLiteral[] | null>;
}

const BUILDING_TEMPLATES: BuildingTemplate[] = [
  // Standard Rectangles
  { name: "40x60 Shop", width: 40, length: 60, color: "#4CAF50" },
  { name: "30x40 Garage", width: 30, length: 40, color: "#2196F3" },
  { name: "20x20 Shed", width: 20, length: 20, color: "#9C27B0" },
  // Larger Buildings
  { name: "50x100 Warehouse", width: 50, length: 100, color: "#FF5722" },
  { name: "60x120 Industrial", width: 60, length: 120, color: "#795548" },
  // Smaller Structures
  { name: "12x16 Storage", width: 12, length: 16, color: "#607D8B" },
  { name: "16x24 Workshop", width: 16, length: 24, color: "#FF9800" },
  // Custom Sizes
  { name: "25x35 Custom", width: 25, length: 35, color: "#9E9E9E" },
  { name: "45x75 Custom", width: 45, length: 75, color: "#3F51B5" }
];

const TEMPLATE_CATEGORIES = {
  "Standard Rectangles": [
    { name: "40x60 Shop", width: 40, length: 60, color: "#4CAF50" },
    { name: "30x40 Garage", width: 30, length: 40, color: "#2196F3" },
    { name: "20x20 Shed", width: 20, length: 20, color: "#9C27B0" },
  ],
  "Larger Buildings": [
    { name: "50x100 Warehouse", width: 50, length: 100, color: "#FF5722" },
    { name: "60x120 Industrial", width: 60, length: 120, color: "#795548" },
  ],
  "Smaller Structures": [
    { name: "12x16 Storage", width: 12, length: 16, color: "#607D8B" },
    { name: "16x24 Workshop", width: 16, length: 24, color: "#FF9800" },
  ],
  "Custom Sizes": [
    { name: "25x35 Custom", width: 25, length: 35, color: "#9E9E9E" },
    { name: "45x75 Custom", width: 45, length: 75, color: "#3F51B5" }
  ]
};

const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

const INITIAL_BOUNDARY = [
  { lat: 37.255510, lng: -122.016530 }, // NW
  { lat: 37.255540, lng: -122.015650 }, // NE
  { lat: 37.254880, lng: -122.015630 }, // SE
  { lat: 37.254860, lng: -122.016520 }, // SW
  { lat: 37.255510, lng: -122.016530 }  // NW again to close the polygon
];

const PropertyMap: FC<PropertyMapProps> = ({
  location,
  address,
  map: externalMap,
  setMap: setExternalMap,
  drawingMode: externalDrawingMode,
  setDrawingMode: setExternalDrawingMode,
  setIsDrawingActive,
  onAnalyze,
  onDetectBoundaries
}) => {
  const [measurements, setMeasurements] = useState<{ distance: number | null; area: number | null }>({
    distance: null,
    area: null
  });
  const [boundaryPath, setBoundaryPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [cornerMarkers, setCornerMarkers] = useState<google.maps.LatLngLiteral[]>([]);
  const [isBoundaryLocked, setIsBoundaryLocked] = useState(false);
  const [showConstraints, setShowConstraints] = useState(false);
  const [constraintAnalysis, setConstraintAnalysis] = useState<any>(null);
  const [showDesigns, setShowDesigns] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [boundaryFromAI, setBoundaryFromAI] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<{
    template: BuildingTemplate;
    position: google.maps.LatLngLiteral;
    points?: google.maps.LatLngLiteral[];
  } | null>(null);

  const structurePolygonRef = useRef<google.maps.Polygon | null>(null);

  const onPolygonLoad = useCallback((polygon: google.maps.Polygon) => {
    structurePolygonRef.current = polygon;
  }, []);

  // Reset all boundary-related state when component mounts
  useEffect(() => {
    setBoundaryPath([]);
    setCornerMarkers([]);
    setIsBoundaryLocked(false);
    setShowDesigns(false);
    setBoundaryFromAI(false);
    setSelectedStructure(null);
    setMeasurements({ distance: null, area: null });
  }, []);

  const defaultMapOptions = useMemo(() => ({
    mapTypeId: 'hybrid',
    tilt: 0,
    mapTypeControl: true,
    streetViewControl: true,
    rotateControl: true,
    fullscreenControl: true,
    zoomControl: true,
    zoom: 19,
    center: location,
    mapTypeControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT,
      mapTypeIds: ['hybrid', 'satellite', 'roadmap']
    },
    maxZoom: 21,
    minZoom: 15,
    scaleControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    styles: [
      {
        featureType: 'all',
        elementType: 'labels',
        stylers: [{ visibility: 'on' }]
      }
    ]
  }), [location]);

  const onLoad = useCallback((map: google.maps.Map) => {
    console.log('Map loaded');
    map.setCenter(location);
    map.setZoom(19);
    setExternalMap(map);
  }, [location, setExternalMap]);

  const onUnmount = useCallback(() => {
    setExternalMap(null);
  }, [setExternalMap]);

  useEffect(() => {
    if (externalMap) {
      externalMap.setCenter(location);
      externalMap.setZoom(19);
    }
  }, [location, externalMap]);

  const handleMarkerDrag = (index: number, position: google.maps.LatLng) => {
    const newMarkers = [...cornerMarkers];
    newMarkers[index] = { lat: position.lat(), lng: position.lng() };
    setCornerMarkers(newMarkers);
    
    // Update boundary path to match markers
    setBoundaryPath([...newMarkers, newMarkers[0]]); // Close the polygon

    // Only calculate area if boundary came from OpenAI
    if (boundaryFromAI && window.google && window.google.maps.geometry) {
      const path = newMarkers.map(coord => new google.maps.LatLng(coord.lat, coord.lng));
      const area = google.maps.geometry.spherical.computeArea(path);
      setMeasurements({ distance: null, area: Math.round(area * 10.764) }); // Convert to sq ft
    }
  };

  const handleOpenAIQuery = async () => {
    if (!externalMap) return;

    setIsAnalyzing(true);
    try {
      const bounds = externalMap.getBounds();
      if (!bounds) {
        throw new Error('Map bounds not available');
      }

      // Get the current map view as an image
      const canvas = document.createElement('canvas');
      const scale = 2; // Higher resolution
      const mapDiv = externalMap.getDiv();
      canvas.width = mapDiv.clientWidth * scale;
      canvas.height = mapDiv.clientHeight * scale;
      
      const html2canvas = (await import('html2canvas')).default;
      const screenshot = await html2canvas(mapDiv, {
        scale: scale,
        useCORS: true,
        backgroundColor: null,
      });

      const response = await fetch('/api/analyze-constraints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: screenshot.toDataURL('image/jpeg', 0.9),
          prompt: 'Analyze this satellite image to identify property boundaries',
          propertyCenter: location,
          zoomLevel: externalMap.getZoom() || 19
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze boundaries');
      }

      const data = await response.json();
      console.log('Vision analysis response:', data);

      // Update boundary path and corner markers based on the analysis
      if (data.parsed?.propertyBoundary?.coordinates) {
        console.log('Property boundary coordinates:', data.parsed.propertyBoundary.coordinates);
        const coordinates = data.parsed.propertyBoundary.coordinates;
        console.log('Setting boundary path:', [...coordinates, coordinates[0]]);
        console.log('Setting corner markers:', coordinates);
        setBoundaryPath([...coordinates, coordinates[0]]); // Close the polygon
        setCornerMarkers(coordinates);
        setIsBoundaryLocked(true); // Lock the boundary since AI detected it
        setBoundaryFromAI(true); // Set flag that boundary came from AI

        // Calculate initial area after OpenAI detection
        if (window.google && window.google.maps.geometry) {
          const path = coordinates.map((coord: google.maps.LatLngLiteral) => new google.maps.LatLng(coord.lat, coord.lng));
          const area = google.maps.geometry.spherical.computeArea(path);
          setMeasurements({ distance: null, area: Math.round(area * 10.764) }); // Convert to sq ft
        }
      } else {
        console.warn('No property boundary coordinates in response:', data);
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    console.log('Constraint analysis state:', constraintAnalysis);
    console.log('Show constraints state:', showConstraints);
  }, [constraintAnalysis, showConstraints]);

  // Helper function to calculate building polygon points based on position, size, and rotation
  const calculateBuildingPolygon = (
    center: google.maps.LatLngLiteral,
    template: BuildingTemplate,
    rotation: number = 0
  ): google.maps.LatLngLiteral[] => {
    // Convert feet to approximate latitude/longitude deltas
    const feetToLatLng = 0.00000274; // rough approximation
    const width = template.width * feetToLatLng;
    const length = template.length * feetToLatLng;

    // Calculate corners before rotation
    const points = [
      { lat: center.lat - width/2, lng: center.lng - length/2 },
      { lat: center.lat - width/2, lng: center.lng + length/2 },
      { lat: center.lat + width/2, lng: center.lng + length/2 },
      { lat: center.lat + width/2, lng: center.lng - length/2 }
    ];

    // Rotate points around center
    const rotatedPoints = points.map(point => {
      const dx = point.lng - center.lng;
      const dy = point.lat - center.lat;
      const theta = (rotation * Math.PI) / 180;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      
      return {
        lat: center.lat + (dy * cos - dx * sin),
        lng: center.lng + (dx * cos + dy * sin)
      };
    });

    // Close the polygon
    return [...rotatedPoints, rotatedPoints[0]];
  };

  const calculateBuildingArea = (corners: google.maps.LatLngLiteral[]) => {
    if (!window.google || !window.google.maps.geometry) return 0;
    const path = corners.map(coord => new google.maps.LatLng(coord.lat, coord.lng));
    const area = google.maps.geometry.spherical.computeArea(path);
    return Math.round(area * 10.764); // Convert to sq ft
  };

  return (
    <div className="relative w-full">
      <div className="rounded-lg overflow-hidden border-2 border-gray-200 mb-4">
        {/* Map Controls */}
        <div className="absolute top-0 left-0 z-10 p-4">
          {boundaryPath.length > 0 ? (
            !isBoundaryLocked ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setIsBoundaryLocked(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600"
                >
                  Lock & Continue
                </button>
                <button
                  onClick={handleOpenAIQuery}
                  disabled={isAnalyzing}
                  className={`px-4 py-2 bg-purple-500 text-white rounded-lg shadow-md ${
                    isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-600'
                  }`}
                >
                  {isAnalyzing ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing...
                    </div>
                  ) : (
                    'Ask AI for Boundaries'
                  )}
                </button>
                <button
                  onClick={() => {
                    setExternalDrawingMode(null);
                    setBoundaryPath([]);
                    setCornerMarkers([]);
                    setMeasurements({ distance: null, area: null });
                    setBoundaryFromAI(false);
                    setShowDesigns(false);
                  }}
                  className="px-4 py-2 rounded-lg shadow-md text-sm font-medium bg-white text-gray-700 hover:bg-red-50"
                >
                  Clear Drawing
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setIsBoundaryLocked(false)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-md hover:bg-yellow-600"
                >
                  Edit Boundary
                </button>
                {/* Only show area and Build Templates after OpenAI analysis */}
                {boundaryFromAI && measurements.area && (
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="px-4 py-2 bg-white rounded-lg shadow-md text-gray-700">
                      Area: {Math.round(measurements.area)} sq ft
                    </div>
                    <button
                      onClick={() => setShowDesigns(!showDesigns)}
                      className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg shadow-md hover:bg-blue-600"
                    >
                      {showDesigns ? 'Hide Templates' : 'Build Templates'}
                    </button>
                    {selectedStructure && (
                      <div className="px-4 py-2 bg-white rounded-lg shadow-md text-gray-700">
                        Structure: {calculateBuildingArea(selectedStructure.points || calculateBuildingPolygon(selectedStructure.position, selectedStructure.template))} sq ft
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleOpenAIQuery}
                disabled={isAnalyzing}
                className={`px-4 py-2 bg-purple-500 text-white rounded-lg shadow-md ${
                  isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-600'
                }`}
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing...
                  </div>
                ) : (
                  'Ask AI for Boundaries'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Template Selection Modal */}
        {showDesigns && boundaryFromAI && (
          <div className="absolute right-0 top-0 z-20 w-96 bg-white rounded-lg shadow-xl m-4 overflow-auto max-h-[calc(100vh-2rem)]">
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Building Templates</h3>
                <button
                  onClick={() => setShowDesigns(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              <StructureTemplates
                onTemplateSelect={(template) => {
                  if (externalMap) {
                    const center = {
                      lat: (cornerMarkers[0].lat + cornerMarkers[2].lat) / 2,
                      lng: (cornerMarkers[0].lng + cornerMarkers[2].lng) / 2
                    };
                    setSelectedStructure({
                      template,
                      position: center
                    });
                    setShowDesigns(false);
                  }
                }}
              />
            </div>
          </div>
        )}

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          options={defaultMapOptions}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          {/* Fixed center marker */}
          {location && (
            <Marker
              position={location}
              draggable={false}
            />
          )}
          
          {/* Selected Building Template */}
          {selectedStructure && (
            <Polygon
              onLoad={onPolygonLoad}
              paths={selectedStructure.points || calculateBuildingPolygon(selectedStructure.position, selectedStructure.template)}
              options={{
                fillColor: '#34D399',
                fillOpacity: 0.4,
                strokeColor: '#059669',
                strokeOpacity: 1,
                strokeWeight: 2,
                zIndex: 1,
                editable: true
              }}
              draggable={true}
              onDragEnd={(e) => {
                if (e.latLng && selectedStructure) {
                  // Update position and maintain shape
                  const oldCenter = selectedStructure.position;
                  const newCenter = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                  const dx = newCenter.lng - oldCenter.lng;
                  const dy = newCenter.lat - oldCenter.lat;
                  
                  const newPoints = selectedStructure.points?.map(p => ({
                    lat: p.lat + dy,
                    lng: p.lng + dx
                  }));

                  setSelectedStructure({
                    ...selectedStructure,
                    position: newCenter,
                    points: newPoints
                  });
                }
              }}
              onMouseUp={(e) => {
                if (selectedStructure && structurePolygonRef.current) {
                  const path = structurePolygonRef.current.getPath();
                  if (path) {
                    const points = Array.from({length: path.getLength()}, (_, i) => {
                      const point = path.getAt(i);
                      return { lat: point.lat(), lng: point.lng() };
                    });
                    
                    // Calculate center
                    const bounds = new google.maps.LatLngBounds();
                    points.forEach(point => bounds.extend(point));
                    const center = bounds.getCenter();
                    
                    setSelectedStructure({
                      ...selectedStructure,
                      position: { lat: center.lat(), lng: center.lng() },
                      points: points
                    });
                  }
                }
              }}
            />
          )}
          
          {/* Draw boundary path */}
          {boundaryPath.length > 2 && (
            <Polygon
              paths={boundaryPath}
              options={{
                strokeColor: '#2196F3',  // Light blue stroke
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#90CAF9',    // Lighter blue fill
                fillOpacity: 0.35,
                editable: !isBoundaryLocked,
                draggable: true,
                zIndex: 0  // Below buildings
              }}
              onDragEnd={(e) => {
                if (!e.latLng) return;
                // Calculate offset
                const oldCenter = {
                  lat: (cornerMarkers[0].lat + cornerMarkers[2].lat) / 2,
                  lng: (cornerMarkers[0].lng + cornerMarkers[2].lng) / 2
                };
                const newCenter = e.latLng.toJSON();
                const latDiff = newCenter.lat - oldCenter.lat;
                const lngDiff = newCenter.lng - oldCenter.lng;
                
                // Move all markers by the offset
                const newMarkers = cornerMarkers.map(marker => ({
                  lat: marker.lat + latDiff,
                  lng: marker.lng + lngDiff
                }));
                setCornerMarkers(newMarkers);
                setBoundaryPath([...newMarkers, newMarkers[0]]);
              }}
            />
          )}
          
          {/* Draw corner markers */}
          {cornerMarkers.map((position, index) => (
            <Marker
              key={index}
              position={position}
              draggable={true}
              options={{
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 4,
                  fillColor: '#2196F3',
                  fillOpacity: 1,
                  strokeColor: '#fff',
                  strokeWeight: 1
                }
              }}
              onDragEnd={(e) => {
                if (e.latLng) {
                  handleMarkerDrag(index, e.latLng);
                }
              }}
              label={['NW', 'NE', 'SE', 'SW'][index]}
            />
          ))}
          
          <DrawingTools
            map={externalMap}
            drawingMode={externalDrawingMode}
            onBoundaryComplete={(path) => {
              // Only take the first 4 points for markers
              setCornerMarkers(path.slice(0, 4));
              setBoundaryPath([...path.slice(0, 4), path[0]]); // Close the polygon
              setExternalDrawingMode(null);
            }}
            onMeasurementUpdate={setMeasurements}
          />
        </GoogleMap>
      </div>
    </div>
  );
};

export default PropertyMap;