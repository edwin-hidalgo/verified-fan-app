/**
 * POST /api/generate-music
 * Generate music from a text description + vibe via Replicate Stable Audio 2.5
 *
 * Request body:
 * {
 *   "description": "walking through rain at night, feeling contemplative",
 *   "vibe": "ambient" | "lofi" | "cinematic" | "upbeat" | "ethereal"
 * }
 *
 * Response:
 * {
 *   "predictionId": "abc123...",
 *   "status": "starting"
 * }
 */

import Replicate from 'replicate'
import { NextRequest, NextResponse } from 'next/server'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

const vibeMap: Record<string, string> = {
  ambient: 'ambient, slow, atmospheric, ethereal pads, meditative, 60bpm',
  lofi: 'lo-fi hip hop, chill, vinyl crackle, jazzy, relaxed, 85bpm',
  cinematic: 'cinematic orchestral, emotional, swelling strings, dramatic, lush',
  upbeat: 'upbeat, energetic, electronic, punchy, driving, 120bpm',
  ethereal: 'ethereal, dreamy, floating, reverb-heavy, whispered, slow',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, vibe } = body

    if (!description || !vibe) {
      return NextResponse.json(
        { error: 'Missing description or vibe' },
        { status: 400 }
      )
    }

    if (!vibeMap[vibe]) {
      return NextResponse.json(
        { error: `Invalid vibe. Must be one of: ${Object.keys(vibeMap).join(', ')}` },
        { status: 400 }
      )
    }

    console.log('[generate-music] Creating prediction for:', description, 'vibe:', vibe)

    // Build the prompt from description + vibe characteristics
    const vibeCharacteristics = vibeMap[vibe]
    const prompt = `${vibeCharacteristics}, ${description}, instrumental, high quality, studio production`

    // Create Replicate prediction (non-blocking)
    const prediction = await replicate.predictions.create({
      version: 'f7cf6f7aac3c5c4fe93ab4fb96a69bbfcde5e4a3a4873d61456c339c74d0c97b', // Stable Audio 2.5
      input: {
        prompt: prompt,
        duration: 12, // 12 seconds for short atmospheric sketches
      },
    })

    console.log('[generate-music] Prediction created:', prediction.id)

    return NextResponse.json({
      predictionId: prediction.id,
      status: 'starting',
    })
  } catch (error) {
    console.error('[generate-music] Error creating prediction:', error)
    return NextResponse.json(
      { error: 'Failed to generate music' },
      { status: 500 }
    )
  }
}
