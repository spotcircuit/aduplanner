import { FC, useEffect, useState } from 'react';
import { Polygon } from '@react-google-maps/api';
import { PropertyAnalysisResult } from '@/lib/visionAnalysis';

interface BuildableAreasProps {
  analysis: PropertyAnalysisResult;
  map: google.maps.Map | null;
}

interface AreaPolygon {
  path: google.maps.LatLngLiteral[];
  color: string;
  opacity: number;
  label?: string;
}

const BuildableAreas: FC<BuildableAreasProps> = ({ analysis, map }) => {
  const [areas, setAreas] = useState<AreaPolygon[]>([]);

  useEffect(() => {
    if (!map || !analysis.buildableAreas) return;

    // Get the map's center and zoom level
    const center = map.getCenter();
    if (!center) return;

    // Calculate rough dimensions based on the map's bounds
    const bounds = map.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const width = Math.abs(ne.lng() - sw.lng());
    const height = Math.abs(ne.lat() - sw.lat());

    // Create polygons for each buildable area
    const newAreas: AreaPolygon[] = [];

    if (analysis.buildableAreas.backYard) {
      // Add back yard area (roughly 40% of the back of the property)
      newAreas.push({
        path: [
          { lat: center.lat() - height * 0.2, lng: center.lng() - width * 0.2 },
          { lat: center.lat() - height * 0.2, lng: center.lng() + width * 0.2 },
          { lat: center.lat() - height * 0.4, lng: center.lng() + width * 0.2 },
          { lat: center.lat() - height * 0.4, lng: center.lng() - width * 0.2 },
        ],
        color: '#4CAF50', // Green
        opacity: 0.35,
        label: 'Back Yard (Highly Suitable)'
      });
    }

    if (analysis.buildableAreas.sideYards) {
      // Add side yard areas (roughly 20% on each side)
      newAreas.push({
        path: [
          { lat: center.lat() + height * 0.2, lng: center.lng() - width * 0.4 },
          { lat: center.lat() + height * 0.2, lng: center.lng() - width * 0.2 },
          { lat: center.lat() - height * 0.2, lng: center.lng() - width * 0.2 },
          { lat: center.lat() - height * 0.2, lng: center.lng() - width * 0.4 },
        ],
        color: '#FFC107', // Yellow
        opacity: 0.35,
        label: 'Side Yard (Potentially Suitable)'
      });

      newAreas.push({
        path: [
          { lat: center.lat() + height * 0.2, lng: center.lng() + width * 0.2 },
          { lat: center.lat() + height * 0.2, lng: center.lng() + width * 0.4 },
          { lat: center.lat() - height * 0.2, lng: center.lng() + width * 0.4 },
          { lat: center.lat() - height * 0.2, lng: center.lng() + width * 0.2 },
        ],
        color: '#FFC107', // Yellow
        opacity: 0.35,
        label: 'Side Yard (Potentially Suitable)'
      });
    }

    // Add setback lines
    if (analysis.setbacks) {
      // TODO: Add setback visualization
    }

    setAreas(newAreas);
  }, [map, analysis]);

  return (
    <>
      {areas.map((area, index) => (
        <Polygon
          key={index}
          paths={area.path}
          options={{
            fillColor: area.color,
            fillOpacity: area.opacity,
            strokeColor: area.color,
            strokeOpacity: 0.8,
            strokeWeight: 2,
          }}
        />
      ))}
    </>
  );
};

export default BuildableAreas;
