/**
 * POST /api/world/verify
 * Verify World ID proof and create/update user in Supabase
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface VerifyRequest {
  payload: {
    nullifier_hash: string
  }
  action?: string
  signal?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json()
    const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

    let worldIdHash = body.payload?.nullifier_hash

    // Dev mode: generate mock hash if not provided
    if (devMode && !worldIdHash) {
      worldIdHash = `dev_${Date.now()}_${Math.random().toString(36).substring(2)}`
    }

    if (!worldIdHash) {
      return NextResponse.json(
        { error: 'No World ID proof provided' },
        { status: 400 }
      )
    }

    // If not dev mode, verify with World API
    if (!devMode) {
      const worldAppId = process.env.NEXT_PUBLIC_WORLD_APP_ID
      const worldActionId = process.env.WORLD_APP_ACTION_ID

      if (!worldAppId || !worldActionId) {
        return NextResponse.json(
          { error: 'World ID not configured' },
          { status: 500 }
        )
      }

      const verifyResponse = await fetch(
        `https://developer.worldcoin.org/api/v2/verify/${worldAppId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nullifier_hash: worldIdHash,
            action: body.action || worldActionId,
            signal: body.signal || '',
          }),
        }
      )

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        console.error('World ID verification failed:', errorData)
        return NextResponse.json(
          { error: 'World ID verification failed' },
          { status: 401 }
        )
      }
    }

    // Create or update user in Supabase
    const supabase = await createServerSupabaseClient()

    // Check if user_id cookie exists (from unverified Spotify OAuth flow)
    const userIdCookie = request.cookies.get('user_id')?.value

    console.log('[world-verify] user_id cookie found:', !!userIdCookie)

    let userId: string

    if (userIdCookie) {
      // User exists (created during Spotify OAuth), update with real world_id_hash
      console.log('[world-verify] Updating existing user with world_id_hash:', userIdCookie)

      const { data, error } = await supabase
        .from('users')
        .update({
          world_id_hash: worldIdHash,
          is_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userIdCookie)
        .select('id')
        .single()

      if (error) {
        console.error('[world-verify] Error updating user:', error)
        return NextResponse.json(
          { error: 'Failed to verify user' },
          { status: 500 }
        )
      }

      userId = data.id
      console.log('[world-verify] User updated successfully')
    } else {
      // No user_id cookie — this is World-ID-first flow
      // Check if user with this world_id_hash already exists
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('world_id_hash', worldIdHash)
        .single()

      if (existingUser) {
        // User already verified with this hash, just update is_verified
        console.log('[world-verify] User already exists with this hash, updating is_verified')

        const { data, error } = await supabase
          .from('users')
          .update({ is_verified: true, updated_at: new Date().toISOString() })
          .eq('id', existingUser.id)
          .select('id')
          .single()

        if (error) {
          console.error('[world-verify] Error updating user:', error)
          return NextResponse.json(
            { error: 'Failed to verify user' },
            { status: 500 }
          )
        }

        userId = data.id
      } else {
        // New user (World-ID-first flow), create entry
        console.log('[world-verify] Creating new user with world_id_hash')

        const { data, error } = await supabase
          .from('users')
          .insert({
            world_id_hash: worldIdHash,
            is_verified: true,
          })
          .select('id')
          .single()

        if (error) {
          console.error('[world-verify] Error creating user:', error)
          return NextResponse.json(
            { error: 'Failed to create verified user' },
            { status: 500 }
          )
        }

        userId = data.id
        console.log('[world-verify] New user created successfully')
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      worldIdHash,
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
