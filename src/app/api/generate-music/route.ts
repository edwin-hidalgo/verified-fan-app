/**
 * POST /api/generate-music
 * Generate music from a text description + style + duration via Stable Audio 2.5
 *
 * Request body:
 * {
 *   "description": "walking through rain at night, feeling contemplative",
 *   "style": "melancholic indie folk" (or any music genre/style),
 *   "duration": 30 (optional, seconds, default 30)
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

// Style enrichment for common genres — expands short style names into rich prompts
// Unknown styles are passed through as-is (model handles them naturally)
const styleEnrichment: Record<string, string> = {
  ambient: 'ambient, slow, atmospheric, ethereal pads, meditative, 60bpm',
  'lo-fi': 'lo-fi hip hop, chill, vinyl crackle, jazzy, relaxed, 85bpm',
  lofi: 'lo-fi hip hop, chill, vinyl crackle, jazzy, relaxed, 85bpm',
  cinematic: 'cinematic orchestral, emotional, swelling strings, dramatic, lush',
  upbeat: 'upbeat, energetic, electronic, punchy, driving, 120bpm',
  jazz: 'warm jazz, upright bass, brushed drums, saxophone, smooth, 110bpm',
  folk: 'folk, acoustic guitar, intimate, storytelling, warm, organic',
  dark: 'dark, brooding, tension, minor chords, atmospheric bass, slow build',
  classical: 'classical, orchestral, elegant, refined, 90bpm',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, style, duration } = body

    if (!description || !style) {
      return NextResponse.json(
        { error: 'Missing description or style' },
        { status: 400 }
      )
    }

    const finalDuration = Math.min(duration || 30, 190) // Default 30s, max 190s
    console.log('[generate-music] Creating prediction for:', description, 'style:', style, 'duration:', finalDuration + 's')

    // Enrich known styles, pass unknowns as-is
    const styleKey = style.toLowerCase()
    const enrichedStyle = styleEnrichment[styleKey] || style
    const prompt = `${enrichedStyle}, ${description}, instrumental, high quality, studio production`

    console.log('[generate-music] Final prompt:', prompt)

    // Create Replicate prediction (non-blocking)
    // Using stability-ai/stable-audio-2.5 (official model, no version hash needed)
    const prediction = await replicate.predictions.create({
      model: 'stability-ai/stable-audio-2.5',
      input: {
        prompt: prompt,
        seconds_total: finalDuration, // timing embedding for model
        duration: finalDuration, // actual duration parameter
        num_inference_steps: 8,
        guidance_scale: 7,
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
