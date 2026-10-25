// backend/src/models/ActivityLog.js
// ─────────────────────────────────────────────────────────────────────────────
// Activity Log model for College Admin auditing
//
// Records important admin actions for accountability and compliance
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'

const { Schema } = mongoose

const ActivityLogSchema = new Schema(
  {
    // Admin who performed the action
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    adminRole: {
      type: String,
      enum: ['admin', 'college_admin', 'main_admin'],
      required: true,
    },

    // College context
    collegeId: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      required: true,
    },
    college: {
      type: String,
      required: true,
    },

    // Action details
    actionType: {
      type: String,
      required: true,
      enum: [
        'user_blocked',
        'user_unblocked',
        'user_suspended',
        'user_reactivated',
        'report_reviewed',
        'report_resolved',
        'report_dismissed',
        'post_hidden',
        'post_restored',
        'comment_hidden',
        'comment_restored',
        'notice_created',
        'notice_edited',
        'notice_pinned',
        'notice_unpinned',
        'notice_deleted',
        'notice_published',
        'department_created',
        'department_edited',
        'department_deactivated',
        'department_activated',
        'department_deleted',
      ],
    },

    // Resource affected
    resourceType: {
      type: String,
      required: true,
      enum: ['user', 'report', 'post', 'comment', 'notice', 'department'],
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    resourceName: {
      type: String,
      default: '',
    },

    // Additional details
    details: {
      type: String,
      default: '',
      maxlength: 1000,
    },

    // IP address for security audit
    ipAddress: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
)

// Indexes for efficient querying
ActivityLogSchema.index({ collegeId: 1, createdAt: -1 })
ActivityLogSchema.index({ adminId: 1, createdAt: -1 })
ActivityLogSchema.index({ actionType: 1, createdAt: -1 })
ActivityLogSchema.index({ resourceType: 1, resourceId: 1 })

// ── toJSON — expose id instead of _id ────────────────────────────────────────
ActivityLogSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('ActivityLog', ActivityLogSchema)
