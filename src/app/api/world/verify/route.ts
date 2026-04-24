/**
 * POST /api/world/verify
 * Verify SIWE (Sign-In With Ethereum) wallet authentication for creator registration
 *
 * Request body:
 * {
 *   "address": "0x...",
 *   "message": "Sign in to verify...",
 *   "signature": "0x...",
 *   "orb_verified": true,
 *   "username": "creator_name",
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

export async function GET(request: NextRequest) {
  // World App redirects here after verification - just redirect to landing page
  const { searchParams } = new URL(request.url)
  const returnTo = searchParams.get('return_to') || '/'
  return Response.redirect(new URL(returnTo, request.url))
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
        console.log('[world-verify] Verifying SIWE signature')
        console.log('[world-verify] Provided address:', providedAddress)
        console.log('[world-verify] Message length:', message.length)
        console.log('[world-verify] Signature:', signature.substring(0, 20) + '...')

        // Recover the signer address from the signature
        const recoveredAddress = await recoverMessageAddress({
          message,
          signature: signature as `0x${string}`,
        })
        console.log('[world-verify] Recovered address:', recoveredAddress)

        // Use the recovered address (it's cryptographically verified)
        address = recoveredAddress
        console.log('[world-verify] SIWE signature verified - using recovered address')
      } catch (signatureError) {
        console.error('[world-verify] Signature verification error:', signatureError)
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
      console.error('[world-verify] Error upserting user:', error)
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      )
    }

    const userId = data.id
    console.log('[world-verify] User verified/created:', userId, 'address:', address)

    // Fetch full user data to return to client
    const { data: fullUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('[world-verify] Error fetching user data:', fetchError)
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
    console.error('[world-verify] Verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
