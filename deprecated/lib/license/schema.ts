import { z } from 'zod'

/**
 * Machine-readable music license terms for Story Protocol IP Assets
 * Used in both on-chain registration and IPFS metadata
 */

export const MusicLicenseTermsSchema = z.object({
  // AI Training
  ai_training_allowed: z.boolean().default(false).describe('Whether this work can be used for AI training'),
  ai_training_price_usd: z
    .number()
    .positive()
    .optional()
    .nullable()
    .describe('Fee in USD for AI training license (if allowed)'),

  // Sync Licensing
  sync_allowed: z.boolean().default(false).describe('Whether this work can be synced to visual media'),
  sync_price_usd: z
    .number()
    .positive()
    .optional()
    .nullable()
    .describe('Fee in USD for sync license (if allowed)'),

  // Commercial Use
  commercial_use_allowed: z.boolean().default(false).describe('Whether commercial use is allowed'),
  commercial_use_revenue_share_pct: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .nullable()
    .describe('Revenue share % if commercial use allowed (0-100)'),
})

export const MusicWorkSchema = z.object({
  // Work identity
  title: z.string().min(1).describe('Track title'),
  isrc: z.string().optional().nullable().describe('International Standard Recording Code'),
  audio_file_url: z.string().url().describe('URL to audio file in Supabase Storage'),
  audio_file_hash: z.string().describe('SHA256 hash of audio file for integrity'),
  duration_seconds: z.number().int().positive().optional().describe('Duration in seconds'),

  // AI Origin Disclosure (immutable on-chain)
  ai_origin: z
    .enum(['human', 'ai_assisted', 'ai_generated'])
    .default('human')
    .describe('Creator-declared origin: human, ai_assisted, or ai_generated'),

  // Metadata
  genre: z.string().optional().describe('Music genre'),
  release_date: z.string().date().optional().describe('Release date (YYYY-MM-DD)'),
})

export const CreatorIdentitySchema = z.object({
  world_wallet_address: z.string().startsWith('0x').describe('World ID wallet address'),
  world_nullifier_hash: z.string().optional().nullable().describe('World ID nullifier hash (proof of uniqueness)'),
  world_username: z.string().optional().nullable().describe('Creator username'),
  verified_human: z.literal(true).describe('Always true - only humans can register'),
})

export const SplitSchema = z.object({
  recipient: z.string().startsWith('0x').describe('Wallet address of split recipient'),
  percentage: z.number().min(0).max(100).describe('Revenue share percentage'),
})

export const MusicIPMetadataSchema = z.object({
  // Work info
  work: MusicWorkSchema,

  // Creator identity (verified with World ID)
  creator: CreatorIdentitySchema,

  // Revenue splits (for collaborators)
  splits: z.array(SplitSchema).default([]).describe('Royalty splits for collaborators'),

  // License terms (machine-readable)
  license_terms: MusicLicenseTermsSchema,

  // Metadata
  registered_at: z.string().datetime().describe('Registration timestamp'),
  version: z.string().default('1.0').describe('Schema version'),
})

export type MusicLicenseTerms = z.infer<typeof MusicLicenseTermsSchema>
export type MusicWork = z.infer<typeof MusicWorkSchema>
export type CreatorIdentity = z.infer<typeof CreatorIdentitySchema>
export type Split = z.infer<typeof SplitSchema>
export type MusicIPMetadata = z.infer<typeof MusicIPMetadataSchema>
export type AIOrigin = z.infer<typeof MusicWorkSchema>['ai_origin']

/**
 * Validate and create music IP metadata for registration
 */
export function createMusicIPMetadata(input: Partial<MusicIPMetadata>): MusicIPMetadata {
  return MusicIPMetadataSchema.parse({
    ...input,
    registered_at: new Date().toISOString(),
  })
}
