import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION_ID,
});

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini-2024-07-18",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this satellite image of a property and provide a detailed assessment for ADU planning with a focus on ADA compliance:

1. Property Analysis:
   - Property type (single family, townhouse, etc.)
   - Lot size and shape
   - Terrain features (slopes, grade changes)
   - Cardinal directions (for solar considerations)

2. Existing Structures and Features:
   - Main house location and approximate size
   - Other structures (garages, sheds, etc.)
   - Pool, patio, or deck areas
   - Driveways and parking areas
   - Trees and significant landscaping
   - Areas not suitable for construction (e.g., existing amenities like pools, designated easements, or other restricted zones)

3. Setback and Buildable Area Analysis:
   - Identify front, back, and side yard areas
   - Estimate setback distances from property lines
   - Note any easements or right-of-ways visible
   - Calculate approximate buildable area sizes
   - Highlight areas that are off-limits or otherwise restricted

4. ADA Compliance Considerations:
   - Evaluate general accessibility of potential ADU locations (e.g., flat vs. sloped terrain)
   - Identify possible entry points or pathways that could accommodate ramps or wheelchair-accessible walkways
   - Note any existing features that could impact ADA compliance (e.g., steps, steep grades, narrow side yards)
   - **EstimatedADACompliance**: Provide a rough percentage or confidence level indicating how feasible it is to achieve ADA compliance on this property

5. ADU Placement Considerations:
   - Identify optimal locations for ADU placement, factoring in ADA requirements
   - Note any obstacles or constraints (utilities, drainage, etc.)
   - Assess privacy factors relative to neighbors
   - Consider access paths from street/driveway that could be made ADA-compliant

6. Measurements:
   - Provide all measurements in feet
   - Include rough dimensions of buildable areas
   - Estimate distances between structures
   - Indicate potential slopes or height differences that might affect ADA ramp design

Format your response as JSON with sections matching the categories above.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
    });

    return NextResponse.json(response.choices[0]?.message?.content || {});
  } catch (error: any) {
    console.error('Vision analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Vision analysis failed' },
      { status: 500 }
    );
  }
}
