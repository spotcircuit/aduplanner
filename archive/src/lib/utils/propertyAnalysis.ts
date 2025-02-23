import type { PropertyBounds, PropertyDimensions, Setbacks, BuildableArea, ADULayout, PropertyAnalysis } from '@/types/property';

const FEET_PER_DEGREE_LAT = 364000;  // approximate feet per degree of latitude
const FEET_PER_DEGREE_LNG = 288200;  // approximate feet per degree of longitude at 40° latitude

interface ADUTemplate {
  readonly width: number;
  readonly length: number;
  readonly style: string;
  readonly minLotSize: number;
}

const ADU_TEMPLATES: ReadonlyArray<ADUTemplate> = [
  { width: 6.096, length: 6.096, style: 'studio', minLotSize: 37.16 }, // 20x20 ft, min 400 sq ft lot
  { width: 7.315, length: 9.144, style: '1bed', minLotSize: 55.74 }, // 24x30 ft, min 600 sq ft lot
  { width: 9.144, length: 9.144, style: '2bed', minLotSize: 74.32 }, // 30x30 ft, min 800 sq ft lot
];

// TODO: This is a prototype. For production, we need to integrate with:
// 1. Local zoning APIs for each city/county
// 2. State-level ADU regulations
// 3. Property records and deed restrictions
// 4. Environmental and historic district data

export async function analyzePropertyByAddress(address: string) {
  // PROTOTYPE ONLY - Replace with real API calls
  console.warn('Using prototype analysis - real implementation needs zoning API integration');
  
  // Extract location data
  const zipCode = address.match(/\b\d{5}\b/)?.[0] || '';
  const state = 'UNKNOWN'; // TODO: Get from geocoding API
  const city = 'UNKNOWN'; // TODO: Get from geocoding API
  
  // Mock zoning lookup - REPLACE with real API calls
  const mockZoningData = {
    isEligible: false, // Default to false until we can verify with real data
    zoning: 'UNKNOWN',
    maxSize: 0,
    restrictions: [
      'PROTOTYPE ONLY - Actual eligibility requires:',
      '- Local zoning verification',
      '- State ADU regulations check',
      '- Property deed/HOA restrictions',
      '- Environmental zone verification',
      '- Historic district status'
    ]
  };

  // Check for obvious disqualifiers
  const isTownhouse = address.toLowerCase().includes('townhouse') || 
                     address.toLowerCase().includes('unit') ||
                     address.toLowerCase().includes('apt') ||
                     address.toLowerCase().includes('#');

  if (isTownhouse) {
    mockZoningData.restrictions.push(
      'Property appears to be a townhouse/condo which may have restrictions:',
      '- Check HOA/condo association rules',
      '- Verify property type with local records',
      '- Check shared wall agreements',
      '- Verify separate utility feasibility'
    );
  }

  // Add location-specific notes
  mockZoningData.restrictions.push(
    `Need to verify rules for:`,
    `- State: ${state}`,
    `- City/County: ${city}`,
    `- Zip Code: ${zipCode}`,
    '- Local zoning district'
  );

  return mockZoningData;
}

export function calculatePropertyDimensions(bounds: PropertyBounds): PropertyDimensions {
  // Convert lat/lng to approximate meters
  const metersPerDegLat = 111320; // at equator
  const metersPerDegLng = 111320 * Math.cos((bounds.north + bounds.south) / 2 * Math.PI / 180);
  
  const width = Math.abs(bounds.east - bounds.west) * metersPerDegLng;
  const length = Math.abs(bounds.north - bounds.south) * metersPerDegLat;
  const area = width * length;

  return { width, length, area };
}

export function getLocalSetbacks(zipCode: string): Setbacks {
  // TODO: Fetch actual setbacks from zoning database
  return {
    front: 7.62, // 25 feet in meters
    back: 7.62,
    left: 3.048, // 10 feet in meters
    right: 3.048
  };
}

