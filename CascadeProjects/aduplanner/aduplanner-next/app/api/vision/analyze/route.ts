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
      model: process.env.OPENAI_MODEL || "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this satellite image and identify features that would impact ADU construction that aren't visible in standard mapping data. Focus on qualitative assessment and visual identification:

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
}`
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
      max_tokens: 1500,
    });

    // Get the response content
    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No analysis generated" }, { status: 500 });
    }

    try {
      // Try to parse the content as JSON, removing any markdown formatting
      const cleanContent = content.replace(/^```json\n|\n```$/g, '');
      const analysisData = JSON.parse(cleanContent);

      // Validate the structure
      if (!analysisData.structures || !analysisData.setbacks || !analysisData.buildableAreas) {
        throw new Error("Invalid analysis structure");
      }

      // Return both raw and processed data
      return NextResponse.json({
        raw: content,
        processed: analysisData
      });
    } catch (error) {
      console.error("Error parsing analysis:", error);
      return NextResponse.json({ error: "Invalid analysis format" }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Vision analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Vision analysis failed' },
      { status: 500 }
    );
  }
}
