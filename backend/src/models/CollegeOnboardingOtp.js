// backend/src/models/CollegeOnboardingOtp.js
// ─────────────────────────────────────────────────────────────────────────────
// Temporary storage for College Onboarding OTPs and verification tokens.
// Stores hashed OTPs, attempt limits, expiration, and server-verifiable tokens.
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'

const { Schema } = mongoose

const CollegeOnboardingOtpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, default: null },
    verificationTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
)

CollegeOnboardingOtpSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.otpHash
    delete ret.verificationTokenHash
    return ret
  },
})

export default mongoose.model('CollegeOnboardingOtp', CollegeOnboardingOtpSchema)

