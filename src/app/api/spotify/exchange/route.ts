/**
 * POST /api/spotify/exchange
 * Exchanges Spotify authorization code for access token using PKCE verifier
 */

import { exchangeCodeForToken } from '@/lib/spotify/auth'
import { NextRequest, NextResponse } from 'next/server'

interface ExchangeRequest {
  code: string
  codeVerifier: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ExchangeRequest = await request.json()
    const { code, codeVerifier } = body

    if (!code || !codeVerifier) {
      return NextResponse.json(
        { error: 'Missing code or codeVerifier' },
        { status: 400 }
      )
    }

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'Spotify configuration missing' },
        { status: 500 }
      )
    }

    console.log('[spotify-exchange] Exchanging code for token with PKCE verifier')
    const token = await exchangeCodeForToken(clientId, redirectUri, code, codeVerifier)
    console.log('[spotify-exchange] Token exchange succeeded, accessToken exists:', !!token.accessToken)

    return NextResponse.json({
      success: true,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresIn: token.expiresIn,
    })
  } catch (error) {
    console.error('Spotify exchange error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Token exchange failed'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
