import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'profile-photos')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const POSTS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'posts')
fs.mkdirSync(POSTS_UPLOAD_DIR, { recursive: true })

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

const postsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, POSTS_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const unique = crypto.randomBytes(16).toString('hex')
    cb(null, `post-${req.user.id}-${Date.now()}-${unique}${ext}`)
  },
})

export const uploadPostPhoto = multer({
  storage: postsStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single('photo')
