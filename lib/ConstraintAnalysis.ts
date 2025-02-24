/// <reference types="@types/google.maps" />

export interface PropertyBoundary {
  coordinates: google.maps.LatLngLiteral[];
}

export interface Structure {
  type: string;
  coordinates: google.maps.LatLngLiteral[];
}

export interface Setbacks {
  coordinates: google.maps.LatLngLiteral[];
  front: number;
  back: number;
  left: number;
  right: number;
}

export interface BuildableArea {
  coordinates: google.maps.LatLngLiteral[];
  suitability: 'excellent' | 'good' | 'poor';
  notes: string[];
}

export interface ConstraintAnalysisResult {
  propertyBoundary: PropertyBoundary;
  structures: Structure[];
  setbacks: Setbacks;
  buildableAreas: BuildableArea[];
}

export interface ConstraintAnalysisRequest {
  image: string;  // Data URL from canvas.toDataURL()
  prompt: string;
  propertyCenter: google.maps.LatLngLiteral;
  zoomLevel: number;
}

export const constraintAnalysisPrompt = `Analyze this satellite image of a residential property and provide a JSON response with detailed information about its constraints and features. The response should follow this exact structure:

{
  "propertyBoundary": {
    "coordinates": [
      {"lat": number, "lng": number},
      // ... array of lat/lng points forming a closed polygon (first and last point should match)
    ]
  },
  "structures": [
    {
      "type": "main_house" | "garage" | "pool" | "shed",
      "coordinates": [
        {"lat": number, "lng": number},
        // ... array of lat/lng points forming a closed polygon
      ]
    }
    // ... array of all structures
  ],
  "setbacks": {
    "coordinates": [
      {"lat": number, "lng": number},
      // ... array of lat/lng points forming the setback polygon
    ],
    "front": number,  // feet
    "back": number,   // feet
    "left": number,   // feet
    "right": number   // feet
  },
  "buildableAreas": [
    {
      "coordinates": [
        {"lat": number, "lng": number},
        // ... array of lat/lng points forming a closed polygon
      ],
      "suitability": "excellent" | "good" | "poor",
      "notes": [
        // ... array of strings describing advantages/challenges
      ]
    }
    // ... array of potential buildable areas
  ]
}

Important:
1. All coordinates must be in decimal degrees (latitude/longitude)
2. All measurements must be in feet
3. Each polygon (property, structures, setbacks, buildable areas) must be closed - first and last point should match
4. Coordinates should be ordered clockwise starting from the northwest corner
5. Response MUST be valid JSON that matches this exact structure

Analyze the image and provide the coordinates and measurements in this JSON format.`;

export async function analyzeConstraints(request: ConstraintAnalysisRequest): Promise<ConstraintAnalysisResult> {
  const response = await fetch('/api/vision/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: request.image,
      prompt: request.prompt,
      propertyCenter: request.propertyCenter,
      zoomLevel: request.zoomLevel,
      type: 'constraints'
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze constraints');
  }

  const data = await response.json();
  return data.processed;
}
