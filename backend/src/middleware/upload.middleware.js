import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'profile-photos')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })


const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const unique = crypto.randomBytes(16).toString('hex')
    cb(null, `${req.user.id}-${unique}${ext}`)
  },
})

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('INVALID_FILE_TYPE'))
  }
  cb(null, true)
}

export const uploadProfilePhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single('photo')

// Post images are uploaded directly to Cloudinary using in-memory buffering.
// They are never written to the local filesystem.
export const uploadPostPhoto = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single('photo')

// Story images are uploaded directly to Cloudinary using in-memory buffering.
// Supports both 'photo' and 'image' field names.
const storyMulter = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
})

export const uploadStoryPhoto = (req, res, next) => {
  storyMulter.single('photo')(req, res, (err) => {
    if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
      return storyMulter.single('image')(req, res, next)
    }
    next(err)
  })
}
