// backend/src/models/Session.js
// ─────────────────────────────────────────────────────────────────────────────
// Session schema for tracking user sessions and devices
//
// Tracks active sessions for security, device management, and token revocation.
// Tokens are NEVER stored in plain text: SHA-256 hashes are used exclusively.
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'

const { Schema } = mongoose

const SessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', default: null },

    // Device information
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    deviceName: { type: String, default: null }, // e.g. "Google Chrome on Windows 10/11"
    browser: { type: String, default: null },
    os: { type: String, default: null },

    // Network / Location information
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    location: { type: String, default: null }, // e.g. "Localhost", "Campus Network"

    // Session management — cryptographic SHA-256 hashes (never raw tokens)
    tokenHash: { type: String, required: true },
    refreshTokenHash: { type: String, default: null },

    // Status & Life Cycle
    isActive: { type: Boolean, default: true },
    lastActivity: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },

    // Security flags
    isSuspicious: { type: Boolean, default: false },
    suspiciousReason: { type: String, default: null },

    // Session expiration (automatic TTL index)
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

SessionSchema.index({ userId: 1, isActive: 1, lastActivity: -1 })
SessionSchema.index({ tokenHash: 1 })
SessionSchema.index({ refreshTokenHash: 1 })
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// ── toJSON — expose id instead of _id, NEVER expose token hashes ──────────────
SessionSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.token
    delete ret.tokenHash
    delete ret.refreshToken
    delete ret.refreshTokenHash
    return ret
  },
})

export default mongoose.model('Session', SessionSchema)
