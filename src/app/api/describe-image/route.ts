/**
 * POST /api/describe-image
 * Generate a music-optimized description from an image using Claude vision
 *
 * Request body:
 * {
 *   "image": "base64-encoded-image-data",
 *   "mimeType": "image/jpeg" | "image/png" | "image/gif" | "image/webp"
 * }
 *
 * Response:
 * {
 *   "description": "emotional, sensory description suitable for music generation"
 * }
 */

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are translating a photo into a music composition prompt.

Look at the image provided and describe what you see in terms of:
- Emotional tone and mood
- Quality of light (warm/cold/dim/bright)
- Energy level (still/gentle/dynamic/intense)
- Atmosphere and feeling
- Any implied sounds or rhythms

Do NOT describe literal objects or people. Focus entirely on the sensory and emotional experience.

Output exactly 1–2 sentences, max 30 words. Write as if describing a feeling to a music composer.

Example: "Soft melancholic isolation, dim blue-grey light filtering through rain, hushed stillness with a slow pulsing quality."`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image, mimeType } = body

    if (!image || !mimeType) {
      return NextResponse.json(
        { error: 'Missing image or mimeType' },
        { status: 400 }
      )
    }

    // Validate MIME type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validMimeTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Invalid MIME type. Must be one of: ${validMimeTypes.join(', ')}` },
        { status: 400 }
      )
    }

    console.log('[describe-image] Analyzing image with Claude vision')

    // Call Claude haiku with vision
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/gif'
                  | 'image/webp',
                data: image,
              },
            },
            {
              type: 'text',
              text: 'Describe this image as a feeling for music composition.',
            },
          ],
        },
      ],
    })

    // Extract text from response
    const textContent = message.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    const description = textContent.text.trim()

    console.log('[describe-image] Generated description:', description)

    return NextResponse.json({
      description,
    })
  } catch (error) {
    console.error('[describe-image] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to describe image', details: errorMessage },
      { status: 500 }
    )
  }
}
