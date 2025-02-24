export interface PropertyAnalysisResult {
  propertyType: 'single_family' | 'townhouse' | 'unknown';
  confidence: number;
  structures: Array<{
    type: string;
    condition: 'excellent' | 'good' | 'poor';
    location: string;
    notes: string[];
  }>;
  setbacks: {
    front: number;    // feet from front property line
    back: number;     // feet from back property line
    left: number;     // feet from left property line
    right: number;    // feet from right property line
    notes: string[];  // any special considerations
  };
  buildableAreas: Array<{
    location: string;
    suitability: 'excellent' | 'good' | 'poor';
    estimatedSize: string;
    advantages: string[];
    challenges: string[];
  }>;
  terrain: {
    description: string;
    concerns: string[];
    opportunities: string[];
  };
  access: {
    bestRoutes: string[];
    privacyFeatures: string[];
    challenges: string[];
  };
  constructionSuitability: {
    bestLocations: Array<{
      location: string;
      rating: 'excellent' | 'good' | 'poor';
      reasons: string[];
    }>;
    generalNotes: string[];
  };
}

export interface VisionAnalysisResponse {
  raw: string;
  processed: PropertyAnalysisResult;
}

export async function analyzePropertyImage(imageUrl: string): Promise<VisionAnalysisResponse> {
  console.log('Starting vision analysis...');
  try {
    console.log('Sending request to /api/vision/analyze');
    const response = await fetch('/api/vision/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response text:', responseText);

    if (!response.ok) {
      throw new Error(`Vision analysis failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Validate the response shape
    if (!result.processed || !result.processed.structures || !result.processed.setbacks || !result.processed.buildableAreas || !result.processed.terrain || !result.processed.access || !result.processed.constructionSuitability) {
      console.error('Invalid response structure:', result);
      throw new Error('Invalid response structure from vision analysis');
    }

    return result;
  } catch (error) {
    console.error('Error in analyzePropertyImage:', error);
    // Return a default result on error
    return {
      raw: '',
      processed: {
        propertyType: 'unknown',
        confidence: 0,
        structures: [],
        setbacks: {
          front: 0,
          back: 0,
          left: 0,
          right: 0,
          notes: []
        },
        buildableAreas: [],
        terrain: {
          description: '',
          concerns: [],
          opportunities: []
        },
        access: {
          bestRoutes: [],
          privacyFeatures: [],
          challenges: []
        },
        constructionSuitability: {
          bestLocations: [],
          generalNotes: []
        }
      }
    };
  }
}

export async function validateADUPlacement(
  propertyImageUrl: string, 
  aduBounds: { x: number; y: number; width: number; height: number }
): Promise<{
  isValid: boolean;
  reasons: string[];
  suggestions: string[];
}> {
  try {
    const response = await fetch('/api/vision/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        imageUrl: propertyImageUrl,
        bounds: aduBounds
      }),
    });

    if (!response.ok) {
      throw new Error('Vision validation failed');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error validating ADU placement:', error);
    return {
      isValid: false,
      reasons: ['Error analyzing placement'],
      suggestions: []
    };
  }
}
