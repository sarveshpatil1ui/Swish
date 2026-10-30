import mongoose from 'mongoose'

const ReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reporterName: {
      type: String,
      required: true,
    },
    reporterRole: {
      type: String,
      enum: ['student', 'faculty', 'college_admin', 'admin', 'user'],
      default: 'student',
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reportedUserName: {
      type: String,
      required: true,
    },
    reportedPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    reportedCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    type: {
      type: String,
      enum: ['user', 'post', 'comment', 'platform'],
      required: true,
    },
    category: {
      type: String,
      enum: ['harassment', 'spam', 'inappropriate_content', 'misinformation', 'platform_bug', 'college_admin_misconduct', 'feature_request', 'other'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      default: null,
    },
    college: {
      type: String,
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: '',
      maxlength: 500,
    },
    resolutionNote: {
      type: String,
      default: '',
      maxlength: 500,
    },
  },
  { timestamps: true }
)

// Index for college-scoped queries
ReportSchema.index({ collegeId: 1, status: 1, createdAt: -1 })
ReportSchema.index({ reporterId: 1 })

export default mongoose.model('Report', ReportSchema)
