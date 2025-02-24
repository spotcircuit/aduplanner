import type { PropertyBounds, PropertyDimensions, Setbacks, BuildableArea, ADULayout, PropertyAnalysis } from '@/types/property';
import { analyzePropertyImage, PropertyAnalysisResult } from './visionAnalysis';

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

interface ExtendedPlaceGeometry extends google.maps.places.PlaceGeometry {
  bounds?: google.maps.LatLngBounds;
}

export async function isEligiblePropertyType(placeDetails: google.maps.places.PlaceResult): Promise<{ eligible: boolean; reason?: string }> {
  // First try vision analysis if satellite image is available
  if (placeDetails.photos && placeDetails.photos.length > 0) {
    try {
      const photoUrl = placeDetails.photos[0].getUrl();
      const visionAnalysis = (await analyzePropertyImage(photoUrl)).processed;
      
      if (visionAnalysis.confidence > 0.8) {
        if (visionAnalysis.propertyType === 'townhouse') {
          return { 
            eligible: false, 
            reason: 'Property appears to be a townhouse based on satellite imagery analysis' 
          };
        }
        if (visionAnalysis.propertyType === 'single_family' && 
            visionAnalysis.buildableAreas.some(area => area.location === 'backyard')) {
          return { 
            eligible: true 
          };
        }
      }
    } catch (error) {
      console.error('Vision analysis failed:', error);
      // Fall back to traditional checks if vision fails
    }
  }

  // Fallback to traditional checks
  // Log all available metadata
  console.log('Full Place Details:', {
    address_components: placeDetails.address_components,
    adr_address: placeDetails.adr_address,
    business_status: placeDetails.business_status,
    formatted_address: placeDetails.formatted_address,
    geometry: placeDetails.geometry,
    icon: placeDetails.icon,
    name: placeDetails.name,
    photos: placeDetails.photos,
    place_id: placeDetails.place_id,
    plus_code: placeDetails.plus_code,
    rating: placeDetails.rating,
    reviews: placeDetails.reviews,
    types: placeDetails.types,
    url: placeDetails.url,
    utc_offset: placeDetails.utc_offset,
    vicinity: placeDetails.vicinity,
    website: placeDetails.website,
    html_attributions: placeDetails.html_attributions,
    utc_offset_minutes: placeDetails.utc_offset_minutes,
    price_level: placeDetails.price_level,
    opening_hours: placeDetails.opening_hours
  });

  // Log specific geometry details
  if (placeDetails.geometry) {
    console.log('Location Details:', {
      lat: placeDetails.geometry.location?.lat(),
      lng: placeDetails.geometry.location?.lng(),
      viewport: placeDetails.geometry.viewport,
      ...((placeDetails.geometry as ExtendedPlaceGeometry).bounds && {
        bounds: (placeDetails.geometry as ExtendedPlaceGeometry).bounds
      })
    });
  }

  // Log address component details
  if (placeDetails.address_components) {
    console.log('Address Components Breakdown:', placeDetails.address_components.map(comp => ({
      long_name: comp.long_name,
      short_name: comp.short_name,
      types: comp.types
    })));
  }

  const types = placeDetails.types || [];
  const addressComponents = placeDetails.address_components || [];

  // Enhanced debug logging
  console.log('Place Types:', types);
  console.log('Address Components:', addressComponents);
  console.log('Formatted Address:', placeDetails.formatted_address);
  console.log('Place Name:', placeDetails.name);

  // First check: Is it residential?
  const residentialTypes = ['single_family_dwelling', 'house', 'residential', 'premise', 'street_address'];
  const isResidential = types.some(type => residentialTypes.includes(type));
  
  console.log('Is Residential Check:', { isResidential, matchedTypes: types.filter(t => residentialTypes.includes(t)) });
  
  if (!isResidential) {
    return {
      eligible: false,
      reason: `Not a residential property. Found types: [${types.join(', ')}]`
    };
  }

  // Second check: What kind of residential?
  // Check for townhouse/rowhouse indicators
  const subpremise = addressComponents.find(comp => comp.types.includes('subpremise'));
  if (subpremise) {
    return {
      eligible: false,
      reason: 'Property is a townhouse/rowhouse (has unit number)'
    };
  }

  // Check for specific residential subtypes that aren't eligible
  const ineligibleResidentialTypes = [
    'townhouse',
    'row_house',
    'multi_family',
    'duplex',
    'triplex',
    'apartment',
    'condo'
  ];

  const foundIneligibleTypes = types.filter(type => ineligibleResidentialTypes.includes(type));
  if (foundIneligibleTypes.length > 0) {
    return {
      eligible: false,
      reason: `Property is not a detached single-family home. Type: ${foundIneligibleTypes.join(', ')}`
    };
  }

  // If it passed all checks, it's likely a detached single-family home
  return { eligible: true };
}

export async function analyzePropertyByAddress(address: string, placeDetails: google.maps.places.PlaceResult) {
  // First check property type eligibility
  const eligibilityCheck = await isEligiblePropertyType(placeDetails);
  if (!eligibilityCheck.eligible) {
    return {
      eligible: false,
      reason: eligibilityCheck.reason
    };
  }

  // Get vision analysis if available
  let visionAnalysis: PropertyAnalysisResult | null = null;
  if (placeDetails.photos && placeDetails.photos.length > 0) {
    try {
      const photoUrl = placeDetails.photos[0].getUrl();
      visionAnalysis = (await analyzePropertyImage(photoUrl)).processed;
    } catch (error) {
      console.error('Vision analysis failed:', error);
    }
  }

  const zipCode = address.match(/\b\d{5}\b/)?.[0] || '';
  
  return {
    eligible: true,
    address,
    placeDetails,
    visionAnalysis,
    zoning: 'R-1 (Single Family Residential)',
    maxSize: 111.48, // 1200 sq ft
    restrictions: [
      'Maximum height: 16 feet (4.88m)',
      'Must maintain 4 feet (1.22m) side and rear setbacks',
      'Cannot be placed in front yard',
      'Must have separate entrance from main dwelling'
    ],
    disclaimers: [
      'This is a preliminary analysis only. Please consult with local planning authorities.',
      'Additional restrictions may apply based on specific lot conditions.',
      'Building permits and inspections required.'
    ]
  };
}

