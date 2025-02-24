import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { constraintAnalysisPrompt } from '@/lib/ConstraintAnalysis';
import type { ConstraintAnalysisRequest } from '@/lib/ConstraintAnalysis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION_ID,
});

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, image, prompt, propertyCenter, zoomLevel, type = 'general' }: ConstraintAnalysisRequest & { imageUrl?: string; type?: string } = await request.json();

    // Support both imageUrl and image (data URL) formats
    const finalImageUrl = imageUrl || image;
    if (!finalImageUrl) {
      return NextResponse.json(
        { error: 'Image URL or data URL is required' },
        { status: 400 }
      );
    }

    let finalPrompt;
    if (type === 'constraints') {
      finalPrompt = `${prompt || 'Analyze this property for ADU placement constraints'}\n\n${constraintAnalysisPrompt}\n\nThe image is centered at ${propertyCenter.lat}, ${propertyCenter.lng} with zoom level ${zoomLevel}.`;
    } else {
      finalPrompt = `Analyze this satellite image and identify features that would impact ADU construction that aren't visible in standard mapping data. Focus on qualitative assessment and visual identification:

1. Existing Structures:
   - Identify and classify all structures (house, garage, shed, pool, etc.)
   - Assess their condition (excellent, good, poor)
   - Note any obvious modifications or temporary structures
   - Describe their locations relative to property boundaries

2. Setbacks & Buildable Areas:
   - Estimate actual setback distances from property lines (in feet)
   - Identify any visible easements or right-of-ways
   - Note any areas that appear off-limits for construction
   - Identify potential buildable areas and their approximate sizes

3. Terrain & Drainage:
   - Describe ground conditions and slopes
   - Identify any visible drainage patterns or issues
   - Note any retaining walls or grade changes
   - List both concerns and opportunities for construction

4. Access & Privacy:
   - Identify best construction access routes
   - List existing privacy features (fences, trees)
   - Note any access challenges
   - Consider neighbor sight lines and privacy impacts

5. Construction Suitability:
   - Rate potential ADU locations (excellent, good, poor)
   - Explain why each location is rated that way
   - Note any visible utilities or constraints
   - Add any general construction notes

Return ONLY the JSON with no markdown formatting or backticks. The response must be valid JSON that can be parsed directly:
{
  "structures": [
    {
      "type": string,
      "condition": "excellent" | "good" | "poor",
      "location": string,
      "notes": string[]
    }
  ],
  "setbacks": {
    "front": number,
    "back": number,
    "left": number,
    "right": number,
    "notes": string[]
  },
  "buildableAreas": [
    {
      "location": string,
      "suitability": "excellent" | "good" | "poor",
      "estimatedSize": string,
      "advantages": string[],
      "challenges": string[]
    }
  ],
  "terrain": {
    "description": string,
    "concerns": string[],
    "opportunities": string[]
  },
  "access": {
    "bestRoutes": string[],
    "privacyFeatures": string[],
    "challenges": string[]
  },
  "constructionSuitability": {
    "bestLocations": [
      {
        "location": string,
        "rating": "excellent" | "good" | "poor",
        "reasons": string[]
      }
    ],
    "generalNotes": string[]
  }
}`;
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL!,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: finalPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: finalImageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: type === 'constraints' ? 4096 : 1500,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No analysis generated" }, { status: 500 });
    }

    try {
      // First try direct JSON parse
      const parsed = JSON.parse(content);
      
      // Process the response based on type
      const processed = {
        propertyBoundary: parsed.property_boundary || parsed.propertyBoundary,
        structures: parsed.structures || [],
        setbacks: parsed.setbacks || [],
        buildableAreas: parsed.buildable_areas || parsed.buildableAreas || []
      };

      if (type === 'constraints') {
        // Transform constraint analysis into vision analysis format
        const transformed = {
          structures: processed.structures.map((s: any) => ({
            type: s.type,
            condition: 'good', // Default since constraints don't specify condition
            location: `Located at coordinates (${s.coordinates[0].lat}, ${s.coordinates[0].lng})`,
            notes: []
          })),
          setbacks: {
            front: processed.setbacks.front,
            back: processed.setbacks.back,
            left: processed.setbacks.left,
            right: processed.setbacks.right,
            notes: []
          },
          buildableAreas: processed.buildableAreas.map((b: any) => ({
            location: `Area at coordinates (${b.coordinates[0].lat}, ${b.coordinates[0].lng})`,
            suitability: b.suitability,
            estimatedSize: 'TBD', // We could calculate this from coordinates
            advantages: [],
            challenges: b.notes
          })),
          terrain: {
            description: 'Analysis focused on property boundaries and setbacks',
            concerns: [],
            opportunities: []
          },
          access: {
            bestRoutes: [],
            privacyFeatures: [],
            challenges: []
          },
          constructionSuitability: {
            bestLocations: processed.buildableAreas.map((b: any) => ({
              location: `Area at coordinates (${b.coordinates[0].lat}, ${b.coordinates[0].lng})`,
              rating: b.suitability,
              reasons: b.notes
            })),
            generalNotes: []
          }
        };

        return NextResponse.json({
          raw: content,
          processed: transformed
        });
      }

      // Return general analysis as is
      return NextResponse.json({
        raw: content,
        processed: parsed
      });
    } catch (parseError) {
      // If direct parse fails, try to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Response content:', content);
        throw new Error('No JSON found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Process the response based on type
      const processed = {
        propertyBoundary: parsed.property_boundary || parsed.propertyBoundary,
        structures: parsed.structures || [],
        setbacks: parsed.setbacks || [],
        buildableAreas: parsed.buildable_areas || parsed.buildableAreas || []
      };

      if (type === 'constraints') {
        // Transform constraint analysis into vision analysis format
        const transformed = {
          structures: processed.structures.map((s: any) => ({
            type: s.type,
            condition: 'good', // Default since constraints don't specify condition
            location: `Located at coordinates (${s.coordinates[0].lat}, ${s.coordinates[0].lng})`,
            notes: []
          })),
          setbacks: {
            front: processed.setbacks.front,
            back: processed.setbacks.back,
            left: processed.setbacks.left,
            right: processed.setbacks.right,
            notes: []
          },
          buildableAreas: processed.buildableAreas.map((b: any) => ({
            location: `Area at coordinates (${b.coordinates[0].lat}, ${b.coordinates[0].lng})`,
            suitability: b.suitability,
            estimatedSize: 'TBD', // We could calculate this from coordinates
            advantages: [],
            challenges: b.notes
          })),
          terrain: {
            description: 'Analysis focused on property boundaries and setbacks',
            concerns: [],
            opportunities: []
          },
          access: {
            bestRoutes: [],
            privacyFeatures: [],
            challenges: []
          },
          constructionSuitability: {
            bestLocations: processed.buildableAreas.map((b: any) => ({
              location: `Area at coordinates (${b.coordinates[0].lat}, ${b.coordinates[0].lng})`,
              rating: b.suitability,
              reasons: b.notes
            })),
            generalNotes: []
          }
        };

        return NextResponse.json({
          raw: content,
          processed: transformed
        });
      }

      // Return general analysis as is
      return NextResponse.json({
        raw: content,
        processed: parsed
      });
    }

  } catch (error: any) {
    console.error('Vision analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Vision analysis failed' },
      { status: 500 }
    );
  }
}
