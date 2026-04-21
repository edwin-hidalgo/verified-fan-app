/**
 * GET /api/spotify/auth
 * Generates PKCE pair on the fly, stores verifier in cookie,
 * and redirects to Spotify authorization endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

function generateRandomString(length: number): string {
  return randomBytes(length)
    .toString('base64url')
    .slice(0, length)
}

function sha256(plain: string): string {
  return createHash('sha256')
    .update(plain)
    .digest('base64url')
}

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'Spotify configuration missing' },
        { status: 500 }
      )
    }

    // Generate PKCE verifier and challenge
    const codeVerifier = generateRandomString(128)
    const codeChallenge = sha256(codeVerifier)

    console.log('[spotify-auth] Generated PKCE pair, verifier length:', codeVerifier.length)

    // Scopes
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-top-read',
      'user-read-recently-played',
      'user-read-currently-playing',
      'user-library-read',
      'playlist-read-private',
    ].join(' ')

    // Build Spotify auth URL
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    })

    const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${params.toString()}`

    console.log('[spotify-auth] Redirecting to Spotify')

    // Create response with redirect
    const response = NextResponse.redirect(spotifyAuthUrl)

    // Set verifier in a regular (non-httpOnly) cookie
    // Non-httpOnly allows client-side JS to read it if needed, but it persists through redirects
    response.cookies.set('spotify_code_verifier', codeVerifier, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    })

    console.log('[spotify-auth] Set spotify_code_verifier cookie (non-httpOnly)')

    return response
  } catch (error) {
    console.error('Spotify auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
