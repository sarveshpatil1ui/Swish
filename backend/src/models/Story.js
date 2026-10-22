import mongoose from 'mongoose'

const { Schema } = mongoose

const StorySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },

    imagePublicId: {
      type: String,
      default: null,
    },

    caption: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    music: {
      title: { type: String, default: null },
      artist: { type: String, default: null },
      coverUrl: { type: String, default: null },
      audioUrl: { type: String, default: null },
    },

    filter: {
      type: String,
      default: 'normal',
    },

    sticker: {
      type: { type: String, default: null },
      label: { type: String, default: null },
    },

    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    replies: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: 500,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// TTL Index: MongoDB automatically removes documents when current time reaches expiresAt
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
StorySchema.index({ user: 1, createdAt: -1 })

StorySchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Story', StorySchema)
