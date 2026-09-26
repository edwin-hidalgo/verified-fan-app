/**
 * palette/run.ts — the whole client-side generation, in one call
 *
 * Given a local file, measure it, choose voices, render a short score, and hand back both the
 * audio and the spec that made it. The spec is what the receipt stores: not the recording, not
 * anything from which the recording could be reconstructed, just the ~800 bytes describing which
 * instruments the measurements pointed at.
 *
 * Everything here runs in the browser. Nothing is uploaded.
 */

// Vendored plain JS. TypeScript infers their shapes directly, which is why there are no
// hand-written declarations here — a second copy of upstream's types is how a vendored copy
// starts drifting from its source.
import { ANALYSIS_RATE, decodeFile, excerpt } from './source.js'
import { analysePalette, drumKitFrom, songToneFrom } from './palette.js'
import { chooseVoices, resolveVoice } from './bank.js'
import { renderWav } from './wav.js'

export interface PaletteSpec {
  /** What the measurements pointed at. */
  songChoices: unknown[]
  /**
   * What actually played. Not the same thing: this build ships patches only, so a choice from a
   * sampled family (piano, guitar, eguitar, violin, flute) is substituted by `resolveVoice` with
   * the nearest patch. A receipt whose job is "the assets actually used" has to say which.
   */
  songVoicesPlayed: { chosen: string; played: string; substituted: boolean }[]
  songKit: unknown
  songTone: unknown
}

export interface PaletteResult {
  wav: Blob
  spec: PaletteSpec
  /** sha256 of the rendered audio, hex — so the receipt can name what was heard. */
  outputSha256: string
  /** sha256 of the source file, so a later claim about which recording was used is checkable. */
  sourceSha256: string
  /** The file's own name. The hash proves WHICH bytes; this is how a person recognises them. */
  sourceName: string
  sourceBytes: number
  clusterCount: number
  voiceNames: string[]
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** A simple repeating figure — the point is to hear the instruments, not to compose. */
function demoScore(bars: number, voiceCount: number) {
  const scale = [0, 2, 4, 7, 9]
  const events: Record<string, unknown>[] = []
  for (let i = 0; i < bars * 4; i++) {
    const semi = scale[i % scale.length] + (i % 8 >= 4 ? 12 : 0)
    events.push({
      t: i * 0.5,
      dur: 0.45,
      freq: 220 * Math.pow(2, semi / 12),
      gain: 0.8,
      strokeIndex: i % voiceCount,
    })
  }
  return events
}

export async function runPalette(file: File, seconds = 12): Promise<PaletteResult> {
  const sourceBytes = await file.arrayBuffer()
  const sourceSha256 = await sha256Hex(sourceBytes)

  const samples = await decodeFile(file)
  const clusters = analysePalette(excerpt(samples, 30, ANALYSIS_RATE), ANALYSIS_RATE, { voices: 4 })
  if (!clusters || clusters.length === 0) {
    // analysePalette gates on frame energy and bails when too few frames survive: silence lends
    // no instruments, and saying so is better than inventing four.
    throw new Error('That file was too quiet or too short to measure.')
  }

  // chooseVoices, never voiceFromCluster — see README (everything-hums defect #64).
  const choices = chooseVoices(clusters)
  const kit = drumKitFrom(clusters)
  const tone = songToneFrom(clusters)
  const voices = choices.map((c: unknown) => resolveVoice(c, {}))

  const beats = Math.max(4, Math.round(seconds / 0.5))
  const events = demoScore(Math.ceil(beats / 4), Math.max(1, voices.length))
  for (const ev of events) {
    const v = voices[ev.strokeIndex as number]
    if (!v) continue
    ev.timbre = v
    if (v.octave) ev.freq = (ev.freq as number) * (v.octave > 0 ? 2 : 0.5)
  }

  const wav: Blob = await renderWav(events, beats, 0.5, { kit, tone })
  const outputSha256 = await sha256Hex(await wav.arrayBuffer())

  const played: PaletteSpec['songVoicesPlayed'] = choices.map((c: { id?: string }, i: number) => {
    const v = voices[i] as { name?: string; kind?: string } | null
    const playedName = v?.name || v?.kind || 'unknown'
    return {
      chosen: c?.id ?? 'unknown',
      played: playedName,
      substituted: (c?.id ?? '') !== playedName,
    }
  })

  return {
    wav,
    spec: { songChoices: choices, songVoicesPlayed: played, songKit: kit, songTone: tone },
    outputSha256,
    sourceSha256,
    sourceName: file.name,
    sourceBytes: file.size,
    clusterCount: clusters.length,
    voiceNames: played.map((entry) => entry.played),
  }
}
