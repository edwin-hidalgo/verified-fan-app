'use client'

export default function Lightpaper() {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; color: black; }
          .print-page { max-width: 100%; padding: 0; }
        }
      `}</style>

      <div className="bg-[#fdfff8] text-[#1b1b1b] min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-12 print-page">

          {/* Header */}
          <div className="mb-12 border-b border-[#1b1b1b] pb-8">
            <div className="flex items-center gap-3 mb-6 no-print">
              <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
                <ellipse cx="50" cy="50" rx="40" ry="32" stroke="#1b1b1b" strokeWidth="3.5" />
                <ellipse cx="50" cy="50" rx="30" ry="24" stroke="#1b1b1b" strokeWidth="3.5" />
                <ellipse cx="50" cy="50" rx="20" ry="16" stroke="#1b1b1b" strokeWidth="3.5" />
                <ellipse cx="50" cy="50" rx="10" ry="8" stroke="#1b1b1b" strokeWidth="3.5" />
              </svg>
              <span className="font-bold text-[#1b1b1b] text-xl">ekos</span>
            </div>

            <h1 className="text-4xl font-bold mb-3">ekos: The Music Trust Layer for the AI Era</h1>
            <p className="text-lg text-[#1b1b1b80] mb-2">A working paper on the opportunity, the architecture, and the roadmap</p>
            <p className="text-sm text-[#1b1b1b80] font-mono">April 2026</p>

            <button
              onClick={() => window.print()}
              className="no-print mt-6 px-6 py-3 bg-[#1b1b1b] text-[#fdfff8] text-sm font-semibold rounded-lg hover:opacity-80 transition-opacity"
            >
              Print / Download PDF
            </button>
          </div>

          {/* One-Line Pitch */}
          <section className="mb-10">
            <div className="border-l-4 border-[#2e8b6f] pl-6 py-2">
              <p className="text-xl font-semibold text-[#1b1b1b] leading-relaxed">
                ekos is the music-native identity and rights layer — where verified humans register music, define machine-readable license terms, and build the infrastructure AI and streaming companies will depend on.
              </p>
            </div>
          </section>

          {/* The Problem */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">The Problem</h2>
            <h3 className="text-lg font-semibold mb-3 text-[#1b1b1b80]">The music industry is held together by opacity.</h3>

            <div className="space-y-4 text-sm leading-relaxed text-[#1b1b1b]">
              <p>
                Rights metadata lives in disconnected silos — PROs, DSPs, distributors, publishers — each with their own schema. Licensing is gatekept by intermediaries. Royalty calculation is opaque. Creators rarely know if they were paid correctly, or at all.
              </p>
              <p>
                Then AI broke what was left. 60,000 AI-generated tracks are uploaded to Deezer alone every day — 39% of its daily intake. 85% of streams on AI-generated tracks in 2025 were fraudulent. Apple Music demonetized $17M in streams in a single year. Spotify estimates 8%+ of streams come from artificial accounts. Beatdapp puts the total cost of streaming fraud at $2B/year.
              </p>
              <p>
                Three approaches have emerged: detection (classify AI content after upload), disclosure (require metadata labels), and source provenance (C2PA watermarking at creation). All three share the same flaw: they are reactive, supply-side only, and entirely ignore whether a real human was on the other side of the stream.
              </p>
              <p className="font-semibold">
                No one has built the demand side. No one has built a rights layer designed for AI-native music from the ground up. That&apos;s the gap ekos fills.
              </p>
            </div>
          </section>

          {/* The Insight */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">The Insight: Dual-Layer Trust</h2>

            <div className="space-y-4 text-sm leading-relaxed text-[#1b1b1b]">
              <p>
                Every music interaction has two sides: a creator and a listener. Current infrastructure verifies neither. ekos introduces dual-layer trust:
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[#1b1b1b] rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Supply-side trust</h4>
                  <p className="text-xs text-[#1b1b1b80]">Verified-human creators register music with cryptographic proof of unique personhood. No fake artists. No AI impersonators. Immutable provenance from creation.</p>
                </div>
                <div className="border border-[#1b1b1b] rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Demand-side trust</h4>
                  <p className="text-xs text-[#1b1b1b80]">Verified-human listeners whose plays are attested to a unique identity. No bot streams. Sybil-resistant engagement metrics. Real audience data.</p>
                </div>
              </div>

              <p>
                Neither layer alone is sufficient. Together, they produce the first end-to-end auditable music interaction — from registered human creator to verified human listener.
              </p>
            </div>
          </section>

          {/* The Moments Feature */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">The Entry Point: Moments</h2>

            <div className="space-y-4 text-sm leading-relaxed text-[#1b1b1b]">
              <p>
                Infrastructure doesn&apos;t go viral. Applications do. Moments is the consumer surface that makes ekos accessible — and is itself the strategic wedge into the broader protocol.
              </p>

              <p>
                Think of it as Instagram for music. Instead of a photo, you capture a feeling through sound. Describe what you&apos;re experiencing, choose a duration, and AI composes music from your description. The result is immediately registered on Story Protocol as your IP Asset — with your World ID as proof of authorship and machine-readable license terms from day one.
              </p>

              <div className="border-l-2 border-[#2e8b6f] pl-4 space-y-1">
                <p className="font-semibold">What makes Moments strategically important:</p>
                <ul className="space-y-1 text-[#1b1b1b]">
                  <li>• It&apos;s the lowest-friction on-ramp into verified human registration</li>
                  <li>• Every Moment is a real IP Asset with license terms — not just content</li>
                  <li>• Creates a catalog of verified-human AI-assisted music with clear provenance</li>
                  <li>• Proves the infrastructure: identity + creation + rights in one atomic transaction</li>
                  <li>• Fun, expressive, shareable — but serious infrastructure underneath</li>
                </ul>
              </div>

              <p>
                The fun surface conceals serious infrastructure. Moments is what users see. The rights protocol is what the industry needs.
              </p>
            </div>
          </section>

          {/* The Infrastructure Play */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">The Infrastructure Play</h2>

            <div className="space-y-4 text-sm leading-relaxed text-[#1b1b1b]">
              <p>
                ekos is a 6-layer protocol. This hackathon ships layers 1–3. The roadmap adds 4–6.
              </p>

              <div className="space-y-3">
                {[
                  { num: '01', label: 'Identity', desc: 'World ID Orb verification. Unique human linked to pseudonymous on-chain identity.' },
                  { num: '02', label: 'Works', desc: 'Music registered as Story Protocol IP Assets with cryptographic provenance.' },
                  { num: '03', label: 'Terms', desc: 'Machine-readable license terms (AI training, sync, commercial) stored on IPFS and linked from the IP Asset.' },
                  { num: '04', label: 'Usage', desc: 'Oracles ingesting play data from DSPs and AI training pipelines.' },
                  { num: '05', label: 'Value Routing', desc: 'Programmatic royalty distribution via smart contracts. USDC settlement.' },
                  { num: '06', label: 'Discovery', desc: 'Queryable public registry. Integrations with MLC, PROs, DDEX.' },
                ].map(({ num, label, desc }) => (
                  <div key={num} className="flex gap-4 items-start">
                    <span className="font-mono text-[#2e8b6f] font-bold text-sm flex-shrink-0 mt-0.5">{num}</span>
                    <div>
                      <span className="font-semibold">{label} — </span>
                      <span className="text-[#1b1b1b80]">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Why World ID + Story Protocol */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Why World ID + Story Protocol</h2>

            <div className="space-y-4 text-sm leading-relaxed text-[#1b1b1b]">
              <p>
                ekos is not a new chain. Not a new protocol. It&apos;s the music-native application layer on top of infrastructure that only just became viable in 2025.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[#1b1b1b] rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold">World ID</h4>
                  <p className="text-xs text-[#1b1b1b80]">The only production-grade proof of unique human personhood at scale. 10M+ Orb verifications globally. Pseudonymous — creators don&apos;t reveal their identity, just prove they&apos;re human. Sybil-resistant by design.</p>
                </div>
                <div className="border border-[#1b1b1b] rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold">Story Protocol</h4>
                  <p className="text-xs text-[#1b1b1b80]">The IP infrastructure layer for on-chain rights. IP Assets, programmable license terms, composable derivative chains. Mainnet live 2025. Purpose-built for exactly the use case ekos requires.</p>
                </div>
              </div>

              <p>
                The timing is deliberate. Both infrastructure layers reached production maturity in 2025. The AI music wave hit the same year. ekos connects them — not as a research prototype but as a working system.
              </p>
            </div>
          </section>

          {/* Roadmap */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">The Roadmap</h2>

            <div className="space-y-4 text-sm text-[#1b1b1b]">
              {[
                {
                  phase: 'Phase 1 — Now',
                  title: 'Creator Registration',
                  desc: 'World ID verification, Moments creation, music upload, license term configuration, Story Protocol IP Asset registration. Public catalog with verified human badges.',
                  status: 'live',
                },
                {
                  phase: 'Phase 2',
                  title: 'Buyer Flow',
                  desc: 'AI companies and music supervisors browse the registry, license works, and pay in USDC. Smart contract enforcement of terms.',
                  status: 'next',
                },
                {
                  phase: 'Phase 3',
                  title: 'Sync Licensing Self-Serve',
                  desc: 'Music supervisors query by BPM, mood, license type, price. Instant clearance for film, TV, and advertising.',
                  status: 'roadmap',
                },
                {
                  phase: 'Phase 4',
                  title: 'Verified Listeners',
                  desc: 'The demand side. Every play attested to a unique human. User-centric streaming payments, direct fan tips, sybil-resistant metrics.',
                  status: 'roadmap',
                },
                {
                  phase: 'Phase 5',
                  title: 'Usage Ingestion',
                  desc: 'Oracles from DSPs and AI training platforms route royalties to creators programmatically. Automated settlement.',
                  status: 'roadmap',
                },
                {
                  phase: 'Phase 6',
                  title: 'The Registry Becomes a Standard',
                  desc: 'Integrations with MLC, PROs, DDEX. The new default rail for music rights across the industry.',
                  status: 'roadmap',
                },
              ].map(({ phase, title, desc, status }) => (
                <div key={phase} className="border border-[#1b1b1b] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-[#1b1b1b80]">{phase}</span>
                    {status === 'live' && (
                      <span className="text-xs font-mono text-[#2e8b6f] border border-[#2e8b6f] px-2 py-0.5 rounded">live</span>
                    )}
                    {status === 'next' && (
                      <span className="text-xs font-mono text-[#1b1b1b80] border border-[#1b1b1b80] px-2 py-0.5 rounded">next</span>
                    )}
                  </div>
                  <h4 className="font-semibold mb-1">{title}</h4>
                  <p className="text-xs text-[#1b1b1b80] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Monetization */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Why This Is Monetizable</h2>

            <div className="space-y-4 text-sm leading-relaxed text-[#1b1b1b]">
              <p>
                ekos charges transaction fees proportional to value routed — not flat subscriptions, not data licensing. This aligns incentives: ekos only earns when creators earn.
              </p>

              <div className="border-l-2 border-[#1b1b1b] pl-4 space-y-2">
                <p><span className="font-semibold">AI training licensing:</span> A single AI company licensing 100,000 tracks at $0.01/track generates $1,000 per run. Scale to 10 runs/month across 5 companies — $600K/year from one license category.</p>
                <p><span className="font-semibold">Sync licensing:</span> Music supervisors pay clearance fees on top of the license price. 2–5% transaction fee on a $500 sync license = $10–25 per transaction.</p>
                <p><span className="font-semibold">Streaming royalties:</span> At scale, ekos routes royalties from DSPs to creators. 1% routing fee on $1M routed = $10K/month, recurring.</p>
              </div>

              <p>
                The model is not extractive. It&apos;s aligned. The more value ekos routes to creators, the more ekos earns. Infrastructure that eats a small percentage of a very large number.
              </p>
            </div>
          </section>

          {/* Team */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">The Builder</h2>

            <div className="border border-[#1b1b1b] rounded-lg p-6 space-y-3 text-sm">
              <div>
                <p className="font-semibold text-lg">Edwin Hidalgo</p>
                <p className="text-[#1b1b1b80] text-xs font-mono">Founder, ekos</p>
              </div>
              <div className="space-y-2 text-[#1b1b1b]">
                <p><a href="https://newm.io/artists/" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[#2e8b6f] transition-colors">NEWM</a> — Music NFT protocol. Built a distribution platform reaching 120+ streaming platforms, an IP marketplace enabling artists to sell and investors to fund music royalties, and a web3 music streaming app — all focused on on-chain music rights and artist monetization.</p>
                <p><a href="https://www.story.foundation/" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[#2e8b6f] transition-colors">Story Protocol</a> — Built the <a href="https://portal.story.foundation/" target="_blank" rel="noopener noreferrer" className="hover:text-[#2e8b6f] transition-colors">IP Portal</a> for on-chain IP registration, and <a href="https://www.emergenceuniverse.com/" target="_blank" rel="noopener noreferrer" className="hover:text-[#2e8b6f] transition-colors">Emergence</a> — an IP universe built natively on Story Protocol. Supported the L1 chain launch and broader ecosystem development.</p>
                <p><a href="https://web3.okx.com/" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[#2e8b6f] transition-colors">OKX</a> — Led product across OKX Wallet, OKX Pay, and the X Layer chain relaunch — deep experience in on-chain settlement, wallet UX, and L2/chain launch dynamics.</p>
                <p><a href="https://www.jpmorganchase.com/" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[#2e8b6f] transition-colors">JPMorgan</a> — TradFi rails. Understanding of how money actually moves in legacy systems ekos is designed to improve.</p>
                <p><a href="https://www.cobaltid.com/" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[#2e8b6f] transition-colors">Cobalt Identity Systems</a> — Identity verification, AI detection, fraud detection, and data graph networking infrastructure. The product intuition behind building trust layers that surface bad actors — directly applicable to sybil resistance and verified creator identity in music.</p>
              </div>
              <p className="text-[#1b1b1b80] text-xs">
                The intersection of music rights, on-chain infrastructure, and identity verification is rare. This project sits directly at that intersection.
              </p>
            </div>
          </section>

          {/* Q&A */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Anticipated Questions</h2>

            <div className="space-y-4">
              {[
                {
                  q: "Isn't Story Protocol already doing this?",
                  a: "Story Protocol is IP infrastructure — it provides the rails. ekos is the music-native application built on those rails, with World ID verification as the creator identity layer, Moments as the consumer on-ramp, and AI training licensing as the primary commercial use case. Story Protocol doesn't have any of those. It's infrastructure. ekos is the application.",
                },
                {
                  q: "Who's the buyer?",
                  a: "Phase 2: AI companies licensing training data (Suno, Udio, Adobe Firefly, Google DeepMind). Phase 3: Music supervisors buying sync rights. Phase 4: DSPs integrating verified listener metrics. Phase 5: PROs and CMOs routing royalties programmatically. Each phase has a distinct buyer with a measurable willingness to pay.",
                },
                {
                  q: "How does this make money?",
                  a: "Transaction fees, proportional to value routed. Not subscriptions. Not data sales. When a creator earns, ekos earns a small percentage. This aligns incentives and scales naturally with adoption.",
                },
                {
                  q: "Can't platforms just ignore this?",
                  a: "They could ignore it until regulators require AI training disclosure. The EU AI Act already mandates it. The US Copyright Office is actively developing rules. ekos is building the infrastructure that will be required — not optional. First-mover advantage matters when the window closes.",
                },
                {
                  q: "What stops someone from using a fake World ID?",
                  a: "Nothing — World ID doesn't exist for that. World ID Orb verification is Sybil-resistant: one unique human, one proof. You can't register twice without physically visiting an Orb again. The proof is ZK-based — pseudonymous but unforgeable.",
                },
                {
                  q: "Why start with Moments instead of the registry directly?",
                  a: "Infrastructure without users is a database. Moments creates real registered IP Assets by real verified humans — organically, at scale, before the commercial licensing layer exists. When AI companies want to license verified-human music, the catalog is already there. Supply-side first is the only viable go-to-market.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="border border-[#1b1b1b] rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-sm">{q}</p>
                  <p className="text-sm text-[#1b1b1b80] leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-[#1b1b1b] pt-8 text-center">
            <p className="text-xs text-[#1b1b1b80] font-mono uppercase">
              ekos — Built for World Build 3 Hackathon | World ID + Story Protocol | April 2026
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
