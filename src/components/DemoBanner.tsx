import { DEMO_MODE, GET_WORLD_APP_URL, OPEN_IN_WORLD_APP_URL } from '@/lib/demo'

type Tone = 'light' | 'dark'

const box: Record<Tone, string> = {
  light: 'bg-[#fdfff8] border border-[#1b1b1b] text-[#1b1b1b]',
  dark: 'bg-gray-900 border border-gray-600 text-white',
}
const muted: Record<Tone, string> = {
  light: 'text-[#1b1b1b80]',
  dark: 'text-gray-400',
}

/** The banner every demo-mode form carries. Wording approved by Edwin, 2026-09-28. */
export function DemoBanner({ tone = 'light' }: { tone?: Tone }) {
  return (
    <div className={`${box[tone]} rounded-lg p-4 mb-8 text-sm leading-relaxed`} role="note">
      <p>
        <span className="font-semibold">Demo mode.</span>{' '}ekos was built for World Build 3 (April
        2026). Live AI generation and on-chain registration were paused after the hackathon. Every
        field still works; at the end you&apos;ll see a real moment this flow produced while it was
        live. Your photo and files never leave your device.
      </p>
    </div>
  )
}

/** Shown wherever the original build said "World App not detected". */
export function WorldAppNote({ tone = 'light', action }: { tone?: Tone; action: string }) {
  return (
    <div className={`${box[tone]} rounded-lg p-5 text-sm leading-relaxed space-y-3 text-left`}>
      <p>
        ekos was a <span className="font-semibold">World App mini app</span>. {action}{' '}works only
        inside World App, where World ID proves you&apos;re a unique human.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={OPEN_IN_WORLD_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`px-4 py-2 rounded-lg font-semibold text-center ${
            tone === 'light' ? 'bg-[#1b1b1b] text-[#fdfff8]' : 'bg-white text-black'
          } hover:opacity-80`}
        >
          Open in World App
        </a>
        <a
          href={GET_WORLD_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`px-4 py-2 rounded-lg font-semibold text-center border ${
            tone === 'light' ? 'border-[#1b1b1b]' : 'border-gray-500'
          } hover:opacity-80`}
        >
          Get World App
        </a>
      </div>
      {DEMO_MODE && <p className={muted[tone]}>You can still walk through the demo here in your browser.</p>}
    </div>
  )
}
