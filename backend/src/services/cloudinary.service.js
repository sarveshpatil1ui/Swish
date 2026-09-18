import { v2 as cloudinary } from 'cloudinary'

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
})

export function isCloudinaryConfigured() {
  return Boolean(cloudName && apiKey && apiSecret)
}

/**
 * Generate a signed upload payload for a college verification proof.
 *
 * The frontend never receives the Cloudinary API secret.
 * The backend controls the folder, public ID and resource type.
 */
export function createProofUploadSignature(resourceType) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured.')
  }

  if (!['image', 'raw'].includes(resourceType)) {
    throw new Error('Unsupported Cloudinary resource type.')
  }

  const timestamp = Math.floor(Date.now() / 1000)

  const publicId = `proof_${timestamp}_${Math.random()
    .toString(36)
    .slice(2, 12)}`

  const folder = 'swish/college-onboarding/proofs'

  const type = 'authenticated'

  const paramsToSign = {
    folder,
    public_id: publicId,
    timestamp,
    type,
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    apiSecret
  )

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    publicId,
    resourceType,
    type,
  }
}

/**
 * Generate a short-lived signed URL for viewing a private/authenticated proof asset.
 */
export function getSignedProofUrl(publicId, resourceType = 'image') {
  if (!isCloudinaryConfigured() || !publicId) return null

  const rType = ['image', 'raw'].includes(resourceType) ? resourceType : 'image'
  const expiresAt = Math.floor(Date.now() / 1000) + 3600 // 1 hour validity

  return cloudinary.url(publicId, {
    resource_type: rType,
    type: 'authenticated',
    sign_url: true,
    expires_at: expiresAt,
  })
}

/**
 * Verify that a proof asset exists in the expected Cloudinary folder.
 */
export async function verifyProofAsset(publicId, resourceType) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured.')
  }

  if (!publicId || !['image', 'raw'].includes(resourceType)) {
    return null
  }

  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
      type: 'authenticated',
    })

    if (
      !result ||
      !result.public_id ||
      !result.public_id.startsWith(
        'swish/college-onboarding/proofs/'
      )
    ) {
      return null
    }

    return result
  } catch (err) {
    if (err?.http_code === 404) {
      return null
    }

    throw err
  }
}

export async function deleteProofAsset(publicId, resourceType) {
  if (!publicId) return

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: 'authenticated',
    })
  } catch (err) {
    console.error('[Cloudinary] Failed to delete proof asset:', err)
  }
}

export default cloudinary