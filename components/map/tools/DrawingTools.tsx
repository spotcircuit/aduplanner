import { FC, useEffect, useRef } from 'react';
import { LatLngLiteral } from '@googlemaps/google-maps-services-js';

interface DrawingToolsProps {
  map: google.maps.Map | null;
  drawingMode: 'polygon' | null;
  onBoundaryComplete: (path: LatLngLiteral[]) => void;
  onMeasurementUpdate: (measurements: { distance: number | null; area: number | null }) => void;
}

const DrawingTools: FC<DrawingToolsProps> = ({
  map,
  drawingMode,
  onBoundaryComplete,
  onMeasurementUpdate,
}) => {
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

  useEffect(() => {
    if (!map) return;

    // Initialize drawing manager if it doesn't exist
    if (!drawingManagerRef.current) {
      drawingManagerRef.current = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: {
          strokeColor: '#2196F3',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#90CAF9',
          fillOpacity: 0.35,
        },
      });

      // Add completion listener
      google.maps.event.addListener(drawingManagerRef.current, 'polygoncomplete', (polygon: google.maps.Polygon) => {
        // Get path vertices but don't include the closing point
        const path = polygon.getPath().getArray().slice(0, -1).map(latLng => ({
          lat: latLng.lat(),
          lng: latLng.lng()
        }));

        // Calculate area
        const area = google.maps.geometry.spherical.computeArea(polygon.getPath());
        onMeasurementUpdate({ distance: null, area });

        // Clean up the drawn polygon
        polygon.setMap(null);

        // Pass the path to parent (without the closing point)
        onBoundaryComplete(path);
      });

      drawingManagerRef.current.setMap(map);
    }

    // Update drawing mode
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(
        drawingMode === 'polygon' ? google.maps.drawing.OverlayType.POLYGON : null
      );
    }

    return () => {
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null);
        drawingManagerRef.current = null;
      }
    };
  }, [map, drawingMode, onBoundaryComplete, onMeasurementUpdate]);

  return null;
};

export default DrawingTools;
