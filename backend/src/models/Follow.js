import mongoose from 'mongoose'

const { Schema } = mongoose

const FollowSchema = new Schema(
  {
    follower:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    following: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
)

FollowSchema.index({ follower: 1, following: 1 }, { unique: true })

export default mongoose.model('Follow', FollowSchema)
