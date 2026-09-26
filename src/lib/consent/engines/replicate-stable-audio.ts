/**
 * The existing hosted path, moved behind the engine seam.
 *
 * The prompt template and the style-enrichment map used to live in the route and were thrown
 * away after the request was sent. They are the receipt's "any rewriting applied" field, so
 * they live here now and are returned rather than discarded.
 */

import Replicate from 'replicate'
import type { GenerationEngine, GenerationRequest, PreparedGeneration, EngineJobStatus } from './types'
import type { Grant } from '../types'

const MODEL = 'stability-ai/stable-audio-2.5'
const PROMPT_TEMPLATE = '{style}, {description}, instrumental, high quality, studio production'

/**
 * Copied verbatim from the route this engine replaces. These strings are the receipt's record
 * of what we did to the request, so changing one changes what past receipts can be compared
 * against — treat them as data, not as copy to be improved.
 * Unknown styles pass through untouched; the model handles them naturally.
 */
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

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

export const replicateStableAudio: GenerationEngine = {
  kind: 'replicate_stable_audio',
  mode: 'server',
  requiredPathway: 'invoke_style',
  available: Boolean(process.env.REPLICATE_API_TOKEN),

  prepare(req: GenerationRequest, grant: Grant): PreparedGeneration {
    const styleKey = req.style.toLowerCase()
    const enrichedStyle = styleEnrichment[styleKey] || req.style
    const prompt = PROMPT_TEMPLATE.replace('{style}', enrichedStyle).replace(
      '{description}',
      req.description
    )
    return {
      rewriting: { template: PROMPT_TEMPLATE, styleKey, enrichedStyle, prompt },
      resolved: { artist: grant.grantor_display_name, song: null, model: MODEL },
      inference: {
        model: MODEL,
        seconds_total: req.durationSeconds,
        duration: req.durationSeconds,
        num_inference_steps: 8,
        guidance_scale: 7,
      },
    }
  },

  async start(prepared: PreparedGeneration): Promise<{ jobId: string }> {
    const { model, ...input } = prepared.inference as { model: string } & Record<string, unknown>
    const prediction = await replicate.predictions.create({
      model,
      input: { prompt: prepared.rewriting?.prompt, ...input },
    })
    return { jobId: prediction.id }
  },

  async poll(jobId: string): Promise<EngineJobStatus> {
    const prediction = await replicate.predictions.get(jobId)
    if (prediction.status === 'succeeded') {
      const out = prediction.output
      const outputUrl = typeof out === 'string' ? out : Array.isArray(out) ? out[0] : null
      if (!outputUrl) return { state: 'failed', error: 'Model succeeded but returned no audio' }
      return { state: 'succeeded', outputUrl }
    }
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      return { state: 'failed', error: String(prediction.error || prediction.status) }
    }
    return { state: 'processing' }
  },

  async cancel(jobId: string): Promise<void> {
    try {
      await replicate.predictions.cancel(jobId)
    } catch (error) {
      // Best effort by design: the grant is revoked either way, and delivery is what we stop.
      console.error('[engine:replicate] cancel failed (continuing):', error)
    }
  },
}
