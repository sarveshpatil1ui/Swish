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
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attachments: [{ type: String }], // URLs to attached files
  },
  { timestamps: true }
)

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
