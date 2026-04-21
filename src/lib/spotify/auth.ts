/**
 * spotify/auth.ts — Spotify OAuth 2.0 Authorization Code Flow with PKCE
 *
 * Implements the OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Public Clients)
 * which is the recommended flow for single-page applications.
 *
 * Reference: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 */

export interface SpotifyToken {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
  expiresAt: number
}

/**
 * Generate a random string for PKCE code_challenge
 */
function generateRandomString(length: number): string {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let text = ''
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

/**
 * Generate SHA256 hash of the code verifier (for PKCE)
 */
async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * generateAuthUrl
 * Generates the authorization URL to redirect the user to Spotify login.
 */
export async function generateAuthUrl(
  clientId: string,
  redirectUri: string,
  scopes: string[] = []
): Promise<string> {
  console.log('[generateAuthUrl] Starting with clientId:', clientId, 'redirectUri:', redirectUri)

  const defaultScopes = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-read-recently-played',
    'user-read-currently-playing',
    'user-library-read',
    'playlist-read-private',
  ]
  const allScopes = scopes.length > 0 ? scopes : defaultScopes
  console.log('[generateAuthUrl] Scopes:', allScopes)

  const codeVerifier = generateRandomString(128)
  console.log('[generateAuthUrl] Generated code verifier')

  const codeChallenge = await sha256(codeVerifier)
  console.log('[generateAuthUrl] Generated code challenge:', codeChallenge)

  // Store code verifier for later use in callback
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('spotify_code_verifier', codeVerifier)
    console.log('[generateAuthUrl] Stored code verifier in sessionStorage')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: allScopes.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  })

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`
  console.log('[generateAuthUrl] Generated auth URL:', authUrl)
  return authUrl
}

/**
 * exchangeCodeForToken
 * Exchange authorization code for access token (called from callback URL)
 *
 * Can be called from client (reads from sessionStorage) or server (pass codeVerifier explicitly)
 */
export async function exchangeCodeForToken(
  clientId: string,
  redirectUri: string,
  code: string,
  codeVerifier?: string
): Promise<SpotifyToken> {
  // If codeVerifier not provided, try to get from sessionStorage (client-side)
  let verifier = codeVerifier
  if (!verifier && typeof window !== 'undefined') {
    verifier = sessionStorage.getItem('spotify_code_verifier') || undefined
  }

  if (!verifier) {
    throw new Error(
      'Code verifier not found. Authorization flow was interrupted.'
    )
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(
      `Token exchange failed: ${errorData.error_description || errorData.error}`
    )
  }

  const data = await response.json()

  // Clear code verifier from session
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('spotify_code_verifier')
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

/**
 * refreshAccessToken
 * Refresh an expired access token using the refresh token
 */
export async function refreshAccessToken(
  clientId: string,
  refreshToken: string
): Promise<Omit<SpotifyToken, 'tokenType'>> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(
      `Token refresh failed: ${errorData.error_description || errorData.error}`
    )
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    expiresAt: Date.now() + data.expires_in * 1000,
    refreshToken: data.refresh_token || refreshToken, // refresh_token may not be returned
  }
}

/**
 * spotifyApiFetch
 * Helper to make authenticated requests to Spotify API with automatic token refresh.
 */
export async function spotifyApiFetch(
  url: string,
  accessToken: string,
  refreshToken: string,
  clientId: string,
  onTokenRefresh: (token: Omit<SpotifyToken, 'tokenType'>) => void
): Promise<any> {
  let token = accessToken

  // Try the request
  let response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  // If 401 Unauthorized, refresh token and retry
  if (response.status === 401 && refreshToken) {
    const newToken = await refreshAccessToken(clientId, refreshToken)
    onTokenRefresh(newToken) // callback to update token state

    token = newToken.accessToken
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  if (!response.ok) {
    throw new Error(
      `Spotify API error: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}
