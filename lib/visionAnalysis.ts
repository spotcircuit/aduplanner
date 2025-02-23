export interface PropertyAnalysisResult {
  propertyType: 'single_family' | 'townhouse' | 'unknown';
  buildableAreas: {
    frontYard?: boolean;
    backYard?: boolean;
    sideYards?: boolean;
    estimatedSize: string;
  };
  setbacks: {
    front: number;
    back: number;
    sides: number[];
  };
  existingStructures: {
    type: string;
    location: string;
    approximateSize: string;
  }[];
  confidence: number;
}

export async function analyzePropertyImage(imageUrl: string): Promise<PropertyAnalysisResult> {
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
      throw new Error(`Vision analysis failed: ${response.status} ${responseText}`);
    }

    // Try to parse the response as JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      throw new Error('Invalid JSON response from vision analysis');
    }

    // Validate the response shape
    if (!result.propertyType || !result.buildableAreas || !result.setbacks) {
      console.error('Invalid response structure:', result);
      throw new Error('Invalid response structure from vision analysis');
    }

    return result as PropertyAnalysisResult;
  } catch (error) {
    console.error('Error in analyzePropertyImage:', error);
    // Return a default result on error
    return {
      propertyType: 'unknown',
      buildableAreas: {
        estimatedSize: 'unknown'
      },
      setbacks: {
        front: 0,
        back: 0,
        sides: [0, 0]
      },
      existingStructures: [],
      confidence: 0
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
