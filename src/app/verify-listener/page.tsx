'use client'

import { MiniKit } from '@worldcoin/minikit-js'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyListenerPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

  const handleWorldIDVerify = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Check if MiniKit is available (inside World App)
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

      // Fetch a nonce from the backend for SIWE (Sign-In With Ethereum)
      const nonceResponse = await fetch('/api/nonce')
      if (!nonceResponse.ok) {
        setError('Failed to generate nonce. Please try again.')
        setIsLoading(false)
        return
      }

      const { nonce } = await nonceResponse.json()

      // Call MiniKit walletAuth with nonce for SIWE flow
      const walletResult = await MiniKit.walletAuth({
        nonce,
        statement: 'Sign in to verify as a listener and track your music engagement.',
      })

      if (!walletResult.data || !('address' in walletResult.data)) {
        setError('Wallet authentication failed. Please try again.')
        setIsLoading(false)
        return
      }

      const { address, message, signature } = walletResult.data

      // Check if user is orb-verified
      const orbVerified = MiniKit.user?.verificationStatus?.isOrbVerified || false

      // Send wallet auth proof to backend for verification
      const verifyResponse = await fetch('/api/world/verify-listener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          message,
          signature,
          orb_verified: orbVerified,
          username: MiniKit.user?.username || 'listener',
        }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        setError(errorData.error || 'Server verification failed.')
        setIsLoading(false)
        return
      }

      const verifyData = await verifyResponse.json()

      // Store listener data in localStorage
      localStorage.setItem('listener_id', verifyData.userId)
      localStorage.setItem(
        'listener_data',
        JSON.stringify({
          world_wallet_address: verifyData.walletAddress,
          world_username: verifyData.username,
          orb_verified: verifyData.orbVerified,
        })
      )

      console.log('[verify-listener] World ID verification succeeded, redirecting to /catalog')
      router.push('/catalog')
    } catch (err) {
      console.error('World ID verification error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during verification.')
      setIsLoading(false)
    }
  }

  const handleDevModeVerification = async () => {
    try {
      // Generate mock wallet address for dev mode
      const mockWallet = `0x${Math.random().toString(16).slice(2, 42)}`

      // Call backend with mock SIWE data
      const response = await fetch('/api/world/verify-listener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: mockWallet,
          message: `dev_mode_message_${Date.now()}`,
          signature: `0x${'0'.repeat(130)}`, // Fake 65-byte signature
          orb_verified: true,
          username: 'dev_listener',
          devMode: true, // Flag to skip signature verification
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Dev mode verification failed.')
        setIsLoading(false)
        return
      }

      const data = await response.json()

      // Store listener data in localStorage
      localStorage.setItem('listener_id', data.userId)
      localStorage.setItem(
        'listener_data',
        JSON.stringify({
          world_wallet_address: data.walletAddress,
          world_username: data.username,
          orb_verified: data.orbVerified,
        })
      )

      console.log('[verify-listener] Dev mode verification succeeded, redirecting to /catalog')
      router.push('/catalog')
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
            Verify as a Listener
          </h1>
          <p className="text-xl text-gray-300">
            Prove your humanity to see verified play counts and support verified creators.
          </p>
        </div>

        {/* Description */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 max-w-sm">
          <p className="text-gray-300 leading-relaxed">
            When you verify with World ID, every song you play is recorded as a provably unique human listen. Help creators see real engagement.
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

        {/* Alternative links */}
        <div className="pt-4 border-t border-gray-800 w-full max-w-sm space-y-3 text-sm">
          <p className="text-gray-500">
            Want to register music instead?{' '}
            <button
              onClick={() => router.push('/verify')}
              className="text-white hover:underline font-semibold"
            >
              Verify as Creator
            </button>
          </p>
          <p className="text-gray-500">
            Just browsing?{' '}
            <button
              onClick={() => router.push('/catalog')}
              className="text-white hover:underline font-semibold"
            >
              View Catalog (Unverified)
            </button>
          </p>
        </div>

        {/* Dev mode bypass */}
        {devMode && (
          <div className="pt-4 border-t border-gray-800 w-full max-w-sm space-y-4">
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 text-blue-300 text-sm">
              <p className="font-semibold mb-2">Dev Mode Active</p>
              <p>World ID verification is mocked. Use the button below to continue without World App.</p>
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
