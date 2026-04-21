'use client'

import { supabase } from '@/lib/supabase/client'
import { getTierColor } from '@/lib/fanScore'
import { VerificationModal } from '@/components/VerificationModal'
import { BottomNav } from '@/components/BottomNav'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface VerifiedFan {
  id: string
  user_id: string
  fan_score: number
  saved_track_count: number
  top_artist_short: boolean
  top_artist_medium: boolean
  top_artist_long: boolean
  users: {
    display_name: string
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [fans, setFans] = useState<VerifiedFan[]>([])
  const [isArtist, setIsArtist] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const userId = localStorage.getItem('user_id')
        if (!userId) {
          router.push('/')
          return
        }

        // Check verification status
        const verified = localStorage.getItem('is_verified') === 'true'
        setIsVerified(verified)

        // If not verified, show locked state
        if (!verified) {
          setIsLoading(false)
          return
        }

        // Check if user is marked as artist
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('is_artist')
          .eq('id', userId)
          .single()

        if (userError) throw userError

        if (!user?.is_artist) {
          setIsArtist(false)
          setIsLoading(false)
          return
        }

        setIsArtist(true)

        // For now, show all verified fans across all artists
        // In production, you'd have a separate artists table and join
        const { data: allFans, error: fansError } = await supabase
          .from('verified_fan_scores')
          .select(
            `
            id,
            user_id,
            fan_score,
            saved_track_count,
            top_artist_short,
            top_artist_medium,
            top_artist_long,
            users:user_id(display_name)
          `
          )
          .order('fan_score', { ascending: false })
          .limit(100)

        if (fansError) throw fansError

        setFans(allFans || [])
        setIsLoading(false)
      } catch (err) {
        console.error('Dashboard load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [router])

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

  if (!isVerified) {
    return (
      <>
        <VerificationModal
          isOpen={!isVerified || showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onSuccess={() => {
            setIsVerified(true)
            setShowVerificationModal(false)
            // Reload page to show dashboard
            window.location.reload()
          }}
        />
        <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4">
          <div className="text-center max-w-lg">
            <h1 className="text-3xl font-bold text-white mb-4">🔒 Feature Locked</h1>
            <p className="text-gray-300 mb-6">
              Verify with World ID to access the artist dashboard and see your verified fans.
            </p>
          </div>
        </div>
      </>
    )
  }

  if (!isArtist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4">
        <div className="text-center max-w-lg">
          <h1 className="text-3xl font-bold text-white mb-4">Artist Dashboard</h1>
          <p className="text-gray-300 mb-6">You must be registered as an artist to access this.</p>
          <p className="text-sm text-gray-400 mb-6">Go to Settings to enable artist mode.</p>
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
            Back
          </button>
        </div>
      </div>
    )
  }

  // Calculate stats
  const totalFans = fans.length
  const avgScore = totalFans > 0 ? Math.round(fans.reduce((sum, f) => sum + f.fan_score, 0) / totalFans) : 0
  const superfans = fans.filter((f) => f.fan_score >= 100).length

  const getTierName = (score: number) => {
    if (score >= 100) return 'Superfan'
    if (score >= 60) return 'Dedicated Fan'
    if (score >= 30) return 'Fan'
    return 'Listener'
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur border-b border-gray-800 p-4 z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Your Verified Fans</h1>
          <p className="text-sm text-gray-400">Artist Dashboard</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white mb-1">{totalFans}</p>
            <p className="text-sm text-gray-400">Total Fans</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white mb-1">{avgScore}</p>
            <p className="text-sm text-gray-400">Avg Score</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-500 mb-1">{superfans}</p>
            <p className="text-sm text-gray-400">Superfans</p>
          </div>
        </div>

        {/* Fans Table */}
        {fans.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400">No verified fans yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fans.map((fan, idx) => (
              <button
                key={fan.id}
                onClick={() => router.push(`/fan/${fan.user_id}`)}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:bg-gray-900 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white mb-1">
                      #{idx + 1} {fan.users?.display_name || 'Anonymous'}
                    </p>
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>{fan.saved_track_count} saved tracks</span>
                      {fan.top_artist_long && <span>✓ Loyal listener</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className="text-lg font-bold"
                      style={{ color: getTierColor(getTierName(fan.fan_score)) }}
                    >
                      {fan.fan_score}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {getTierName(fan.fan_score)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
