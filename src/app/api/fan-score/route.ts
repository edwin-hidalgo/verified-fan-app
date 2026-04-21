/**
 * POST /api/fan-score
 * Comprehensive data pipeline:
 * 1. Fetch user profile from Spotify
 * 2. Fetch top artists (3 time ranges) and saved tracks
 * 3. Store in Supabase
 * 4. Calculate fan scores
 * 5. Return results
 */

import { calculateFanScore } from '@/lib/fanScore'
import { getTopArtists, getRecentlyPlayed, getSavedTracks, getCurrentUser } from '@/lib/spotify/api'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface FanScoreRequest {
  userId: string
  accessToken: string
}

export async function POST(request: NextRequest) {
  try {
    const body: FanScoreRequest = await request.json()
    const { userId, accessToken } = body

    if (!userId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing userId or accessToken' },
        { status: 400 }
      )
    }

    // Step 1: Fetch user profile from Spotify
    const spotifyUser = await getCurrentUser(accessToken)

    // Step 2: Fetch top artists for all 3 time ranges
    const topArtistsShort = await getTopArtists(
      accessToken,
      'short_term',
      50
    )
    const topArtistsMedium = await getTopArtists(
      accessToken,
      'medium_term',
      50
    )
    const topArtistsLong = await getTopArtists(accessToken, 'long_term', 50)

    // Step 3: Fetch saved tracks
    const savedTracksRaw = await getSavedTracks(accessToken)

    const supabase = await createServerSupabaseClient()

    // Step 4: Update user profile in Supabase
    await supabase
      .from('users')
      .update({
        spotify_id: spotifyUser.id,
        display_name: spotifyUser.display_name,
        profile_image: spotifyUser.images?.[0]?.url || null,
        spotify_connected: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    // Step 5: Store top artists in Supabase
    const artistsToInsert = [
      ...topArtistsShort.items.map((artist: any, idx: number) => ({
        user_id: userId,
        artist_spotify_id: artist.id,
        artist_name: artist.name,
        artist_image: artist.images?.[0]?.url || null,
        time_range: 'short_term',
        rank: idx + 1,
      })),
      ...topArtistsMedium.items.map((artist: any, idx: number) => ({
        user_id: userId,
        artist_spotify_id: artist.id,
        artist_name: artist.name,
        artist_image: artist.images?.[0]?.url || null,
        time_range: 'medium_term',
        rank: idx + 1,
      })),
      ...topArtistsLong.items.map((artist: any, idx: number) => ({
        user_id: userId,
        artist_spotify_id: artist.id,
        artist_name: artist.name,
        artist_image: artist.images?.[0]?.url || null,
        time_range: 'long_term',
        rank: idx + 1,
      })),
    ]

    // Upsert artists (handle duplicates across time ranges)
    for (const artist of artistsToInsert) {
      await supabase.from('spotify_top_artists').upsert(artist, {
        onConflict: 'user_id,artist_spotify_id,time_range',
      })
    }

    // Step 6: Store saved tracks
    const tracksToInsert = savedTracksRaw.map((item: any) => ({
      user_id: userId,
      track_spotify_id: item.track.id,
      track_name: item.track.name,
      artist_spotify_id: item.track.artists?.[0]?.id || null,
      artist_name: item.track.artists?.[0]?.name || null,
      saved_at: item.added_at,
    }))

    // Batch insert saved tracks (limit to 1000 per call to avoid timeouts)
    const batchSize = 1000
    for (let i = 0; i < tracksToInsert.length; i += batchSize) {
      const batch = tracksToInsert.slice(i, i + batchSize)
      await supabase.from('spotify_saved_tracks').upsert(batch, {
        onConflict: 'user_id,track_spotify_id',
      })
    }

    // Step 7: Calculate fan scores
    // Get unique artists from all time ranges
    const allArtists = new Set<string>()
    artistsToInsert.forEach((a: any) => allArtists.add(a.artist_spotify_id))

    const fanScoresToInsert: any[] = []

    for (const artistSpotifyId of allArtists) {
      // Find this artist in each time range
      const shortTermData = topArtistsShort.items.find(
        (a: any) => a.id === artistSpotifyId
      )
      const mediumTermData = topArtistsMedium.items.find(
        (a: any) => a.id === artistSpotifyId
      )
      const longTermData = topArtistsLong.items.find(
        (a: any) => a.id === artistSpotifyId
      )

      // Count saved tracks by this artist
      const savedTracksByArtist = tracksToInsert.filter(
        (t: any) => t.artist_spotify_id === artistSpotifyId
      ).length

      // Calculate fan score
      const scoreData = calculateFanScore({
        topArtistShort: !!shortTermData,
        rankShort: shortTermData
          ? topArtistsShort.items.indexOf(shortTermData) + 1
          : null,
        topArtistMedium: !!mediumTermData,
        rankMedium: mediumTermData
          ? topArtistsMedium.items.indexOf(mediumTermData) + 1
          : null,
        topArtistLong: !!longTermData,
        rankLong: longTermData
          ? topArtistsLong.items.indexOf(longTermData) + 1
          : null,
        savedTrackCount: savedTracksByArtist,
      })

      fanScoresToInsert.push({
        user_id: userId,
        artist_spotify_id: artistSpotifyId,
        artist_name:
          shortTermData?.name ||
          mediumTermData?.name ||
          longTermData?.name ||
          'Unknown',
        artist_image:
          shortTermData?.images?.[0]?.url ||
          mediumTermData?.images?.[0]?.url ||
          longTermData?.images?.[0]?.url ||
          null,
        fan_score: scoreData.score,
        top_artist_short: !!shortTermData,
        top_artist_medium: !!mediumTermData,
        top_artist_long: !!longTermData,
        saved_track_count: savedTracksByArtist,
        rank_short: shortTermData
          ? topArtistsShort.items.indexOf(shortTermData) + 1
          : null,
        rank_medium: mediumTermData
          ? topArtistsMedium.items.indexOf(mediumTermData) + 1
          : null,
        rank_long: longTermData
          ? topArtistsLong.items.indexOf(longTermData) + 1
          : null,
      })
    }

    // Upsert fan scores
    for (const fanScore of fanScoresToInsert) {
      await supabase.from('verified_fan_scores').upsert(fanScore, {
        onConflict: 'user_id,artist_spotify_id',
      })
    }

    return NextResponse.json({
      success: true,
      userId,
      artistsProcessed: allArtists.size,
      tracksProcessed: tracksToInsert.length,
      fanScoresCalculated: fanScoresToInsert.length,
    })
  } catch (error) {
    console.error('Fan score pipeline error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process fan data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
