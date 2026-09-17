// backend/src/models/CollegeOnboardingRequest.js
// ─────────────────────────────────────────────────────────────────────────────
// College Onboarding Request schema.
// Stores pending/approved/rejected onboarding requests submitted by campus admins.
// Documents are strictly created during final submission after OTP verification.
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'

const { Schema } = mongoose

const CollegeOnboardingRequestSchema = new Schema(
  {
    // College details
    collegeName: { type: String, required: true, trim: true },
    collegeCode: { type: String, required: true, trim: true, uppercase: true },
    emailDomain: { type: String, required: true, trim: true, lowercase: true },
    location:    { type: String, default: '', trim: true },
    campusType:  { type: String, default: '', trim: true },
    campusSize:  { type: String, default: '', trim: true },

    // Requester details
    adminName:     { type: String, required: true, trim: true },
    designation:   { type: String, default: '', trim: true },
    phone:         { type: String, default: '', trim: true },
    officialEmail: { type: String, required: true, lowercase: true, trim: true, index: true },

    // Proof Upload (Placeholders for Cloudinary integration)
    proofUrl:      { type: String, default: null },
    proofPublicId: { type: String, default: null },

    approvedAt: {
  type: Date,
  default: null,
},

approvedCollegeId: {
  type: Schema.Types.ObjectId,
  ref: 'College',
  default: null,
},

approvedAdminId: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  default: null,
},
rejectedAt: {
  type: Date,
  default: null,
},

rejectionReason: {
  type: String,
  default: '',
  trim: true,
},

    // Workflow status: 'PENDING', 'APPROVED', or 'REJECTED'
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      required: true,
      default: 'PENDING',
    },

    // Verification Audit
    emailVerified: { type: Boolean, default: true },
    verifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

CollegeOnboardingRequestSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('CollegeOnboardingRequest', CollegeOnboardingRequestSchema)

