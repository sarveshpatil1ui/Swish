import { v2 as cloudinary } from 'cloudinary'

function getCredentials() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
    apiKey: process.env.CLOUDINARY_API_KEY?.trim(),
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim(),
  }
}

function ensureConfig() {
  const { cloudName, apiKey, apiSecret } = getCredentials()
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    })
  }
}

ensureConfig()

export function isCloudinaryConfigured() {
  const { cloudName, apiKey, apiSecret } = getCredentials()
  if (!cloudName || !apiKey || !apiSecret) return false
  const values = [cloudName, apiKey, apiSecret].map(v => (v || '').trim())
  const isPlaceholder = values.some(
    v => !v || v.startsWith('your-') || v.startsWith('YOUR_') || v.includes('REPLACE_WITH')
  )
  return !isPlaceholder
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
  ensureConfig()
  const { cloudName, apiKey, apiSecret } = getCredentials()

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

  const rType =
    resourceType === 'raw' || resourceType === 'application/pdf'
      ? 'raw'
      : 'image'
  const expiresAt = Math.floor(Date.now() / 1000) + 3600 // 1 hour validity

  // Raw authenticated assets, such as PDFs, must use a private download URL.
  // The generic delivery URL can produce a URL that the browser cannot open
  // even though the asset exists and the signature is valid.
  if (rType === 'raw') {
    return cloudinary.utils.private_download_url(publicId, 'pdf', {
      resource_type: 'raw',
      type: 'authenticated',
      expires_at: expiresAt,
    })
  }

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

/**
 * Upload an image buffer directly to Cloudinary.
 * Used for post media uploads so images are never saved to the local disk.
 *
 * @param {Buffer} buffer - Image file buffer from multer.memoryStorage
 * @param {Object} [options] - Optional Cloudinary upload parameters
 * @returns {Promise<{ secureUrl: string, publicId: string }>}
 */
export async function uploadPostImage(buffer, options = {}) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured.')
  }
  ensureConfig()

  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('A valid image buffer is required.')
  }

  const folder = process.env.CLOUDINARY_POSTS_FOLDER || 'swish/posts'

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
        width: 1200,
        crop: 'limit',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error)
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        })
      }
    )
    uploadStream.end(buffer)
  })
}

/**
 * Delete a post image asset from Cloudinary.
 *
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object|null>}
 */
export async function deletePostImage(publicId) {
  if (!isCloudinaryConfigured() || !publicId) return null
  ensureConfig()

  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    })
  } catch (err) {
    console.error('[Cloudinary] Failed to delete post image:', err)
    return null
  }
}

/**
 * Upload a story image buffer directly to Cloudinary.
 * Used for story media uploads so media is never saved to the local disk.
 *
 * @param {Buffer} buffer - Image file buffer from multer.memoryStorage
 * @param {Object} [options] - Optional Cloudinary upload parameters
 * @returns {Promise<{ secureUrl: string, publicId: string }>}
 */
export async function uploadStoryImage(buffer, options = {}) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured.')
  }
  ensureConfig()

  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('A valid image buffer is required.')
  }

  const folder = process.env.CLOUDINARY_STORIES_FOLDER || 'swish/stories'

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
        width: 1080,
        crop: 'limit',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error)
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        })
      }
    )
    uploadStream.end(buffer)
  })
}

/**
 * Delete a story image asset from Cloudinary.
 *
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object|null>}
 */
export async function deleteStoryImage(publicId) {
  if (!isCloudinaryConfigured() || !publicId) return null
  ensureConfig()

  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    })
  } catch (err) {
    console.error('[Cloudinary] Failed to delete story image:', err)
    return null
  }
}

/**
 * Upload a document buffer directly to Cloudinary.
 * Used for notice attachments (PDF, DOC, DOCX, images).
 *
 * @param {Buffer} buffer - File buffer from multer.memoryStorage
 * @param {Object} [options] - Optional Cloudinary upload parameters
 * @returns {Promise<{ secureUrl: string, publicId: string }>}
 */
export async function uploadDocument(buffer, options = {}) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured.')
  }
  ensureConfig()

  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('A valid file buffer is required.')
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error)
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        })
      }
    )
    uploadStream.end(buffer)
  })
}

/**
 * Delete a document asset from Cloudinary.
 *
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object|null>}
 */
export async function deleteDocument(publicId) {
  if (!isCloudinaryConfigured() || !publicId) return null
  ensureConfig()

  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: 'auto',
    })
  } catch (err) {
    console.error('[Cloudinary] Failed to delete document:', err)
    return null
  }
}

export default cloudinary