export function calculatePropertyDimensions(bounds: PropertyBounds): PropertyDimensions {
  const width = Math.abs(bounds.ne.lng - bounds.sw.lng) * FEET_PER_DEGREE_LNG * 0.3048; // convert to meters
  const length = Math.abs(bounds.ne.lat - bounds.sw.lat) * FEET_PER_DEGREE_LAT * 0.3048; // convert to meters
  const area = width * length;
  
  return { width, length, area };
}

export function getLocalSetbacks(zipCode: string): Setbacks {
  // PROTOTYPE: Replace with actual zoning lookup
  return {
    front: 6.096, // 20 feet
    back: 1.524,  // 5 feet
    left: 1.524,  // 5 feet
    right: 1.524  // 5 feet
  };
}

export function getBuildableArea(bounds: PropertyBounds, dimensions: PropertyDimensions, setbacks: Setbacks): BuildableArea {
  // Calculate the buildable area by applying setbacks
  const latDiff = bounds.ne.lat - bounds.sw.lat;
  const lngDiff = bounds.ne.lng - bounds.sw.lng;
  
  const frontSetbackLat = (setbacks.front / FEET_PER_DEGREE_LAT) / 0.3048;
  const backSetbackLat = (setbacks.back / FEET_PER_DEGREE_LAT) / 0.3048;
  const leftSetbackLng = (setbacks.left / FEET_PER_DEGREE_LNG) / 0.3048;
  const rightSetbackLng = (setbacks.right / FEET_PER_DEGREE_LNG) / 0.3048;
  
  const buildableBounds: PropertyBounds = {
    sw: {
      lat: bounds.sw.lat + frontSetbackLat,
      lng: bounds.sw.lng + leftSetbackLng
    },
    ne: {
      lat: bounds.ne.lat - backSetbackLat,
      lng: bounds.ne.lng - rightSetbackLng
    }
  };
  
  const buildableDimensions = calculatePropertyDimensions(buildableBounds);
  
  return {
    bounds: buildableBounds,
    dimensions: buildableDimensions,
    setbacks
  };
}

export async function analyzeProperty(
  bounds: PropertyBounds,
  dimensions: PropertyDimensions,
  zipCode: string
): Promise<PropertyAnalysis> {
  // PROTOTYPE: Replace with actual zoning and property analysis
  const setbacks = getLocalSetbacks(zipCode);
  const buildableArea = getBuildableArea(bounds, dimensions, setbacks);
  const areaInSqFt = dimensions.area * 10.764; // convert to sq ft
  
  // Basic eligibility checks
  const isEligible = areaInSqFt >= 5000; // minimum lot size
  const maxSize = Math.min(1200, areaInSqFt * 0.24); // 1200 sq ft or 24% of lot size
  
  const analysis: PropertyAnalysis = {
    isEligible,
    zoning: 'R-1 (Single Family Residential)',
    maxSize: maxSize * 0.0929, // convert to square meters
    restrictions: [
      'Maximum height: 16 feet (4.88m)',
      'Must maintain 4 feet (1.22m) side and rear setbacks',
      'Cannot be placed in front yard',
      'Must have separate entrance from main dwelling'
    ],
    disclaimers: [
      'This is a preliminary analysis only. Please consult with local planning authorities.',
      'Additional restrictions may apply based on specific lot conditions.',
      'Building permits and inspections required.'
    ]
  };
  
  if (!isEligible) {
    analysis.ineligibilityReason = `Lot size (${Math.round(areaInSqFt)} sq ft) is below minimum requirement (5000 sq ft)`;
    return analysis;
  }
  
  analysis.buildableArea = buildableArea;
  analysis.suggestedLayouts = generateADULayouts(buildableArea);
  
  return analysis;
}

export function generateADULayouts(buildableArea: BuildableArea): ReadonlyArray<ADULayout> {
  const layouts: ADULayout[] = [];
  const { bounds, dimensions } = buildableArea;
  
  // Convert dimensions to square feet for comparison with templates
  const areaInSqFt = dimensions.area * 10.764;
  
  // Filter templates that would fit in the buildable area
  const viableTemplates = ADU_TEMPLATES.filter(template => {
    const templateAreaInSqM = template.width * template.length;
    return template.minLotSize <= areaInSqFt &&
           template.width <= dimensions.width &&
           template.length <= dimensions.length;
  });
  
  // For each viable template, generate possible positions
  viableTemplates.forEach(template => {
    // Center position
    const centerLat = (bounds.ne.lat + bounds.sw.lat) / 2;
    const centerLng = (bounds.ne.lng + bounds.sw.lng) / 2;
    
    layouts.push({
      width: template.width,
      length: template.length,
      style: template.style,
      position: { lat: centerLat, lng: centerLng }
    });
    
    // TODO: Add more sophisticated layout positioning logic
    // Consider factors like:
    // - Solar orientation
    // - Access paths
    // - Views
    // - Privacy
    // - Existing structures
  });
  
  return layouts;
}
