/**
 * GET /api/tracks
 * List all registered tracks (public catalog)
 *
 * POST /api/tracks
 * Register a music work as an IP Asset
 *
 * Accepts:
 * - Form data with audio file
 * - JSON with track metadata, splits, license terms
 *
 * Process:
 * 1. Upload audio file to Supabase Storage
 * 2. Hash audio file for integrity
 * 3. Create license metadata JSON
 * 4. Upload metadata to IPFS
 * 5. Register IP Asset on Story Protocol
 * 6. Create track record in Supabase
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { registerMusicIP } from '@/lib/story/register'
import { uploadJSON, uploadFile, hashFile } from '@/lib/ipfs/pinata'
import { MusicIPMetadataSchema, createMusicIPMetadata } from '@/lib/license/schema'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Fetch all registered tracks (public catalog)
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('registration_status', 'registered')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[tracks-list] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tracks' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      tracks: tracks || [],
    })
  } catch (error) {
    console.error('[tracks-list] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request - support both multipart (audio_file) and JSON (audio_url)
    let audioFile: File | null = null
    let audioUrl: string | null = null
    let metadataJson: string
    let fileName: string = 'unknown'

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      // JSON request with audio_url
      const body = await request.json()
      audioUrl = body.audio_url
      metadataJson = JSON.stringify(body.metadata)
      fileName = body.metadata?.title || 'moment'

      if (!audioUrl || !metadataJson) {
        return NextResponse.json(
          { error: 'Missing audio_url or metadata' },
          { status: 400 }
        )
      }

      console.log('[tracks-api] Processing moment creation with audio_url:', audioUrl)
    } else {
      // Multipart form data with audio_file
      const formData = await request.formData()
      audioFile = formData.get('audio_file') as File
      metadataJson = formData.get('metadata') as string
      fileName = audioFile?.name || 'unknown'

      if (!audioFile || !metadataJson) {
        return NextResponse.json(
          { error: 'Missing audio_file or metadata' },
          { status: 400 }
        )
      }

      console.log('[tracks-api] Processing track upload:', fileName)
    }

    // Get authenticated user from header
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing x-user-id header. User must be authenticated.' },
        { status: 401 }
      )
    }

    // Get user data from Supabase
    const supabase = await createServerSupabaseClient()
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('[tracks-api] User not found:', userId, userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse metadata
    let trackData
    try {
      trackData = JSON.parse(metadataJson)
    } catch {
      return NextResponse.json({ error: 'Invalid metadata JSON' }, { status: 400 })
    }

    // Get audio buffer (either from uploaded file or from URL)
    let audioBuffer: Buffer
    let audioContentType: string = 'audio/mpeg'

    if (audioFile) {
      // From uploaded file
      audioBuffer = Buffer.from(await audioFile.arrayBuffer())
      audioContentType = audioFile.type || 'audio/mpeg'
    } else if (audioUrl) {
      // Download from URL (Replicate audio output)
      console.log('[tracks-api] Downloading audio from URL:', audioUrl)
      const response = await fetch(audioUrl)
      if (!response.ok) {
        throw new Error(`Failed to download audio from URL: ${response.statusText}`)
      }
      audioBuffer = Buffer.from(await response.arrayBuffer())
      audioContentType = response.headers.get('content-type') || 'audio/mpeg'
    } else {
      throw new Error('No audio source provided')
    }

    const audioHash = await hashFile(audioBuffer)
    console.log('[tracks-api] Audio file hash:', audioHash)

    // Upload audio file to Supabase Storage
    const audioFileName = `${Date.now()}-${fileName}`
    const { error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(audioFileName, audioBuffer, {
        contentType: audioContentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('[tracks-api] Supabase storage error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload audio file' },
        { status: 500 }
      )
    }

    // Get public URL of uploaded audio
    const {
      data: { publicUrl },
    } = supabase.storage.from('audio-files').getPublicUrl(audioFileName)

    console.log('[tracks-api] Audio uploaded to:', publicUrl)

    // Create music IP metadata
    const musicMetadata = createMusicIPMetadata({
      work: {
        title: trackData.title,
        isrc: trackData.isrc,
        audio_file_url: publicUrl,
        audio_file_hash: audioHash,
        duration_seconds: trackData.duration_seconds,
        genre: trackData.genre,
        release_date: trackData.release_date,
        ai_origin: trackData.ai_origin || 'human',
      },
      creator: {
        world_wallet_address: userData.world_wallet_address,
        world_nullifier_hash: userData.world_nullifier_hash,
        world_username: userData.world_username,
        verified_human: true,
      },
      splits: trackData.splits || [],
      license_terms: {
        ai_training_allowed: trackData.ai_training_allowed || false,
        ai_training_price_usd: trackData.ai_training_price_usd || null,
        sync_allowed: trackData.sync_allowed || false,
        sync_price_usd: trackData.sync_price_usd || null,
        commercial_use_allowed: trackData.commercial_use_allowed || false,
        commercial_use_revenue_share_pct: trackData.commercial_use_revenue_share_pct || 0,
      },
    })

    // Validate metadata against schema
    try {
      MusicIPMetadataSchema.parse(musicMetadata)
    } catch (error) {
      console.error('[tracks-api] Metadata validation error:', error)
      return NextResponse.json({ error: 'Invalid metadata structure' }, { status: 400 })
    }

    console.log('[tracks-api] Uploading metadata to IPFS...')

    // Upload metadata to IPFS
    const ipfsMetadataCid = await uploadJSON(musicMetadata)

    console.log('[tracks-api] Metadata CID:', ipfsMetadataCid)

    // Create track record in Supabase (draft status)
    const { data: trackRecord, error: trackCreateError } = await supabase
      .from('tracks')
      .insert({
        user_id: userId,
        title: trackData.title,
        artist_name: userData.world_username || userData.world_wallet_address,
        isrc: trackData.isrc,
        duration_seconds: trackData.duration_seconds,
        genre: trackData.genre,
        release_date: trackData.release_date,
        audio_file_url: publicUrl,
        audio_file_hash: audioHash,
        splits: trackData.splits || [],
        ai_origin: trackData.ai_origin || 'human',
        ai_training_allowed: trackData.ai_training_allowed || false,
        ai_training_price_usd: trackData.ai_training_price_usd || null,
        sync_allowed: trackData.sync_allowed || false,
        sync_price_usd: trackData.sync_price_usd || null,
        commercial_use_allowed: trackData.commercial_use_allowed || false,
        commercial_use_revenue_share_pct: trackData.commercial_use_revenue_share_pct || 0,
        ipfs_metadata_cid: ipfsMetadataCid,
        registration_status: 'registering',
      })
      .select('id')
      .single()

    if (trackCreateError) {
      console.error('[tracks-api] Track record creation error:', trackCreateError)
      return NextResponse.json(
        { error: 'Failed to create track record' },
        { status: 500 }
      )
    }

    const trackId = trackRecord.id

    console.log('[tracks-api] Track record created:', trackId)

    // Check if running in dev mode (skip Story registration)
    const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

    if (devMode) {
      console.log('[tracks-api] DEV_MODE enabled - skipping Story Protocol registration')

      // Mark as registered anyway for demo purposes
      await supabase
        .from('tracks')
        .update({
          registration_status: 'registered',
        })
        .eq('id', trackId)

      return NextResponse.json({
        success: true,
        trackId,
        ipId: 'dev-mode-mock-' + trackId,
        txHash: '0x' + 'dev'.repeat(32),
        metadataCid: ipfsMetadataCid,
        note: 'DEV_MODE: Story Protocol registration skipped',
      })
    }

    console.log('[tracks-api] Registering IP Asset on Story Protocol...')

    // Register IP Asset on Story Protocol
    try {
      const storyResult = await registerMusicIP({
        metadata: musicMetadata,
      })

      console.log('[tracks-api] IP Asset registered:', storyResult.ipId)

      // Update track record with Story Protocol details
      const { error: updateError } = await supabase
        .from('tracks')
        .update({
          story_ip_id: storyResult.ipId,
          story_license_terms_id: storyResult.licenseTermsId,
          story_tx_hash: storyResult.txHash,
          registration_status: 'registered',
        })
        .eq('id', trackId)

      if (updateError) {
        console.error('[tracks-api] Failed to update track with Story details:', updateError)
        // Continue anyway - track is registered on Story even if DB update fails
      }

      return NextResponse.json({
        success: true,
        trackId,
        ipId: storyResult.ipId,
        txHash: storyResult.txHash,
        metadataCid: ipfsMetadataCid,
      })
    } catch (storyError) {
      console.error('[tracks-api] Story Protocol registration failed:', storyError)

      // Update track status to failed
      await supabase
        .from('tracks')
        .update({
          registration_status: 'failed',
        })
        .eq('id', trackId)

      return NextResponse.json(
        {
          error: 'Failed to register IP Asset on Story Protocol',
          details: storyError instanceof Error ? storyError.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[tracks-api] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
