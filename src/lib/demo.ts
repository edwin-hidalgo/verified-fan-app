/**
 * Demo mode — the hackathon build after live generation was paused (2026-09-28).
 *
 * Every paid or write path (photo description via Claude, music via Replicate, IPFS + Story
 * registration) is switched off on the server. The forms still work; where they used to call
 * those services they now replay a REAL result this flow produced while it was live. Nothing
 * here is invented: each record below was copied from the production `tracks` table, and its
 * Story IP ID resolves on the Aeneid testnet. The UI must always label a replay as a replay.
 */

export const DEMO_MODE = true

export const PAUSED_MESSAGE =
  'Live generation and registration were paused after the hackathon. This build runs in demo mode.'

export const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID || ''
export const OPEN_IN_WORLD_APP_URL = WORLD_APP_ID
  ? `https://world.org/mini-app?app_id=${WORLD_APP_ID}`
  : 'https://world.org/ecosystem'
export const GET_WORLD_APP_URL = 'https://world.org/download'
// The old aeneid.storyscan.xyz now redirects to aeneid.storyscan.io, which no longer resolves
// (checked 2026-09-28); Story's official IP-asset explorer does.
export const STORY_EXPLORER_IPA = 'https://aeneid.explorer.story.foundation/ipa/'

export interface ReplayRecord {
  trackId: string
  title: string
  createdAt: string
  /** The style the creator chose when it was generated */
  style: string
  /** Style words this replay stands in for */
  matches: string[]
  audioUrl: string
  coverUrl: string | null
  /** What Claude said about the creator's photo at the time */
  photoDescription: string | null
  /** A plain-words gloss of that photo, for the "this is an example" label */
  photoGloss: string | null
  storyIpId: string
  storyTxHash: string
  licenseTermsId: string
  ipfsMetadataCid: string
}

const STORAGE = 'https://gwafkmkmoaqgsdnvuqzn.supabase.co/storage/v1/object/public/audio-files/'

