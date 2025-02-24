'use client';

import { FC, useCallback, useState, useEffect } from 'react';
import { GoogleMap, Marker, Polygon } from '@react-google-maps/api';
import DrawingTools from '../map/tools/DrawingTools';
import DrawingInstructions from './DrawingInstructions';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';
import { LightBulbIcon } from '@heroicons/react/24/outline';

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
}

interface BuildingTemplate {
  name: string;
  width: number;  // in feet
  length: number; // in feet
  color: string;
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
  onAnalyze
}) => {
  const [measurements, setMeasurements] = useState<{ distance: number | null; area: number | null }>({
    distance: null,
    area: null
  });
  const [boundaryPath, setBoundaryPath] = useState(INITIAL_BOUNDARY);
  const [cornerMarkers, setCornerMarkers] = useState<google.maps.LatLngLiteral[]>(INITIAL_BOUNDARY.slice(0, -1));
  const [isBoundaryLocked, setIsBoundaryLocked] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BuildingTemplate | null>(null);
  const [buildingPosition, setBuildingPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [buildingRotation, setBuildingRotation] = useState(0);
  const [isQuerying, setIsQuerying] = useState(false);
  const [showDesigns, setShowDesigns] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawingMode, setDrawingMode] = useState<'polygon' | null>(null);

  useEffect(() => {
    if (map) {
      setExternalMap(map);
    }
  }, [map, setExternalMap]);

  useEffect(() => {
    setDrawingMode(externalDrawingMode);
  }, [externalDrawingMode]);

  useEffect(() => {
    setExternalDrawingMode(drawingMode);
  }, [drawingMode, setExternalDrawingMode]);

  const defaultMapOptions = {
    mapTypeId: 'satellite',
    tilt: 0,
    mapTypeControl: true,
    streetViewControl: true,
    rotateControl: true,
    fullscreenControl: true,
    zoomControl: true,
    zoom: 19,
    center: location,
    mapTypeControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT
    }
  };

  const onLoad = useCallback((map: google.maps.Map) => {
    console.log('Map loaded');
    
    // Center map on property location
    map.setCenter(location);
    map.setZoom(19);
    
    // Listen for tilesloaded to ensure everything is rendered
    google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
      console.log('Map tiles loaded');
    });
    setMap(map);
  }, [location]);

  const onUnmount = useCallback(() => {
  }, []);

  const handleMarkerDrag = (index: number, position: google.maps.LatLng) => {
    const newMarkers = [...cornerMarkers];
    newMarkers[index] = { lat: position.lat(), lng: position.lng() };
    setCornerMarkers(newMarkers);

    const newPath = [...newMarkers];
    // Close the polygon by adding the first point again
    newPath.push(newMarkers[0]);
    setBoundaryPath(newPath);
  };

  const handleBuildingDrag = (position: google.maps.LatLng) => {
    setBuildingPosition({ lat: position.lat(), lng: position.lng() });
  };

  const handleRotateBuilding = (degrees: number) => {
    setBuildingRotation((prev) => (prev + degrees) % 360);
  };

  const handlePolygonEdit = () => {
    // Get the updated path from the polygon
    const path = boundaryPath;
    if (path) {
      // Only update the midpoints, keep corners fixed
      const newPath = [...cornerMarkers];
      newPath.push(cornerMarkers[0]); // Close the polygon
      setBoundaryPath(newPath);
    }
  };

  const handleOpenAIQuery = async () => {
    if (!map) return;

    setIsQuerying(true);
    try {
      const bounds = map.getBounds();
      if (!bounds) {
        throw new Error('Map bounds not available');
      }

      // Get the current map view as an image
      const canvas = document.createElement('canvas');
      const scale = 2; // Higher resolution
      const mapDiv = map.getDiv();
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
          imageUrl: screenshot.toDataURL('image/jpeg', 0.9),
          type: 'property',
          center: location,
          bounds: {
            north: bounds.getNorthEast().lat(),
            south: bounds.getSouthWest().lat(),
            east: bounds.getNorthEast().lng(),
            west: bounds.getSouthWest().lng()
          },
          zoom: map.getZoom()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze constraints');
      }

      const data = await response.json();
      onAnalyze(map, {
        map,
        drawingMode,
        setDrawingMode: setExternalDrawingMode,
        setIsDrawingActive
      });
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden border-2 border-gray-200 mb-4">
      {/* Map Controls */}
      <div className="absolute top-0 left-0 z-10 p-4">
        {!isBoundaryLocked ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsBoundaryLocked(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600"
            >
              Lock & Continue
            </button>
            <button
              onClick={handleOpenAIQuery}
              disabled={isQuerying}
              className={`px-4 py-2 bg-purple-500 text-white rounded-lg shadow-md ${
                isQuerying ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-600'
              }`}
            >
              {isQuerying ? 'Analyzing...' : 'Ask AI for Boundaries'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setIsBoundaryLocked(false)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-md hover:bg-yellow-600"
              >
                Edit Boundary
              </button>
              <button
                onClick={() => setShowDesigns(!showDesigns)}
                className={`px-4 py-2 ${
                  showDesigns 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-green-500 hover:bg-green-600'
                } text-white rounded-lg shadow-md`}
              >
                {showDesigns ? 'Hide Designs' : 'Show Designs'}
              </button>
              {selectedTemplate && (
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setBuildingPosition(null);
                    setBuildingRotation(0);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600"
                >
                  Clear Template
                </button>
              )}
            </div>

            {showDesigns && (
              <>
                <div className="bg-white p-2 rounded-lg shadow-md max-h-[60vh] overflow-y-auto">
                  <h3 className="font-medium mb-2">Building Templates</h3>
                  {Object.entries(TEMPLATE_CATEGORIES).map(([category, templates]) => (
                    <div key={category} className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">{category}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {templates.map((template) => (
                          <button
                            key={template.name}
                            onClick={() => {
                              setSelectedTemplate(template);
                              setBuildingPosition(location);
                            }}
                            className={`px-3 py-2 rounded text-sm ${
                              selectedTemplate?.name === template.name 
                              ? 'bg-blue-100 border-2 border-blue-500' 
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            {template.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTemplate && (
                  <div className="bg-white p-2 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Rotate Building</h3>
                      <button
                        onClick={() => {
                          setSelectedTemplate(null);
                          setBuildingPosition(null);
                          setBuildingRotation(0);
                        }}
                        className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleRotateBuilding(-90)}
                        className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        ↶ 90°
                      </button>
                      <button
                        onClick={() => handleRotateBuilding(90)}
                        className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        ↷ 90°
                      </button>
                      <button
                        onClick={() => handleRotateBuilding(-45)}
                        className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        ↶ 45°
                      </button>
                      <button
                        onClick={() => handleRotateBuilding(45)}
                        className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        ↷ 45°
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <button
          onClick={() => setDrawingMode('polygon')}
          className={`px-4 py-2 rounded-lg shadow-md text-sm font-medium transition-colors ${
            drawingMode === 'polygon'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-blue-50'
          }`}
        >
          Draw Boundary
        </button>
        <button
          onClick={() => {
            setDrawingMode(null);
          }}
          className="px-4 py-2 rounded-lg shadow-md text-sm font-medium bg-white text-gray-700 hover:bg-red-50"
        >
          Clear Drawing
        </button>
        {measurements.area && (
          <div className="px-4 py-2 rounded-lg shadow-md text-sm font-medium bg-white text-gray-700">
            Area: {Math.round(measurements.area)} sq ft
          </div>
        )}
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        options={defaultMapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {selectedTemplate && buildingPosition && (
          <Polygon
            paths={calculateBuildingPolygon(buildingPosition, selectedTemplate, buildingRotation)}
            options={{
              strokeColor: '#2E7D32',  // Darker green stroke
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: '#4CAF50',    // Green fill
              fillOpacity: 0.35,
              draggable: true,
              zIndex: 2  // Above boundary
            }}
            onDragEnd={(e) => handleBuildingDrag(e.latLng!)}
          />
        )}

        <Polygon
          paths={boundaryPath}
          options={{
            strokeColor: '#2196F3',  // Light blue stroke
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#90CAF9',    // Lighter blue fill
            fillOpacity: 0.35,
            editable: false,
            draggable: false,
            zIndex: 1  // Below buildings
          }}
        />
        
        {cornerMarkers.map((position, index) => (
          <Marker
            key={index}
            position={position}
            label={{ text: ['NW', 'NE', 'SE', 'SW'][index], color: 'white' }}
            draggable={true}
            onDragEnd={(e) => handleMarkerDrag(index, e.latLng!)}
            title={`${['NW', 'NE', 'SE', 'SW'][index]} Corner`}
            zIndex={3}  // Above everything
          />
        ))}
        
        <Marker
          position={location}
          title="Property Location"
        />
        
        <DrawingTools
          map={map}
          drawingMode={drawingMode}
          onBoundaryComplete={() => {}}
          onMeasurementUpdate={setMeasurements}
        />
      </GoogleMap>

      {/* Drawing Instructions */}
      <DrawingInstructions isVisible={true} />
    </div>
  );
};

// Helper function to calculate building polygon points based on position, size, and rotation
const calculateBuildingPolygon = (
  center: google.maps.LatLngLiteral,
  template: BuildingTemplate,
  rotation: number
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

export default PropertyMap;