'use client';

import { useState } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import PropertyMap from '@/components/property/PropertyMap';
import type { PropertyMapInstance } from '@/components/property/PropertyMap';
import ConstraintLayer from '@/components/map/layers/ConstraintLayer';
import html2canvas from 'html2canvas';

// Pre-defined location for testing
const TEST_LOCATION = {
  lat: 37.25518162228746,
  lng: -122.01615486937833
};

const TEST_ADDRESS = '123 Test St, Test City, ST 12345';

const TestCapturePage = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawingMode, setDrawingMode] = useState<'polygon' | null>(null);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [constraintAnalysis, setConstraintAnalysis] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConstraints, setShowConstraints] = useState(false);

  const handleBoundaryComplete = (shape: google.maps.Polygon) => {
    console.log('Boundary complete:', shape);
    // Here we can add logic to handle the completed boundary
    // For example, validate coordinates or calculate area
  };

  const handleAnalyze = async (map: google.maps.Map, propertyMap: PropertyMapInstance) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const bounds = map.getBounds();
      if (!bounds) {
        throw new Error('Map bounds not available');
      }

      // Capture the map view as an image
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
          prompt: 'Analyze this property for ADU placement constraints',
          propertyCenter: TEST_LOCATION,
          zoomLevel: map.getZoom() || 19,
          type: 'constraints'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze property');
      }

      const data = await response.json();
      setConstraintAnalysis(data.processed);
      setShowConstraints(true);
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze property');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-2 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Property Analysis Test</h1>
            <div className="space-x-2">
              <button
                onClick={() => setShowConstraints(!showConstraints)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                {showConstraints ? 'Hide' : 'Show'} Constraints
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex justify-center bg-gray-50 p-2">
        <div className="max-w-7xl w-full flex flex-col gap-2">
          <div className="relative" style={{ height: 'calc(100vh - 4rem)' }}>
            <div className="absolute inset-0 rounded-lg overflow-hidden shadow-lg">
              <Wrapper 
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
                libraries={['drawing', 'geometry']}
              >
                <PropertyMap
                  location={TEST_LOCATION}
                  address={TEST_ADDRESS}
                  map={map}
                  setMap={setMap}
                  drawingMode={drawingMode}
                  setDrawingMode={setDrawingMode}
                  setIsDrawingActive={setIsDrawingActive}
                  onAnalyze={handleAnalyze}
                  onDetectBoundaries={async () => null}
                />
                {showConstraints && constraintAnalysis && map && (
                  <ConstraintLayer
                    map={map}
                    constraintAnalysis={{
                      property_boundaries: [{
                        coordinates: constraintAnalysis.propertyBoundary.coordinates
                      }],
                      structures: constraintAnalysis.structures.map((structure: { type: string; coordinates: google.maps.LatLngLiteral[] }) => ({
                        type: structure.type,
                        coordinates: structure.coordinates
                      }))
                    }}
                  />
                )}
              </Wrapper>
            </div>
          </div>

          {/* Analysis results below the map */}
          {(error || constraintAnalysis) && (
            <div className="bg-white rounded-lg shadow-lg overflow-auto p-4">
              {error && (
                <div className="bg-red-100 text-red-700 rounded p-4 mb-4">
                  {error}
                </div>
              )}

              {constraintAnalysis && (
                <div>
                  <h2 className="text-xl font-semibold mb-2">Analysis Results</h2>
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
                    {JSON.stringify(constraintAnalysis, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestCapturePage;
