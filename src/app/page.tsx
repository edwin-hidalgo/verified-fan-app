'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import RippleCanvas from '@/components/RippleCanvas'

interface Stats {
  totalTracks: number
  totalPlays: number
}

export default function Landing() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ totalTracks: 0, totalPlays: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-[#d9dbdd] text-[#1b1b1b]">
      {/* Hero — FULL WIDTH */}
      <div className="relative w-full overflow-hidden py-24 md:py-32 min-h-[88vh] md:min-h-[90vh] flex flex-col justify-center items-center">
        <RippleCanvas />
        <div className="relative z-10 space-y-8 text-center px-4 md:px-0">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
              Turn a moment into music.
            </h1>
            <p className="text-lg text-[#1b1b1b80] max-w-2xl mx-auto leading-relaxed">
              Snap a photo or describe a feeling — AI composes an original moment you can publish and
              stream. Think Instagram for music, where every post is a song made from your world.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <button
              onClick={() => router.push('/create')}
              className="px-8 py-4 bg-[#1b1b1b] text-[#fdfff8] font-semibold rounded-lg hover:opacity-80 transition-opacity duration-200"
            >
              Create a Moment →
            </button>
            <button
              onClick={() => router.push('/catalog')}
              className="px-8 py-4 bg-transparent border border-[#1b1b1b] text-[#1b1b1b] font-semibold rounded-lg hover:bg-[#1b1b1b] hover:text-[#fdfff8] transition-colors duration-200"
            >
              Stream Music →
            </button>
          </div>
          <p className="text-sm text-[#1b1b1b80]">
            Browsing and streaming are open to everyone. Sign in to create your own moments.
          </p>
        </div>
      </div>

      {/* Content - constrained width */}
      <main className="w-full max-w-2xl mx-auto flex flex-col gap-12 px-4 md:py-12">
        {/* Live Stats */}
        <div className="flex flex-col gap-4 items-center">
          <div className="grid grid-cols-2 gap-4 max-w-md w-full">
            <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-[#1b1b1b] mb-2">
                {statsLoading ? '—' : stats.totalTracks}
              </div>
              <p className="text-xs text-[#1b1b1b80] font-mono uppercase letter-spacing">Moments</p>
            </div>
            <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-[#2e8b6f] mb-2">
                {statsLoading ? '—' : stats.totalPlays}
              </div>
              <p className="text-xs text-[#1b1b1b80] font-mono uppercase letter-spacing">Plays</p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">How it works</h2>
          <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6 space-y-4">
            <div className="flex gap-3 text-sm">
              <span className="font-mono text-[#2e8b6f] font-bold flex-shrink-0">01</span>
              <div>
                <span className="font-semibold">Capture the moment.</span>
                <span className="text-[#1b1b1b80]"> Snap a photo or describe what you&apos;re feeling. AI reads it and suggests a musical direction.</span>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="font-mono text-[#2e8b6f] font-bold flex-shrink-0">02</span>
              <div>
                <span className="font-semibold">AI composes it.</span>
                <span className="text-[#1b1b1b80]"> Pick a style and length; an original instrumental is generated from your description.</span>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="font-mono text-[#2e8b6f] font-bold flex-shrink-0">03</span>
              <div>
                <span className="font-semibold">Publish &amp; stream.</span>
                <span className="text-[#1b1b1b80]"> Name it, add cover art, and it lands in the public feed for anyone to play.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary CTA */}
        <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium text-[#1b1b1b]">Ready to make your first one?</p>
          <button
            onClick={() => router.push('/create')}
            className="px-6 py-3 bg-[#1b1b1b] text-[#fdfff8] text-sm font-semibold rounded-lg hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            Create a Moment →
          </button>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-[#1b1b1b] pt-8">
          <p className="text-xs text-[#1b1b1b80] font-mono uppercase letter-spacing">
            ekos — moments, made into music
          </p>
        </div>
      </main>
    </div>
  )
}
