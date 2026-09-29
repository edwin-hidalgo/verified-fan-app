import Link from 'next/link'
import { formatReplayDate, STORY_EXPLORER_IPA, type ReplayRecord } from '@/lib/demo'

type Tone = 'light' | 'dark'

const short = (hex: string) => `${hex.slice(0, 10)}…${hex.slice(-6)}`

/**
 * The real on-chain registration a past run produced. Shown at the end of a demo flow, and
 * always introduced as someone else's earlier registration — never as the visitor's.
 */
export function ReplayRecordCard({
  replay,
  tone = 'light',
  heading,
}: {
  replay: ReplayRecord
  tone?: Tone
  heading: string
}) {
  const border = tone === 'light' ? 'border-[#1b1b1b]' : 'border-gray-600'
  const muted = tone === 'light' ? 'text-[#1b1b1b80]' : 'text-gray-400'
  const link = 'underline underline-offset-2 hover:opacity-70'

  return (
    <div className={`border ${border} rounded-lg p-6 space-y-4`}>
      <div>
        <p className={`text-xs font-mono uppercase ${muted}`}>Replay · real registration</p>
        <h3 className="text-xl font-bold mt-1">{heading}</h3>
        <p className={`text-sm mt-1 ${muted}`}>
          &ldquo;{replay.title}&rdquo; was registered on Story Protocol&apos;s Aeneid testnet on{' '}
          {formatReplayDate(replay.createdAt)}. Nothing you entered here was registered.
        </p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className={muted}>IP Asset</dt>
        <dd className="font-mono break-all">
          <a href={`${STORY_EXPLORER_IPA}${replay.storyIpId}`} target="_blank" rel="noopener noreferrer" className={link}>
            {short(replay.storyIpId)}
          </a>
        </dd>
        <dt className={muted}>Transaction</dt>
        <dd className="font-mono break-all">{short(replay.storyTxHash)}</dd>
        <dt className={muted}>License terms</dt>
        <dd className="font-mono">#{replay.licenseTermsId}</dd>
        <dt className={muted}>IPFS metadata</dt>
        <dd className="font-mono break-all">
          <a href={`https://gateway.pinata.cloud/ipfs/${replay.ipfsMetadataCid}`} target="_blank" rel="noopener noreferrer" className={link}>
            {short(replay.ipfsMetadataCid)}
          </a>
        </dd>
      </dl>
      <Link href={`/track/${replay.trackId}`} className={`inline-block text-sm font-semibold ${link}`}>
        Open this track →
      </Link>
    </div>
  )
}
