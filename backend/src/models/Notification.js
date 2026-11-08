import mongoose from 'mongoose'
const { Schema } = mongoose

const NotificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['like', 'comment', 'follow', 'mention', 'event', 'follow_request', 'follow_accept', 'report_update'],
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    notice: {
      type: Schema.Types.ObjectId,
      ref: 'Notice',
      default: null,
    },
    text: {
      type: String,
      required: true,
    },
    subtext: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
    },
    // College context for multi-tenant notifications
    collegeId: {
      type: Schema.Types.ObjectId,
      ref: 'College',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

NotificationSchema.index({ recipient: 1, createdAt: -1 })
NotificationSchema.index({ recipient: 1, collegeId: 1, createdAt: -1 })

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)
