// backend/src/models/Comment.js
// ─────────────────────────────────────────────────────────────────────────────
// Swish Comment model
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'

const { Schema } = mongoose

const CommentSchema = new Schema(
  {
    // ── Associated post ──────────────────────────────────────────────────
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },

    // ── Author ─────────────────────────────────────────────────────────────
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Content ─────────────────────────────────────────────────────────────
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },

    // ── Meta ────────────────────────────────────────────────────────────────
    // For future features: nested replies, mentions, etc.
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// ── Indexes for performance ──────────────────────────────────────────────────
CommentSchema.index({ post: 1, createdAt: -1 });
CommentSchema.index({ user: 1, createdAt: -1 });

// ── toJSON transform ─────────────────────────────────────────────────────────
CommentSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Comment', CommentSchema)