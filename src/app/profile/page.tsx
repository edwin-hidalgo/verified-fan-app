'use client'

import { supabase } from '@/lib/supabase/client'
import { getTierColor } from '@/lib/fanScore'
import { VerificationModal } from '@/components/VerificationModal'
import { BottomNav } from '@/components/BottomNav'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface FanScore {
  id: string
  artist_spotify_id: string
  artist_name: string
  artist_image: string
  fan_score: number
  top_artist_short: boolean
  top_artist_medium: boolean
  top_artist_long: boolean
  saved_track_count: number
  rank_short: number | null
  rank_medium: number | null
  rank_long: number | null
}

interface RecentlyPlayed {
  track_id: string
  track_name: string
  artist_name: string
  artist_image: string
}

interface User {
  display_name: string
  profile_image: string | null
  is_verified: boolean
}

type Archetype = 'Devoted Loyalist' | 'Broad Explorer' | 'Seasonal Fan' | 'All-Timer'
type Trajectory = 'Rising' | 'Consistent' | 'Fading'

function getTrajectory(fanScore: FanScore): Trajectory {
  // Rising: appears in more recent term
  // Fading: appears in less recent term
  // Consistent: appears across all or stable across terms
  const shortRank = fanScore.rank_short
  const mediumRank = fanScore.rank_medium
  const longRank = fanScore.rank_long

  if (!mediumRank && !longRank) return 'Rising'
  if (!shortRank) return 'Fading'

  if (shortRank && mediumRank) {
    if (shortRank < mediumRank - 5) return 'Rising'
    if (shortRank > mediumRank + 5) return 'Fading'
  }

  return 'Consistent'
}

function calculateArchetype(fanScores: FanScore[]): Archetype {
  if (fanScores.length === 0) return 'All-Timer'

  const loyalists = fanScores.filter(f => f.top_artist_long && f.top_artist_medium).length
  const explorers = fanScores.filter(f => f.top_artist_short && !f.top_artist_long).length
  const seasonal = fanScores.filter(f => f.top_artist_short && !f.top_artist_medium).length

  const totalArtists = fanScores.length
  const loyaltyRatio = loyalists / totalArtists
  const noveltyRatio = explorers / totalArtists

  if (loyaltyRatio > 0.6) return 'Devoted Loyalist'
  if (noveltyRatio > 0.5) return 'Broad Explorer'
  if (seasonal / totalArtists > 0.4) return 'Seasonal Fan'
  return 'All-Timer'
}

