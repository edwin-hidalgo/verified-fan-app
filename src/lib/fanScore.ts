/**
 * fanScore.ts — Fan Score Calculation Algorithm
 *
 * Calculates a composite engagement score based on Spotify data.
 * Tiers: Superfan (100+), Dedicated Fan (60-99), Fan (30-59), Listener (1-29)
 */

export interface FanScoreInput {
  topArtistShort: boolean
  rankShort: number | null
  topArtistMedium: boolean
  rankMedium: number | null
  topArtistLong: boolean
  rankLong: number | null
  savedTrackCount: number
}

export interface FanScoreOutput {
  score: number
  tier: 'Superfan' | 'Dedicated Fan' | 'Fan' | 'Listener'
  breakdown: {
    shortTermBonus: number
    mediumTermBonus: number
    longTermBonus: number
    savedTracksBonus: number
  }
}

/**
 * Calculate fan score based on engagement metrics
 */
export function calculateFanScore(input: FanScoreInput): FanScoreOutput {
  let score = 0
  const breakdown = {
    shortTermBonus: 0,
    mediumTermBonus: 0,
    longTermBonus: 0,
    savedTracksBonus: 0,
  }

  // Long-term presence (deepest loyalty indicator)
  if (input.topArtistLong) {
    score += 30
    breakdown.longTermBonus += 30

    if (input.rankLong !== null && input.rankLong <= 5) {
      score += 20
      breakdown.longTermBonus += 20
    } else if (input.rankLong !== null && input.rankLong <= 15) {
      score += 10
      breakdown.longTermBonus += 10
    }
  }

  // Medium-term presence
  if (input.topArtistMedium) {
    score += 20
    breakdown.mediumTermBonus += 20

    if (input.rankMedium !== null && input.rankMedium <= 5) {
      score += 15
      breakdown.mediumTermBonus += 15
    } else if (input.rankMedium !== null && input.rankMedium <= 15) {
      score += 8
      breakdown.mediumTermBonus += 8
    }
  }

  // Short-term presence
  if (input.topArtistShort) {
    score += 15
    breakdown.shortTermBonus += 15

    if (input.rankShort !== null && input.rankShort <= 5) {
      score += 10
      breakdown.shortTermBonus += 10
    } else if (input.rankShort !== null && input.rankShort <= 15) {
      score += 5
      breakdown.shortTermBonus += 5
    }
  }

  // Saved tracks (intentional engagement)
  // 2 points per saved track, capped at 30
  const savedTracksBonus = Math.min(input.savedTrackCount * 2, 30)
  score += savedTracksBonus
  breakdown.savedTracksBonus = savedTracksBonus

  // Determine tier
  let tier: 'Superfan' | 'Dedicated Fan' | 'Fan' | 'Listener'
  if (score >= 100) {
    tier = 'Superfan'
  } else if (score >= 60) {
    tier = 'Dedicated Fan'
  } else if (score >= 30) {
    tier = 'Fan'
  } else {
    tier = 'Listener'
  }

  return {
    score,
    tier,
    breakdown,
  }
}

/**
 * Get tier color for UI rendering
 */
export function getTierColor(
  tier: 'Superfan' | 'Dedicated Fan' | 'Fan' | 'Listener'
): string {
  switch (tier) {
    case 'Superfan':
      return '#FCD34D' // yellow/gold
    case 'Dedicated Fan':
      return '#C084FC' // purple
    case 'Fan':
      return '#60A5FA' // blue
    case 'Listener':
      return '#9CA3AF' // gray
  }
}

/**
 * Get tier badge text
 */
export function getTierBadge(
  tier: 'Superfan' | 'Dedicated Fan' | 'Fan' | 'Listener'
): string {
  switch (tier) {
    case 'Superfan':
      return '🌟 Superfan'
    case 'Dedicated Fan':
      return '❤️ Dedicated Fan'
    case 'Fan':
      return '👂 Fan'
    case 'Listener':
      return '🎵 Listener'
  }
}
