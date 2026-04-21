/**
 * POST /api/user/create
 * Creates an unverified Supabase user record without World ID verification.
 * Called server-to-server from the Spotify OAuth callback when user has no existing user_id.
 *
 * This allows users to see their fan profile immediately after connecting Spotify,
 * before (or instead of) completing World ID verification.
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

export async function POST() {
  try {
    const cookieStore = await cookies()

    // Create Supabase server client (uses SERVICE_ROLE_KEY, bypasses RLS)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Generate placeholder world_id_hash for unverified user
    // Format: spotify_{UUID} so we can distinguish from real World ID hashes
    const placeholderHash = `spotify_${randomUUID()}`

    console.log('[user-create] Creating unverified user with placeholder hash:', placeholderHash)

    // Insert new unverified user
    const { data, error } = await supabase
      .from('users')
      .insert({
        world_id_hash: placeholderHash,
        is_verified: false,
        spotify_connected: false, // Will be set to true after fan-score pipeline
      })
      .select('id')
      .single()

    if (error) {
      console.error('[user-create] Database error:', error)
      throw new Error(`Failed to create user: ${error.message}`)
    }

    if (!data?.id) {
      throw new Error('No user ID returned from database')
    }

    console.log('[user-create] User created successfully:', data.id)

    return NextResponse.json(
      {
        success: true,
        userId: data.id,
      },
      { status: 201 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('[user-create] Error:', errorMessage)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
