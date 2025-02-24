    /// <reference types="@types/google.maps" />
import { FC, useEffect, useRef } from 'react';

interface ConstraintLayerProps {
  map: google.maps.Map;
  constraintAnalysis: {
    property_boundaries: Array<{
      coordinates: Array<google.maps.LatLngLiteral>
    }>,
    structures: Array<{
      type: string,
      coordinates: Array<google.maps.LatLngLiteral>
    }>
  };
  onConstraintsReady?: (buildableArea: number) => void;
}

interface Constraint {
  polygon: google.maps.Polygon;
  type: 'property' | 'structure';
  area: number;
  coordinates: google.maps.LatLngLiteral[];
}

const ConstraintLayer: FC<ConstraintLayerProps> = ({ map, constraintAnalysis, onConstraintsReady }) => {
  const constraints = useRef<Constraint[]>([]);

  const validateCoordinates = (coords: google.maps.LatLngLiteral[]): boolean => {
    if (!coords || coords.length < 3) {
      console.warn('Invalid coordinates: Less than 3 points');
      return false;
    }
    
    // Ensure coordinates form a valid polygon (first and last points should match)
    const path = coords.map(c => new google.maps.LatLng(c));
    if (path.length >= 3) {
      path.push(path[0]); // Close the polygon
    }
    
    return true;
  };

  const calculatePolygonArea = (coords: google.maps.LatLngLiteral[]): number => {
    if (!coords || coords.length < 3) return 0;
    
    const path = coords.map(c => new google.maps.LatLng(c));
    // Close the polygon if not already closed
    if (path.length >= 3 && !path[0].equals(path[path.length - 1])) {
      path.push(path[0]);
    }
    
    return google.maps.geometry?.spherical?.computeArea(path) || 0;
  };

  const createPolygon = (coords: google.maps.LatLngLiteral[], type: Constraint['type']): Constraint | null => {
    if (!validateCoordinates(coords)) return null;

    const color = {
      property: '#0066FF',  // Blue for property
      structure: '#FF4444'  // Red for structures
    }[type];

    // Create a closed polygon path
    const path = coords.map(c => new google.maps.LatLng(c));
    if (path.length >= 3 && !path[0].equals(path[path.length - 1])) {
      path.push(path[0]);
    }

    const polygon = new google.maps.Polygon({
      paths: path,
      strokeColor: color,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: type === 'property' ? 0.2 : 0.4,
      map
    });

    const area = calculatePolygonArea(coords);
    console.log(`Created ${type} polygon with area: ${area.toFixed(2)} sq meters`);

    return {
      polygon,
      type,
      area,
      coordinates: coords
    };
  };

  useEffect(() => {
    // Clear existing polygons
    constraints.current.forEach(constraint => {
      constraint.polygon.setMap(null);
    });
    constraints.current = [];

    try {
      // Create property boundary
      if (constraintAnalysis.property_boundaries?.[0]) {
        const propertyCoords = constraintAnalysis.property_boundaries[0].coordinates;
        const propertyConstraint = createPolygon(propertyCoords, 'property');
        if (propertyConstraint) {
          constraints.current.push(propertyConstraint);
          console.log('Property boundary created:', {
            coordinates: propertyCoords,
            area: propertyConstraint.area
          });
        }
      }

      // Create structure polygons
      constraintAnalysis.structures?.forEach((structure, index) => {
        const structureConstraint = createPolygon(structure.coordinates, 'structure');
        if (structureConstraint) {
          constraints.current.push(structureConstraint);
          console.log(`Structure ${index + 1} (${structure.type}) created:`, {
            coordinates: structure.coordinates,
            area: structureConstraint.area
          });
        }
      });

      // Calculate buildable area
      const propertyArea = constraints.current.find(c => c.type === 'property')?.area || 0;
      const structureAreas = constraints.current
        .filter(c => c.type === 'structure')
        .reduce((total, structure) => total + structure.area, 0);

      const buildableArea = Math.max(0, propertyArea - structureAreas);
      
      console.log('Area calculations:', {
        propertyArea: propertyArea.toFixed(2),
        structureAreas: structureAreas.toFixed(2),
        buildableArea: buildableArea.toFixed(2)
      });

      onConstraintsReady?.(buildableArea);
    } catch (error) {
      console.error('Error creating constraint polygons:', error);
    }

    return () => {
      constraints.current.forEach(constraint => {
        constraint.polygon.setMap(null);
      });
    };
  }, [map, constraintAnalysis, onConstraintsReady]);

  return null;
};

export default ConstraintLayer;