function countTrajectories(fanScores: FanScore[]) {
  const trajectories = fanScores.map(getTrajectory)
  return {
    rising: trajectories.filter(t => t === 'Rising').length,
    consistent: trajectories.filter(t => t === 'Consistent').length,
    fading: trajectories.filter(t => t === 'Fading').length,
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fanScores, setFanScores] = useState<FanScore[]>([])
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([])
  const [isVerified, setIsVerified] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userId = localStorage.getItem('user_id')

        if (!userId) {
          router.push('/')
          return
        }

        // Check verification status (use DB truth, not localStorage)
        // Fetch user
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('display_name, profile_image, is_verified')
          .eq('id', userId)
          .single()

        if (userError) throw userError

        setUser(userData)
        setIsVerified(userData.is_verified)

        // Fetch fan scores (sorted by score DESC)
        const { data: scoresData, error: scoresError } = await supabase
          .from('verified_fan_scores')
          .select('*')
          .eq('user_id', userId)
          .order('fan_score', { ascending: false })

        if (scoresError) throw scoresError

        setFanScores(scoresData || [])

        // Fetch recently played tracks (last 24h equivalent - top recently played)
        const { data: recentData, error: recentError } = await supabase
          .from('spotify_top_artists')
          .select('artist_name, artist_image')
          .eq('user_id', userId)
          .eq('time_range', 'short_term')
          .limit(10)

        if (!recentError && recentData) {
          const played: RecentlyPlayed[] = recentData.map((artist: any, idx: number) => ({
            track_id: `${artist.artist_name}-${idx}`,
            track_name: `Top track from ${artist.artist_name}`,
            artist_name: artist.artist_name,
            artist_image: artist.artist_image,
          }))
          setRecentlyPlayed(played)
        }

        setIsLoading(false)
      } catch (err) {
        console.error('Profile load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

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

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4">
        <div className="text-center max-w-lg">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Error Loading Profile</h1>
          <p className="text-gray-300 mb-6">{error || 'Profile not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const archetype = calculateArchetype(fanScores)
  const trajectories = countTrajectories(fanScores)
  const totalArtists = fanScores.length
  const avgScore = totalArtists > 0 ? Math.round(fanScores.reduce((sum, f) => sum + f.fan_score, 0) / totalArtists) : 0
  const superfans = fanScores.filter(f => f.fan_score >= 100).length

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

      {/* Identity Header */}
      <div className="border-b border-gray-800 bg-gradient-to-b from-gray-900/50 to-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            {user.profile_image && (
              <img
                src={user.profile_image}
                alt={user.display_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{user.display_name}</h1>
                {isVerified && (
                  <span className="text-xs bg-blue-600 px-3 py-1 rounded-full font-semibold">
                    ✓ Verified Human
                  </span>
                )}
              </div>
              <p className="text-gray-400 mt-1 text-lg">{archetype}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Taste Summary */}
      <div className="border-b border-gray-800 bg-black/50 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-500 font-semibold">{trajectories.rising}</span>
              <span className="text-gray-400">Rising</span>
            </div>
            <span className="text-gray-700">·</span>
            <div className="flex items-center gap-2">
              <span className="text-yellow-500 font-semibold">{trajectories.consistent}</span>
              <span className="text-gray-400">Consistent</span>
            </div>
            <span className="text-gray-700">·</span>
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-semibold">{trajectories.fading}</span>
              <span className="text-gray-400">Fading</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Your Top Artists */}
        <h2 className="text-2xl font-bold mb-4">Top Artists</h2>

        {fanScores.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400">No artists found. Connect Spotify to get started.</p>
            <button
              onClick={() => router.push('/connect')}
              className="mt-4 px-6 py-2 bg-[#1DB954] text-white rounded-full hover:bg-[#1ed760] font-semibold"
            >
              Connect Spotify
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
            {fanScores.map((artist) => {
              const trajectory = getTrajectory(artist)
              const trajectoryColor =
                trajectory === 'Rising'
                  ? 'text-green-500'
                  : trajectory === 'Fading'
                    ? 'text-red-500'
                    : 'text-yellow-500'

              return (
                <button
                  key={artist.id}
                  onClick={() => {
                    if (!isVerified) {
                      setShowVerificationModal(true)
                      return
                    }
                    router.push(`/artist/${artist.artist_spotify_id}`)
                  }}
                  className="group relative bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:bg-gray-900 transition-colors text-left"
                >
                  {/* Artist Image */}
                  {artist.artist_image && (
                    <img
                      src={artist.artist_image}
                      alt={artist.artist_name}
                      className={`w-full aspect-square object-cover rounded-lg mb-3 group-hover:opacity-80 transition-opacity ${
                        !isVerified ? 'blur-sm' : ''
                      }`}
                    />
                  )}

                  {/* Lock overlay if not verified */}
                  {!isVerified && (
                    <div className="absolute inset-4 rounded-lg flex items-center justify-center">
                      <div className="bg-black/60 p-2 rounded-full">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Artist Name */}
                  <p className="font-semibold text-white truncate mb-2">
                    {artist.artist_name}
                  </p>

                  {/* Fan Score + Trajectory */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: getTierColor(
                          artist.fan_score >= 100
                            ? 'Superfan'
                            : artist.fan_score >= 60
                              ? 'Dedicated Fan'
                              : artist.fan_score >= 30
                                ? 'Fan'
                                : 'Listener'
                        ) + '20',
                        color: getTierColor(
                          artist.fan_score >= 100
                            ? 'Superfan'
                            : artist.fan_score >= 60
                              ? 'Dedicated Fan'
                              : artist.fan_score >= 30
                                ? 'Fan'
                                : 'Listener'
                        ),
                      }}
                    >
                      {artist.fan_score}
                    </span>
                  </div>

                  {/* Trajectory badge */}
                  <p className={`text-xs font-semibold ${trajectoryColor}`}>
                    {trajectory === 'Rising' && '📈 Rising'}
                    {trajectory === 'Fading' && '📉 Fading'}
                    {trajectory === 'Consistent' && '➡️ Consistent'}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        {/* Recently Played Section */}
        {recentlyPlayed.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Recently Played</h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {recentlyPlayed.map((track) => (
                <div
                  key={track.track_id}
                  className="flex-shrink-0 w-40 bg-gray-900/50 border border-gray-800 rounded-lg p-3"
                >
                  {track.artist_image && (
                    <img
                      src={track.artist_image}
                      alt={track.artist_name}
                      className="w-full aspect-square object-cover rounded-lg mb-3"
                    />
                  )}
                  <p className="font-semibold text-sm text-white truncate">
                    {track.track_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{track.artist_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard Teaser */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Your Rankings</h2>
          {!isVerified ? (
            <div
              className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center relative overflow-hidden"
              style={{ perspective: '1000px' }}
            >
              <div
                className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent blur-3xl"
                style={{}}
              />
              <div className="relative">
                <p className="text-gray-400 mb-4">
                  Verify with World ID to see where you rank among other fans
                </p>
                <button
                  onClick={() => setShowVerificationModal(true)}
                  className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
                >
                  Verify Now
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-4">Coming soon: See your rank among verified fans of each artist</p>
            </div>
          )}
        </div>

        {/* Private/Verified Banner */}
        {!isVerified && (
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6 text-center mb-8">
            <p className="text-blue-300 mb-4">
              Your profile is currently private. Verify with World ID to become a verified fan and unlock rankings.
            </p>
            <button
              onClick={() => router.push('/verify')}
              className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
            >
              Verify with World ID
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
