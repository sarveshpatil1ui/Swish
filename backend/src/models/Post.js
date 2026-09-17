import mongoose from 'mongoose'

const { Schema } = mongoose

const PostSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    caption: {
      type: String,
      trim: true,
      maxlength: 2200,
      default: '',
    },

    imageUrl: {
      type: String,
      default: null,
    },
    
    tags: [{
      type: String,
    }],

    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],

    commentCount: {
      type: Number,
      default: 0,
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

PostSchema.index({ user: 1, createdAt: -1 });
PostSchema.index({ likes: 1 });
PostSchema.index({ createdAt: -1 });

PostSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
  options: { sort: { createdAt: -1 } }
});

PostSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Post', PostSchema)