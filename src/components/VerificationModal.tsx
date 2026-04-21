'use client'

import { useState } from 'react'

interface VerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function VerificationModal({ isOpen, onClose, onSuccess }: VerificationModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

  const handleVerify = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Dynamically import MiniKit only when verification is triggered
      const { MiniKit } = await import('@worldcoin/minikit-js')

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

      // Update localStorage with verified status
      localStorage.setItem('world_id_hash', verifyData.worldIdHash)
      localStorage.setItem('is_verified', 'true')

      setIsLoading(false)
      onSuccess()
    } catch (err) {
      console.error('World ID verification error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during verification.')
      setIsLoading(false)
    }
  }

  const handleDevModeVerification = async () => {
    try {
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

      // Update localStorage
      localStorage.setItem('world_id_hash', data.worldIdHash)
      localStorage.setItem('is_verified', 'true')

      setIsLoading(false)
      onSuccess()
    } catch (err) {
      console.error('Dev mode verification error:', err)
      setError(err instanceof Error ? err.message : 'Dev mode verification failed.')
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-black border border-gray-800 rounded-lg max-w-sm w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Unlock verified features</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Description */}
        <div className="space-y-4">
          <p className="text-gray-300">
            Verify you're human with World ID to show artists your verified fan status and see rankings.
          </p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex gap-2">
              <span>✓</span>
              <span>Show artists your verified fan status</span>
            </li>
            <li className="flex gap-2">
              <span>✓</span>
              <span>See where you rank among verified fans</span>
            </li>
            <li className="flex gap-2">
              <span>✓</span>
              <span>One-time verification, works everywhere</span>
            </li>
          </ul>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Dev Mode Info */}
        {devMode && (
          <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3 text-blue-300 text-sm">
            Dev mode: Click verify to skip World ID and proceed
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-800 text-white rounded-full hover:bg-gray-900 transition-colors font-semibold"
          >
            Maybe later
          </button>
          <button
            onClick={handleVerify}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-white text-black rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>
    </div>
  )
}
