// backend/src/models/Notice.js
// ─────────────────────────────────────────────────────────────────────────────
// Notice schema for College Admin module
//
// Each notice belongs to a specific college (collegeId)
// College Admin can only manage notices belonging to their college
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'

const { Schema } = mongoose

const NoticeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
    college: { type: String, required: true }, // Denormalized for easier filtering
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    department: { type: String, default: null }, // If specific to a department
    targetAudience: {
      type: String,
      enum: ['all', 'students', 'faculty', 'department'],
      default: 'all'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    category: {
      type: String,
      enum: ['Examinations', 'Placements', 'Holiday', 'Administrative', 'Sports', 'General'],
      default: 'General'
    },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    pinned: { type: Boolean, default: false }, // For official announcements
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attachments: [{
      url: { type: String, required: true },
      filename: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true },
      publicId: { type: String, required: true }
    }], // Cloudinary attachment metadata
    idempotencyKey: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
)

NoticeSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  }
)
NoticeSchema.index({ collegeId: 1, published: 1, createdAt: -1 })
NoticeSchema.index({ collegeId: 1, expiresAt: 1 })
NoticeSchema.index({ collegeId: 1, published: 1, pinned: -1, createdAt: -1 })

// ── toJSON — expose id instead of _id ────────────────────────────────────────
NoticeSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Notice', NoticeSchema)
