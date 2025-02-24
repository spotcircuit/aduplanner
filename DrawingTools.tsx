'use client';

import { FC, useEffect, useState } from 'react';
import { DrawingManager, Rectangle } from '@react-google-maps/api';

interface DrawingToolsProps {
  map: google.maps.Map | null;
  onShapeComplete?: (shape: google.maps.Polygon | google.maps.Polyline) => void;
  drawingMode: 'polygon' | 'polyline' | null;
}

const DrawingTools: FC<DrawingToolsProps> = ({ map, onShapeComplete, drawingMode }) => {
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
  const [propertyBounds, setPropertyBounds] = useState<google.maps.Polygon | null>(null);
  const [buildableOverlay, setBuildableOverlay] = useState<google.maps.Rectangle | null>(null);
  const [setbackOverlays, setSetbackOverlays] = useState<google.maps.Polygon[]>([]);
  const [maxRectangle, setMaxRectangle] = useState<google.maps.Rectangle | null>(null);
  const [dimensionLabels, setDimensionLabels] = useState<google.maps.InfoWindow[]>([]);

  useEffect(() => {
    if (!drawingManager) return;
    
    // Update drawing mode when prop changes
    drawingManager.setDrawingMode(
      drawingMode === 'polygon' ? google.maps.drawing.OverlayType.POLYGON :
      drawingMode === 'polyline' ? google.maps.drawing.OverlayType.POLYLINE :
      null
    );
  }, [drawingMode, drawingManager]);

  // Function to calculate distance between two points in feet
  const calculateDistance = (p1: google.maps.LatLng, p2: google.maps.LatLng): number => {
    return google.maps.geometry.spherical.computeDistanceBetween(p1, p2) * 3.28084; // Convert meters to feet
  };

  // Function to find the largest rectangle that fits within the polygon
  const findLargestRectangle = (polygon: google.maps.Polygon) => {
    const bounds = new google.maps.LatLngBounds();
    const path = polygon.getPath();
    path.forEach(point => bounds.extend(point));

    // Get the corners of the bounding box
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    // Calculate center point
    const center = new google.maps.LatLng(
      (ne.lat() + sw.lat()) / 2,
      (ne.lng() + sw.lng()) / 2
    );

    // Calculate dimensions
    const width = calculateDistance(
      new google.maps.LatLng(center.lat(), sw.lng()),
      new google.maps.LatLng(center.lat(), ne.lng())
    );
    const height = calculateDistance(
      new google.maps.LatLng(sw.lat(), center.lng()),
      new google.maps.LatLng(ne.lat(), center.lng())
    );

    // Create rectangle with 15ft setbacks
    const setbackLat = 0.00015; // Approximately 15 feet in latitude
    const setbackLng = 0.00015; // Approximately 15 feet in longitude
    
    const rectangleBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(sw.lat() + setbackLat, sw.lng() + setbackLng),
      new google.maps.LatLng(ne.lat() - setbackLat, ne.lng() - setbackLng)
    );

    // Clear existing rectangle and labels
    if (maxRectangle) maxRectangle.setMap(null);
    dimensionLabels.forEach(label => label.setMap(null));

    // Create new rectangle
    const newRectangle = new google.maps.Rectangle({
      bounds: rectangleBounds,
      map,
      fillColor: '#4CAF50',
      fillOpacity: 0.3,
      strokeColor: '#4CAF50',
      strokeWeight: 2,
      editable: false
    });
    setMaxRectangle(newRectangle);

    // Add dimension labels
    const adjustedWidth = width - 30; // Account for setbacks
    const adjustedHeight = height - 30;
    
    const newLabels = [
      new google.maps.InfoWindow({
        position: new google.maps.LatLng(
          center.lat(),
          (rectangleBounds.getNorthEast().lng() + rectangleBounds.getSouthWest().lng()) / 2
        ),
        content: `${Math.round(adjustedWidth)}ft`,
      }),
      new google.maps.InfoWindow({
        position: new google.maps.LatLng(
          (rectangleBounds.getNorthEast().lat() + rectangleBounds.getSouthWest().lat()) / 2,
          center.lng()
        ),
        content: `${Math.round(adjustedHeight)}ft`,
      })
    ];
    
    newLabels.forEach(label => label.open(map));
    setDimensionLabels(newLabels);
  };

  // Function to create setback overlays
  const createSetbackOverlays = (polygon: google.maps.Polygon) => {
    // Clear existing overlays
    setbackOverlays.forEach(overlay => overlay.setMap(null));
    dimensionLabels.forEach(label => label.setMap(null));
    if (maxRectangle) maxRectangle.setMap(null);
    
    const path = polygon.getPath();
    const points = path.getArray();
    const setbackDistance = 0.00015; // Roughly 15 feet in lat/lng

    // Create setback polygon points
    const setbackPoints: google.maps.LatLng[] = [];
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const prev = points[(i - 1 + points.length) % points.length];

      // Calculate vectors
      const toPrev = {
        lat: prev.lat() - current.lat(),
        lng: prev.lng() - current.lng()
      };
      const toNext = {
        lat: next.lat() - current.lat(),
        lng: next.lng() - current.lng()
      };

      // Normalize vectors
      const lenPrev = Math.sqrt(toPrev.lat * toPrev.lat + toPrev.lng * toPrev.lng);
      const lenNext = Math.sqrt(toNext.lat * toNext.lat + toNext.lng * toNext.lng);
      
      const normPrev = {
        lat: toPrev.lat / lenPrev,
        lng: toPrev.lng / lenPrev
      };
      const normNext = {
        lat: toNext.lat / lenNext,
        lng: toNext.lng / lenNext
      };

      // Calculate bisector
      const bisector = {
        lat: -(normPrev.lat + normNext.lat),
        lng: -(normPrev.lng + normNext.lng)
      };
      
      // Normalize bisector
      const lenBisector = Math.sqrt(bisector.lat * bisector.lat + bisector.lng * bisector.lng);
      const normBisector = {
        lat: bisector.lat / lenBisector,
        lng: bisector.lng / lenBisector
      };

      // Add setback point
      setbackPoints.push(new google.maps.LatLng(
        current.lat() + normBisector.lat * setbackDistance,
        current.lng() + normBisector.lng * setbackDistance
      ));
    }

    // Create setback polygon
    const setbackPolygon = new google.maps.Polygon({
      paths: [points, setbackPoints],
      map,
      fillColor: '#FF5252',
      fillOpacity: 0.2,
      strokeWeight: 0
    });
    
    setSetbackOverlays([setbackPolygon]);

    // Find and show largest buildable rectangle
    findLargestRectangle(polygon);
  };

  return (
    <DrawingManager
      onLoad={setDrawingManager}
      options={{
        drawingControl: false, // We'll use our own UI controls
        polygonOptions: {
          fillColor: '#4299e1',
          fillOpacity: 0.3,
          strokeColor: '#3182ce',
          strokeWeight: 2,
          clickable: true,
          editable: true,
          draggable: true,
          zIndex: 1,
        },
        polylineOptions: {
          strokeColor: '#3182ce',
          strokeWeight: 3,
          clickable: true,
          editable: true,
          draggable: true,
          zIndex: 1,
        },
      }}
      onPolygonComplete={(polygon) => {
        if (propertyBounds) {
          propertyBounds.setMap(null);
        }
        setPropertyBounds(polygon);
        createSetbackOverlays(polygon);
        onShapeComplete?.(polygon);

        // Add polygon edit listeners
        google.maps.event.addListener(polygon.getPath(), 'set_at', () => {
          createSetbackOverlays(polygon);
        });
        google.maps.event.addListener(polygon.getPath(), 'insert_at', () => {
          createSetbackOverlays(polygon);
        });
      }}
      onPolylineComplete={(polyline) => {
        onShapeComplete?.(polyline);
      }}
    />
  );
};

export default DrawingTools;
