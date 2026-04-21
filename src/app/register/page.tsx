'use client'

import { useRequireAuth } from '@/lib/hooks/useAuthedUser'

export default function RegisterPage() {
  const { user, isLoading } = useRequireAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // useRequireAuth will redirect
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Register Your Music</h1>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
          <p className="text-gray-400 mb-4">
            Welcome, <span className="text-white font-semibold">{user.world_username || user.world_wallet_address.slice(0, 10) + '...'}</span>
          </p>
          <p className="text-gray-400 mb-6">
            Register your original music as an IP Asset on Story Protocol with machine-readable license terms.
          </p>

          {/* Track upload form will go here (Task 3.1) */}
          <div className="bg-gray-800/50 border border-gray-700 rounded p-6 text-center">
            <p className="text-gray-400">Track upload form coming next...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
