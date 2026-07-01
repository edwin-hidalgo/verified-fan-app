/**
 * DEBUG ENDPOINT - Lists all users and their track counts
 * Remove this before shipping to production!
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, world_wallet_address, world_username')

    if (usersError) {
      return NextResponse.json({ error: 'Failed to fetch users', details: usersError.message }, { status: 500 })
    }

    // For each user, get their track count
    const usersWithTracks = await Promise.all(
      users.map(async (user) => {
        const { count, error } = await supabase
          .from('tracks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        return {
          userId: user.id,
          wallet: user.world_wallet_address,
          username: user.world_username,
          trackCount: error ? 0 : count || 0,
        }
      })
    )

    return NextResponse.json({
      totalUsers: users.length,
      users: usersWithTracks.sort((a, b) => b.trackCount - a.trackCount),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
