/**
 * Spotify OAuth Callback Handler (Route Handler)
 *
 * Handles the OAuth callback from Spotify and returns an HTML page that:
 * 1. Reads the PKCE verifier from the cookie
 * 2. Exchanges the code for a token via /api/spotify/exchange
 * 3. Completes the user creation and pipeline flow
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Handle Spotify error (user denied access, etc)
  if (error) {
    const errorMessage =
      error === 'access_denied'
        ? 'You denied access to your Spotify account.'
        : `Spotify error: ${error}`

    const errorUrl = new URL('/connect', request.url)
    errorUrl.searchParams.set('error', errorMessage)
    return NextResponse.redirect(errorUrl)
  }

  // No authorization code in URL - redirect to connect
  if (!code) {
    console.error('[callback-route] No code in search params')
    return NextResponse.redirect(new URL('/connect', request.url))
  }

  // Read verifier from cookie
  const codeVerifier = request.cookies.get('spotify_code_verifier')?.value

  console.log('[callback-route] Received authorization code from Spotify, verifier in cookie:', !!codeVerifier)

  // Return an HTML page that handles the token exchange and user flow client-side
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connecting Spotify...</title>
  <style>
    body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #000; font-family: system-ui; color: #fff; }
    .container { text-align: center; }
    .spinner { width: 3rem; height: 3rem; border: 3px solid #333; border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { margin: 0; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>Connecting your music account...</p>
  </div>

  <script>
    const appUrl = ${JSON.stringify(process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000')};
    const code = ${JSON.stringify(code)};

    function getCookie(name) {
      const value = \`; \${document.cookie}\`;
      const parts = value.split(\`; \${name}=\`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    }

    console.log('[callback-page] appUrl:', appUrl);
    console.log('[callback-page] code:', code);

    async function completeOAuth() {
      try {
        // Step 1: Get PKCE verifier from cookie
        const codeVerifier = getCookie('spotify_code_verifier');
        console.log('[callback-page] codeVerifier from cookie:', !!codeVerifier);

        if (!codeVerifier) {
          throw new Error('PKCE verifier not found in cookie. Please try connecting again.');
        }

        // Step 2: Exchange code for token
        console.log('[callback-page] Exchanging code for token...');
        const exchangeResponse = await fetch(appUrl + '/api/spotify/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: code,
            codeVerifier: codeVerifier,
          }),
        });

        if (!exchangeResponse.ok) {
          const errorData = await exchangeResponse.json();
          throw new Error(errorData.error || 'Token exchange failed');
        }

        const token = await exchangeResponse.json();
        console.log('[callback-page] Token exchange succeeded');

        // Step 3: Store token in localStorage
        localStorage.setItem('spotify_token', JSON.stringify(token));

        // Step 4: Create unverified user or get existing user
        console.log('[callback-page] Creating/getting user...');
        const createUserResponse = await fetch(appUrl + '/api/user/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!createUserResponse.ok) {
          const errorData = await createUserResponse.json();
          throw new Error(errorData.error || 'Failed to create user');
        }

        const userData = await createUserResponse.json();
        const userId = userData.userId;
        console.log('[callback-page] User created/retrieved:', userId);

        // Step 5: Store userId in localStorage
        localStorage.setItem('user_id', userId);

        // Step 6: Trigger data pipeline
        console.log('[callback-page] Triggering data pipeline...');
        const pipelineResponse = await fetch(appUrl + '/api/fan-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            accessToken: token.accessToken,
          }),
        });

        if (!pipelineResponse.ok) {
          console.error('[callback-page] Pipeline failed, but continuing...');
        } else {
          console.log('[callback-page] Pipeline succeeded');
        }

        // Step 7: Redirect to profile (cookie will expire after 10 minutes)
        window.location.href = appUrl + '/profile';
      } catch (error) {
        console.error('[callback-page] Error:', error.message);
        const errorUrl = appUrl + '/connect?error=' + encodeURIComponent(error.message);
        window.location.href = errorUrl;
      }
    }

    completeOAuth();
  </script>
</body>
</html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  )
}
