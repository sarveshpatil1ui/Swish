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
      enum: ['like', 'comment', 'follow', 'mention', 'event', 'follow_request', 'follow_accept'],
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
  },
  {
    timestamps: true,
  }
)

NotificationSchema.index({ recipient: 1, createdAt: -1 })

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)
