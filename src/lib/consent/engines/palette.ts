/**
 * The client-side palette engine — server half only.
 *
 * The audio never reaches the server: the browser decodes a local file, measures it, chooses
 * voices and renders. What arrives here is the ~1 KB spec that voiced the render, which the
 * receipt stores VERBATIM. It is not re-derived, because the analyser is nondeterministic
 * across processes (everything-hums defect #64) and a receipt that recomputed its own contents
 * would sometimes disagree with the audio the listener actually heard.
 */

import type { GenerationEngine, GenerationRequest, PreparedGeneration } from './types'
import type { Grant } from '../types'

export const PALETTE_ENGINE_VERSION = 'everything-hums@cd9da31 (v3.89) chooseVoices'

/** Generous but finite: the real artifact measures about a kilobyte. */
const MAX_SPEC_BYTES = 8192

export const paletteEngine: GenerationEngine = {
  kind: 'palette',
  mode: 'client',
  // Conditioning on a recording, not invoking a name — EKOS-SCOPE-MAP §A1's second pathway.
  requiredPathway: 'condition',
  available: true,

  prepare(req: GenerationRequest, grant: Grant): PreparedGeneration {
    return {
      rewriting: null, // nothing is sent anywhere, so there is nothing to rewrite
      resolved: {
        artist: grant.grantor_display_name,
        song: null,
        model: 'palette',
        engine_version: PALETTE_ENGINE_VERSION,
      },
      inference: { durationSeconds: req.durationSeconds, style: req.style },
    }
  },
}

export type SpecValidation = { ok: true; spec: unknown } | { ok: false; error: string }

/**
 * Enough checking to keep junk out of the ledger, without pretending to validate DSP the
 * server never runs.
 */
export function validatePaletteSpec(spec: unknown): SpecValidation {
  if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) {
    return { ok: false, error: 'Spec must be an object' }
  }
  const size = Buffer.byteLength(JSON.stringify(spec))
  if (size > MAX_SPEC_BYTES) {
    return { ok: false, error: `Spec is ${size} bytes; the limit is ${MAX_SPEC_BYTES}` }
  }
  const s = spec as Record<string, unknown>
  for (const key of ['songChoices', 'songVoicesPlayed', 'songKit', 'songTone']) {
    if (!(key in s)) return { ok: false, error: `Spec is missing ${key}` }
  }
  if (!Array.isArray(s.songChoices) || s.songChoices.length === 0) {
    return { ok: false, error: 'songChoices must be a non-empty array' }
  }
  // What played, not just what was chosen — this build substitutes a patch for any sampled
  // voice, and the receipt must say so.
  if (!Array.isArray(s.songVoicesPlayed) || s.songVoicesPlayed.length === 0) {
    return { ok: false, error: 'songVoicesPlayed must be a non-empty array' }
  }
  return { ok: true, spec }
}
