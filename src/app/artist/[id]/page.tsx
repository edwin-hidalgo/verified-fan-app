'use client'

import { supabase } from '@/lib/supabase/client'
import { getTierColor } from '@/lib/fanScore'
import { VerificationModal } from '@/components/VerificationModal'
import { BottomNav } from '@/components/BottomNav'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface FanScore {
  id: string
  user_id: string
  artist_spotify_id: string
  fan_score: number
  rank_short?: number
  rank_medium?: number
  rank_long?: number
  saved_track_count: number
}

interface VerifiedFan {
  id: string
  users: {
    display_name: string
  }
  fan_score: number
  saved_track_count: number
}

export default function ArtistDetailPage() {
  const router = useRouter()
  const params = useParams()
  const artistId = params.id as string

  const [userFanScore, setUserFanScore] = useState<FanScore | null>(null)
  const [verifiedFans, setVerifiedFans] = useState<VerifiedFan[]>([])
  const [isVerified, setIsVerified] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadArtistDetail = async () => {
      try {
        const userId = localStorage.getItem('user_id')
        if (!userId) {
          router.push('/')
          return
        }

        // Check verification status
        const verified = localStorage.getItem('is_verified') === 'true'
        setIsVerified(verified)

        // Get current user's fan score for this artist
        const { data: userScore, error: scoreError } = await supabase
          .from('verified_fan_scores')
          .select('*')
          .eq('user_id', userId)
          .eq('artist_spotify_id', artistId)
          .single()

        if (scoreError && scoreError.code !== 'PGRST116') {
          // PGRST116 = no rows returned
          throw scoreError
        }

        setUserFanScore(userScore || null)

        // Get all verified fans for this artist (sorted by score)
        const { data: fans, error: fansError } = await supabase
          .from('verified_fan_scores')
          .select(
            `
            id,
            user_id,
            fan_score,
            saved_track_count,
            users:user_id(display_name)
          `
          )
          .eq('artist_spotify_id', artistId)
          .order('fan_score', { ascending: false })

        if (fansError) throw fansError

        setVerifiedFans(fans || [])
        setIsLoading(false)
      } catch (err) {
        console.error('Artist detail load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load artist details')
        setIsLoading(false)
      }
    }

    loadArtistDetail()
  }, [artistId, router])

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4">
        <div className="text-center max-w-lg">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push('/profile')}
            className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100"
          >
            Back to Profile
          </button>
        </div>
      </div>
    )
  }

  if (!userFanScore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4">
        <div className="text-center max-w-lg">
          <h1 className="text-3xl font-bold text-white mb-4">Artist Not Found</h1>
          <p className="text-gray-300 mb-6">This artist isn't in your top list.</p>
          <button
            onClick={() => router.push('/profile')}
            className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100"
          >
            Back to Profile
          </button>
        </div>
      </div>
    )
  }

  // Determine tier
  const getTierName = (score: number) => {
    if (score >= 100) return 'Superfan'
    if (score >= 60) return 'Dedicated Fan'
    if (score >= 30) return 'Fan'
    return 'Listener'
  }

  const userRank = verifiedFans.findIndex((f) => f.user_id === localStorage.getItem('user_id')) + 1
  const totalVerifiedFans = verifiedFans.length

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={() => {
          setIsVerified(true)
          setShowVerificationModal(false)
        }}
      />

      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur border-b border-gray-800 p-4 z-10 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold flex-1">{userFanScore.artist_name}</h1>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Artist Image */}
        <div className="mb-8">
          <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden mb-6">
            {/* Placeholder for artist image */}
            <div className="w-full h-full flex items-center justify-center text-6xl">🎵</div>
          </div>

          {/* Your Tier */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center mb-6">
            <p className="text-sm text-gray-400 mb-2">Your Fan Tier</p>
            <p
              className="text-4xl font-bold mb-4"
              style={{ color: getTierColor(getTierName(userFanScore.fan_score)) }}
            >
              {getTierName(userFanScore.fan_score)}
            </p>
            <p className="text-2xl font-semibold text-white mb-4">
              {userFanScore.fan_score} points
            </p>

            {/* Score breakdown */}
            <div className="bg-black/50 rounded p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Saved Tracks:</span>
                <span className="text-white font-semibold">{userFanScore.saved_track_count}</span>
              </div>
              {userFanScore.rank_short && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Short-term Rank:</span>
                  <span className="text-white font-semibold">#{userFanScore.rank_short}</span>
                </div>
              )}
              {userFanScore.rank_medium && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Medium-term Rank:</span>
                  <span className="text-white font-semibold">#{userFanScore.rank_medium}</span>
                </div>
              )}
              {userFanScore.rank_long && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Long-term Rank:</span>
                  <span className="text-white font-semibold">#{userFanScore.rank_long}</span>
                </div>
              )}
            </div>
          </div>

          {/* Verified Fan Ranking */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6 text-center mb-8">
            <p className="text-sm text-blue-300 mb-2">Verified Fan Rank</p>
            <p className="text-3xl font-bold text-white">
              #{userRank} of {totalVerifiedFans}
            </p>
            <p className="text-sm text-blue-300 mt-2">verified fans</p>
          </div>
        </div>

        {/* Other Verified Fans */}
        <h2 className="text-2xl font-bold mb-6">Other Verified Fans</h2>
        {!isVerified ? (
          <button
            onClick={() => setShowVerificationModal(true)}
            className="w-full bg-gray-900/50 border border-gray-800 rounded-lg p-8 hover:bg-gray-900 transition-colors text-center space-y-4"
          >
            <div className="text-4xl">🔒</div>
            <div>
              <p className="text-white font-semibold mb-2">Verify to see other fans</p>
              <p className="text-gray-400 text-sm">
                Unlock rankings and see who else is a verified fan of this artist
              </p>
            </div>
            <div className="text-blue-400 text-sm font-semibold">Verify with World ID →</div>
          </button>
        ) : (
          <div className="space-y-3">
            {verifiedFans.slice(0, 10).map((fan, idx) => (
            <div
              key={fan.id}
              className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-white">
                  #{idx + 1} {fan.users?.display_name || 'Anonymous Fan'}
                </p>
                <p className="text-sm text-gray-400">{fan.saved_track_count} saved tracks</p>
              </div>
              <p
                className="font-bold text-lg"
                style={{ color: getTierColor(getTierName(fan.fan_score)) }}
              >
                {fan.fan_score}
              </p>
            </div>
          ))}
            </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
