'use client';

import { FC, useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import type { LatLngLiteral } from '@react-google-maps/api';
import { 
  PencilSquareIcon, 
  ArrowsPointingOutIcon, 
  HomeIcon, 
  InformationCircleIcon,
  ChevronRightIcon,
  XMarkIcon,
  TrashIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import DrawingTools from './map/DrawingTools';

interface PropertyPlannerProps {
  location: google.maps.LatLngLiteral;
  address: string;
  initialAnalysis: {
    isEligible: boolean;
    zoning: string;
    maxSize: number;
    restrictions: string[];
    disclaimers: string[];
    ineligibilityReason?: string;
  };
  placeDetails?: google.maps.places.PlaceResult;
}

interface PropertyMetadata {
  propertyType: string;
  lotSize?: string;
  yearBuilt?: string;
  zoning?: string;
  isEligible: boolean;
  eligibilityReason?: string;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
  stories?: number;
  parkingSpaces?: number;
  setbacks?: {
    front?: number;
    back?: number;
    sides?: number;
  };
  maxADUSize?: number;
  lotCoverage?: string;
  buildableArea?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '0.5rem'
};

const PropertyPlanner: FC<PropertyPlannerProps> = ({ 
  location, 
  address, 
  initialAnalysis,
  placeDetails 
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeTab, setActiveTab] = useState<'draw' | 'measure' | 'place'>('draw');
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [propertyMetadata, setPropertyMetadata] = useState<PropertyMetadata | null>(null);
  const [propertyShape, setPropertyShape] = useState<google.maps.Polygon | null>(null);
  const [measurements, setMeasurements] = useState<google.maps.Polyline[]>([]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  useEffect(() => {
    if (!placeDetails) return;

    // Analyze property details
    const analyzeProperty = async () => {
      const addressComponents = placeDetails.address_components || [];
      const types = placeDetails.types || [];
      
      // Check if it's a single-family home
      const isSingleFamily = types.includes('house') || 
                           types.some(type => type.includes('residential')) ||
                           addressComponents.some(comp => 
                             comp.types.includes('street_number') && 
                             !comp.long_name.includes('/') // No unit numbers
                           );

      // Extract property metadata
      const metadata: PropertyMetadata = {
        propertyType: isSingleFamily ? 'Single-Family Home' : 'Other',
        yearBuilt: 'Unknown', // Would need property records API for this
        zoning: initialAnalysis.zoning,
        isEligible: isSingleFamily && initialAnalysis.isEligible,
        eligibilityReason: isSingleFamily ? 
          'Property appears to be a single-family home and may be eligible for ADU development.' :
          'Only single-family homes are eligible for ADU development in this zone.',
        squareFootage: 2500, // Example value, would come from property records
        bedrooms: 3,
        bathrooms: 2.5,
        stories: 2,
        parkingSpaces: 2,
        setbacks: {
          front: 20,
          back: 15,
          sides: 5
        },
        maxADUSize: initialAnalysis.maxSize,
        lotCoverage: '35%',
        buildableArea: 'Calculating...'
      };

      // Try to estimate lot size from viewport bounds if available
      if (placeDetails.geometry?.viewport) {
        const bounds = placeDetails.geometry.viewport;
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        
        // Rough estimation of lot size in square feet
        const width = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(ne.lat(), sw.lng()),
          new google.maps.LatLng(ne.lat(), ne.lng())
        );
        const height = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(sw.lat(), sw.lng()),
          new google.maps.LatLng(ne.lat(), sw.lng())
        );
        
        const lotSizeSqFt = Math.round(width * height);
        metadata.lotSize = `${lotSizeSqFt.toLocaleString()} sq ft (estimated)`;
        
        // Calculate buildable area
        const setbackArea = 2 * (metadata.setbacks?.front || 0) * width +
                          2 * (metadata.setbacks?.sides || 0) * height;
        const buildableAreaSqFt = Math.max(0, lotSizeSqFt - setbackArea);
        metadata.buildableArea = `${buildableAreaSqFt.toLocaleString()} sq ft (estimated)`;
      }

      setPropertyMetadata(metadata);
    };

    analyzeProperty();
  }, [placeDetails, initialAnalysis]);

  const handleShapeComplete = (shape: google.maps.Polygon | google.maps.Polyline) => {
    if (shape instanceof google.maps.Polygon) {
      if (propertyShape) {
        propertyShape.setMap(null);
      }
      setPropertyShape(shape);
    } else if (shape instanceof google.maps.Polyline) {
      setMeasurements(prev => [...prev, shape]);
      
      // Calculate and display distance
      const path = shape.getPath();
      const length = google.maps.geometry.spherical.computeLength(path);
      const lengthInFeet = (length * 3.28084).toFixed(1); // Convert meters to feet
      
      // Add distance label
      const midpoint = path.getAt(Math.floor(path.getLength() / 2));
      new google.maps.InfoWindow({
        content: `${lengthInFeet} ft`,
        position: midpoint,
      }).open(map);
    }
  };

  const renderInstructions = () => {
    switch (activeTab) {
      case 'draw':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center text-blue-600 text-lg">
                <PencilSquareIcon className="w-6 h-6 mr-2" />
                Draw Your Property Boundary
              </h4>
              <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                Step 1 of 3
              </span>
            </div>
            <ol className="list-decimal pl-5 space-y-3">
              <li className="hover:text-blue-600 transition-colors duration-200 flex items-start">
                <span className="mt-1 mr-2">🎯</span>
                <span>Click on the map to start drawing your property line</span>
              </li>
              <li className="hover:text-blue-600 transition-colors duration-200 flex items-start">
                <span className="mt-1 mr-2">📍</span>
                <span>Continue clicking to add corner points around your property</span>
              </li>
              <li className="hover:text-blue-600 transition-colors duration-200 flex items-start">
                <span className="mt-1 mr-2">✅</span>
                <span>Double-click to complete the boundary</span>
              </li>
              <li className="hover:text-blue-600 transition-colors duration-200 flex items-start">
                <span className="mt-1 mr-2">✨</span>
                <span>Drag any point to adjust the shape</span>
              </li>
            </ol>
            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-lg p-4">
              <div className="flex items-center text-yellow-800">
                <LightBulbIcon className="w-5 h-5 mr-2" />
                <span className="font-medium">Pro Tip</span>
              </div>
              <p className="mt-1 text-sm text-yellow-700">
                Use satellite view to trace your property lines accurately. Look for fences, walls, or other boundary markers.
              </p>
            </div>
          </div>
        );
      case 'measure':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center text-blue-600 text-lg">
                <ArrowsPointingOutIcon className="w-6 h-6 mr-2" />
                Measure Distances
              </h4>
              <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                Step 2 of 3
              </span>
            </div>
            <ol className="list-decimal pl-5 space-y-3">
              <li className="hover:text-blue-600 transition-colors duration-200 flex items-start">
                <span className="mt-1 mr-2">📏</span>
                <span>Click where you want to start measuring</span>
              </li>
              <li className="hover:text-blue-600 transition-colors duration-200 flex items-start">
                <span className="mt-1 mr-2">📐</span>
                <span>Move your mouse and click to end measurement</span>
              </li>
              <li className="hover:text-blue-600 transition-colors duration-200 flex items-start">
                <span className="mt-1 mr-2">🔢</span>
                <span>Measurements will show in feet automatically</span>
              </li>
              <li className="hover:text-blue-600 transition-colors duration-200 flex items-start">
                <span className="mt-1 mr-2">➕</span>
                <span>Add multiple measurements to plan your ADU placement</span>
              </li>
            </ol>
            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-lg p-4">
              <div className="flex items-center text-yellow-800">
                <LightBulbIcon className="w-5 h-5 mr-2" />
                <span className="font-medium">Pro Tip</span>
              </div>
              <p className="mt-1 text-sm text-yellow-700">
                Remember to measure setbacks from all property lines. Front setback is typically {propertyMetadata?.setbacks?.front}ft, 
                sides {propertyMetadata?.setbacks?.sides}ft, and rear {propertyMetadata?.setbacks?.back}ft.
              </p>
            </div>
          </div>
        );
      case 'place':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center text-blue-600 text-lg">
                <HomeIcon className="w-6 h-6 mr-2" />
                Place Your ADU
              </h4>
              <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                Step 3 of 3
              </span>
            </div>
            <ol className="list-decimal pl-5 space-y-3">
              <li className="hover:text-blue-600 transition-colors duration-200 flex items-start">
                <span className="mt-1 mr-2">🏠</span>
                <span>Click anywhere within your property to place the ADU</span>
              </li>
              <li className="hover:text-blue-600 transition-colors duration-200 flex items-start">
                <span className="mt-1 mr-2">🎯</span>
                <span>Drag the ADU to adjust its position</span>
              </li>
              <li className="hover:text-blue-600 transition-colors duration-200 flex items-start">
                <span className="mt-1 mr-2">📐</span>
                <span>Use the corner handles to resize the ADU</span>
              </li>
              <li className="hover:text-blue-600 transition-colors duration-200 flex items-start">
                <span className="mt-1 mr-2">✨</span>
                <span>The ADU will automatically snap to required setbacks</span>
              </li>
            </ol>
            {propertyMetadata?.maxADUSize && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center text-blue-800">
                  <InformationCircleIcon className="w-5 h-5 mr-2" />
                  <span className="font-medium">Size Limit</span>
                </div>
                <p className="mt-1 text-sm text-blue-700">
                  Maximum ADU size for your property: {propertyMetadata.maxADUSize.toLocaleString()} sq ft
                </p>
              </div>
            )}
            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-lg p-4">
              <div className="flex items-center text-yellow-800">
                <LightBulbIcon className="w-5 h-5 mr-2" />
                <span className="font-medium">Pro Tip</span>
              </div>
              <p className="mt-1 text-sm text-yellow-700">
                Consider sun exposure, privacy, and accessibility when placing your ADU. 
                South-facing windows can help with natural lighting and energy efficiency.
              </p>
            </div>
          </div>
        );
    }
  };

  const TabButton: FC<{ id: 'draw' | 'measure' | 'place'; label: string; icon: any }> = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      onMouseEnter={() => setHoveredButton(id)}
      onMouseLeave={() => setHoveredButton(null)}
      className={`relative flex items-center p-4 rounded-lg transition-all duration-250 transform hover:scale-102 ${
        activeTab === id 
          ? 'bg-blue-500 text-white shadow-lg' 
          : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'
      }`}
    >
      <Icon className={`w-5 h-5 mr-2 transition-transform duration-250 ${hoveredButton === id ? 'scale-110' : ''}`} />
      {label}
      {hoveredButton === id && (
        <ChevronRightIcon className="w-4 h-4 ml-2 animate-bounce-right" />
      )}
      {activeTab === id && (
        <div className="absolute -bottom-px left-0 w-full h-1 bg-blue-300 rounded-full shadow-glow" />
      )}
    </button>
  );

  return (
    <div className="mt-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Map and Tools */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Header */}
          <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  Property Planner
                </h2>
                <p className="text-gray-600">{address}</p>
              </div>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  propertyMetadata?.isEligible 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {propertyMetadata?.isEligible ? '✓ Potentially Eligible' : '✗ Not Eligible'}
                </span>
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Tool Tabs */}
            <div className="p-4 border-b border-gray-200 flex space-x-4">
              <TabButton
                id="draw"
                label="Draw Property"
                icon={PencilSquareIcon}
              />
              <TabButton
                id="measure"
                label="Measure"
                icon={ArrowsPointingOutIcon}
              />
              <TabButton
                id="place"
                label="Place ADU"
                icon={HomeIcon}
              />
            </div>

            {/* Instructions */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-white border-b border-blue-100">
              <div className="max-w-2xl mx-auto">
                {renderInstructions()}
                
                {/* Quick Help */}
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    <span>Press Esc to cancel current action</span>
                  </div>
                  <div className="flex items-center">
                    <TrashIcon className="w-4 h-4 mr-1" />
                    <span>Delete to remove last point</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Map */}
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={location}
              zoom={19}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={{
                mapTypeId: 'satellite',
                tilt: 0,
                mapTypeControl: true,
                streetViewControl: true,
                rotateControl: true,
                fullscreenControl: true
              }}
            >
              <Marker position={location} />
              {map && (
                <DrawingTools
                  map={map}
                  drawingMode={activeTab === 'draw' ? 'polygon' : activeTab === 'measure' ? 'polyline' : null}
                  onShapeComplete={handleShapeComplete}
                />
              )}
            </GoogleMap>
          </div>
        </div>

        {/* Right Column - Analysis and Info */}
        <div className="space-y-6">
          {/* Property Analysis */}
          {propertyMetadata && (
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Property Analysis
              </h2>
              
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2">
                  <h3 className="font-semibold text-gray-700 mb-2">Property Type</h3>
                  <p className="text-lg">{propertyMetadata.propertyType}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">Square Footage</h3>
                  <p>{propertyMetadata.squareFootage?.toLocaleString()} sq ft</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">Lot Size</h3>
                  <p>{propertyMetadata.lotSize}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">Bedrooms</h3>
                  <p>{propertyMetadata.bedrooms}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">Bathrooms</h3>
                  <p>{propertyMetadata.bathrooms}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">Stories</h3>
                  <p>{propertyMetadata.stories}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">Parking Spaces</h3>
                  <p>{propertyMetadata.parkingSpaces}</p>
                </div>
              </div>

              {/* Setbacks */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Required Setbacks</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Front</p>
                    <p className="font-medium">{propertyMetadata.setbacks?.front}ft</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Back</p>
                    <p className="font-medium">{propertyMetadata.setbacks?.back}ft</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Sides</p>
                    <p className="font-medium">{propertyMetadata.setbacks?.sides}ft</p>
                  </div>
                </div>
              </div>

              {/* Development Potential */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Development Potential</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Maximum ADU Size</p>
                    <p className="text-lg font-medium">{propertyMetadata.maxADUSize?.toLocaleString()} sq ft</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Lot Coverage</p>
                    <p className="text-lg font-medium">{propertyMetadata.lotCoverage}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Buildable Area</p>
                    <p className="text-lg font-medium">{propertyMetadata.buildableArea}</p>
                  </div>
                </div>
              </div>
              
              {/* Eligibility Status */}
              <div className={`p-4 rounded-lg ${propertyMetadata.isEligible ? 'bg-green-50' : 'bg-red-50'}`}>
                <h3 className="font-semibold mb-2">
                  {propertyMetadata.isEligible ? 'Eligible for ADU' : 'Not Eligible for ADU'}
                </h3>
                <p className={propertyMetadata.isEligible ? 'text-green-700' : 'text-red-700'}>
                  {propertyMetadata.eligibilityReason}
                </p>
              </div>
            </div>
          )}

          {/* Zoning Analysis */}
          <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Zoning Requirements
            </h3>
            {initialAnalysis.isEligible ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500">Zoning</p>
                    <p className="text-lg font-medium">{initialAnalysis.zoning}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500">Max ADU Size</p>
                    <p className="text-lg font-medium">{initialAnalysis.maxSize} sq ft</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Requirements:</h4>
                  <div className="space-y-2">
                    {initialAnalysis.restrictions.map((restriction, index) => (
                      <p key={index} className="text-sm text-gray-700 hover:text-blue-600 transition-colors">
                        • {restriction}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-red-700">{initialAnalysis.ineligibilityReason}</p>
              </div>
            )}
          </div>

          {/* Important Notes */}
          <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <InformationCircleIcon className="w-5 h-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold">Important Notes</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              {initialAnalysis.disclaimers.map((disclaimer, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span className="hover:text-blue-600 transition-colors">{disclaimer}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyPlanner;