export function getBuildableArea(bounds: PropertyBounds, dimensions: PropertyDimensions, setbacks: Setbacks): BuildableArea {
  const buildableWidth = dimensions.width - (setbacks.left + setbacks.right);
  const buildableLength = dimensions.length - (setbacks.front + setbacks.back);
  const buildableArea = buildableWidth * buildableLength;

  // Calculate buildable bounds (reduced by setbacks)
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((bounds.north + bounds.south) / 2 * Math.PI / 180);

  const buildableBounds = {
    north: bounds.north - (setbacks.front / metersPerDegLat),
    south: bounds.south + (setbacks.back / metersPerDegLat),
    east: bounds.east - (setbacks.right / metersPerDegLng),
    west: bounds.west + (setbacks.left / metersPerDegLng)
  };

  return {
    width: buildableWidth,
    length: buildableLength,
    area: buildableArea,
    bounds: buildableBounds
  };
}

export async function analyzeProperty(
  bounds: PropertyBounds,
  dimensions: PropertyDimensions,
  zipCode: string
): Promise<PropertyAnalysis> {
  const setbacks = getLocalSetbacks(zipCode);
  const buildableArea = getBuildableArea(bounds, dimensions, setbacks);

  // TODO: Fetch actual zoning information
  const zoning = {
    code: "R-1",
    allowsADU: true,
    maxSize: 111.48, // 1200 sq ft in meters
    maxHeight: 6.096 // 20 feet in meters
  };

  const isQualified = 
    buildableArea.area >= 37.16 && // Minimum 400 sq ft
    dimensions.area >= 371.6 && // Minimum 4000 sq ft lot
    zoning.allowsADU;

  const reasons = [];
  const recommendations = [];

  if (buildableArea.area >= 37.16) {
    reasons.push("✓ Buildable area meets minimum requirements");
  } else {
    reasons.push("✗ Buildable area is too small");
  }

  if (dimensions.area >= 371.6) {
    reasons.push("✓ Lot size meets minimum requirements");
  } else {
    reasons.push("✗ Lot is too small");
  }

  if (zoning.allowsADU) {
    reasons.push("✓ Zoning permits ADU development");
  } else {
    reasons.push("✗ Zoning does not permit ADUs");
  }

  // Add recommendations based on property characteristics
  if (buildableArea.area > 74.32) { // > 800 sq ft
    recommendations.push("Consider a larger ADU design for maximum utility");
  } else {
    recommendations.push("Optimize layout for efficient use of limited space");
  }

  if (buildableArea.width > buildableArea.length) {
    recommendations.push("Wide lot suggests horizontal ADU orientation");
  } else {
    recommendations.push("Deep lot suggests vertical ADU orientation");
  }

  recommendations.push(
    "Plan for separate utility connections",
    "Consider solar orientation for energy efficiency",
    "Design for privacy between main house and ADU"
  );

  return {
    isQualified,
    reasons,
    recommendations,
    propertyDetails: {
      dimensions,
      setbacks,
      buildableArea,
      zoning
    }
  };
}

export function generateADULayouts(buildableArea: BuildableArea): ReadonlyArray<ADULayout> {
  const layouts: ADULayout[] = [];
  
  // Check if we have enough buildable area for the smallest ADU template
  const minTemplateArea = Math.min(...ADU_TEMPLATES.map(t => t.width * t.length));
  
  if (buildableArea.area < minTemplateArea) {
    return layouts;
  }

  // Try each ADU template
  for (const template of ADU_TEMPLATES) {
    // Check if template fits within buildable area
    if (buildableArea.width >= template.width && buildableArea.length >= template.length) {
      // Try horizontal orientation
      layouts.push({
        width: template.width,
        length: template.length,
        area: template.width * template.length,
        position: {
          x: buildableArea.bounds.west + (buildableArea.width - template.width) / 2,
          y: buildableArea.bounds.south + (buildableArea.length - template.length) / 2
        },
        orientation: 'horizontal',
        style: template.style
      });

      // Try vertical orientation if dimensions are different
      if (template.width !== template.length) {
        layouts.push({
          width: template.length,
          length: template.width,
          area: template.width * template.length,
          position: {
            x: buildableArea.bounds.west + (buildableArea.width - template.length) / 2,
            y: buildableArea.bounds.south + (buildableArea.length - template.width) / 2
          },
          orientation: 'vertical',
          style: template.style
        });
      }
    }
  }

  return Object.freeze(layouts);
}
