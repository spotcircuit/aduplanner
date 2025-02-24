'use client';

import { FC } from 'react';
import { BuildingTemplate } from '@/types/building';
import { Polygon } from '@react-google-maps/api';

interface StructureVisualizerProps {
  template: BuildingTemplate;
  position: google.maps.LatLngLiteral;
  rotation?: number;
}

const StructureVisualizer: FC<StructureVisualizerProps> = ({
  template,
  position,
  rotation = 0
}) => {
  // Convert feet to approximate latitude/longitude deltas
  // This is a rough approximation - 1 degree latitude ≈ 364,000 feet
  const latFeetToDegrees = (feet: number) => feet / 364000;
  const lngFeetToDegrees = (feet: number) => feet / (364000 * Math.cos(position.lat * Math.PI / 180));

  // Calculate the corners of the rectangle
  const getCorners = () => {
    const halfWidth = template.width / 2;
    const halfLength = template.length / 2;
    
    // Calculate unrotated corners in lat/lng
    const corners = [
      { // NW
        lat: position.lat + latFeetToDegrees(halfWidth),
        lng: position.lng - lngFeetToDegrees(halfLength)
      },
      { // NE
        lat: position.lat + latFeetToDegrees(halfWidth),
        lng: position.lng + lngFeetToDegrees(halfLength)
      },
      { // SE
        lat: position.lat - latFeetToDegrees(halfWidth),
        lng: position.lng + lngFeetToDegrees(halfLength)
      },
      { // SW
        lat: position.lat - latFeetToDegrees(halfWidth),
        lng: position.lng - lngFeetToDegrees(halfLength)
      }
    ];

    // If there's rotation, apply it
    if (rotation !== 0) {
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      
      return corners.map(corner => {
        const dx = corner.lng - position.lng;
        const dy = corner.lat - position.lat;
        return {
          lat: position.lat + (dy * cos - dx * sin),
          lng: position.lng + (dx * cos + dy * sin)
        };
      });
    }

    return corners;
  };

  const corners = getCorners();

  return (
    <Polygon
      paths={[...corners, corners[0]]} // Close the polygon
      options={{
        strokeColor: template.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: template.color,
        fillOpacity: 0.35,
        draggable: true,
        editable: true,
        zIndex: 2 // Above property boundary
      }}
    />
  );
};

export default StructureVisualizer;
