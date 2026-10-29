import mongoose from 'mongoose'

const { Schema } = mongoose

const FollowRequestSchema = new Schema(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

FollowRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true })
FollowRequestSchema.index({ recipient: 1, status: 1 })

export default mongoose.models.FollowRequest || mongoose.model('FollowRequest', FollowRequestSchema)

