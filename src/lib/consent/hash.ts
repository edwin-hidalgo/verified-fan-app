/**
 * consent/hash.ts — hashes a receipt can be checked against later
 *
 * `stableStringify` exists because JSONB does not preserve key order or whitespace. Hashing
 * the bytes that arrived over the wire would produce a digest nobody could ever reproduce
 * from the stored row, which makes the hash decorative. Sorting keys first means anyone with
 * the row can recompute it.
 */

import { createHash } from 'node:crypto'

export function sha256Hex(input: Buffer | Uint8Array | string): string {
  return createHash('sha256').update(input).digest('hex')
}

/** JSON with object keys sorted recursively. Arrays keep their order — order is data there. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
  return `{${entries.join(',')}}`
}

/** The canonical digest of any JSON-shaped value. */
export function hashJson(value: unknown): string {
  return sha256Hex(stableStringify(value))
}
