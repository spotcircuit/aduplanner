'use client';

import { useState, useCallback, type FC } from 'react';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';
import VisionAnalysis from './VisionAnalysis';
import PropertyMap from './PropertyMap';
import { 
  InformationCircleIcon,
  ChevronRightIcon,
  XMarkIcon,
  HomeIcon,
  EyeIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import html2canvas from 'html2canvas';

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
  };
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
  const [visionAnalysis, setVisionAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isMetadataVisible, setIsMetadataVisible] = useState(false);

  const handleBoundaryComplete = useCallback((shape: google.maps.Polygon) => {
    console.log('Boundary complete:', shape);
  }, []);

  const analyzePropertyWithVision = useCallback(async (map: google.maps.Map) => {
    try {
      console.log('Starting vision analysis');
      setIsAnalyzing(true);
      setAnalysisError(null);

      // Wait one frame to ensure canvas is ready
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Get the map div and try to capture it
      const mapDiv = map.getDiv();
      console.log('Map div found:', mapDiv);

      // Use html2canvas for better capture quality
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
          address: address
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze property');
      }

      const data = await response.json();
      console.log('Vision analysis complete:', data);
      setVisionAnalysis(data);
    } catch (error) {
      console.error('Vision analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze property');
    } finally {
      setIsAnalyzing(false);
    }
  }, [address]);

  return (
    <div className="container mx-auto p-4">
      {/* Header with title and analyze button */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => map && analyzePropertyWithVision(map)}
          disabled={isAnalyzing || !map}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg
            transition-all duration-200 ease-in-out
            ${isAnalyzing || !map
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          `}
        >
          <EyeIcon className="h-5 w-5" />
          <span>
            {isAnalyzing 
              ? 'Analyzing...' 
              : !map 
                ? 'Loading Map...'
                : 'Analyze Property'
            }
          </span>
        </button>
      </div>
      
      {/* Vision Analysis Results */}
      {(visionAnalysis || isAnalyzing || analysisError) && (
        <div className="mb-6">
          {analysisError && (
            <div className="p-4 bg-red-50 rounded-lg text-red-700 mb-4">
              <p>{analysisError}</p>
              <button 
                onClick={() => map && analyzePropertyWithVision(map)}
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
            handleBoundaryComplete={handleBoundaryComplete}
            isAnalyzing={isAnalyzing}
            onAnalyze={analyzePropertyWithVision}
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
                
                {!initialAnalysis?.isEligible && initialAnalysis?.ineligibilityReason && (
                  <div className="flex items-start gap-2 bg-red-50 p-3 rounded-lg border border-red-100">
                    <XMarkIcon className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-red-700 font-medium">Not Eligible for ADU</p>
                      <p className="text-red-600">{initialAnalysis.ineligibilityReason}</p>
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
                  {placeDetails?.types?.length > 0 && (
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="text-gray-900 ml-1">
                        {placeDetails.types[0].replace(/_/g, ' ')}
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
                        lat: placeDetails?.geometry?.location?.lat(),
                        lng: placeDetails?.geometry?.location?.lng()
                      },
                      viewport: placeDetails?.geometry?.viewport,
                      bounds: placeDetails?.geometry?.bounds
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
