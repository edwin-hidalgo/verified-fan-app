'use client'

import { useAuthedUser, useRequireAuth } from '@/lib/hooks/useAuthedUser'
import { DEMO_MODE } from '@/lib/demo'
import { TrackUploadForm } from '@/components/track-upload-form'
import { DemoBanner } from '@/components/DemoBanner'

// Demo mode lets anyone walk the form; live mode keeps the original sign-in redirect.
const useGate = DEMO_MODE ? useAuthedUser : useRequireAuth

export default function RegisterPage() {
  const { user, isLoading } = useGate()

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

  if (!DEMO_MODE && !user) {
    return null // useRequireAuth will redirect
  }

  const name = user?.world_username || (user?.world_wallet_address ? user.world_wallet_address.slice(0, 10) + '...' : null)

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {DEMO_MODE && <DemoBanner tone="dark" />}

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Register Your Music</h1>
          {name && (
            <p className="text-gray-400">
              Welcome, <span className="font-semibold">{name}</span>
            </p>
          )}
        </div>

        <TrackUploadForm userId={user?.id} username={user?.world_username} />
      </div>
    </div>
  )
}
