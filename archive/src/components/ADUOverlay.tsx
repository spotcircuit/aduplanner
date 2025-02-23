'use client';

import { useEffect, useState, type FC } from 'react';
import type { ADULayout } from '@/types/property';

interface ADUOverlayProps {
  map: google.maps.Map | null;
  layout: ADULayout;
}

const ADUOverlay: FC<ADUOverlayProps> = ({ map, layout }) => {
  const [overlay, setOverlay] = useState<google.maps.Rectangle | null>(null);

  useEffect(() => {
    if (!map) return undefined;

    // Remove existing overlay
    if (overlay) {
      overlay.setMap(null);
    }

    // Convert layout dimensions from feet to degrees
    const FEET_PER_DEGREE_LAT = 364000;
    const FEET_PER_DEGREE_LNG = 288200;
    
    const widthDegrees = layout.width / FEET_PER_DEGREE_LNG;
    const depthDegrees = layout.depth / FEET_PER_DEGREE_LAT;

    // Calculate rectangle bounds based on position and dimensions
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(
        layout.position.lat - (depthDegrees / 2),
        layout.position.lng - (widthDegrees / 2)
      ),
      new google.maps.LatLng(
        layout.position.lat + (depthDegrees / 2),
        layout.position.lng + (widthDegrees / 2)
      )
    );

    // Create new rectangle overlay
    const newOverlay = new google.maps.Rectangle({
      bounds: bounds,
      map: map,
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      rotation: layout.rotation,
      editable: false,
      draggable: true,
    });

    setOverlay(newOverlay);

    return () => {
      if (newOverlay) {
        newOverlay.setMap(null);
      }
    };
  }, [map, layout, overlay]);

  return null;
};

export default ADUOverlay;
