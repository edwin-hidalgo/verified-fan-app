/**
 * spotify/api.ts — Spotify Web API helper functions
 *
 * These functions make authenticated requests to the Spotify Web API.
 */

interface SpotifyFetchOptions extends RequestInit {
  headers?: Record<string, string>
}

/**
 * Helper to make authenticated Spotify API requests
 */
async function spotifyFetch(
  url: string,
  accessToken: string,
  options: SpotifyFetchOptions = {}
): Promise<any> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `Spotify API error: ${response.status} ${response.statusText} - ${errorData.error?.message || ''}`
    )
  }

  return response.json()
}

/**
 * getCurrentUser
 * Fetch the current user's profile
 */
export async function getCurrentUser(accessToken: string): Promise<any> {
  return spotifyFetch('https://api.spotify.com/v1/me', accessToken)
}

/**
 * getRecentlyPlayed
 * Get the user's recently played tracks
 */
export async function getRecentlyPlayed(
  accessToken: string,
  limit: number = 50
): Promise<any> {
  const params = new URLSearchParams({ limit: limit.toString() })
  return spotifyFetch(
    `https://api.spotify.com/v1/me/player/recently-played?${params}`,
    accessToken
  )
}

/**
 * getCurrentlyPlaying
 * Get the currently playing track (or null if nothing is playing)
 */
export async function getCurrentlyPlaying(accessToken: string): Promise<any> {
  try {
    const data = await spotifyFetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      accessToken
    )

    if (!data || !data.item) {
      return null
    }

    return {
      songName: data.item.name,
      artist: data.item.artists?.[0]?.name || 'Unknown',
      albumArt: data.item.album?.images?.[0]?.url || null,
      uri: data.item.uri,
      isPlaying: data.is_playing,
      progressMs: data.progress_ms,
      durationMs: data.item.duration_ms,
      raw: data,
    }
  } catch (err) {
    console.warn('Error fetching currently playing:', err)
    return null
  }
}

/**
 * getTopTracks
 * Get the user's top tracks for a specific time range
 *
 * timeRange: 'long_term' | 'medium_term' | 'short_term'
 */
export async function getTopTracks(
  accessToken: string,
  timeRange: 'long_term' | 'medium_term' | 'short_term' = 'medium_term',
  limit: number = 50
): Promise<any> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    time_range: timeRange,
  })
  return spotifyFetch(
    `https://api.spotify.com/v1/me/top/tracks?${params}`,
    accessToken
  )
}

/**
 * getTopArtists
 * Get the user's top artists for a specific time range
 */
export async function getTopArtists(
  accessToken: string,
  timeRange: 'long_term' | 'medium_term' | 'short_term' = 'medium_term',
  limit: number = 50
): Promise<any> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    time_range: timeRange,
  })
  return spotifyFetch(
    `https://api.spotify.com/v1/me/top/artists?${params}`,
    accessToken
  )
}

/**
 * getSavedTracks
 * Get all of the user's saved tracks (paginated)
 * Spotify API returns 50 per page, we loop to get all
 */
export async function getSavedTracks(accessToken: string): Promise<any[]> {
  const allTracks: any[] = []
  let nextUrl: string | null =
    'https://api.spotify.com/v1/me/tracks?limit=50'

  while (nextUrl) {
    const data = await spotifyFetch(nextUrl, accessToken)
    allTracks.push(...(data.items || []))
    nextUrl = data.next || null
  }

  return allTracks
}

/**
 * getArtist
 * Get details for a specific artist
 */
export async function getArtist(
  accessToken: string,
  artistId: string
): Promise<any> {
  return spotifyFetch(`https://api.spotify.com/v1/artists/${artistId}`, accessToken)
}

/**
 * getArtistAlbums
 * Get an artist's albums
 */
export async function getArtistAlbums(
  accessToken: string,
  artistId: string,
  limit: number = 50
): Promise<any> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    include_groups: 'album,single',
  })
  return spotifyFetch(
    `https://api.spotify.com/v1/artists/${artistId}/albums?${params}`,
    accessToken
  )
}

/**
 * getArtistTopTracks
 * Get an artist's top tracks
 */
export async function getArtistTopTracks(
  accessToken: string,
  artistId: string,
  market: string = 'US'
): Promise<any> {
  const params = new URLSearchParams({ market })
  return spotifyFetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?${params}`,
    accessToken
  )
}

/**
 * getTrack
 * Get details for a specific track
 */
export async function getTrack(
  accessToken: string,
  trackId: string
): Promise<any> {
  return spotifyFetch(`https://api.spotify.com/v1/tracks/${trackId}`, accessToken)
}

/**
 * getTracks
 * Get details for multiple tracks (up to 50 at once)
 */
export async function getTracks(
  accessToken: string,
  trackIds: string | string[]
): Promise<any> {
  const ids = Array.isArray(trackIds) ? trackIds.join(',') : trackIds
  const params = new URLSearchParams({ ids })
  return spotifyFetch(
    `https://api.spotify.com/v1/tracks?${params}`,
    accessToken
  )
}

/**
 * getPlaylist
 * Get details for a playlist
 */
export async function getPlaylist(
  accessToken: string,
  playlistId: string
): Promise<any> {
  return spotifyFetch(
    `https://api.spotify.com/v1/playlists/${playlistId}`,
    accessToken
  )
}

/**
 * search
 * Search for tracks, artists, albums, or playlists
 */
export async function search(
  accessToken: string,
  query: string,
  type: string = 'track',
  limit: number = 20
): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    type,
    limit: limit.toString(),
  })
  return spotifyFetch(
    `https://api.spotify.com/v1/search?${params}`,
    accessToken
  )
}
