'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
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
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white">My Tracks</h1>
          <p className="text-lg text-gray-400">
            Registered by {user.world_username || 'verified creator'}
          </p>
        </div>

        {tracks.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-12 text-center w-full">
            <p className="text-gray-400 mb-6">No tracks registered yet.</p>
            <Link
              href="/register"
              className="inline-block px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
            >
              Register Your First Track
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {tracks.map((track) => (
              <Link
                key={track.id}
                href={`/track/${track.id}`}
                className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:bg-gray-900 hover:border-gray-700 transition-colors"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{track.title}</h3>
                    <p className="text-sm text-gray-400">{track.artist_name}</p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {getAIOriginBadge(track.ai_origin)}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                    <div className="text-sm text-gray-400">
                      <span className="text-green-400 font-semibold">{track.play_count}</span> verified{' '}
                      {track.play_count === 1 ? 'listen' : 'listens'}
                    </div>
                    {track.story_ip_id && (
                      <span className="text-xs bg-blue-900/30 border border-blue-600 text-blue-300 px-2 py-1 rounded">
                        On-chain
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="w-full pt-8 border-t border-gray-800">
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
          >
            Register Another Track
          </Link>
        </div>
      </main>
    </div>
  )
}
