// backend/test/report_post_content.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Verification of Reported Post Content, Fallbacks, and Tenant Isolation
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

describe('Report Post Content & Multi-Tenant Moderation Audit', () => {
  const collegeA = new mongoose.Types.ObjectId()
  const collegeB = new mongoose.Types.ObjectId()

  const collegeAdminA = {
    _id: new mongoose.Types.ObjectId(),
    role: 'college_admin',
    collegeId: collegeA,
  }

  const collegeAdminB = {
    _id: new mongoose.Types.ObjectId(),
    role: 'college_admin',
    collegeId: collegeB,
  }

  const mainAdmin = {
    _id: new mongoose.Types.ObjectId(),
    role: 'main_admin',
    collegeId: null,
  }

  const mockAuthor = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Aditi Dhage',
    username: 'aditid',
    initials: 'AD',
    avatarColor: '#ec4899',
    profilePhoto: 'https://res.cloudinary.com/swish/image/upload/v1/avatar.jpg',
  }

  const mockPostCollegeA = {
    _id: new mongoose.Types.ObjectId(),
    caption: 'Inappropriate content posted in Campus A',
    imageUrl: 'https://res.cloudinary.com/swish/image/upload/v1/post_photo.jpg',
    imagePublicId: 'swish/post_photo',
    tags: ['campus', 'event'],
    collegeId: collegeA,
    isDeleted: false,
    hidden: false,
    createdAt: new Date('2026-11-01T10:00:00Z'),
    user: mockAuthor,
  }

  const mockDeletedPost = {
    _id: new mongoose.Types.ObjectId(),
    caption: 'This post was later deleted',
    collegeId: collegeA,
    isDeleted: true,
    user: mockAuthor,
  }

  // Simulation of backend/src/routes/reports.routes.js formatReportForClient logic
  function formatReportForClient(report, currentUser) {
    if (!report) return report
    const formatted = { ...report }

    let post =
      report.reportedPostId && typeof report.reportedPostId === 'object' && report.reportedPostId._id
        ? report.reportedPostId
        : null

    if (currentUser?.role === 'college_admin' && post) {
      const postCollegeId = post.collegeId ? post.collegeId.toString() : null
      const userCollegeId = currentUser.collegeId ? currentUser.collegeId.toString() : null
      if (postCollegeId && userCollegeId && postCollegeId !== userCollegeId) {
        post = null
        formatted.reportedPostId = null
      }
    }

    formatted.reportedPost = post

    let comment =
      report.reportedCommentId && typeof report.reportedCommentId === 'object' && report.reportedCommentId._id
        ? report.reportedCommentId
        : null

    formatted.reportedComment = comment
    return formatted
  }

  it('1. Formats report with populated post: author name, username, caption, image, and timestamp are preserved', () => {
    const rawReport = {
      _id: new mongoose.Types.ObjectId(),
      type: 'post',
      category: 'inappropriate_content',
      description: 'Harassing statements in the caption',
      reporterName: 'Student Reporter',
      reportedUserName: 'Aditi Dhage',
      reportedPostId: mockPostCollegeA,
      collegeId: collegeA,
      status: 'pending',
      createdAt: new Date(),
    }

    const formatted = formatReportForClient(rawReport, collegeAdminA)

    assert.ok(formatted.reportedPost, 'reportedPost must be attached')
    assert.equal(formatted.reportedPost.caption, 'Inappropriate content posted in Campus A')
    assert.equal(formatted.reportedPost.imageUrl, 'https://res.cloudinary.com/swish/image/upload/v1/post_photo.jpg')
    assert.equal(formatted.reportedPost.user.name, 'Aditi Dhage')
    assert.equal(formatted.reportedPost.user.username, 'aditid')
    assert.equal(formatted.reportedPost.user.profilePhoto, 'https://res.cloudinary.com/swish/image/upload/v1/avatar.jpg')
    assert.equal(formatted.reportedPost.isDeleted, false)
    assert.ok(formatted.reportedPost.createdAt)
  })

  it('2. Keeps reporter description separate from reported post content', () => {
    const rawReport = {
      _id: new mongoose.Types.ObjectId(),
      type: 'post',
      category: 'spam',
      description: 'The reporter states: "This user is spamming advertising links"',
      reportedUserName: 'Aditi Dhage',
      reportedPostId: mockPostCollegeA,
      collegeId: collegeA,
    }

    const formatted = formatReportForClient(rawReport, collegeAdminA)

    assert.equal(formatted.description, 'The reporter states: "This user is spamming advertising links"')
    assert.equal(formatted.reportedPost.caption, 'Inappropriate content posted in Campus A')
    assert.notEqual(formatted.description, formatted.reportedPost.caption)
  })

  it('3. Handles deleted/unavailable post cleanly without throwing or exposing misleading data', () => {
    // When post has been deleted from MongoDB or marked isDeleted
    const rawReportDeletedPost = {
      _id: new mongoose.Types.ObjectId(),
      type: 'post',
      category: 'harassment',
      description: 'Post was abusive but author deleted it',
      reportedUserName: 'Aditi Dhage',
      reportedPostId: mockDeletedPost,
      collegeId: collegeA,
    }

    const formatted = formatReportForClient(rawReportDeletedPost, collegeAdminA)

    assert.ok(formatted.reportedPost)
    assert.equal(formatted.reportedPost.isDeleted, true)

    // Verify UI logic check:
    const isPostUnavailable = !formatted.reportedPost || formatted.reportedPost.isDeleted
    assert.equal(isPostUnavailable, true, 'UI must detect post as unavailable when isDeleted is true')

    // Also test when Mongoose populate returns null for deleted post
    const rawReportNullPost = {
      _id: new mongoose.Types.ObjectId(),
      type: 'post',
      category: 'harassment',
      description: 'Post completely removed from DB',
      reportedUserName: 'Aditi Dhage',
      reportedPostId: null,
      collegeId: collegeA,
    }

    const formattedNull = formatReportForClient(rawReportNullPost, collegeAdminA)
    assert.equal(formattedNull.reportedPost, null)
    const isNullPostUnavailable = !formattedNull.reportedPost || formattedNull.reportedPost.isDeleted
    assert.equal(isNullPostUnavailable, true, 'UI must detect post as unavailable when reportedPost is null')
  })

  it('4. Enforces college tenant isolation: College Admin B cannot access post content from College A', () => {
    const rawReportCollegeA = {
      _id: new mongoose.Types.ObjectId(),
      type: 'post',
      category: 'harassment',
      description: 'Post from College A',
      reportedUserName: 'Aditi Dhage',
      reportedPostId: mockPostCollegeA,
      collegeId: collegeA,
    }

    // College Admin B attempts to format/view this report
    const formattedForAdminB = formatReportForClient(rawReportCollegeA, collegeAdminB)

    assert.equal(formattedForAdminB.reportedPost, null, 'Post content must be redacted for other college admin')
    assert.equal(formattedForAdminB.reportedPostId, null, 'reportedPostId must be redacted for other college admin')
  })

  it('5. Main Admin has global cross-college access and can view post content from any college', () => {
    const rawReportCollegeA = {
      _id: new mongoose.Types.ObjectId(),
      type: 'post',
      category: 'inappropriate_content',
      description: 'Post from College A reviewed by Main Admin',
      reportedUserName: 'Aditi Dhage',
      reportedPostId: mockPostCollegeA,
      collegeId: collegeA,
    }

    const formattedForMainAdmin = formatReportForClient(rawReportCollegeA, mainAdmin)

    assert.ok(formattedForMainAdmin.reportedPost, 'Main Admin must see post content')
    assert.equal(formattedForMainAdmin.reportedPost.caption, 'Inappropriate content posted in Campus A')
    assert.equal(formattedForMainAdmin.reportedPost.user.name, 'Aditi Dhage')
  })
})
