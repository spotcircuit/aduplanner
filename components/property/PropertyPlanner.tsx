'use client';

import { useState, useCallback, type FC } from 'react';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';
import VisionAnalysis from './VisionAnalysis';
import PropertyMap from './PropertyMap';
import type { PropertyMapInstance } from './PropertyMap';
import { analyzeConstraints } from '@/lib/ConstraintAnalysis';
import type { ConstraintAnalysisResult } from '@/lib/ConstraintAnalysis';
import html2canvas from 'html2canvas';
import { 
  InformationCircleIcon,
  ChevronRightIcon,
  XMarkIcon,
  HomeIcon,
  EyeIcon,
  ChevronDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface PropertyPlannerProps {
  location: LatLngLiteral;
  address: string;
  placeDetails?: google.maps.places.PlaceResult;
  initialAnalysis?: {
    isEligible: boolean;
    zoning: string;
    maxSize: number;
    restrictions: string[];
    disclaimers: string[];
    ineligibilityReason?: string;
  };
}

// Extend PlaceGeometry to include bounds
interface ExtendedPlaceGeometry extends google.maps.places.PlaceGeometry {
  bounds?: google.maps.LatLngBounds;
}

const PropertyPlanner: FC<PropertyPlannerProps> = ({ 
  location, 
  address, 
  placeDetails,
  initialAnalysis
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawingMode, setDrawingMode] = useState<'polygon' | null>(null);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ConstraintAnalysisResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [visionAnalysis, setVisionAnalysis] = useState<any>(null);
  const [isMetadataVisible, setIsMetadataVisible] = useState(false);

  const handleBoundaryComplete = useCallback((shape: google.maps.Polygon) => {
    console.log('Boundary complete:', shape);
  }, []);

  const analyzePropertyWithVision = useCallback(async (map: google.maps.Map, propertyMap: PropertyMapInstance) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const bounds = map.getBounds();
      if (!bounds) {
        throw new Error('Map bounds not available');
      }

      // Get the current map view as an image
      const mapDiv = map.getDiv();
      const canvas = await html2canvas(mapDiv, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
      });

      const response = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: canvas.toDataURL('image/jpeg', 0.9),
          prompt: 'Analyze this satellite image for property constraints',
          propertyCenter: location,
          zoomLevel: map.getZoom() || 19,
          type: 'general'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze property');
      }

      const data = await response.json();
      setVisionAnalysis(data);
      setShowAnalysis(true);
    } catch (error) {
      console.error('Error analyzing property:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze property');
    } finally {
      setIsAnalyzing(false);
    }
  }, [location]);

  const detectBoundaries = useCallback(async (map: google.maps.Map) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const bounds = map.getBounds();
      if (!bounds) {
        throw new Error('Map bounds not available');
      }

      // Get the current map view as an image
      const mapDiv = map.getDiv();
      const canvas = await html2canvas(mapDiv, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
      });

      const response = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: canvas.toDataURL('image/jpeg', 0.9),
          prompt: 'Analyze this satellite image to detect property boundaries. Return the coordinates of the main property boundary.',
          propertyCenter: location,
          zoomLevel: map.getZoom() || 19,
          type: 'constraints'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze property boundaries');
      }

      const data = await response.json();
      
      // Return the boundary coordinates
      if (data.processed?.propertyBoundary?.coordinates) {
        return data.processed.propertyBoundary.coordinates;
      } else {
        throw new Error('No property boundaries detected in the image');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to detect boundaries');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [location]);

  return (
    <div className="container mx-auto p-4">
      {/* Header with title and analyze button */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => map && analyzePropertyWithVision(map, {
            map,
            drawingMode,
            setDrawingMode,
            setIsDrawingActive
          })}
          disabled={isAnalyzing || !map}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg
            ${isAnalyzing 
              ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {isAnalyzing ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <InformationCircleIcon className="w-5 h-5" />
              <span>Analyze Property</span>
            </>
          )}
        </button>
      </div>
      
      {/* Vision Analysis Results */}
      {(visionAnalysis || isAnalyzing || analysisError) && (
        <div className="mb-6">
          {analysisError && (
            <div className="p-4 bg-red-50 rounded-lg text-red-700 mb-4">
              <p>{analysisError}</p>
              <button 
                onClick={() => map && analyzePropertyWithVision(map, {
                  map,
                  drawingMode,
                  setDrawingMode,
                  setIsDrawingActive
                })}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Try Again
              </button>
            </div>
          )}
          
          <VisionAnalysis 
            isAnalyzing={isAnalyzing}
            visionAnalysis={visionAnalysis}
          />
        </div>
      )}

      {/* Main content area - Map and Property Analysis side by side */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side - Map */}
        <div className="flex-1">
          <PropertyMap
            location={location}
            address={address}
            map={map}
            setMap={setMap}
            drawingMode={drawingMode}
            setDrawingMode={setDrawingMode}
            setIsDrawingActive={setIsDrawingActive}
            onAnalyze={analyzePropertyWithVision}
            onDetectBoundaries={detectBoundaries}
          />
        </div>

        {/* Right side - Property Analysis */}
        <div className="lg:w-1/3">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow p-6">
            {/* Property Details */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                <HomeIcon className="h-5 w-5 text-blue-500" />
                Property Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <ChevronRightIcon className="h-5 w-5 text-blue-500 mt-1" />
                  <div>
                    <p className="text-gray-700">
                      <span className="font-medium">Address:</span> {address}
                    </p>
                  </div>
                </div>
                
                {!initialAnalysis?.isEligible && (
                  <div className="flex items-start gap-2 bg-red-50 p-3 rounded-lg border border-red-100">
                    <XMarkIcon className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-700">Property is not eligible</p>
                      {initialAnalysis?.ineligibilityReason && (
                        <p className="text-sm text-red-600 mt-1">{initialAnalysis.ineligibilityReason}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Property Characteristics */}
                <div className="border-t border-blue-100 pt-3 mt-3">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">Property Characteristics</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm">
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-1 text-gray-900">{placeDetails?.types?.includes('single_family_dwelling') ? 'Single Family' : 'Residential'}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Zoning:</span>
                      <span className="ml-1 text-gray-900">{initialAnalysis?.zoning}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Max ADU:</span>
                      <span className="ml-1 text-gray-900">{initialAnalysis?.maxSize} sq ft</span>
                    </div>
                  </div>
                </div>

                {/* Location Context */}
                <div className="border-t border-blue-100 pt-3">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">Location Context</h4>
                  <div className="space-y-1">
                    {placeDetails?.address_components?.map((component, index) => {
                      if (component.types.includes('neighborhood') || 
                          component.types.includes('sublocality') ||
                          component.types.includes('locality')) {
                        return (
                          <div key={index} className="text-sm">
                            <span className="text-gray-600">{component.types[0].charAt(0).toUpperCase() + component.types[0].slice(1)}:</span>
                            <span className="ml-1 text-gray-900">{component.long_name}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>

                {/* Setback Requirements */}
                <div className="border-t border-blue-100 pt-3">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">Setback Requirements</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm">
                      <span className="text-gray-600">Front:</span>
                      <span className="ml-1 text-gray-900">20 ft</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Back:</span>
                      <span className="ml-1 text-gray-900">15 ft</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Sides:</span>
                      <span className="ml-1 text-gray-900">5 ft</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Height Limit:</span>
                      <span className="ml-1 text-gray-900">16 ft</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Metadata - Collapsible */}
            <div className="border-t border-blue-100 pt-3 mt-3">
              <button
                onClick={() => setIsMetadataVisible(!isMetadataVisible)}
                className="w-full flex items-center justify-between text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
              >
                <span>Property Metadata</span>
                <ChevronDownIcon 
                  className={`h-5 w-5 transition-transform ${isMetadataVisible ? 'rotate-180' : ''}`}
                />
              </button>
              <div className={`transition-all duration-200 ease-in-out ${isMetadataVisible ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {placeDetails?.types && placeDetails.types.length > 0 && (
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="text-gray-900 ml-1">
                        {placeDetails.types.map(type => 
                          type.replace(/_/g, ' ').toLowerCase()
                        ).join(', ')}
                      </span>
                    </div>
                  )}
                  {initialAnalysis?.zoning && (
                    <div>
                      <span className="text-gray-600">Zoning:</span>
                      <span className="text-gray-900 ml-1">{initialAnalysis.zoning}</span>
                    </div>
                  )}
                  {initialAnalysis?.maxSize && (
                    <div>
                      <span className="text-gray-600">Max ADU Size:</span>
                      <span className="text-gray-900 ml-1">{initialAnalysis.maxSize} sqft</span>
                    </div>
                  )}
                  {placeDetails?.geometry?.location && (
                    <>
                      <div>
                        <span className="text-gray-600">Lat:</span>
                        <span className="text-gray-900 ml-1">
                          {placeDetails.geometry.location.lat().toFixed(6)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Lng:</span>
                        <span className="text-gray-900 ml-1">
                          {placeDetails.geometry.location.lng().toFixed(6)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Restrictions */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                <XMarkIcon className="h-5 w-5 text-blue-500" />
                Restrictions
              </h3>
              <div className="space-y-2">
                {(initialAnalysis?.restrictions || []).map((restriction, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <ChevronRightIcon className="h-5 w-5 text-blue-500 mt-1" />
                    <p className="text-gray-700">{restriction}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimers */}
            <div>
              <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-500" />
                Disclaimers
              </h3>
              <div className="space-y-2">
                {(initialAnalysis?.disclaimers || []).map((disclaimer, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <InformationCircleIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    <p className="text-gray-600 text-sm">{disclaimer}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Debug Information */}
            <div className="border-t border-blue-100 pt-3 mt-3">
              <h4 className="text-sm font-medium text-blue-700 mb-2">Property Metadata (Debug)</h4>
              <div className="bg-gray-50 p-3 rounded-lg text-xs font-mono overflow-auto max-h-96">
                <pre>
                  {JSON.stringify({
                    address_components: placeDetails?.address_components,
                    types: placeDetails?.types,
                    geometry: {
                      location: {
                        lat: placeDetails?.geometry?.location?.lat() || location.lat,
                        lng: placeDetails?.geometry?.location?.lng() || location.lng
                      },
                      viewport: placeDetails?.geometry?.viewport || undefined,
                      ...(placeDetails?.geometry && (placeDetails.geometry as ExtendedPlaceGeometry).bounds && {
                        bounds: (placeDetails.geometry as ExtendedPlaceGeometry).bounds
                      })
                    },
                    formatted_address: placeDetails?.formatted_address,
                    name: placeDetails?.name,
                    vicinity: placeDetails?.vicinity
                  }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyPlanner;