/** Real moments created through /create during the hackathon, April 25-26 2026. */
export const CREATE_REPLAYS: ReplayRecord[] = [
  {
    trackId: '9305db57-4502-421e-87a9-6d967f574cd1',
    title: 'Moment — cozy lo-fi jazz',
    createdAt: '2026-04-26T17:23:12Z',
    style: 'cozy lo-fi jazz',
    matches: ['jazz', 'cozy', 'coffee', 'vinyl'],
    audioUrl: `${STORAGE}1777224190469-moment-cozy-lo-fi-jazz`,
    coverUrl: `${STORAGE}covers/1777224147011.jpg`,
    photoDescription:
      "A vintage poster on a white wall featuring an illustrated black and white cat holding a vinyl record, sitting in an orange-toned room with a desk lamp and coffee cup. The text reads 'Always handle your record by its edges' and credits PFirong Coffee.",
    photoGloss: 'a poster of a cat holding a vinyl record',
    storyIpId: '0xB11dbA9D1FA90c6f73F1cE6156b4f58Ebb5aB364',
    storyTxHash: '0x06a0f11e46a476aab353bc7a94d98a0cf9409c579c2d125e47f4f4f700b815b0',
    licenseTermsId: '2054',
    ipfsMetadataCid: 'QmeZ1y7jGQ3twcKvsbMzrXh71GVd26hWqBHBiPuHXkRp9j',
  },
  {
    trackId: 'c656b6a0-caa6-42c4-ace6-fcad836ae7ed',
    title: 'Moment — cozy lo-fi',
    createdAt: '2026-04-26T16:30:35Z',
    style: 'cozy lo-fi',
    matches: ['lo-fi', 'lofi', 'chill', 'folk', 'calm'],
    audioUrl: `${STORAGE}1777221034187-moment-cozy-lo-fi`,
    coverUrl: `${STORAGE}covers/1777221016420.jpg`,
    photoDescription:
      'A tabby and white cat lounging on a yellow cushion or couch, looking directly at the camera with a slightly skeptical expression. Yellow sparkle stickers are overlaid near its ear.',
    photoGloss: 'a cat lounging on a yellow cushion',
    storyIpId: '0x53cD0cDBb2CbDA888812d647fA628983C08017B8',
    storyTxHash: '0xa4fdd70dffab8c23f8ef69719a02dc292d726f21318e425ba195a00336f16117',
    licenseTermsId: '2054',
    ipfsMetadataCid: 'QmRGNg3i5KsGmdAcsTj3ZXjpXQ7721qojvvB9eqtKWKa8M',
  },
  {
    trackId: '0ae80c91-3a55-42cd-90e4-16e825c016f7',
    title: 'Moment — ambient',
    createdAt: '2026-04-25T19:17:57Z',
    style: 'ambient',
    matches: ['ambient', 'cinematic', 'dark', 'atmospheric', 'drone'],
    audioUrl: `${STORAGE}1777144675194-moment-ambient`,
    coverUrl: `${STORAGE}covers/1777144605626.jpg`,
    photoDescription:
      'A decorative cat figurine holding colorful flowers stands in an interior space with curtains, sunglasses on a shelf above, and a large floral arrangement mounted on the wall.',
    photoGloss: 'a cat figurine holding flowers',
    storyIpId: '0xcA753D16E1c11f83C1Fc99be23Ea60C69610Ae8E',
    storyTxHash: '0x379766a2f5602b8e1f26627440bedf6e82a7d4c1826a05645914605d754ff2c0',
    licenseTermsId: '2054',
    ipfsMetadataCid: 'QmSLmSRKrcJFmwskXnkdMWoRKJMDpecdsyfnpzHrDkoVRQ',
  },
  {
    trackId: '3f887f9e-6b97-484e-9991-31b5ffc87b43',
    title: 'Moment — hyperpop energy with lo-fi undertones',
    createdAt: '2026-04-25T22:40:29Z',
    style: 'hyperpop energy with lo-fi undertones',
    matches: ['hyperpop', 'pop', 'energetic', 'upbeat', 'electronic', 'dance'],
    audioUrl: `${STORAGE}1777156827625-moment-hyperpop-energy-with-lo-fi-undertones`,
    coverUrl: `${STORAGE}covers/1777156734460.jpg`,
    photoDescription:
      'A cluttered creative workspace with dual monitors, a laptop, and walls covered in anime posters, fan art, stickers, and collectible figures.',
    photoGloss: 'a workspace covered in anime posters',
    storyIpId: '0x69c3a2be44748A79F19df6FF4399351d6F1C37f5',
    storyTxHash: '0xab3edc675908dc337d1d3750a2d5432ddee4dc9abdf8e1d331f70406610bff80',
    licenseTermsId: '2054',
    ipfsMetadataCid: 'QmRVLhnE5QCwHbKND24fCpeR3ZLY1pUTz4kxhxoK8dCJv9',
  },
]

/** A real upload registered through /register during the hackathon, April 24 2026. */
export const REGISTER_REPLAY: ReplayRecord = {
  trackId: '2ff0bbc1-cfda-4aa2-afc7-b263fb4dbf3d',
  title: 'dancing-on-neon-clouds',
  createdAt: '2026-04-24T19:34:46Z',
  style: '',
  matches: [],
  audioUrl: `${STORAGE}1777059281380-dancing-on-neon-clouds.mp3`,
  coverUrl: null,
  photoDescription: null,
  photoGloss: null,
  storyIpId: '0x8CE10B685CF04Fbaa34B9BC2c22b2F0d285Cf01C',
  storyTxHash: '0xec627e9ee5627daa6823f2b1ad61b6800d41ebec37564dbca02ee66ad377ed75',
  licenseTermsId: '2054',
  ipfsMetadataCid: 'QmUwpPKoqdXsB7dSTGxV5G4BmdCt7btJtKcSqeiNSyq5JT',
}

/** The replay used before the visitor has chosen a style (e.g. right after picking a photo). */
export const DEFAULT_REPLAY = CREATE_REPLAYS[0]

/**
 * Pick the replay whose style is closest to what the visitor asked for. Returns whether it was
 * an actual keyword match, so the UI can say "closest example" honestly when it was not.
 */
export function pickReplay(style: string): { replay: ReplayRecord; matched: boolean } {
  const s = style.toLowerCase()
  for (const replay of CREATE_REPLAYS) {
    if (replay.matches.some((word) => s.includes(word))) return { replay, matched: true }
  }
  return { replay: DEFAULT_REPLAY, matched: false }
}

export function formatReplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Pause for a moment so the labelled demo sequence is readable. */
export const demoPause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
