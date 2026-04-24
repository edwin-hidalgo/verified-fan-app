/**
 * GET /api/tracks/[id]/license
 * Public, CORS-open endpoint returning machine-readable music license terms
 *
 * This endpoint demonstrates that license terms are queryable by third parties (AI companies, sync supervisors, etc.)
 * No authentication required.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params

    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Fetch track with all metadata
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single()

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      )
    }

    // Only return public license data (not private creator info)
    const licenseData = {
      track_id: track.id,
      title: track.title,
      isrc: track.isrc || undefined,
      created_at: track.created_at,
      ai_origin: track.ai_origin,
      creator: {
        verified_human: true,
        username: track.artist_name,
      },
      license_terms: {
        ai_training: {
          allowed: track.ai_training_allowed,
          price_usd: track.ai_training_price_usd || undefined,
        },
        sync: {
          allowed: track.sync_allowed,
          price_usd: track.sync_price_usd || undefined,
        },
        commercial_use: {
          allowed: track.commercial_use_allowed,
          revenue_share_pct: track.commercial_use_revenue_share_pct || undefined,
        },
      },
      on_chain: {
        story_ip_id: track.story_ip_id || undefined,
        story_license_terms_id: track.story_license_terms_id || undefined,
        ipfs_metadata_cid: track.ipfs_metadata_cid || undefined,
      },
    }

    // Return with CORS headers to allow cross-origin access from AI companies
    return NextResponse.json(licenseData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('[tracks-license] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
