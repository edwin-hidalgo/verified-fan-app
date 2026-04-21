import 'server-only'

import { getStoryClient } from './client'
import { MusicIPMetadata } from '../license/schema'
import { PILFlavor } from '@story-protocol/core-sdk'
import { Address } from 'viem'

interface RegisterMusicIPOptions {
  metadata: MusicIPMetadata
  nftContract?: Address
  recipient?: Address
}

interface RegisterMusicIPResult {
  ipId: string
  licenseTermsId: string
  txHash: string
}

/**
 * Register a music work as an IP Asset on Story Protocol
 * Uses the service wallet to mint NFT and register IP with license terms
 *
 * This is a one-call convenience function that:
 * 1. Mints an NFT from the SPG collection
 * 2. Registers it as an IP Asset
 * 3. Attaches machine-readable license terms (PIL)
 */
export async function registerMusicIP(
  options: RegisterMusicIPOptions
): Promise<RegisterMusicIPResult> {
  const { metadata, nftContract, recipient } = options

  try {
    const client = getStoryClient()

    // Get the SPG NFT contract from config
    const spgNftContract = (nftContract || process.env.STORY_SPG_NFT_CONTRACT) as Address
    if (!spgNftContract) {
      throw new Error('SPG_NFT_CONTRACT not configured')
    }

    console.log('[story-register] Registering music IP:', metadata.work.title)
    console.log('[story-register] Creator:', metadata.creator.world_wallet_address)

    // Build PIL terms based on license configuration
    const pilTerms = buildPILTerms(metadata)

    // Register IP Asset with license terms
    // This is the modern unified entry point that handles both minting and registration
    const result = await client.ipAsset.registerIpAsset({
      nft: {
        type: 'mint',
        spgNftContract: spgNftContract,
        recipient: recipient || (client.account?.address as Address),
      },
      ipMetadata: {
        title: metadata.work.title,
        description: `Music registered by ${metadata.creator.world_username || 'verified creator'}`,
        watermarkURI: '',
        attributes: [
          {
            key: 'isrc',
            value: metadata.work.isrc || 'N/A',
          },
          {
            key: 'genre',
            value: metadata.work.genre || 'N/A',
          },
          {
            key: 'ai_training_allowed',
            value: metadata.license_terms.ai_training_allowed ? 'yes' : 'no',
          },
        ],
      },
      // Attach PIL terms to the IP Asset
      licenseTermsData: [
        {
          terms: pilTerms,
        },
      ],
    })

    console.log('[story-register] IP registered successfully')
    console.log('[story-register] IP ID:', result.ipId)
    console.log('[story-register] License Terms ID:', result.licenseTermsId)
    console.log('[story-register] TX Hash:', result.txHash)

    return {
      ipId: result.ipId,
      licenseTermsId: result.licenseTermsId || '0',
      txHash: result.txHash,
    }
  } catch (error) {
    console.error('[story-register] Registration failed:', error)
    throw error
  }
}

/**
 * Build PIL (Programmable IP License) terms from music license configuration
 *
 * PIL Flavors provide pre-configured license templates:
 * - nonCommercialSocialRemixing: Free remixing with attribution
 * - commercialUse: Paid use, requires attribution
 * - commercialRemix: Paid use + revenue sharing, allows remixes
 *
 * For our music registry, we use commercialRemix as the base since it's most flexible
 */
function buildPILTerms(metadata: MusicIPMetadata) {
  const { license_terms: terms } = metadata

  // Start with commercial remix flavor (most flexible)
  // This allows paid licensing with revenue sharing
  let pil = PILFlavor.commercialRemix({
    defaultMintingFee: 0n, // Hackathon: no fee for minting license tokens
    commercialRevShare: terms.commercial_use_revenue_share_pct || 0,
    // Currency would be set to IP or WIP token address in production
    // For now, we skip it to use default
  })

  // In production, we would:
  // 1. Check if AI training is allowed and set custom terms
  // 2. Use registerPILTerms() to create custom license combinations
  // 3. Attach multiple PIL terms for different use cases
  //
  // For MVP, we use the pre-built commercial remix flavor
  // The actual AI training restrictions would be enforced at the application level
  // by checking metadata.license_terms.ai_training_allowed before allowing training use

  return pil
}
