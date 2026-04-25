/**
 * POST /api/describe-image
 * Generate dual descriptions (music + literal) from an image using Claude vision
 * Also uploads the image to Supabase Storage for use as cover art
 *
 * Request body:
 * {
 *   "image": "base64-encoded-image-data",
 *   "mimeType": "image/jpeg" | "image/png" | "image/gif" | "image/webp"
 * }
 *
 * Response:
 * {
 *   "musicDescription": "emotional description for music generation",
 *   "momentDescription": "literal description of what's in the photo",
 *   "imageUrl": "https://supabase.../covers/..."
 * }
 */

import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are analyzing a photo and generating two complementary descriptions.

Return a JSON object with exactly two keys:
- "music": 1-2 sentences, max 30 words, emotional/atmospheric ONLY. NO literal objects or people. For a music composer.
- "moment": 1-2 sentences, plain English. What is literally in the photo — who/what/where. For the person who took it.

Focus the music description on: tone, light quality, energy level, atmosphere, implied sounds or rhythms.
Focus the moment description on: the actual scene, objects, people, location, activity.

Example for a rainy window at night:
{"music": "Soft melancholic isolation, dim blue-grey light, hushed stillness with slow pulsing quality.", "moment": "A rain-streaked window at night, city lights blurred through the glass."}

Respond with ONLY the JSON object, no markdown or other text.`

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
      max_tokens: 300,
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
              text: 'Generate both music and moment descriptions for this photo.',
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

    // Parse JSON response (strip markdown code blocks if present)
    let descriptions
    try {
      let jsonText = textContent.text.trim()
      // Remove markdown code block formatting if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      descriptions = JSON.parse(jsonText)
    } catch {
      console.error('[describe-image] Failed to parse Claude response:', textContent.text)
      throw new Error('Invalid response format from Claude')
    }

    const musicDescription = descriptions.music?.trim()
    const momentDescription = descriptions.moment?.trim()

    if (!musicDescription || !momentDescription) {
      throw new Error('Missing music or moment description in Claude response')
    }

    console.log('[describe-image] Music description:', musicDescription)
    console.log('[describe-image] Moment description:', momentDescription)

    // Upload image to Supabase Storage
    console.log('[describe-image] Uploading image to Supabase Storage')
    const supabase = await createServerSupabaseClient()
    const imageBuffer = Buffer.from(image, 'base64')
    const imageFileName = `covers/${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(imageFileName, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('[describe-image] Supabase storage error:', uploadError)
      throw new Error('Failed to upload image to storage')
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('audio-files').getPublicUrl(imageFileName)

    console.log('[describe-image] Image uploaded:', publicUrl)

    return NextResponse.json({
      musicDescription,
      momentDescription,
      imageUrl: publicUrl,
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
