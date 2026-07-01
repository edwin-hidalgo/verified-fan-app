'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              The first rights registry where only humans can register music.
            </h1>
            <p className="text-lg text-[#1b1b1b80] max-w-2xl mx-auto leading-relaxed">
              AI music supply is infinite. Verified-human music isn&apos;t. ekos is the application layer that makes the difference — built on World ID and Story Protocol.
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
              onClick={() => router.push('/verify')}
              className="px-8 py-4 bg-[#1b1b1b] text-[#fdfff8] font-semibold rounded-lg hover:opacity-80 transition-opacity duration-200"
            >
              Verify &amp; Register →
            </button>
            <button
              onClick={() => router.push('/catalog')}
              className="px-8 py-4 bg-transparent border border-[#1b1b1b] text-[#1b1b1b] font-semibold rounded-lg hover:bg-[#1b1b1b] hover:text-[#fdfff8] transition-colors duration-200"
            >
              Stream Music →
            </button>
          </div>
          <p className="text-sm text-[#1b1b1b80]">
            Creators: register your IP with proof of humanity. Listeners: verify to enable play counting. Or just browse.
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
              <p className="text-xs text-[#1b1b1b80] font-mono uppercase letter-spacing">Registered Tracks</p>
            </div>
            <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-[#2e8b6f] mb-2">
                {statsLoading ? '—' : stats.totalPlays}
              </div>
              <p className="text-xs text-[#1b1b1b80] font-mono uppercase letter-spacing">Verified Plays</p>
            </div>
          </div>
        </div>

        {/* The Problem */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">The music industry has a rail problem.</h2>
          <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="border border-[#1b1b1b] rounded-lg p-4">
                <div className="text-2xl font-bold text-[#1b1b1b] mb-1">$2B/year</div>
                <div className="text-sm text-[#1b1b1b80]">lost to streaming fraud (Beatdapp)</div>
              </div>
              <div className="border border-[#1b1b1b] rounded-lg p-4">
                <div className="text-2xl font-bold text-[#1b1b1b] mb-1">60,000 AI tracks/day</div>
                <div className="text-sm text-[#1b1b1b80]">uploaded to Deezer — 39% of daily intake</div>
              </div>
              <div className="border border-[#1b1b1b] rounded-lg p-4">
                <div className="text-2xl font-bold text-[#1b1b1b] mb-1">85% of streams</div>
                <div className="text-sm text-[#1b1b1b80]">on AI-generated tracks were fraudulent in 2025</div>
              </div>
            </div>

            <div className="border-l-2 border-[#1b1b1b] pl-4">
              <p className="text-[#1b1b1b80] text-sm leading-relaxed">
                <span className="text-[#1b1b1b] font-semibold">Three approaches exist</span> — detection (Deezer), disclosure (Spotify), source provenance (C2PA). All three are reactive, supply-side only, and ignore whether a real human was on the other side of the stream.
              </p>
            </div>
          </div>
        </div>

        {/* Lightpaper CTA Strip */}
        <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium text-[#1b1b1b]">We wrote the full thesis.</p>
          <Link
            href="/lightpaper"
            className="px-6 py-3 bg-[#1b1b1b] text-[#fdfff8] text-sm font-semibold rounded-lg hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            Read the ekos lightpaper →
          </Link>
        </div>

        {/* The Entry Point — Moments */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">The Entry Point — Moments</h2>
          <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6 space-y-4">
            <p className="text-[#1b1b1b] text-sm leading-relaxed">
              <span className="font-semibold text-[#2e8b6f]">Music is the new modality for self-expression.</span> Think Instagram for music — but instead of a photo, you capture a feeling through sound. Every Moment is AI-composed from your description, registered on-chain with your verified human identity, and owned by you from the start.
            </p>

            <div className="border-l-2 border-[#2e8b6f] pl-4 space-y-2">
              <h3 className="text-[#1b1b1b] font-semibold">Creating a Moment is the easiest on-ramp into the verified-human music ecosystem.</h3>
              <ul className="text-[#1b1b1b] text-sm space-y-1">
                <li>✓ Describe what you&apos;re feeling or experiencing</li>
                <li>✓ AI composes music from your description</li>
                <li>✓ Register as an IP Asset on Story Protocol — you own it</li>
                <li>✓ License terms are machine-readable from day one</li>
                <li>✓ Verified human identity attached — no AI impersonation possible</li>
              </ul>
            </div>

            <p className="text-[#1b1b1b80] text-sm">
              Not just content creation — it&apos;s identity + ownership + licensing in a single flow. The fun surface conceals serious infrastructure.
            </p>
          </div>
        </div>

        {/* The Solution */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">A neutral rail. Verified humans. Machine-readable terms.</h2>
          <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="border border-[#1b1b1b] rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-[#1b1b1b]">World ID Orb verification</h3>
                <p className="text-sm text-[#1b1b1b80]">Only unique, verified humans can register works. Pseudonymity preserved, sybil attacks blocked.</p>
              </div>
              <div className="border border-[#1b1b1b] rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-[#1b1b1b]">Story Protocol native</h3>
                <p className="text-sm text-[#1b1b1b80]">Every work becomes an on-chain IP Asset with programmable license terms. Portable, composable, auditable.</p>
              </div>
              <div className="border border-[#1b1b1b] rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-[#1b1b1b]">AI-native license types</h3>
                <p className="text-sm text-[#1b1b1b80]">First-class support for AI training licenses — the license category every other registry ignores.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Where This Goes</h2>
          <div className="bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-6 space-y-3">
            <div className="space-y-4">
              <div className="flex gap-3 text-sm">
                <span className="font-mono text-[#2e8b6f] font-bold flex-shrink-0">01</span>
                <div>
                  <span className="font-semibold text-[#1b1b1b]">Creator identity + works + AI-training license terms.</span>
                  <span className="text-[#1b1b1b80]"> Verified humans register, AI companies can query.</span>
                  <span className="ml-2 text-xs font-mono text-[#2e8b6f]">← now</span>
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="font-mono text-[#1b1b1b80] font-bold flex-shrink-0">02</span>
                <div>
                  <span className="font-semibold text-[#1b1b1b]">Buyer flow.</span>
                  <span className="text-[#1b1b1b80]"> AI companies browse, license, and pay via USDC. Real commercial transactions.</span>
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="font-mono text-[#1b1b1b80] font-bold flex-shrink-0">03</span>
                <div>
                  <span className="font-semibold text-[#1b1b1b]">Sync licensing self-serve.</span>
                  <span className="text-[#1b1b1b80]"> Music supervisors query the registry at their price point.</span>
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="font-mono text-[#1b1b1b80] font-bold flex-shrink-0">04</span>
                <div>
                  <span className="font-semibold text-[#1b1b1b]">Verified listeners.</span>
                  <span className="text-[#1b1b1b80]"> User-centric streaming payments, direct fan tips, sybil-resistant metrics.</span>
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="font-mono text-[#1b1b1b80] font-bold flex-shrink-0">05</span>
                <div>
                  <span className="font-semibold text-[#1b1b1b]">Usage ingestion.</span>
                  <span className="text-[#1b1b1b80]"> Oracles from DSPs and AI pipelines route royalties programmatically.</span>
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="font-mono text-[#1b1b1b80] font-bold flex-shrink-0">06</span>
                <div>
                  <span className="font-semibold text-[#1b1b1b]">The registry becomes a standard.</span>
                  <span className="text-[#1b1b1b80]"> Integrations with MLC, PROs, DDEX. The new default rail for music.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-[#1b1b1b] pt-8">
          <p className="text-xs text-[#1b1b1b80] font-mono uppercase letter-spacing">
            Built for World Build 3 Hackathon | World ID + Story Protocol
          </p>
        </div>
      </main>
    </div>
  )
}
