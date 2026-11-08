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
    // College tenancy of the request (for same-college validation)
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

FollowRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true })
FollowRequestSchema.index({ recipient: 1, status: 1 })
FollowRequestSchema.index({ collegeId: 1, status: 1 })

export default mongoose.models.FollowRequest || mongoose.model('FollowRequest', FollowRequestSchema)

