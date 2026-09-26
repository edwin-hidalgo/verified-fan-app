/**
 * palette/source.js — a local audio file becomes mono samples at the analysis rate.
 *
 * Vendored from everything-hums js/song/source.js, DELIBERATELY WITHOUT its iTunes search and
 * preview-fetch functions. Apple's Search API terms restrict previews to promotional use and
 * restrict caching, and analysing one locally does not clear that — so the only input here is a
 * file the person already has. It also makes the honest claim available: the audio never leaves
 * the browser.
 */

export const ANALYSIS_RATE = 22050; // the rate every palette constant was calibrated at

function toMono(buffer, rate = ANALYSIS_RATE) {
  const chans = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) chans.push(buffer.getChannelData(c));
  const ratio = buffer.sampleRate / rate;
  const out = new Float32Array(Math.floor(buffer.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const src = Math.floor(i * ratio);
    let sum = 0;
    for (const ch of chans) sum += ch[src];
    out[i] = sum / chans.length;
  }
  return out;
}

async function decodeBytes(bytes) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try {
    const buffer = await ctx.decodeAudioData(bytes);
    return toMono(buffer);
  } finally {
    ctx.close?.();
  }
}

export async function decodeFile(file) {
  return decodeBytes(await file.arrayBuffer());
}

export function excerpt(samples, seconds = 30, rate = ANALYSIS_RATE) {
  const want = Math.floor(seconds * rate);
  if (samples.length <= want) return samples;
  const start = Math.floor((samples.length - want) / 2);
  return samples.subarray(start, start + want);
}
