/**
 * GET /api/tracks
 * List all published moments (public catalog).
 *
 * POST /api/tracks
 * Publish a moment (AI-generated audio + metadata) for the signed-in user.
 * No blockchain / World ID — audio is stored in Supabase and the row is public.
 */

import { createServerSupabaseClient, getAuthUser } from '@/lib/supabase/server'
import { ensureAppUser, displayNameFor } from '@/lib/supabase/ensure-user'
import { getReceiptForUser } from '@/lib/consent/receipts'
import { getGrant, grantStatus } from '@/lib/consent/grants'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('registration_status', 'registered')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[tracks-list] Error:', error.message || error)
      return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 })
    }

    return NextResponse.json({ tracks: tracks || [] })
  } catch (error) {
    console.error('[tracks-list] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1) Require a signed-in user (Supabase Auth session via cookies).
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'You must be signed in to create a moment.' }, { status: 401 })
    }

    const displayName = displayNameFor(authUser)

    // 2) Parse request — JSON (audio_url from generation) or multipart (audio_file upload).
    let audioFile: File | null = null
    let audioUrl: string | null = null
    let metadataJson: string
    let fileName = 'moment'

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await request.json()
      audioUrl = body.audio_url
      metadataJson = JSON.stringify(body.metadata)
      fileName = body.metadata?.title || 'moment'
      if (!audioUrl || !body.metadata) {
        return NextResponse.json({ error: 'Missing audio_url or metadata' }, { status: 400 })
      }
    } else {
      const formData = await request.formData()
      audioFile = formData.get('audio_file') as File
      metadataJson = formData.get('metadata') as string
      fileName = audioFile?.name || 'moment'
      if (!audioFile || !metadataJson) {
        return NextResponse.json({ error: 'Missing audio_file or metadata' }, { status: 400 })
      }
    }

    const trackData = (() => {
      try {
        return JSON.parse(metadataJson)
      } catch {
        return null
      }
    })()
    if (!trackData || !trackData.title) {
      return NextResponse.json({ error: 'Invalid or incomplete metadata (title required)' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // 3) Ensure an app `users` row exists for this auth user (FK target for tracks.user_id).
    const { error: userUpsertError } = await ensureAppUser(supabase, authUser)
    if (userUpsertError) {
      return NextResponse.json({ error: 'Failed to prepare account' }, { status: 500 })
    }

    // 4) Get audio bytes (uploaded file or generated URL) and hash them.
    let audioBuffer: Buffer
    let audioContentType = 'audio/mpeg'
    if (audioFile) {
      audioBuffer = Buffer.from(await audioFile.arrayBuffer())
      audioContentType = audioFile.type || 'audio/mpeg'
    } else {
      const res = await fetch(audioUrl as string)
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to download generated audio' }, { status: 502 })
      }
      audioBuffer = Buffer.from(await res.arrayBuffer())
      audioContentType = res.headers.get('content-type') || 'audio/mpeg'
    }
    const audioHash = crypto.createHash('sha256').update(audioBuffer).digest('hex')

    // 4b) If this moment came from a gated generation, check its receipt before publishing.
    //
    // Three things are asserted: the receipt is yours, it describes a generation that actually
    // succeeded, and the bytes about to be stored are the bytes the receipt describes. The last
    // one is why the output was hashed at generation time — it turns "the client says this audio
    // came from that receipt" into something the server can check.
    const receiptId: string | null = trackData.receipt_id || null
    if (receiptId) {
      const receipt = await getReceiptForUser(supabase, receiptId, authUser.id)
      if (!receipt) {
        return NextResponse.json({ error: 'Receipt does not belong to you' }, { status: 403 })
      }
      if (receipt.outcome !== 'succeeded') {
        return NextResponse.json({ error: 'Receipt has no successful output' }, { status: 400 })
      }
      if (receipt.output_sha256 && receipt.output_sha256 !== audioHash) {
        console.error('[tracks-api] receipt/audio mismatch', {
          receiptId,
          expected: receipt.output_sha256,
          got: audioHash,
        })
        return NextResponse.json({ error: 'Audio does not match the receipt' }, { status: 400 })
      }

      // Where output_survival_rule earns its place: a grant withdrawn after generation can
      // forbid publishing what was already made, and only the grant knows which it is.
      if (receipt.grant_id) {
        const grant = await getGrant(supabase, receipt.grant_id)
        if (
          grant &&
          grantStatus(grant) === 'revoked' &&
          grant.output_survival_rule !== 'outputs_survive'
        ) {
          console.log('[tracks-api] publish refused — revoked grant', {
            receiptId,
            grantId: grant.id,
            rule: grant.output_survival_rule,
          })
          return NextResponse.json(
            { error: 'This grant was revoked and its outputs may not be published.' },
            { status: 403 }
          )
        }
      }
    }

    // 5) Upload audio to Supabase Storage.
    const sanitized = fileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100)
    const audioFileName = `${Date.now()}-${sanitized || 'moment'}`

    const { error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(audioFileName, audioBuffer, { contentType: audioContentType, upsert: false })
    if (uploadError) {
      console.error('[tracks-api] Storage error:', uploadError.message)
      return NextResponse.json({ error: 'Failed to upload audio file' }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('audio-files').getPublicUrl(audioFileName)

    // 6) Insert the moment as a published track.
    const { data: trackRecord, error: insertError } = await supabase
      .from('tracks')
      .insert({
        user_id: authUser.id,
        title: trackData.title,
        artist_name: trackData.artist_name || displayName,
        duration_seconds: trackData.duration_seconds ?? null,
        genre: trackData.genre ?? null,
        audio_file_url: publicUrl,
        audio_file_hash: audioHash,
        ai_origin: trackData.ai_origin || 'ai_generated',
        cover_image_url: trackData.cover_image_url || null,
        moment_description: trackData.moment_description || null,
        registration_status: 'registered',
        receipt_id: receiptId,
      })
      .select('id')
      .single()

    if (insertError || !trackRecord) {
      console.error('[tracks-api] Insert error:', insertError?.message)
      return NextResponse.json({ error: 'Failed to save moment' }, { status: 500 })
    }

    return NextResponse.json({ success: true, trackId: trackRecord.id })
  } catch (error) {
    console.error('[tracks-api] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
