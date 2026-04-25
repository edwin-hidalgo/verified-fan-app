/**
 * GET /api/generate-music/status?id=prediction_id
 * Poll the status of a music generation prediction
 *
 * Response:
 * - While processing: { "status": "processing" }
 * - When succeeded: { "status": "succeeded", "audioUrl": "https://..." }
 * - If failed: { "status": "failed", "error": "..." }
 */

import Replicate from 'replicate'
import { NextRequest, NextResponse } from 'next/server'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get('id')

    if (!predictionId) {
      return NextResponse.json(
        { error: 'Missing prediction id' },
        { status: 400 }
      )
    }

    console.log('[generate-music-status] Checking prediction:', predictionId)

    // Get prediction status
    const prediction = await replicate.predictions.get(predictionId)

    console.log('[generate-music-status] Prediction status:', prediction.status)

    if (prediction.status === 'succeeded') {
      // Extract audio URL from output
      // stability-audio-2.5 returns a single string URL, not an array
      const audioUrl = typeof prediction.output === 'string'
        ? prediction.output
        : prediction.output?.[0]

      if (!audioUrl) {
        console.error('[generate-music-status] No audio URL in output:', prediction.output)
        return NextResponse.json(
          { status: 'succeeded', audioUrl: null, error: 'No output generated' },
          { status: 200 }
        )
      }

      console.log('[generate-music-status] Prediction succeeded, audio URL:', audioUrl)

      return NextResponse.json({
        status: 'succeeded',
        audioUrl: audioUrl,
      })
    } else if (prediction.status === 'failed') {
      console.error('[generate-music-status] Prediction failed:', prediction.error)
      return NextResponse.json({
        status: 'failed',
        error: prediction.error || 'Generation failed',
      })
    } else {
      // Still processing (status: 'starting', 'processing')
      return NextResponse.json({
        status: 'processing',
      })
    }
  } catch (error) {
    console.error('[generate-music-status] Error checking prediction:', error)
    return NextResponse.json(
      { error: 'Failed to check prediction status' },
      { status: 500 }
    )
  }
}
