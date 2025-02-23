import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';

export interface MapMeasurement {
  area: number;      // in square meters
  perimeter: number; // in meters
}

export interface MapDrawingOptions {
  strokeColor: string;
  strokeOpacity: number;
  strokeWeight: number;
  fillColor: string;
  fillOpacity: number;
}

export interface MapToolState {
  isDrawing: boolean;
  activeTool: 'property' | 'adu' | 'measure' | null;
  measurements: MapMeasurement | null;
}
