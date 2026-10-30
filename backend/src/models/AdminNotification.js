import mongoose from 'mongoose'
const { Schema } = mongoose

const AdminNotificationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['college_request', 'platform_report', 'admin_security', 'college_status'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    link: {
      type: String,
      default: '',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

AdminNotificationSchema.index({ read: 1, createdAt: -1 })
AdminNotificationSchema.index({ type: 1, createdAt: -1 })

export default mongoose.models.AdminNotification || mongoose.model('AdminNotification', AdminNotificationSchema)

