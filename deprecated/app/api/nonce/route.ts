/**
 * GET /api/nonce
 * Generate a cryptographically random nonce for SIWE (Sign-In With Ethereum)
 *
 * MiniKit.walletAuth() requires a nonce to be at least 8 alphanumeric characters.
 */

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Generate a random nonce using Web Crypto API
    // Format: alphanumeric, at least 8 chars (MiniKit requirement)
    const randomBytes = new Uint8Array(16)
    crypto.getRandomValues(randomBytes)

    // Convert to base36 (alphanumeric) string
    const nonce = Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 32)

    return NextResponse.json({ nonce })
  } catch (error) {
    console.error('[nonce] Error generating nonce:', error)
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    )
  }
}
