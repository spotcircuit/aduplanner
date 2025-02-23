'use client';

import { useState, useCallback, type FC } from 'react';
import { GoogleMap, DrawingManager } from '@react-google-maps/api';
import { toast } from 'react-hot-toast';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';
import ADUOverlay from './ADUOverlay';
import type { ADULayout } from '@/types/property';
import { generateADULayouts, getLocalSetbacks, calculatePropertyDimensions, getBuildableArea, analyzeProperty } from '@/lib/propertyAnalysis';

interface PropertyPlannerProps {
  location: LatLngLiteral;
  address: string;
  initialAnalysis: {
    isEligible: boolean;
    zoning: string;
    maxSize: number;
    restrictions: string[];
  } | null;
}

const DEFAULT_ZOOM = 20;
const DEFAULT_MAP_OPTIONS = {
  mapTypeId: 'satellite',
  tilt: 0,
  mapTypeControl: true,
  streetViewControl: true,
  rotateControl: true,
  fullscreenControl: true,
  zoomControl: true
};

const DRAWING_OPTIONS = {
  drawingMode: window.google?.maps?.drawing?.OverlayType?.RECTANGLE,
  drawingControl: true,
  drawingControlOptions: {
    position: window.google?.maps?.ControlPosition?.TOP_CENTER,
    drawingModes: [window.google?.maps?.drawing?.OverlayType?.RECTANGLE]
  },
  rectangleOptions: {
    fillColor: '#45c152',
    fillOpacity: 0.3,
    strokeWeight: 2,
    strokeColor: '#45c152',
    clickable: true,
    editable: true,
    draggable: true,
    zIndex: 1
  }
};

const PropertyPlanner: FC<PropertyPlannerProps> = ({ location, address, initialAnalysis }) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [propertyBounds, setPropertyBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [aduLayouts, setAduLayouts] = useState<ADULayout[]>([]);
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
  const [propertyAnalysis, setPropertyAnalysis] = useState<{
    isQualified: boolean;
    reasons: string[];
    recommendations: string[];
  } | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onDrawingManagerLoad = useCallback((drawingManager: google.maps.drawing.DrawingManager) => {
    setDrawingManager(drawingManager);
    
    // Show drawing instructions
    toast((t) => (
      <div className="text-sm">
        <p className="font-medium">Draw Your Property Boundaries:</p>
        <ol className="list-decimal ml-4 mt-1">
          <li>Click and drag to draw a rectangle</li>
          <li>Adjust the corners to match your property lines</li>
          <li>Move the rectangle if needed</li>
        </ol>
      </div>
    ), { duration: 10000 });
    
    if (drawingManager) {
      google.maps.event.addListener(drawingManager, 'rectanglecomplete', async (rectangle: google.maps.Rectangle) => {
        // Remove any existing rectangles
        if (propertyBounds) {
          rectangle.setMap(null);
        }

        const bounds = rectangle.getBounds()!;
        setPropertyBounds(bounds);
        
        const propertyBoundsObj = {
          north: bounds.getNorthEast().lat(),
          south: bounds.getSouthWest().lat(),
          east: bounds.getNorthEast().lng(),
          west: bounds.getSouthWest().lng(),
        };

        try {
          const dimensions = calculatePropertyDimensions(propertyBoundsObj);
          const setbacks = getLocalSetbacks('default'); // TODO: Use actual zip code
          const buildableArea = getBuildableArea(propertyBoundsObj, dimensions, setbacks);
          
          // Get zip code from address
          const zipCode = address.match(/\b\d{5}\b/)?.[0] || '';
          
          // Do detailed analysis including hillside requirements
          const analysis = await analyzeProperty(propertyBoundsObj, dimensions, zipCode);
          setPropertyAnalysis(analysis);

          // Generate layouts considering hillside requirements
          const layouts = generateADULayouts(buildableArea);
          setAduLayouts(layouts);
          
          if (analysis.isQualified) {
            toast.success(`Found ${layouts.length} possible ADU layouts that meet hillside requirements!`);
          } else {
            toast.error("Property analysis complete. Check the detailed report below.");
          }
        } catch (error) {
          console.error('Error analyzing property:', error);
          toast.error('Error analyzing property. Please try adjusting the property bounds.');
        }
      });
    }
  }, [propertyBounds, address]);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Drawing Instructions</h3>
        <ul className="list-disc pl-5 text-blue-800 space-y-1">
          <li>Use the rectangle tool (selected by default) to draw your property boundaries</li>
          <li>Click and drag on the map to create the rectangle</li>
          <li>Adjust the corners by dragging them to match your property lines</li>
          <li>Use the hand tool to pan the map if needed</li>
        </ul>
      </div>

      <div className="h-[600px] relative">
        <GoogleMap
          mapContainerClassName="w-full h-full rounded-lg"
          center={location}
          zoom={DEFAULT_ZOOM}
          options={DEFAULT_MAP_OPTIONS}
          onLoad={onMapLoad}
        >
          <DrawingManager
            onLoad={onDrawingManagerLoad}
            options={DRAWING_OPTIONS}
          />
          {map && propertyBounds && aduLayouts.length > 0 && (
            <ADUOverlay
              map={map}
              bounds={propertyBounds}
              layouts={aduLayouts}
            />
          )}
        </GoogleMap>
      </div>
      
      {propertyAnalysis && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Detailed Property Analysis</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-medium text-green-600">
                {propertyAnalysis.isQualified ? "✓ Property Qualifies" : "✗ Property May Not Qualify"}
              </h4>
              <ul className="mt-2 space-y-2">
                {propertyAnalysis.reasons.map((reason, index) => (
                  <li key={index} className="flex items-center text-gray-700">
                    <span className="mr-2">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-blue-600">Recommendations</h4>
              <ul className="mt-2 space-y-2">
                {propertyAnalysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-center text-gray-700">
                    <span className="mr-2">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            {initialAnalysis?.restrictions.includes('Hillside construction requirements apply') && (
              <div className="bg-yellow-50 p-4 rounded-md">
                <h4 className="text-lg font-medium text-yellow-800 mb-2">Hillside Requirements</h4>
                <ul className="list-disc pl-5 text-yellow-700 space-y-1">
                  <li>Maximum slope for ADU construction: 25%</li>
                  <li>Additional setback requirements may apply</li>
                  <li>Geological survey may be required</li>
                  <li>Special drainage considerations needed</li>
                  <li>Enhanced foundation requirements</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyPlanner;
