'use client';

import { FC, useEffect, useRef } from 'react';
import { useGoogleMap } from '@react-google-maps/api';

interface DrawingToolsProps {
  map: google.maps.Map | null;
  onBoundaryComplete: (shape: google.maps.Polygon) => void;
  drawingMode: 'polygon' | null;
  onMeasurementUpdate: (measurement: { distance: number | null; area: number | null }) => void;
}

const DrawingTools: FC<DrawingToolsProps> = ({ map, onBoundaryComplete, drawingMode, onMeasurementUpdate }) => {
  const currentShape = useRef<google.maps.Polygon | null>(null);
  const mouseMoveListener = useRef<google.maps.MapsEventListener | null>(null);
  const clickListener = useRef<google.maps.MapsEventListener | null>(null);
  const path = useRef<google.maps.MVCArray<google.maps.LatLng> | null>(null);
  const isDrawing = useRef<boolean>(false);
  const firstClick = useRef<boolean>(true);

  const calculateDistance = (start: google.maps.LatLng, end: google.maps.LatLng) => {
    return google.maps.geometry.spherical.computeDistanceBetween(start, end) * 3.28084; // Convert to feet
  };

  const calculateArea = (path: google.maps.MVCArray<google.maps.LatLng>) => {
    return google.maps.geometry.spherical.computeArea(path.getArray()) * 10.7639; // Convert to sq ft
  };

  const updateMeasurements = (start: google.maps.LatLng, end: google.maps.LatLng) => {
    const distance = calculateDistance(start, end);
    onMeasurementUpdate({ distance, area: null });
  };

  const clearCurrentShape = () => {
    if (currentShape.current) {
      currentShape.current.setMap(null);
      currentShape.current = null;
    }
    if (path.current) {
      path.current.clear();
      path.current = null;
    }
    if (mouseMoveListener.current) {
      google.maps.event.removeListener(mouseMoveListener.current);
      mouseMoveListener.current = null;
    }
    if (clickListener.current) {
      google.maps.event.removeListener(clickListener.current);
      clickListener.current = null;
    }
    isDrawing.current = false;
    firstClick.current = true;
    onMeasurementUpdate({ distance: null, area: null });
    
    if (map) {
      map.setOptions({ 
        draggableCursor: 'default',
        draggingCursor: 'default'
      });
    }
  };

  const setupShapeListeners = (shape: google.maps.Polygon) => {
    shape.setOptions({ 
      draggable: true,
      editable: true 
    });

    const updateShapeMeasurements = () => {
      console.log('Updating measurements...');
      const path = shape.getPath();
      if (path.getLength() >= 2) {
        const start = path.getAt(0);
        const end = path.getAt(1);
        const area = google.maps.geometry.spherical.computeArea(path);
        const areaInSqFt = Math.round(area * 10.764);
        const distance = google.maps.geometry.spherical.computeLength(path);
        const distanceInFt = Math.round(distance * 3.28084);
        const measurement = { distance: distanceInFt, area: areaInSqFt };
        console.log('New measurements:', measurement);
        onMeasurementUpdate(measurement);
      } else {
        console.log('Path too short, resetting measurements');
        onMeasurementUpdate({ distance: null, area: null });
      }
    };

    // Initial measurement
    updateShapeMeasurements();

    // Update measurements during drag
    let dragTimeout: NodeJS.Timeout;
    
    shape.addListener('dragstart', () => {
      map?.setOptions({ draggableCursor: 'grabbing' });
    });

    shape.addListener('drag', () => {
      // Debounce the updates during drag
      if (dragTimeout) clearTimeout(dragTimeout);
      dragTimeout = setTimeout(updateShapeMeasurements, 50);
    });

    shape.addListener('dragend', () => {
      map?.setOptions({ draggableCursor: 'grab' });
      // Clear any pending debounced updates
      if (dragTimeout) clearTimeout(dragTimeout);
      // Ensure final measurement is updated
      setTimeout(updateShapeMeasurements, 0);
    });

    // Update measurements when path changes
    shape.getPath().addListener('set_at', updateShapeMeasurements);
    shape.getPath().addListener('insert_at', updateShapeMeasurements);
    shape.getPath().addListener('remove_at', updateShapeMeasurements);

    shape.addListener('mouseover', () => {
      map?.setOptions({ draggableCursor: 'grab' });
    });

    shape.addListener('mouseout', () => {
      if (!shape.getDraggable()) {
        map?.setOptions({ draggableCursor: 'default' });
      }
    });
  };

  useEffect(() => {
    if (!map) return;

    if (drawingMode === 'polygon' && !isDrawing.current) {
      isDrawing.current = true;
      firstClick.current = true;

      currentShape.current = new google.maps.Polygon({
        map,
        strokeColor: '#22C55E',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#22C55E',
        fillOpacity: 0.35,
        editable: false,
        draggable: false
      });

      path.current = new google.maps.MVCArray();
      currentShape.current.setPath(path.current);

      const handleClick = (e: google.maps.MapMouseEvent) => {
        if (!path.current || !isDrawing.current) return;

        if (firstClick.current) {
          // First click - start the line
          const startPoint = e.latLng!;
          path.current.push(startPoint);
          firstClick.current = false;

          // Start showing dynamic line
          mouseMoveListener.current = map.addListener('mousemove', (moveEvent: google.maps.MapMouseEvent) => {
            if (path.current?.getLength() === 1) {
              path.current.push(moveEvent.latLng!);
              updateMeasurements(startPoint, moveEvent.latLng!);
            } else if (path.current?.getLength() === 2) {
              path.current.setAt(1, moveEvent.latLng!);
              updateMeasurements(path.current.getAt(0), moveEvent.latLng!);
            }
          });
        } else {
          // Second click - complete the line
          if (mouseMoveListener.current) {
            google.maps.event.removeListener(mouseMoveListener.current);
            mouseMoveListener.current = null;
          }

          const endPoint = e.latLng!;
          path.current.setAt(1, endPoint);
          
          const shape = currentShape.current!;
          setupShapeListeners(shape);
          
          // Complete shape
          onBoundaryComplete(shape);
          
          // Update measurements
          if (path.current) {
            const area = calculateArea(path.current);
            onMeasurementUpdate({ distance: null, area });
          }

          // Reset drawing state
          isDrawing.current = false;
          firstClick.current = true;
          path.current = null;
          currentShape.current = null;
        }
      };

      clickListener.current = map.addListener('click', handleClick);

      return () => {
        clearCurrentShape();
      };
    } else if (!drawingMode) {
      clearCurrentShape();
    }
  }, [map, drawingMode, onBoundaryComplete, onMeasurementUpdate]);

  return null;
};

export default DrawingTools;
