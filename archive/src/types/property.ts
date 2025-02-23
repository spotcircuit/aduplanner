export interface PropertyBounds {
  readonly north: number;
  readonly south: number;
  readonly east: number;
  readonly west: number;
}

export interface PropertyDimensions {
  readonly width: number;  // in feet
  readonly depth: number;  // in feet
  readonly area: number;   // in square feet
}

export interface Setbacks {
  readonly front: number;
  readonly back: number;
  readonly left: number;
  readonly right: number;
}

export interface BuildableArea {
  readonly bounds: PropertyBounds;
  readonly dimensions: PropertyDimensions;
  readonly setbacks: Setbacks;
}

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

export interface ADULayout {
  readonly width: number;      // in feet
  readonly depth: number;      // in feet
  readonly position: LatLng;
  readonly rotation: 0 | 90 | 180 | 270;  // in degrees
  readonly style: 'modern' | 'traditional' | 'studio';
  readonly squareFootage: number;  // in square feet
}

// Ensure all numeric values are within reasonable bounds
export function validatePropertyBounds(bounds: PropertyBounds): boolean {
  return (
    bounds.north > bounds.south &&
    bounds.east > bounds.west &&
    Math.abs(bounds.north) <= 90 &&
    Math.abs(bounds.south) <= 90 &&
    Math.abs(bounds.east) <= 180 &&
    Math.abs(bounds.west) <= 180
  );
}

export function validateDimensions(dimensions: PropertyDimensions): boolean {
  return (
    dimensions.width > 0 &&
    dimensions.depth > 0 &&
    dimensions.area === dimensions.width * dimensions.depth
  );
}

export function validateSetbacks(setbacks: Setbacks): boolean {
  return (
    setbacks.front >= 0 &&
    setbacks.back >= 0 &&
    setbacks.left >= 0 &&
    setbacks.right >= 0
  );
}

export function validateLatLng(position: LatLng): boolean {
  return (
    Math.abs(position.lat) <= 90 &&
    Math.abs(position.lng) <= 180
  );
}

export interface PropertyBoundsAnalysis {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface PropertyDimensionsAnalysis {
  width: number;
  length: number;
  area: number;
}

export interface SetbacksAnalysis {
  front: number;
  back: number;
  left: number;
  right: number;
}

export interface BuildableAreaAnalysis {
  width: number;
  length: number;
  area: number;
  bounds: PropertyBoundsAnalysis;
}

export interface ADULayoutAnalysis {
  width: number;
  length: number;
  area: number;
  position: {
    x: number;
    y: number;
  };
  orientation: 'horizontal' | 'vertical';
}

export interface PropertyAnalysis {
  isQualified: boolean;
  reasons: string[];
  recommendations: string[];
  propertyDetails: {
    dimensions: PropertyDimensionsAnalysis;
    setbacks: SetbacksAnalysis;
    buildableArea: BuildableAreaAnalysis;
    zoning: {
      code: string;
      allowsADU: boolean;
      maxSize: number;
      maxHeight: number;
    };
  };
}
