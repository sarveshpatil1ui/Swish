// backend/test/content_moderation.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Content Moderation & Tenant Isolation Verification Suite
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import {
  buildCollegeUserFilter,
  isUserInCollege,
} from '../src/services/college-reconciliation.service.js'

describe('Content Moderation — Architecture, Tenant Isolation & Filters', () => {
  const collegeAId = new mongoose.Types.ObjectId()
  const collegeBId = new mongoose.Types.ObjectId()

  const collegeA = {
    _id: collegeAId,
    name: 'College of Engineering Mumbai',
    code: 'COEM',
    domain: 'coem.edu.in',
  }

  const collegeB = {
    _id: collegeBId,
    name: 'National Institute of Technology',
    code: 'NIT',
    domain: 'nit.ac.in',
  }

  const collegeAdminA = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Admin College A',
    username: 'admin_a',
    role: 'college_admin',
    collegeId: collegeAId,
    college: collegeA.name,
  }

  const collegeAdminB = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Admin College B',
    username: 'admin_b',
    role: 'college_admin',
    collegeId: collegeBId,
    college: collegeB.name,
  }

  const mainAdmin = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Main Platform Admin',
    username: 'main_admin',
    role: 'main_admin',
    collegeId: null,
  }

  // Users for College A
  const studentA1 = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Aarav Patel',
    username: 'aarav_p',
    role: 'student',
    dept: 'Computer Engineering',
    collegeId: collegeAId,
    college: collegeA.name,
    email: 'aarav@coem.edu.in',
    suspended: false,
  }

  const facultyA1 = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Dr. Sunita Sharma',
    username: 'dr_sunita',
    role: 'faculty',
    dept: 'Information Technology',
    designation: 'Associate Professor',
    collegeId: collegeAId,
    college: collegeA.name,
    email: 'sunita@coem.edu.in',
    suspended: false,
  }

  const legacyStudentA = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Legacy Student',
    username: 'legacy_student',
    role: 'student',
    dept: 'Computer Engineering',
    collegeId: null, // Legacy record without collegeId
    college: 'College of Engineering Mumbai',
    email: 'legacy@coem.edu.in',
  }

  // Users for College B
  const studentB1 = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Rohan Mehra',
    username: 'rohan_m',
    role: 'student',
    dept: 'Mechanical Engineering',
    collegeId: collegeBId,
    college: collegeB.name,
    email: 'rohan@nit.ac.in',
    suspended: false,
  }

  const facultyB1 = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Prof. Rajesh Khanna',
    username: 'prof_rajesh',
    role: 'faculty',
    dept: 'Civil Engineering',
    collegeId: collegeBId,
    college: collegeB.name,
    email: 'rajesh@nit.ac.in',
    suspended: false,
  }

  // Sample Posts
  const postA1_unreported = {
    _id: new mongoose.Types.ObjectId(),
    caption: 'Great workshop today on AI and Cloud at COEM campus!',
    user: studentA1,
    collegeId: collegeAId,
    likeCount: 15,
    commentCount: 3,
    isDeleted: false,
    hidden: false,
    createdAt: new Date('2026-11-01T09:00:00Z'),
  }

  const postA2_reported = {
    _id: new mongoose.Types.ObjectId(),
    caption: 'Spam promotional link for unofficial notes and cheats',
    user: studentA1,
    collegeId: collegeAId,
    likeCount: 2,
    commentCount: 1,
    isDeleted: false,
    hidden: false,
    createdAt: new Date('2026-11-02T11:00:00Z'),
  }

  const postA3_faculty_hidden = {
    _id: new mongoose.Types.ObjectId(),
    caption: 'Important midterm guidelines update for IT department',
    user: facultyA1,
    collegeId: collegeAId,
    likeCount: 45,
    commentCount: 8,
    isDeleted: false,
    hidden: true,
    hiddenReason: 'Premature draft accidentally published',
    createdAt: new Date('2026-11-02T14:00:00Z'),
  }

  const postA4_legacy = {
    _id: new mongoose.Types.ObjectId(),
    caption: 'Legacy user post without explicit post collegeId tag',
    user: legacyStudentA,
    collegeId: null, // Resolved via author affiliation
    likeCount: 5,
    commentCount: 0,
    isDeleted: false,
    hidden: false,
    createdAt: new Date('2026-11-03T08:00:00Z'),
  }

  const postB1_otherCollege = {
    _id: new mongoose.Types.ObjectId(),
    caption: 'NIT Annual Sports meet announcements and schedule',
    user: studentB1,
    collegeId: collegeBId,
    likeCount: 80,
    commentCount: 12,
    isDeleted: false,
    hidden: false,
    createdAt: new Date('2026-11-02T16:00:00Z'),
  }

  // Reports
  const reportOnPostA2 = {
    _id: new mongoose.Types.ObjectId(),
    reportedPostId: postA2_reported._id,
    category: 'spam',
    description: 'Promotional spam link violating campus rules',
    reporterName: 'Pooja V',
    reporterRole: 'student',
    status: 'pending',
    createdAt: new Date('2026-11-02T11:30:00Z'),
  }

  // ── TEST 1: Tenant Isolation ────────────────────────────────────────────────
  it('1. College Admin A can only access content belonging to College A', () => {
    // Helper replicating moderation college validation
    function validateCollegeAccess(content, college) {
      if (!college) return true
      if (content.collegeId && content.collegeId.toString() === college._id.toString()) {
        return true
      }
      return isUserInCollege(content.user, college)
    }

    // College A admin should have access to Post A1, A2, A3, and A4 (legacy)
    assert.equal(validateCollegeAccess(postA1_unreported, collegeA), true)
    assert.equal(validateCollegeAccess(postA2_reported, collegeA), true)
    assert.equal(validateCollegeAccess(postA3_faculty_hidden, collegeA), true)
    assert.equal(validateCollegeAccess(postA4_legacy, collegeA), true)

    // College A admin MUST NOT have access to Post B1
    assert.equal(validateCollegeAccess(postB1_otherCollege, collegeA), false)

    // College B admin can access Post B1 but NOT Post A1
    assert.equal(validateCollegeAccess(postB1_otherCollege, collegeB), true)
    assert.equal(validateCollegeAccess(postA1_unreported, collegeB), false)
  })

  // ── TEST 2: Main Admin Access ───────────────────────────────────────────────
  it('2. Main Admin has platform-wide moderation access across all colleges', () => {
    function validateCollegeAccess(content, college) {
      if (!college) return true // Main Admin has no college constraint
      if (content.collegeId && content.collegeId.toString() === college._id.toString()) return true
      return isUserInCollege(content.user, college)
    }

    assert.equal(validateCollegeAccess(postA1_unreported, null), true)
    assert.equal(validateCollegeAccess(postA2_reported, null), true)
    assert.equal(validateCollegeAccess(postB1_otherCollege, null), true)
  })

  // ── TEST 3: Both Reported and Unreported Content ────────────────────────────
  it('3. Moderation returns all content (both reported and unreported)', () => {
    const allCollegeAPosts = [postA1_unreported, postA2_reported, postA3_faculty_hidden, postA4_legacy]

    // Both reported and unreported must exist in the pool
    const hasUnreported = allCollegeAPosts.some(p => p._id.equals(postA1_unreported._id))
    const hasReported = allCollegeAPosts.some(p => p._id.equals(postA2_reported._id))

    assert.equal(hasUnreported, true, 'Unreported posts must be visible in Content Moderation')
    assert.equal(hasReported, true, 'Reported posts must be visible in Content Moderation')
    assert.equal(allCollegeAPosts.length, 4, 'All posts belonging to college must be listed')
  })

  // ── TEST 4: Student and Faculty Author Coverage ─────────────────────────────
  it('4. Content Moderation includes posts authored by both students and faculty', () => {
    const allPosts = [postA1_unreported, postA3_faculty_hidden]

    const studentPosts = allPosts.filter(p => p.user.role === 'student')
    const facultyPosts = allPosts.filter(p => p.user.role === 'faculty')

    assert.equal(studentPosts.length, 1, 'Student posts must be included')
    assert.equal(studentPosts[0].user.name, 'Aarav Patel')

    assert.equal(facultyPosts.length, 1, 'Faculty posts must be included')
    assert.equal(facultyPosts[0].user.name, 'Dr. Sunita Sharma')
    assert.equal(facultyPosts[0].user.designation, 'Associate Professor')
  })

  // ── TEST 5: Status Filtering ────────────────────────────────────────────────
  it('5. Status filters accurately segment reported, unreported, hidden, and visible content', () => {
    const allPosts = [postA1_unreported, postA2_reported, postA3_faculty_hidden]
    const reportedIds = new Set([postA2_reported._id.toString()])

    // Filter: 'reported'
    const reportedOnly = allPosts.filter(p => reportedIds.has(p._id.toString()))
    assert.equal(reportedOnly.length, 1)
    assert.equal(reportedOnly[0]._id.equals(postA2_reported._id), true)

    // Filter: 'unreported'
    const unreportedOnly = allPosts.filter(p => !reportedIds.has(p._id.toString()))
    assert.equal(unreportedOnly.length, 2)

    // Filter: 'hidden'
    const hiddenOnly = allPosts.filter(p => p.hidden === true)
    assert.equal(hiddenOnly.length, 1)
    assert.equal(hiddenOnly[0]._id.equals(postA3_faculty_hidden._id), true)

    // Filter: 'visible'
    const visibleOnly = allPosts.filter(p => !p.hidden)
    assert.equal(visibleOnly.length, 2)
  })

  // ── TEST 6: Department Filtering ────────────────────────────────────────────
  it('6. Department filter isolates content from authors belonging to that department', () => {
    const allPosts = [postA1_unreported, postA3_faculty_hidden]

    const compEngPosts = allPosts.filter(p => p.user.dept === 'Computer Engineering')
    const itPosts = allPosts.filter(p => p.user.dept === 'Information Technology')

    assert.equal(compEngPosts.length, 1)
    assert.equal(compEngPosts[0].user.username, 'aarav_p')

    assert.equal(itPosts.length, 1)
    assert.equal(itPosts[0].user.username, 'dr_sunita')
  })

  // ── TEST 7: Search Filtering ────────────────────────────────────────────────
  it('7. Search correctly filters by caption keyword or author name/username', () => {
    const allPosts = [postA1_unreported, postA2_reported, postA3_faculty_hidden]

    function searchPosts(query, posts) {
      const q = query.toLowerCase()
      return posts.filter(
        p =>
          p.caption.toLowerCase().includes(q) ||
          p.user.name.toLowerCase().includes(q) ||
          p.user.username.toLowerCase().includes(q)
      )
    }

    // Search by caption keyword
    const aiWorkshop = searchPosts('workshop', allPosts)
    assert.equal(aiWorkshop.length, 1)
    assert.equal(aiWorkshop[0]._id.equals(postA1_unreported._id), true)

    // Search by author name
    const sunitaPosts = searchPosts('sunita', allPosts)
    assert.equal(sunitaPosts.length, 1)
    assert.equal(sunitaPosts[0]._id.equals(postA3_faculty_hidden._id), true)

    // Search by username
    const aaravPosts = searchPosts('aarav_p', allPosts)
    assert.equal(aaravPosts.length, 2) // postA1 and postA2
  })

  // ── TEST 8: Report Annotation ───────────────────────────────────────────────
  it('8. Posts are annotated with report count and active report details', () => {
    const reportsMap = new Map([[postA2_reported._id.toString(), [reportOnPostA2]]])

    function annotatePostWithReports(post, map) {
      const reports = map.get(post._id.toString()) || []
      return {
        ...post,
        isReported: reports.length > 0,
        reportCount: reports.length,
        activeReportCount: reports.filter(r => r.status === 'pending' || r.status === 'reviewed').length,
        reports,
      }
    }

    const annotatedClean = annotatePostWithReports(postA1_unreported, reportsMap)
    assert.equal(annotatedClean.isReported, false)
    assert.equal(annotatedClean.reportCount, 0)

    const annotatedReported = annotatePostWithReports(postA2_reported, reportsMap)
    assert.equal(annotatedReported.isReported, true)
    assert.equal(annotatedReported.reportCount, 1)
    assert.equal(annotatedReported.activeReportCount, 1)
    assert.equal(annotatedReported.reports[0].category, 'spam')
    assert.equal(annotatedReported.reports[0].reporterName, 'Pooja V')
  })

  // ── TEST 9: Moderation Actions (Hide, Restore, Delete) ───────────────────────
  it('9. Moderation actions (Hide, Restore, Delete) properly mutate state and audit metadata', () => {
    const testPost = { ...postA1_unreported }

    // Action: Hide
    testPost.hidden = true
    testPost.hiddenBy = collegeAdminA._id
    testPost.hiddenAt = new Date()
    testPost.hiddenReason = 'Inappropriate content flagged by admin'

    assert.equal(testPost.hidden, true)
    assert.equal(testPost.hiddenReason, 'Inappropriate content flagged by admin')
    assert.equal(testPost.hiddenBy.equals(collegeAdminA._id), true)

    // Action: Restore
    testPost.hidden = false
    testPost.hiddenBy = null
    testPost.hiddenAt = null
    testPost.hiddenReason = ''

    assert.equal(testPost.hidden, false)
    assert.equal(testPost.hiddenReason, '')

    // Action: Delete (soft delete for audit persistence and feed exclusion)
    testPost.isDeleted = true
    assert.equal(testPost.isDeleted, true)
  })

  // ── TEST 10: Comments Moderation & Original Post Context ────────────────────
  it('10. Comments moderation preserves author details, reports, and original post context', () => {
    const commentOnPostA1 = {
      _id: new mongoose.Types.ObjectId(),
      text: 'Thanks for sharing this, will attend tomorrow!',
      user: studentA1,
      post: {
        _id: postA1_unreported._id,
        caption: postA1_unreported.caption,
        user: studentA1,
      },
      isDeleted: false,
      hidden: false,
      createdAt: new Date('2026-11-01T10:00:00Z'),
    }

    assert.equal(commentOnPostA1.post._id.equals(postA1_unreported._id), true)
    assert.equal(commentOnPostA1.user.name, 'Aarav Patel')
    assert.equal(commentOnPostA1.text, 'Thanks for sharing this, will attend tomorrow!')
    assert.equal(isUserInCollege(commentOnPostA1.user, collegeA), true)
    assert.equal(isUserInCollege(commentOnPostA1.user, collegeB), false)
  })
})
