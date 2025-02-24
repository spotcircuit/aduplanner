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
    const { image, prompt, propertyCenter, zoomLevel }: ConstraintAnalysisRequest = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Combine the user's prompt with our format requirements
    const finalPrompt = `${prompt}\n\n${constraintAnalysisPrompt}\n\nThe image is centered at ${propertyCenter.lat}, ${propertyCenter.lng} with zoom level ${zoomLevel}.`;

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
                url: image,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error('No content in response');
      throw new Error('No content in response');
    }

    console.log('OpenAI Response:', content);

    try {
      // First try direct JSON parse
      const parsed = JSON.parse(content);
      return NextResponse.json({ parsed });
    } catch (parseError) {
      // If direct parse fails, try to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Response content:', content);
        throw new Error('No JSON found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ parsed });
    }

  } catch (error) {
    console.error('Error analyzing constraints:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return NextResponse.json(
      { error: 'Failed to analyze constraints', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
