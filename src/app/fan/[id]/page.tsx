'use client'

import { supabase } from '@/lib/supabase/client'
import { getTierColor } from '@/lib/fanScore'
import { BottomNav } from '@/components/BottomNav'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface User {
  display_name: string
  is_verified: boolean
}

interface FanScore {
  artist_spotify_id: string
  artist_name: string
  fan_score: number
  saved_track_count: number
  rank_short?: number
  rank_medium?: number
  rank_long?: number
}

export default function FanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [fan, setFan] = useState<User | null>(null)
  const [fanScores, setFanScores] = useState<FanScore[]>([])
  const [topArtists, setTopArtists] = useState<FanScore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadFanDetail = async () => {
      try {
        // Get fan profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('display_name, is_verified')
          .eq('id', userId)
          .single()

        if (userError) throw userError

        setFan(userData)

        // Get all fan scores for this user (sorted by score)
        const { data: scores, error: scoresError } = await supabase
          .from('verified_fan_scores')
          .select('*')
          .eq('user_id', userId)
          .order('fan_score', { ascending: false })

        if (scoresError) throw scoresError

        setFanScores(scores || [])
        setTopArtists((scores || []).slice(0, 5))
        setIsLoading(false)
      } catch (err) {
        console.error('Fan detail load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load fan details')
        setIsLoading(false)
      }
    }

    loadFanDetail()
  }, [userId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    )
  }

  if (error || !fan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4">
        <div className="text-center max-w-lg">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Error</h1>
          <p className="text-gray-300 mb-6">{error || 'Fan not found'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const getTierName = (score: number) => {
    if (score >= 100) return 'Superfan'
    if (score >= 60) return 'Dedicated Fan'
    if (score >= 30) return 'Fan'
    return 'Listener'
  }

  const totalArtists = fanScores.length
  const avgScore = totalArtists > 0 ? Math.round(fanScores.reduce((sum, f) => sum + f.fan_score, 0) / totalArtists) : 0

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur border-b border-gray-800 p-4 z-10 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2 flex-1">
          {fan.display_name}
          {fan.is_verified && (
            <span className="text-xs bg-blue-600 px-2 py-1 rounded-full font-semibold">
              ✓ Verified
            </span>
          )}
        </h1>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Fan Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white mb-1">{totalArtists}</p>
            <p className="text-sm text-gray-400">Artists</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white mb-1">{avgScore}</p>
            <p className="text-sm text-gray-400">Avg Score</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white mb-1">
              {fanScores.filter((f) => f.fan_score >= 100).length}
            </p>
            <p className="text-sm text-gray-400">Superfans</p>
          </div>
        </div>

        {/* Top Artists */}
        <h2 className="text-2xl font-bold mb-6">Their Top Artists</h2>
        {topArtists.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">No artist data available</p>
          </div>
        ) : (
          <div className="space-y-3 mb-12">
            {topArtists.map((artist, idx) => (
              <div
                key={artist.artist_spotify_id}
                className="bg-gray-900/50 border border-gray-800 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white mb-1">
                      #{idx + 1} {artist.artist_name}
                    </p>
                    <p className="text-sm text-gray-400">
                      {artist.saved_track_count} saved tracks
                    </p>
                  </div>
                  <p
                    className="text-lg font-bold"
                    style={{ color: getTierColor(getTierName(artist.fan_score)) }}
                  >
                    {artist.fan_score}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Engagement Breakdown */}
        <h2 className="text-2xl font-bold mb-6">Engagement Pattern</h2>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-2">Long-term (6 months)</p>
            <div className="bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-yellow-500 h-full"
                style={{
                  width: `${(fanScores.filter((f) => f.rank_long).length / totalArtists) * 100}%`,
                }}
              ></div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">Medium-term (4 weeks)</p>
            <div className="bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full"
                style={{
                  width: `${(fanScores.filter((f) => f.rank_medium).length / totalArtists) * 100}%`,
                }}
              ></div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">Short-term (7 days)</p>
            <div className="bg-gray-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full"
                style={{
                  width: `${(fanScores.filter((f) => f.rank_short).length / totalArtists) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
