'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Stats {
  totalTracks: number
  totalPlays: number
}

export default function Landing() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ totalTracks: 0, totalPlays: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  // Removed auto-redirect to /register for verified users
  // Verified users should still see the landing page and choose their action

  useEffect(() => {
    // Fetch live stats
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
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white px-4 py-12">
      <main className="w-full max-w-2xl mx-auto flex flex-col gap-12">

        {/* Headline */}
        <div className="space-y-6 text-center">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              ekos — the music trust layer for the AI era
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Verified humans register music with on-chain provenance. Every creator is a unique person. Every play is a verified listen. License terms are machine-readable. This is the infrastructure the industry needs and no one else has built.
            </p>
          </div>

          {/* CTA - Both Creator and Listener Flows */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <button
              onClick={() => router.push('/create')}
              className="px-8 py-4 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 transition-colors duration-200"
            >
              Create a Moment →
            </button>
            <button
              onClick={() => router.push('/verify')}
              className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors duration-200"
            >
              Verify & Register →
            </button>
            <button
              onClick={() => router.push('/catalog')}
              className="px-8 py-4 bg-gray-800 text-white font-semibold rounded-full hover:bg-gray-700 transition-colors duration-200 border border-gray-600"
            >
              Browse Catalog →
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Creators: Register your IP with proof. Listeners: Verify to enable play counting. Or just browse.
          </p>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {statsLoading ? '—' : stats.totalTracks}
            </div>
            <p className="text-sm text-gray-400">Registered Tracks</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {statsLoading ? '—' : stats.totalPlays}
            </div>
            <p className="text-sm text-gray-400">Verified Plays</p>
          </div>
        </div>

        {/* The Problem */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Why Now</h2>
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 space-y-4">
            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                <span className="text-red-400 font-semibold">$2B/year lost to streaming fraud</span> (Beatdapp)
              </div>
              <div className="text-sm text-gray-300">
                <span className="text-red-400 font-semibold">8%+ of Spotify streams</span> come from artificial accounts
              </div>
              <div className="text-sm text-gray-300">
                <span className="text-red-400 font-semibold">60,000 AI tracks per day</span> uploaded to Deezer — 39% of daily intake
              </div>
              <div className="text-sm text-gray-300">
                <span className="text-red-400 font-semibold">85% of streams on AI-generated tracks</span> were fraudulent in 2025
              </div>
              <div className="text-sm text-gray-300">
                <span className="text-red-400 font-semibold">Apple Music demonetized 2B streams</span> in 2025 (~$17M)
              </div>
            </div>

            <div className="bg-red-950/40 border border-red-700/40 rounded p-4">
              <p className="text-gray-200 text-sm leading-relaxed">
                <span className="text-red-300 font-semibold">Why existing solutions fail:</span> Detection (AI classifiers) is brittle. Disclosure (metadata) is unenforceable. Source provenance is not integrated in DAWs. All three are reactive, supply-side only, and ignore whether a real human was on the other end of the stream.
              </p>
            </div>
          </div>
        </div>

        {/* The Solution */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">The Solution</h2>
          <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-6 space-y-6">
            <p className="text-gray-300">
              <span className="text-green-400 font-semibold">World ID + Story Protocol = Verifiable Music IP</span>
            </p>

            {/* Core */}
            <div className="border-l-2 border-green-600 pl-4 space-y-2">
              <h3 className="text-green-300 font-semibold">Creator Registration with Proof</h3>
              <p className="text-gray-300 text-sm">
                Creators verify with World ID Orb (proof of unique human). Upload a music file. Attach machine-readable license terms (AI training allowed/disallowed with pricing, sync rights, commercial use revenue share). Register as IP Asset on Story Protocol Aeneid testnet.
              </p>
              <p className="text-gray-400 text-xs">Result: Cryptographic proof that this human created this work, with explicit license restrictions.</p>
            </div>

            {/* Public Catalog */}
            <div className="border-l-2 border-green-600 pl-4 space-y-2">
              <h3 className="text-green-300 font-semibold">Public Registry</h3>
              <p className="text-gray-300 text-sm">
                Browse all registered works. Filter by license terms (e.g., "AI training allowed"). Each work shows verified human creator badge, Story Protocol IP Asset ID, license terms as queryable JSON API.
              </p>
              <p className="text-gray-400 text-xs">Result: Transparent, decentralized music IP registry. No gatekeepers. Provably human creators.</p>
            </div>

            {/* Legal Infrastructure */}
            <div className="border-l-2 border-green-600 pl-4 space-y-2">
              <h3 className="text-green-300 font-semibold">Machine-Readable Rights</h3>
              <p className="text-gray-300 text-sm">
                License terms stored as JSON on IPFS + linked from Story IP Asset. Third-party AI training platforms can query the registry: "Is AI training allowed on this work? What's the fee?" Smart contracts can enforce terms automatically.
              </p>
              <p className="text-gray-400 text-xs">Result: Rights are enforceable, transparent, and can be used in crypto apps.</p>
            </div>

            <div className="bg-green-950/40 border border-green-700/40 rounded p-4">
              <p className="text-green-200 text-sm">
                <span className="font-semibold">Result:</span> The substrate for a human-verified music rights protocol. Only verified humans can register. Rights are on-chain. License terms are machine-readable. Creators get immutable ownership proof.
              </p>
            </div>
          </div>
        </div>

        {/* Long-Game Vision */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Where This Goes</h2>
          <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-6 space-y-3">
            <div className="text-sm text-gray-300">
              <span className="text-purple-400 font-semibold">Verified Listeners</span> — The demand-side of the dual-layer trust system. Every play is attested to a unique human.
            </div>
            <div className="text-sm text-gray-300">
              <span className="text-purple-400 font-semibold">Privacy-Preserving Creation Verification</span> — DAW-level provenance with zero-knowledge proofs. Prove you created something without revealing the work.
            </div>
            <div className="text-sm text-gray-300">
              <span className="text-purple-400 font-semibold">Programmatic AI Training Licensing</span> — Queryable catalog with per-use settlement. AI companies pay per training run. Creators get paid on-chain, instantly.
            </div>
          </div>
        </div>

        {/* What You'll See */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">What This Demo Shows</h2>
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6 space-y-3">
            <p className="text-gray-300 font-semibold mb-3">Supply Side: Creator Registration</p>
            <ul className="text-gray-300 space-y-2 text-sm mb-4">
              <li>✓ Verify with World ID Orb (proof of humanity)</li>
              <li>✓ Disclose whether your music is human-created, AI-assisted, or AI-generated</li>
              <li>✓ Upload music file + metadata</li>
              <li>✓ Define license terms (AI training pricing, sync rights, commercial use)</li>
              <li>✓ Register as IP Asset on Story Protocol Aeneid testnet</li>
            </ul>

            <p className="text-gray-300 font-semibold mb-3">Demand Side: Verified Listeners</p>
            <ul className="text-gray-300 space-y-2 text-sm mb-4">
              <li>✓ Browse all registered works with verified creator badges</li>
              <li>✓ See how many verified humans have listened to each track</li>
              <li>✓ Every time YOU play a track (as a verified user), that counts as 1 verified listen</li>
              <li>✓ Not inflated streams — actual, auditable human engagement</li>
            </ul>

            <p className="text-gray-300 font-semibold mb-3">Both Sides Together</p>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>✓ View machine-readable license terms (JSON API)</li>
              <li>✓ See creation method badge (Human / AI-Assisted / AI-Generated)</li>
              <li>✓ Link to work on Story Protocol explorer</li>
              <li>✓ Understand rights at a glance</li>
            </ul>
          </div>
        </div>

        {/* Demo vs Production */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Demo vs. Production</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <p className="font-semibold text-gray-300 mb-2">This Demo</p>
              <ul className="text-gray-400 space-y-1">
                <li>✓ World ID verification</li>
                <li>✓ Music file upload</li>
                <li>✓ License terms configuration</li>
                <li>✓ Story Protocol registration (Aeneid testnet)</li>
                <li>✓ Public catalog browsing</li>
                <li>✓ License JSON API</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <p className="font-semibold text-gray-300 mb-2">Production Version</p>
              <ul className="text-gray-400 space-y-1">
                <li>✓ All demo features</li>
                <li>✓ Story Protocol mainnet</li>
                <li>✓ Orb in-person verification</li>
                <li>✓ Creator dashboard</li>
                <li>✓ Rights marketplace</li>
                <li>✓ Smart contract enforcement</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-800 pt-8">
          <p className="text-xs text-gray-600">
            Built for World Build 3 Hackathon | World ID + Story Protocol
          </p>
        </div>
      </main>
    </div>
  )
}
