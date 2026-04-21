'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'

interface Track {
  id: string
  title: string
  artist_name: string
  genre: string
  duration_seconds: number
  audio_file_url: string
  ai_training_allowed: boolean
  sync_allowed: boolean
  commercial_use_allowed: boolean
  registration_status: string
  created_at: string
}

type FilterType = 'all' | 'ai_training' | 'sync' | 'commercial'

export default function CatalogPage() {
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const response = await fetch('/api/tracks')
        if (!response.ok) {
          throw new Error('Failed to fetch tracks')
        }

        const data = await response.json()
        setTracks(data.tracks || [])
        setFilteredTracks(data.tracks || [])
      } catch (err) {
        console.error('Failed to fetch catalog:', err)
        setError(err instanceof Error ? err.message : 'Failed to load catalog')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTracks()
  }, [])

  useEffect(() => {
    let filtered = tracks

    if (filter === 'ai_training') {
      filtered = tracks.filter((t) => t.ai_training_allowed)
    } else if (filter === 'sync') {
      filtered = tracks.filter((t) => t.sync_allowed)
    } else if (filter === 'commercial') {
      filtered = tracks.filter((t) => t.commercial_use_allowed)
    }

    setFilteredTracks(filtered)
  }, [filter, tracks])

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Music Registry Catalog</h1>
          <p className="text-gray-400">
            Browse registered works from verified human creators. All tracks are registered as IP Assets on Story Protocol.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full font-semibold transition ${
              filter === 'all'
                ? 'bg-white text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Works ({tracks.length})
          </button>
          <button
            onClick={() => setFilter('ai_training')}
            className={`px-4 py-2 rounded-full font-semibold transition ${
              filter === 'ai_training'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            AI Training Allowed ({tracks.filter((t) => t.ai_training_allowed).length})
          </button>
          <button
            onClick={() => setFilter('sync')}
            className={`px-4 py-2 rounded-full font-semibold transition ${
              filter === 'sync'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Sync Licenses ({tracks.filter((t) => t.sync_allowed).length})
          </button>
          <button
            onClick={() => setFilter('commercial')}
            className={`px-4 py-2 rounded-full font-semibold transition ${
              filter === 'commercial'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Commercial Use ({tracks.filter((t) => t.commercial_use_allowed).length})
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 text-center">
            <p className="text-red-300 font-semibold mb-2">Error Loading Catalog</p>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400 text-lg">No tracks found with selected filters.</p>
            <button
              onClick={() => setFilter('all')}
              className="mt-4 px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-100"
            >
              View All Tracks
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => router.push(`/track/${track.id}`)}
                className="group bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:bg-gray-900 hover:border-gray-700 transition text-left h-full flex flex-col"
              >
                {/* Audio Preview */}
                <audio
                  src={track.audio_file_url}
                  controls
                  className="w-full mb-4 h-8"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Track Info */}
                <div className="flex-1 mb-4">
                  <h3 className="font-bold text-lg group-hover:text-gray-100 mb-1 line-clamp-2">
                    {track.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-3">{track.artist_name}</p>

                  {track.genre && (
                    <p className="text-gray-500 text-xs mb-3">
                      {track.genre} • {Math.floor(track.duration_seconds / 60)}m
                    </p>
                  )}

                  {/* License Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {track.ai_training_allowed && (
                      <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                        AI Training
                      </span>
                    )}
                    {track.sync_allowed && (
                      <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">
                        Sync
                      </span>
                    )}
                    {track.commercial_use_allowed && (
                      <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                        Commercial
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Footer */}
                <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {new Date(track.created_at).toLocaleDateString()}
                  </span>
                  {track.registration_status === 'registered' ? (
                    <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                      ✓ Registered
                    </span>
                  ) : (
                    <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded">
                      {track.registration_status}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
