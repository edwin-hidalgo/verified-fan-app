import 'server-only'

import { getStoryClient, getServiceWalletAddress } from './client'
import { MusicIPMetadata } from '../license/schema'
import { uploadJSON } from '../ipfs/pinata'
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
    console.log('[story-register] PIL terms built:', pilTerms)

    // Get service wallet address for NFT recipient
    const walletAddress = getServiceWalletAddress()
    console.log('[story-register] Service wallet address:', walletAddress)
    console.log('[story-register] SPG NFT contract:', spgNftContract)

    const nftRecipient = recipient || (walletAddress as Address)
    console.log('[story-register] NFT recipient:', nftRecipient)

    // Register IP Asset with PIL terms attached
    // Upload metadata to IPFS first
    console.log('[story-register] Uploading metadata to IPFS')
    const ipfsMetadata = {
      title: metadata.work.title,
      description: `Music registered by ${metadata.creator.world_username || 'verified creator'}`,
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
          key: 'ai_origin',
          value: metadata.work.ai_origin,
        },
        {
          key: 'ai_training_allowed',
          value: metadata.license_terms.ai_training_allowed ? 'yes' : 'no',
        },
      ],
    }

    const ipfsMetadataHash = await uploadJSON(ipfsMetadata)
    const ipfsMetadataURI = `ipfs://${ipfsMetadataHash}`
    console.log('[story-register] Metadata uploaded to IPFS:', ipfsMetadataURI)

    console.log('[story-register] Calling registerIpAsset with PIL terms')
    console.log('[story-register] Full registration payload:', {
      nft: {
        type: 'mint',
        spgNftContract,
        recipient: nftRecipient,
      },
      ipMetadataURI: ipfsMetadataURI,
      licenseTermsData: [{ terms: pilTerms }],
    })

    let result
    try {
      result = await client.ipAsset.registerIpAsset({
        nft: {
          type: 'mint',
          spgNftContract: spgNftContract,
          recipient: nftRecipient,
        },
        ipMetadataURI: ipfsMetadataURI,
        // Attach PIL terms to the IP Asset
        licenseTermsData: [
          {
            terms: pilTerms,
          },
        ],
      })
    } catch (registrationError) {
      console.error('[story-register] Registration call failed:', registrationError)
      console.error('[story-register] Error details:', {
        message: registrationError instanceof Error ? registrationError.message : String(registrationError),
        stack: registrationError instanceof Error ? registrationError.stack : undefined,
      })
      throw registrationError
    }

    console.log('[story-register] IP registered successfully')
    console.log('[story-register] IP ID:', result.ipId)
    console.log('[story-register] License Terms IDs:', result.licenseTermsIds)
    console.log('[story-register] TX Hash:', result.txHash)

    return {
      ipId: result.ipId || '',
      licenseTermsId: result.licenseTermsIds?.[0] ? String(result.licenseTermsIds[0]) : '0',
      txHash: result.txHash || '',
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
 * - nonCommercialSocialRemixing: Free remixing with attribution (no currency needed)
 * - commercialUse: Paid use, requires currency contract
 * - commercialRemix: Paid use + revenue sharing, requires currency contract
 *
 * For hackathon, we use nonCommercialSocialRemixing as it doesn't require currency setup.
 * In production with actual payments, we'd use commercialRemix with a proper currency contract.
 */
function buildPILTerms(metadata: MusicIPMetadata) {
  const { license_terms: terms } = metadata

  // For hackathon: use non-commercial social remixing (free, no currency needed)
  // This allows anyone to remix non-commercially with proper attribution
  // The actual licensing restrictions (AI training, sync, commercial) are stored
  // in the ipMetadata attributes and enforced at the application level
  let pil = PILFlavor.nonCommercialSocialRemixing()

  console.log('[story-register] Using nonComSocialRemixing PIL flavor for hackathon')

  // In production, we would:
  // 1. Set up a currency contract (USDC, IP token, etc)
  // 2. Use commercialRemix flavor with proper payment terms
  // 3. Check if AI training is allowed and set custom terms
  // 4. Use registerPILTerms() to create custom license combinations
  // 5. Attach multiple PIL terms for different use cases
  //
  // For this MVP, actual licensing restrictions are:
  // - Stored immutably in ipMetadata.attributes (ai_origin, ai_training_allowed, etc)
  // - Enforced at the application level by the catalog/API (checking metadata before allowing use)
  // - Story Protocol provides the immutable on-chain proof of creation + attribution

  return pil
}
