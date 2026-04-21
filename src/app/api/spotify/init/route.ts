/**
 * GET /api/spotify/init
 * Generates PKCE verifier and challenge, returns them for client to store
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
    // Generate PKCE verifier and challenge
    const codeVerifier = generateRandomString(128)
    const codeChallenge = sha256(codeVerifier)

    console.log('[spotify-init] Generated PKCE pair, verifier length:', codeVerifier.length)

    return NextResponse.json({
      codeVerifier,
      codeChallenge,
    })
  } catch (error) {
    console.error('Spotify init error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PKCE pair' },
      { status: 500 }
    )
  }
}
