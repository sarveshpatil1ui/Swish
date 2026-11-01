// backend/src/models/Broadcast.js
// ─────────────────────────────────────────────────────────────────────────────
// Broadcast schema for College Admin module
//
// Tracks broadcast messages sent to all users in a college
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'

const { Schema } = mongoose

const BroadcastSchema = new Schema(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
    college: { type: String, required: true }, // Denormalized for easier filtering
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sentByName: { type: String, required: true },
    sentByRole: { type: String, required: true },
    
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    
    targetAudience: {
      type: String,
      enum: ['all', 'students', 'faculty', 'college_admin'],
      required: true
    },
    
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    
    deliveryMethod: {
      type: String,
      enum: ['in_app', 'email', 'both'],
      default: 'in_app'
    },
    
    scheduledFor: { type: Date, default: null }, // For scheduled broadcasts
    sentAt: { type: Date, default: null }, // When actually sent
    
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sent', 'cancelled'],
      default: 'draft'
    },
    
    // Delivery statistics
    totalRecipients: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
    
    expiresAt: { type: Date, default: null }, // Broadcast messages can expire
  },
  { timestamps: true }
)

BroadcastSchema.index({ collegeId: 1, status: 1, createdAt: -1 })
BroadcastSchema.index({ collegeId: 1, scheduledFor: 1 }, { partialFilterExpression: { status: 'scheduled' } })
BroadcastSchema.index({ sentAt: 1 }, { partialFilterExpression: { status: 'sent' } })

// ── toJSON — expose id instead of _id ────────────────────────────────────────
BroadcastSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Broadcast', BroadcastSchema)
