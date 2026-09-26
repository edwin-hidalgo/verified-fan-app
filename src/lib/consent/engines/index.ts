/**
 * consent/engines/index.ts — the registry
 *
 * `ml_adapter` is deliberately present and unavailable. Track B fills it in; until then a
 * request naming it gets a clear refusal rather than a confusing 400, and the receipt schema
 * already has the columns for it.
 */

import type { GenerationEngine } from './types'
import type { EngineKind } from '../types'
import { replicateStableAudio } from './replicate-stable-audio'
import { paletteEngine } from './palette'

const ENGINES: Record<EngineKind, GenerationEngine | null> = {
  replicate_stable_audio: replicateStableAudio,
  palette: paletteEngine,
  ml_adapter: null, // Track B
}

export const DEFAULT_ENGINE: EngineKind = 'replicate_stable_audio'

export function getEngine(kind: string): GenerationEngine | null {
  return ENGINES[kind as EngineKind] ?? null
}

export { replicateStableAudio, paletteEngine }
export * from './types'
