// backend/src/models/StoryView.js
// ─────────────────────────────────────────────────────────────────────────────
// StoryView schema for tracking story views / "Seen by"
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'

const { Schema } = mongoose

const StoryViewSchema = new Schema(
  {
    story: {
      type: Schema.Types.ObjectId,
      ref: 'Story',
      required: true,
      index: true,
    },
    viewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

// Unique compound index so a user viewing the same story multiple times counts as ONE view
StoryViewSchema.index({ story: 1, viewer: 1 }, { unique: true })
StoryViewSchema.index({ story: 1, viewedAt: -1 })

StoryViewSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('StoryView', StoryViewSchema)
