import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION_ID,
});

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, prompt, center, bounds, zoom, type = 'constraints' } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    let finalPrompt;
    if (type === 'property') {
      finalPrompt = `Analyze this satellite image and identify the 4 corners of the main property boundary.
      The image is centered at ${center.lat}, ${center.lng} with zoom level ${zoom}.
      The visible bounds are:
      North: ${bounds.north}
      South: ${bounds.south}
      East: ${bounds.east}
      West: ${bounds.west}

      Return ONLY the coordinates in this exact JSON format:
      {
        "corners": [
          {"lat": number, "lng": number},  // NW corner
          {"lat": number, "lng": number},  // NE corner
          {"lat": number, "lng": number},  // SE corner
          {"lat": number, "lng": number}   // SW corner
        ]
      }`;
    } else {
      // Append our format to the client's prompt
      const formatPrompt = ` Return the response in this exact format:
{
  "property_boundaries": [{
    "boundary_id": 1,
    "coordinates": [
      {"lat": number, "lng": number},  // top-left
      {"lat": number, "lng": number},  // top-right
      {"lat": number, "lng": number},  // bottom-right
      {"lat": number, "lng": number}   // bottom-left
    ]
  }],
  "structures": [{
    "structure_id": number,
    "type": "residential" | "pool" | "garage" | "shed",
    "coordinates": [
      {"lat": number, "lng": number},  // top-left
      {"lat": number, "lng": number},  // top-right
      {"lat": number, "lng": number},  // bottom-right
      {"lat": number, "lng": number}   // bottom-left
    ]
  }]
}`;

      finalPrompt = prompt + formatPrompt;
    }

    console.log('Client prompt:', prompt);
    console.log('Final combined prompt:', finalPrompt);

    console.log('Making OpenAI API call...');

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4-vision-preview",
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
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: type === 'property' ? 4096 : 1500,
      temperature: type === 'property' ? undefined : 0.2,
      response_format: type === 'property' ? undefined : { type: "json_object" }
    });

    // Get the response content
    const content = response.choices[0]?.message?.content;
    console.log('OpenAI Response Content:', content);

    if (!content) {
      console.error('No content in OpenAI response');
      return NextResponse.json({ error: "No analysis generated" }, { status: 500 });
    }

    try {
      // Try to parse the content as JSON, removing any markdown formatting
      console.log('Attempting to clean and parse content...');
      let cleanContent;
      if (type === 'property') {
        cleanContent = content;
      } else {
        cleanContent = content.replace(/^```json\n|\n```$/g, '');
      }
      console.log('Cleaned content:', cleanContent);
      
      let rawData;
      if (type === 'property') {
        rawData = JSON.parse(cleanContent);
      } else {
        rawData = JSON.parse(cleanContent);
      }
      console.log('Successfully parsed JSON. Transforming structure...');

      // Transform the data to match our expected format
      let transformedData;
      if (type === 'property') {
        transformedData = rawData;
      } else {
        transformedData = {
          property_boundaries: [{
            boundary_id: 1,
            coordinates: rawData.propertyBoundary.coordinates
          }],
          structures: rawData.structures.map((structure: any, index: number) => ({
            structure_id: index + 1,
            type: structure.type,
            coordinates: structure.coordinates
          }))
        };
      }

      console.log('Transformed data:', transformedData);

      // Return both raw and processed data
      return NextResponse.json(
        type === 'property' 
          ? rawData
          : { raw: content, processed: transformedData }
      );
    } catch (error) {
      console.error("Error parsing analysis:", error);
      return NextResponse.json({ error: "Invalid analysis format" }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Vision analysis error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    return NextResponse.json(
      { error: error.message || 'Vision analysis failed' },
      { status: 500 }
    );
  }
}
