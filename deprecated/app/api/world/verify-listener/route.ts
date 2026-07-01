/**
 * POST /api/world/verify-listener
 * Verify SIWE (Sign-In With Ethereum) wallet authentication for listener registration
 *
 * Same as /api/world/verify but for listeners. Users can verify as listeners to enable play counting.
 *
 * Request body:
 * {
 *   "address": "0x...",
 *   "message": "Sign in to verify...",
 *   "signature": "0x...",
 *   "orb_verified": true,
 *   "username": "listener_name",
 *   "devMode": boolean (optional, for dev mode bypass)
 * }
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { recoverMessageAddress, getAddress } from 'viem'
import { NextRequest, NextResponse } from 'next/server'

interface VerifyRequest {
  address: string
  message: string
  signature: string
  orb_verified?: boolean
  username?: string
  devMode?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json()

    const { address: providedAddress, message, signature, orb_verified = false, username, devMode = false } = body

    if (!providedAddress || !message || !signature) {
      return NextResponse.json(
        { error: 'Address, message, and signature required' },
        { status: 400 }
      )
    }

    let address = providedAddress
    // Verify SIWE signature (unless dev mode)
    if (!devMode) {
      try {
        console.log('[world-verify-listener] Verifying SIWE signature')
        console.log('[world-verify-listener] Provided address:', providedAddress)
        console.log('[world-verify-listener] Message length:', message.length)
        console.log('[world-verify-listener] Signature:', signature.substring(0, 20) + '...')

        // Recover the signer address from the signature
        const recoveredAddress = await recoverMessageAddress({
          message,
          signature: signature as `0x${string}`,
        })
        console.log('[world-verify-listener] Recovered address:', recoveredAddress)

        // Use the recovered address (it's cryptographically verified)
        address = recoveredAddress
        console.log('[world-verify-listener] SIWE signature verified - using recovered address')
      } catch (signatureError) {
        console.error('[world-verify-listener] Signature verification error:', signatureError)
        return NextResponse.json(
          { error: 'Signature verification failed' },
          { status: 401 }
        )
      }
    }

    // Upsert user in Supabase (music registry schema)
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          world_wallet_address: address,
          world_nullifier_hash: null, // No longer using nullifier hash
          world_username: username || null,
          orb_verified: orb_verified || false,
        },
        {
          onConflict: 'world_wallet_address', // Use wallet address as unique identifier
        }
      )
      .select('id')
      .single()

    if (error) {
      console.error('[world-verify-listener] Error upserting user:', error)
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      )
    }

    const userId = data.id
    console.log('[world-verify-listener] Listener verified/created:', userId, 'address:', address)

    // Fetch full user data to return to client
    const { data: fullUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('[world-verify-listener] Error fetching user data:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userId: fullUser.id,
      walletAddress: fullUser.world_wallet_address,
      username: fullUser.world_username,
      orbVerified: fullUser.orb_verified,
    })
  } catch (error) {
    console.error('[world-verify-listener] Verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
