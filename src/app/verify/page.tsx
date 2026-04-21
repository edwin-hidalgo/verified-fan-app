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

      // Call MiniKit verification (music registry action)
      const response = await MiniKit.commandsAsync.verify({
        action: process.env.NEXT_PUBLIC_WORLD_APP_ACTION_ID || 'register-work',
      })

      if (!response.success) {
        setError(response.error?.message || 'Verification failed. Please try again.')
        setIsLoading(false)
        return
      }

      // Get user's wallet address from MiniKit wallet context
      const walletResponse = await MiniKit.commandsAsync.walletAuth({})
      if (!walletResponse.success || !walletResponse.wallet_address) {
        setError('Could not retrieve wallet address.')
        setIsLoading(false)
        return
      }

      // Send proof to backend for validation
      const verifyResponse = await fetch('/api/world/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: response,
          world_wallet_address: walletResponse.wallet_address,
          world_username: walletResponse.wallet_address?.slice(0, 10), // Placeholder, can be updated later
        }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        setError(errorData.error || 'Server verification failed.')
        setIsLoading(false)
        return
      }

      const verifyData = await verifyResponse.json()

      // Store user data in localStorage for useAuthedUser hook
      localStorage.setItem('user_id', verifyData.userId)
      localStorage.setItem(
        'user_data',
        JSON.stringify({
          world_wallet_address: verifyData.walletAddress,
          world_username: verifyData.username,
          orb_verified: verifyData.orbVerified,
        })
      )

      console.log('[verify] Verification succeeded, redirecting to /register')
      router.push('/register')
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

      // Call backend to create user with mock World ID hash
      const response = await fetch('/api/world/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: { nullifier_hash: `dev_${Date.now()}_${Math.random().toString(36).substring(2)}` },
          world_wallet_address: mockWallet,
          world_username: 'dev_creator',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Dev mode verification failed.')
        setIsLoading(false)
        return
      }

      const data = await response.json()

      // Store user data in localStorage for useAuthedUser hook
      localStorage.setItem('user_id', data.userId)
      localStorage.setItem(
        'user_data',
        JSON.stringify({
          world_wallet_address: data.walletAddress,
          world_username: data.username,
          orb_verified: data.orbVerified,
        })
      )

      console.log('[verify] Dev mode verification succeeded, redirecting to /register')
      router.push('/register')
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
            Verify as a Creator
          </h1>
          <p className="text-xl text-gray-300">
            Prove your humanity to register music IP Assets.
          </p>
        </div>

        {/* Description */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 max-w-sm">
          <p className="text-gray-300 leading-relaxed">
            Use World ID to verify you're a unique human creator. Your identity proves only verified humans can register music in this protocol.
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
