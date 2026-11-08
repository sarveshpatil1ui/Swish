import mongoose from 'mongoose'

const { Schema } = mongoose

const FollowSchema = new Schema(
  {
    follower:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    following: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Status flag for isolating/deactivating cross-college relationships while preserving history
    isActive:  { type: Boolean, default: true, index: true },
    // College tenancy of the follow relationship (for same-college validation)
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', default: null, index: true },
  },
  { timestamps: true }
)

FollowSchema.index({ follower: 1, following: 1 }, { unique: true })
FollowSchema.index({ follower: 1, isActive: 1 })
FollowSchema.index({ following: 1, isActive: 1 })
FollowSchema.index({ collegeId: 1, isActive: 1 })

export default mongoose.model('Follow', FollowSchema)
