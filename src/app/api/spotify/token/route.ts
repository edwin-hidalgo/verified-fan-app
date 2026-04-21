/**
 * POST /api/spotify/token
 * Exchange Spotify auth code for access token
 * Client-side calls this after OAuth redirect
 */

import { NextRequest, NextResponse } from 'next/server'

interface TokenRequest {
  code: string
  redirectUri: string
  codeVerifier: string
}

export async function POST(request: NextRequest) {
  try {
    const body: TokenRequest = await request.json()
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID

    if (!clientId || !body.code || !body.codeVerifier) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Exchange code for token with Spotify
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code: body.code,
        redirect_uri: body.redirectUri,
        code_verifier: body.codeVerifier,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Spotify token exchange failed:', errorData)
      return NextResponse.json(
        { error: errorData.error_description || 'Token exchange failed' },
        { status: 401 }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      expiresAt: Date.now() + data.expires_in * 1000,
    })
  } catch (error) {
    console.error('Token exchange error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
