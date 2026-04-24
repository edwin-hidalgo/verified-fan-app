import 'server-only'

import { StoryClient, StoryConfig } from '@story-protocol/core-sdk'
import { http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

let client: StoryClient | null = null
let serviceWalletAddress: string | null = null

export function getStoryClient(): StoryClient {
  if (client) {
    return client
  }

  const rpcUrl = process.env.STORY_RPC_URL || 'https://aeneid.storyrpc.io'
  const privateKey = process.env.STORY_SERVICE_WALLET_PRIVATE_KEY

  if (!privateKey) {
    throw new Error(
      'STORY_SERVICE_WALLET_PRIVATE_KEY not configured. ' +
      'Generate with: openssl rand -hex 32 and fund at https://aeneid.faucet.story.foundation'
    )
  }

  // Ensure private key has 0x prefix
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`

  try {
    const account = privateKeyToAccount(formattedKey as `0x${string}`)
    serviceWalletAddress = account.address

    const config: StoryConfig = {
      account,
      transport: http(rpcUrl),
      chainId: 'aeneid',
    }

    client = StoryClient.newClient(config)
    console.log('[story-client] Initialized for Aeneid testnet')
    console.log('[story-client] Service wallet:', account.address)

    return client
  } catch (error) {
    console.error('[story-client] Failed to initialize:', error)
    throw error
  }
}

export function getServiceWalletAddress(): string {
  if (!serviceWalletAddress) {
    // Initialize client if not already done
    getStoryClient()
  }

  if (!serviceWalletAddress) {
    throw new Error('Failed to determine service wallet address')
  }

  return serviceWalletAddress
}

