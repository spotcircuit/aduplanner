import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION_ID,
});

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, bounds } = await request.json();

    if (!imageUrl || !bounds) {
      return NextResponse.json(
        { error: 'Image URL and bounds are required' },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-40-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Given this property image with a proposed ADU placement (marked in red rectangle):
              1. Is the placement valid according to typical setback requirements?
              2. Are there any issues with the location?
              3. What suggestions would you make for better placement?
              Format response as JSON with isValid (boolean), reasons (string[]), and suggestions (string[]).`
            },
            {
              type: "image_url",
              image_url: imageUrl,
            }
          ]
        }
      ],
      max_tokens: 1000,
    });

    return NextResponse.json(response.choices[0]?.message?.content || {});
  } catch (error: any) {
    console.error('Vision validation error:', error);
    return NextResponse.json(
      { error: error.message || 'Vision validation failed' },
      { status: 500 }
    );
  }
}
