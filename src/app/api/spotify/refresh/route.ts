/**
 * POST /api/spotify/refresh
 * Refresh expired Spotify access token
 */

import { NextRequest, NextResponse } from 'next/server'

interface RefreshRequest {
  refreshToken: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RefreshRequest = await request.json()
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID

    if (!clientId || !body.refreshToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: body.refreshToken,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Spotify token refresh failed:', errorData)
      return NextResponse.json(
        { error: errorData.error_description || 'Token refresh failed' },
        { status: 401 }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      expiresAt: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token || body.refreshToken,
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
