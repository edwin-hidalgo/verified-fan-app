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
        statement: 'Sign in to verify your humanity and register music on the protocol.',
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
      const verifyResponse = await fetch('/api/world/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          message,
          signature,
          orb_verified: orbVerified,
          username: MiniKit.user?.username || 'creator',
        }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        setError(errorData.error || 'Server verification failed.')
        setIsLoading(false)
        return
      }

      const verifyData = await verifyResponse.json()

      // Store user data in localStorage and cookies (cookies persist better in World App webview)
      localStorage.setItem('user_id', verifyData.userId)
      const userData = {
        world_wallet_address: verifyData.walletAddress,
        world_username: verifyData.username,
        orb_verified: verifyData.orbVerified,
      }
      localStorage.setItem('user_data', JSON.stringify(userData))

      // Also set cookies for better persistence in World App webview
      document.cookie = `user_id=${encodeURIComponent(verifyData.userId)}; path=/; max-age=${7 * 24 * 60 * 60}`
      document.cookie = `user_data=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${7 * 24 * 60 * 60}`

      console.log('[verify] World ID verification succeeded, redirecting to /register')
      router.push('/register')
    } catch (err) {
      console.error('World ID verification error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during verification.')
      setIsLoading(false)
    }
  }

  const handleDevModeVerification = async () => {
    try {
      // Use consistent wallet for dev mode (per session)
      let mockWallet = sessionStorage.getItem('dev_mode_wallet')
      if (!mockWallet) {
        mockWallet = `0x${Math.random().toString(16).slice(2, 42)}`
        sessionStorage.setItem('dev_mode_wallet', mockWallet)
      }

      // Call backend with mock SIWE data
      const response = await fetch('/api/world/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: mockWallet,
          message: `dev_mode_message_${Date.now()}`,
          signature: `0x${'0'.repeat(130)}`, // Fake 65-byte signature
          orb_verified: true,
          username: 'dev_creator',
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

      // Store user data in localStorage and cookies (cookies persist better in World App webview)
      localStorage.setItem('user_id', data.userId)
      const userData = {
        world_wallet_address: data.walletAddress,
        world_username: data.username,
        orb_verified: data.orbVerified,
      }
      localStorage.setItem('user_data', JSON.stringify(userData))

      // Also set cookies for better persistence in World App webview
      document.cookie = `user_id=${encodeURIComponent(data.userId)}; path=/; max-age=${7 * 24 * 60 * 60}`
      document.cookie = `user_data=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${7 * 24 * 60 * 60}`

      console.log('[verify] Dev mode verification succeeded, redirecting to /register')
      router.push('/register')
    } catch (err) {
      console.error('Dev mode verification error:', err)
      setError(err instanceof Error ? err.message : 'Dev mode verification failed.')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
      <main className="w-full max-w-lg flex flex-col items-center justify-center gap-8 text-center">
        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1b1b1b] tracking-tight">
            Verify as a Creator
          </h1>
          <p className="text-xl text-[#1b1b1b80]">
            Prove your humanity to register music IP Assets.
          </p>
        </div>

        {/* Description */}
        <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6 max-w-sm">
          <p className="text-[#1b1b1b80] leading-relaxed">
            Use World ID to verify you're a unique human creator. Your wallet address is tied to your World ID identity.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full border border-[#ff2e00] rounded-lg p-4 text-[#ff2e00] text-sm">
            <p className="font-semibold mb-1">Verification Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Verify Button */}
        <button
          onClick={handleWorldIDVerify}
          disabled={isLoading}
          className="w-full sm:w-auto px-8 py-4 bg-[#1b1b1b] text-[#fdfff8] font-semibold rounded-lg hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? 'Verifying...' : 'Verify with World ID'}
        </button>

        {/* Dev mode bypass */}
        {devMode && (
          <div className="pt-4 border-t border-[#1b1b1b] w-full max-w-sm space-y-4">
            <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-4 text-[#1b1b1b80] text-sm">
              <p className="font-semibold mb-2">Dev Mode Active</p>
              <p>World ID verification is mocked. Use the button below to continue without World App.</p>
            </div>
            <button
              onClick={() => handleDevModeVerification()}
              disabled={isLoading}
              className="w-full px-6 py-3 border border-[#1b1b1b] text-[#1b1b1b] bg-transparent hover:bg-[#1b1b1b] hover:text-[#fdfff8] font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? 'Skipping...' : 'Skip Verification (Dev Mode)'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
