/**
 * consent/engines/types.ts — one seam for every way ekos can make audio
 *
 * Three implementations are foreseen and the receipt shape has to fit all of them without a
 * migration: a server-side hosted model (Replicate), a client-side deterministic engine (the
 * palette, where the audio never leaves the browser), and a per-artist adapter later in
 * Track B. What they share is that `prepare()` is pure and its output IS the receipt's
 * "rewriting" field — the transformation between what the user asked for and what actually ran
 * is recorded because it is computed here rather than buried in a route.
 */

import type { ExecutionMode, Grant, EngineKind, Pathway, UseTier } from '../types'

export interface GenerationRequest {
  description: string
  style: string
  durationSeconds: number
  useTier: UseTier
}

export interface PreparedGeneration {
  /** What we did to the request. Null when the engine sends nothing anywhere. */
  rewriting: {
    template: string
    styleKey: string
    enrichedStyle: string
    prompt: string
  } | null
  resolved: {
    artist: string
    song: string | null
    model: string
    engine_version?: string
  }
  /** Engine-specific knobs, recorded alongside the model id. */
  inference: Record<string, unknown>
}

export type EngineJobStatus =
  | { state: 'processing' }
  | { state: 'succeeded'; outputUrl: string }
  | { state: 'failed'; error: string }

export interface GenerationEngine {
  readonly kind: EngineKind
  readonly mode: ExecutionMode
  /** Which pathway a grant must permit for this engine to run at all. */
  readonly requiredPathway: Pathway
  readonly available: boolean
  prepare(req: GenerationRequest, grant: Grant): PreparedGeneration
  /** Server-mode only. */
  start?(prepared: PreparedGeneration): Promise<{ jobId: string }>
  poll?(jobId: string): Promise<EngineJobStatus>
  /** Best effort. Used when a grant is revoked while work is in flight. */
  cancel?(jobId: string): Promise<void>
}
