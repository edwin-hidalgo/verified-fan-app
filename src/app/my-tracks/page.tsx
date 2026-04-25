'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

interface UserData {
  world_wallet_address: string
  world_username: string
  orb_verified: boolean
}

interface Track {
  id: string
  title: string
  artist_name: string
  ai_origin: 'human' | 'ai_assisted' | 'ai_generated'
  play_count: number
  duration_seconds?: number
  ai_training_allowed?: boolean
  sync_allowed?: boolean
  commercial_use_allowed?: boolean
  commercial_use_revenue_share_pct?: number
  story_ip_id?: string
  created_at: string
}

export default function MyTracksPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    const userData = localStorage.getItem('user_data')

    if (userId && userData) {
      try {
        setUser(JSON.parse(userData))
        // Fetch creator's tracks
        fetchTracks(userId)
      } catch (e) {
        setUser(null)
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchTracks = async (userId: string) => {
    try {
      const response = await fetch(`/api/creators/${userId}/tracks`)
      if (response.ok) {
        const data = await response.json()
        setTracks(data.tracks || [])
      }
    } catch (error) {
      console.error('Failed to fetch tracks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getAIOriginBadge = (origin: string) => {
    switch (origin) {
      case 'human':
        return <span className="inline-block px-2 py-1 bg-green-900/30 border border-green-600 text-green-300 text-xs rounded">Human</span>
      case 'ai_assisted':
        return <span className="inline-block px-2 py-1 bg-yellow-900/30 border border-yellow-600 text-yellow-300 text-xs rounded">AI-Assisted</span>
      case 'ai_generated':
        return <span className="inline-block px-2 py-1 bg-purple-900/30 border border-purple-600 text-purple-300 text-xs rounded">AI-Generated</span>
      default:
        return null
    }
  }

  const getTotalPlays = () => {
    return tracks.reduce((sum, track) => sum + (track.play_count || 0), 0)
  }

  const estimateEarnings = () => {
    // Rough estimate: commercial-enabled tracks with revenue share
    // Assume ~$0.001 per verified listen (very conservative)
    const commercialTracks = tracks.filter(t => t.commercial_use_allowed)
    const totalPlaysCommercial = commercialTracks.reduce((sum, t) => sum + (t.play_count || 0), 0)
    const estimatedMonthlyRevenue = (totalPlaysCommercial * 0.001 * (50)) // assuming average 50% revenue share
    return Math.round(estimatedMonthlyRevenue * 100) / 100
  }

  const formatWallet = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4 py-12">
        <main className="w-full max-w-lg flex flex-col items-center justify-center gap-6 text-center">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">My Tracks</h1>
            <p className="text-lg text-gray-400">
              You need to verify as a creator to register and manage your tracks.
            </p>
          </div>

          <Link
            href="/verify"
            className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
          >
            Verify as Creator
          </Link>

          <p className="text-sm text-gray-500 mt-4">
            Don't have music to register yet?{' '}
            <Link href="/catalog" className="text-white hover:underline">
              Browse the catalog
            </Link>
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start justify-start min-h-screen bg-black px-4 py-12">
      <main className="w-full max-w-6xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white">My Tracks</h1>
            <p className="text-lg text-gray-400">
              Registered by {user.world_username || 'verified creator'}
            </p>
          </div>

          {/* Creator Identity Card */}
          <Card className="p-6 bg-blue-900/20 border-blue-700/50">
            <p className="text-xs text-blue-300 font-semibold mb-2">VERIFIED CREATOR</p>
            <p className="text-xl font-bold text-white mb-1">{user.world_username || 'Verified Creator'}</p>
            <p className="text-sm text-gray-400 font-mono mb-4">{formatWallet(user.world_wallet_address)}</p>
            <p className="text-xs text-blue-300">✓ World ID verified • On-chain IP registered via Story Protocol</p>
          </Card>

          {/* Stats Bar */}
          {tracks.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-6 bg-gray-900/50 border-gray-800">
                <p className="text-2xl font-bold text-white mb-1">{tracks.length}</p>
                <p className="text-sm text-gray-400">Registered Moments</p>
              </Card>
              <Card className="p-6 bg-gray-900/50 border-gray-800">
                <p className="text-2xl font-bold text-green-400 mb-1">{getTotalPlays()}</p>
                <p className="text-sm text-gray-400">Verified Listens</p>
              </Card>
              <Card className="p-6 bg-gray-900/50 border-gray-800">
                <p className="text-2xl font-bold text-purple-400 mb-1">${estimateEarnings()}</p>
                <p className="text-xs text-gray-500">Est. Monthly Potential</p>
              </Card>
            </div>
          )}
        </div>

        {/* Tracks Section */}
        {tracks.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-12 text-center w-full">
            <p className="text-gray-400 mb-6">No tracks registered yet.</p>
            <Link
              href="/create"
              className="inline-block px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
            >
              Create Your First Moment
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Your Moments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {tracks.map((track) => (
                <Link
                  key={track.id}
                  href={`/track/${track.id}`}
                  className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:bg-gray-900 hover:border-gray-700 transition-colors"
                >
                  <div className="space-y-4">
                    {/* Title + Duration */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">{track.title}</h3>
                        <p className="text-sm text-gray-400">{track.artist_name}</p>
                      </div>
                      {track.duration_seconds && (
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {Math.round(track.duration_seconds)}s
                        </span>
                      )}
                    </div>

                    {/* AI Origin + License Badges */}
                    <div className="flex gap-2 flex-wrap">
                      {getAIOriginBadge(track.ai_origin)}
                      {track.ai_training_allowed && (
                        <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">AI Training</span>
                      )}
                      {track.sync_allowed && (
                        <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">Sync</span>
                      )}
                      {track.commercial_use_allowed && (
                        <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">Commercial</span>
                      )}
                    </div>

                    {/* Stats Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                      <div className="text-sm">
                        <span className="text-green-400 font-semibold">{track.play_count}</span> listens
                      </div>
                      <span className="text-xs text-purple-400 hover:text-purple-300">
                        View Details →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="w-full pt-8 border-t border-gray-800">
          <Link
            href="/create"
            className="inline-block px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
          >
            Create Another Moment
          </Link>
        </div>
      </main>
    </div>
  )
}
