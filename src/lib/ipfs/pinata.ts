import 'server-only'

const PINATA_API_URL = 'https://api.pinata.cloud/pinning'
const PINATA_JWT = process.env.PINATA_JWT

if (!PINATA_JWT) {
  console.warn('[pinata] PINATA_JWT not configured. IPFS uploads will fail.')
}

interface PinataResponse {
  IpfsHash: string
  PinSize: number
  Timestamp: string
}

/**
 * Upload JSON metadata to IPFS via Pinata
 * Returns the IPFS CID (content hash)
 */
export async function uploadJSON(data: Record<string, any>): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT not configured')
  }

  try {
    const jsonString = JSON.stringify(data)
    const blob = new Blob([jsonString], { type: 'application/json' })

    const formData = new FormData()
    formData.append('file', blob, 'metadata.json')

    const response = await fetch(`${PINATA_API_URL}/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[pinata] Upload error:', error)
      throw new Error(`IPFS upload failed: ${error.error?.reason || 'Unknown error'}`)
    }

    const result: PinataResponse = await response.json()
    console.log('[pinata] Uploaded JSON to IPFS:', result.IpfsHash)

    return result.IpfsHash
  } catch (error) {
    console.error('[pinata] Error uploading JSON:', error)
    throw error
  }
}

/**
 * Upload file to IPFS via Pinata
 * Returns the IPFS CID (content hash)
 */
export async function uploadFile(buffer: Buffer, filename: string): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT not configured')
  }

  try {
    const blob = new Blob([buffer], { type: 'application/octet-stream' })
    const formData = new FormData()
    formData.append('file', blob, filename)

    const response = await fetch(`${PINATA_API_URL}/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[pinata] Upload error:', error)
      throw new Error(`IPFS upload failed: ${error.error?.reason || 'Unknown error'}`)
    }

    const result: PinataResponse = await response.json()
    console.log('[pinata] Uploaded file to IPFS:', result.IpfsHash)

    return result.IpfsHash
  } catch (error) {
    console.error('[pinata] Error uploading file:', error)
    throw error
  }
}

/**
 * Calculate SHA256 hash of file for integrity checking
 */
export async function hashFile(buffer: Buffer): Promise<string> {
  const crypto = await import('crypto')
  return crypto.createHash('sha256').update(buffer).digest('hex')
}
