// Offline Web Audio uses exactly the live synth, then encodes mono PCM.
import { createSynth, AUDIO_START, EFFECT_TAIL, noteEnd } from './synth.js';

// `kit` and `tone` — the song's drum kit and its tone curve — both have to be
// passed explicitly. Every synth owns its own (closure state, not a module
// global), so a synth built here starts on the app's flat, app-drummed sound no
// matter what the live one is playing. Without the kit, an exported song-world
// hum lost the record's drums silently: song-voiced melody, our kick under it.
export async function renderAudio(noteEvents, beats, secPerBeat, { beat = 0, scale = [0, 2, 4, 7, 9], rootMidi = 48, chords = null, kit = null, tone = null } = {}) {
  const sr = 44100;
  const lastEnd = Math.max(beats * secPerBeat, ...noteEvents.map(e => e.t * secPerBeat + noteEnd(e, secPerBeat)));
  const Context = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Context) throw new Error('Offline audio is unavailable');
  const ctx = new Context(1, Math.ceil((AUDIO_START + lastEnd + EFFECT_TAIL) * sr), sr);
  const synth = createSynth(ctx);
  if (kit) synth.setDrumKit(kit);
  if (tone) synth.setSongTone(tone);
  const voices = [];
  try {
    for (const ev of noteEvents) synth.scheduleEvent(ev, AUDIO_START + ev.t * secPerBeat, secPerBeat, voices);
    if (beat) synth.scheduleRhythm(AUDIO_START, beats, secPerBeat, beat, scale, rootMidi, voices, -Infinity, chords);
    return await ctx.startRendering();
  } finally { synth.dispose(); }
}

// The gain that brings `samples` to `targetRms`, vetoed by whatever keeps the
// peak under 1. Two sounds are only comparable by ear if they arrive at the
// same loudness, and RMS is what the ear averages; the peak veto is what stops
// a quiet-but-spiky signal from clipping on the way up. Measured off the
// buffer, so it is a fact about this audio rather than a number someone tuned.
export function levelFor(samples, targetRms) {
  let sum = 0, peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    sum += s * s;
    const a = s < 0 ? -s : s;
    if (a > peak) peak = a;
  }
  const rms = Math.sqrt(sum / (samples.length || 1));
  if (!rms || !peak) return 1;
  return Math.min(targetRms / rms, 0.99 / peak);
}

export function encodeWav(audio) {
  const samples = audio.getChannelData(0);
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let j = 0; j < s.length; j++) v.setUint8(o + j, s.charCodeAt(j)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, audio.sampleRate, true); v.setUint32(28, audio.sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    if (!Number.isFinite(samples[i])) throw new Error('Non-finite audio sample');
    v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

export async function renderWav(...args) { return encodeWav(await renderAudio(...args)); }
