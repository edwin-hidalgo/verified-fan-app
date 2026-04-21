'use client'

import { MiniKit } from '@worldcoin/minikit-js'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

  const handleWorldIDVerify = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Check if MiniKit is available
      if (!MiniKit.isInstalled()) {
        if (!devMode) {
          setError('World App not detected. Please open this app in World App.')
          setIsLoading(false)
          return
        }
        // Dev mode: skip to mock verification
        await handleDevModeVerification()
        return
      }

      // Call MiniKit verification
      const response = await MiniKit.commandsAsync.verify({
        action: process.env.NEXT_PUBLIC_WORLD_APP_ACTION_ID || 'verify-listen',
      })

      if (!response.success) {
        setError(response.error?.message || 'Verification failed. Please try again.')
        setIsLoading(false)
        return
      }

      // Send proof to backend for validation
      const verifyResponse = await fetch('/api/world/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: response,
          action: process.env.NEXT_PUBLIC_WORLD_APP_ACTION_ID,
          signal: response.signal,
        }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        setError(errorData.error || 'Server verification failed.')
        setIsLoading(false)
        return
      }

      const verifyData = await verifyResponse.json()

      // Store verification data in localStorage (client-side access)
      localStorage.setItem('world_id_hash', verifyData.worldIdHash)
      localStorage.setItem('user_id', verifyData.userId)
      localStorage.setItem('is_verified', 'true')

      // Also store user_id in a regular cookie so the callback page (server component) can access it
      document.cookie = `user_id=${verifyData.userId}; path=/; max-age=${60 * 60 * 24}`

      // With the new flow, users connect Spotify first, so we always have spotify_token at this point
      // Just redirect to profile — the profile will refetch data with the user_id now being verified
      console.log('[verify] Verification succeeded, redirecting to /profile')
      router.push('/profile')
    } catch (err) {
      console.error('World ID verification error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during verification.')
      setIsLoading(false)
    }
  }

  const handleDevModeVerification = async () => {
    try {
      // Call backend to create user with mock World ID hash
      const response = await fetch('/api/world/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: { nullifier_hash: null },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Dev mode verification failed.')
        setIsLoading(false)
        return
      }

      const data = await response.json()

      // Store verification data in localStorage (client-side access)
      localStorage.setItem('world_id_hash', data.worldIdHash)
      localStorage.setItem('user_id', data.userId)
      localStorage.setItem('is_verified', 'true')

      // Also store user_id in a regular cookie so the callback page (server component) can access it
      document.cookie = `user_id=${data.userId}; path=/; max-age=${60 * 60 * 24}`

      // Check if user already has Spotify token (connected before verification)
      const spotifyTokenStr = localStorage.getItem('spotify_token')
      if (spotifyTokenStr) {
        try {
          const spotifyToken = JSON.parse(spotifyTokenStr)
          // Trigger data pipeline now that user is verified
          const pipelineResponse = await fetch('/api/fan-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.userId,
              accessToken: spotifyToken.accessToken,
            }),
          })

          if (pipelineResponse.ok) {
            // Pipeline succeeded - go to profile
            router.push('/profile')
            return
          }
        } catch (err) {
          console.error('Failed to trigger data pipeline:', err)
          // Fall through to redirect to connect
        }
      }

      // No Spotify token yet - redirect to connect Spotify
      router.push('/connect')
    } catch (err) {
      console.error('Dev mode verification error:', err)
      setError(err instanceof Error ? err.message : 'Dev mode verification failed.')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4 py-12">
      <main className="w-full max-w-lg flex flex-col items-center justify-center gap-8 text-center">
        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Verify you're human.
          </h1>
          <p className="text-xl text-gray-300">
            One-time verification with World ID.
          </p>
        </div>

        {/* Description */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 max-w-sm">
          <p className="text-gray-300 leading-relaxed">
            World ID proves you're a unique human without revealing who you are. Quick, private, and works everywhere.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-300 text-sm">
            <p className="font-semibold mb-1">Verification Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Verify Button */}
        <button
          onClick={handleWorldIDVerify}
          disabled={isLoading}
          className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? 'Verifying...' : 'Verify with World ID'}
        </button>

        {/* Dev mode bypass */}
        {devMode && (
          <div className="pt-4 border-t border-gray-800 w-full max-w-sm space-y-4">
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 text-blue-300 text-sm">
              <p className="font-semibold mb-2">Dev Mode Active</p>
              <p>World ID verification is mocked. Use the button below to continue without verification.</p>
            </div>
            <button
              onClick={() => handleDevModeVerification()}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-blue-600/20 border border-blue-500/50 text-blue-300 font-semibold rounded-full hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm"
            >
              {isLoading ? 'Skipping...' : 'Skip Verification (Dev Mode)'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
