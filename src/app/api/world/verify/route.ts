/**
 * POST /api/world/verify
 * Verify World ID proof (register-work action) and create/update user for music registry
 *
 * Request body:
 * {
 *   "payload": { "nullifier_hash": "0x...", ... },
 *   "world_wallet_address": "0x...",
 *   "world_username": "creator_name"
 * }
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface VerifyRequest {
  payload: {
    nullifier_hash: string
  }
  world_wallet_address?: string
  world_username?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json()
    const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

    const nullifierHash = body.payload?.nullifier_hash
    const walletAddress = body.world_wallet_address
    const username = body.world_username

    if (!nullifierHash) {
      return NextResponse.json(
        { error: 'No World ID proof provided' },
        { status: 400 }
      )
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      )
    }

    // Verify with World API (unless dev mode)
    if (!devMode) {
      const worldAppId = process.env.NEXT_PUBLIC_WORLD_APP_ID
      const worldActionId = process.env.WORLD_APP_ACTION_ID || 'register-work'

      if (!worldAppId) {
        return NextResponse.json(
          { error: 'World ID not configured' },
          { status: 500 }
        )
      }

      console.log('[world-verify] Verifying World ID with action:', worldActionId)

      const verifyResponse = await fetch(
        `https://developer.worldcoin.org/api/v2/verify/${worldAppId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nullifier_hash: nullifierHash,
            action: worldActionId,
            signal: walletAddress, // Use wallet as signal for uniqueness
          }),
        }
      )

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        console.error('[world-verify] World ID verification failed:', errorData)
        return NextResponse.json(
          { error: 'World ID verification failed' },
          { status: 401 }
        )
      }

      console.log('[world-verify] World ID verification succeeded')
    }

    // Upsert user in Supabase (music registry schema)
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          world_wallet_address: walletAddress,
          world_nullifier_hash: nullifierHash,
          world_username: username || null,
          orb_verified: true,
        },
        {
          onConflict: 'world_nullifier_hash', // If nullifier already exists, update it
        }
      )
      .select('id')
      .single()

    if (error) {
      console.error('[world-verify] Error upserting user:', error)
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      )
    }

    const userId = data.id
    console.log('[world-verify] User verified/created:', userId)

    return NextResponse.json({
      success: true,
      userId,
      walletAddress,
    })
  } catch (error) {
    console.error('[world-verify] Verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
