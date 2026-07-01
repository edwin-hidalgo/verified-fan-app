'use client'

import { useRequireAuth } from '@/lib/hooks/useAuthedUser'
import { TrackUploadForm } from '@/components/track-upload-form'

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
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Register Your Music</h1>
          <p className="text-gray-400">
            Welcome, <span className="font-semibold">{user.world_username || user.world_wallet_address.slice(0, 10) + '...'}</span>
          </p>
        </div>

        <TrackUploadForm userId={user.id} username={user.world_username} />
      </div>
    </div>
  )
}
