// backend/src/models/User.js
// ─────────────────────────────────────────────────────────────────────────────
// Swish User schema.
//
// Key security fields:
//   passwordHash     — bcrypt hash, NEVER plain-text
//   isEmailVerified  — account cannot log in until true
//   otpCode          — hashed 6-digit OTP (stored hashed, compared with bcrypt)
//   otpExpiresAt     — OTP TTL (default: 10 min from generation)
//   otpAttempts      — guards against brute-force OTP guessing
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'

const { Schema } = mongoose

// ── Nested preference sub-schemas ─────────────────────────────────────────────
const NotificationPrefsSchema = new Schema(
  {
    likes:    { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    follows:  { type: Boolean, default: true },
    mentions: { type: Boolean, default: true },
    events:   { type: Boolean, default: false },
  },
  { _id: false }
)

const PrivacyPrefsSchema = new Schema(
  {
    private:   { type: Boolean, default: false },
    showEmail: { type: Boolean, default: false },
    activity:  { type: Boolean, default: true },
    tagged:    { type: Boolean, default: true },
  },
  { _id: false }
)

const SecurityPrefsSchema = new Schema(
  { twoFactor: { type: Boolean, default: false } },
  { _id: false }
)

const PreferencesSchema = new Schema(
  {
    notifications: { type: NotificationPrefsSchema, default: () => ({}) },
    privacy:       { type: PrivacyPrefsSchema,       default: () => ({}) },
    security:      { type: SecurityPrefsSchema,      default: () => ({}) },
  },
  { _id: false }
)

// ── Main User schema ──────────────────────────────────────────────────────────
const UserSchema = new Schema(
  {
    // ── Identity ────────────────────────────────────────────────────────────
    name:        { type: String, required: true, trim: true },
    username:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    initials:    { type: String, required: true },
    avatarColor: { type: String, default: '#6366f1' },

    // ── Auth ────────────────────────────────────────────────────────────────
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['student', 'faculty', 'admin'], required: true },

    // ── Email verification / OTP ─────────────────────────────────────────────
    isEmailVerified: { type: Boolean, default: false },
    // OTP is stored as a bcrypt hash to prevent DB-dump attacks
    otpHash:         { type: String, default: null },
    otpExpiresAt:    { type: Date,   default: null },
    otpAttempts:     { type: Number, default: 0 },

    // ── Campus / profile info ────────────────────────────────────────────────
    college: { type: String, default: '' },
    dept:    { type: String, default: '' },
    bio:     { type: String, default: '' },

    // Student-only fields
    year:      { type: String, default: null },
    studentId: { type: String, default: null },

    // Faculty-only fields
    designation: { type: String, default: null },
    employeeId:  { type: String, default: null },

    // ── Social counts (denormalized for display speed) ───────────────────────
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    posts:     { type: Number, default: 0 },

    // ── Preferences ──────────────────────────────────────────────────────────
    preferences: { type: PreferencesSchema, default: () => ({}) },

    // ── Account state ─────────────────────────────────────────────────────────
    deactivated: { type: Boolean, default: false },
    suspended:   { type: Boolean, default: false },

    // ── Demo account flag (skips OTP for pre-seeded demo accounts) ────────────
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// ── toJSON — strip sensitive fields from all serializations ──────────────────
UserSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.passwordHash
    delete ret.otpHash
    delete ret.otpExpiresAt
    delete ret.otpAttempts
    return ret
  },
})

export default mongoose.model('User', UserSchema)
