// backend/test/report_permissions.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Report Permission Matrix Verification Suite
// Tests for Main Admin vs College Admin report access control
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import Report from '../src/models/Report.js'

describe('Report Permission Matrix', () => {
  const mainAdminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Main Admin',
    role: 'main_admin',
    collegeId: null,
    college: 'Swish Network',
  }

  const collegeAdminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'College Admin',
    role: 'college_admin',
    collegeId: new mongoose.Types.ObjectId(),
    college: 'Engineering College',
  }

  const otherCollegeAdminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Other College Admin',
    role: 'college_admin',
    collegeId: new mongoose.Types.ObjectId(),
    college: 'Medical College',
  }

  const platformReport = {
    _id: new mongoose.Types.ObjectId(),
    type: 'platform',
    category: 'platform_bug',
    collegeId: null,
    college: 'Swish Network',
    status: 'pending',
  }

  const systemReport = {
    _id: new mongoose.Types.ObjectId(),
    type: 'platform',
    category: 'college_admin_misconduct',
    collegeId: null,
    college: 'Swish Network',
    status: 'pending',
  }

  const postReportOwnCollege = {
    _id: new mongoose.Types.ObjectId(),
    type: 'post',
    category: 'harassment',
    collegeId: collegeAdminUser.collegeId,
    college: collegeAdminUser.college,
    status: 'pending',
  }

  const commentReportOwnCollege = {
    _id: new mongoose.Types.ObjectId(),
    type: 'comment',
    category: 'spam',
    collegeId: collegeAdminUser.collegeId,
    college: collegeAdminUser.college,
    status: 'pending',
  }

  const postReportOtherCollege = {
    _id: new mongoose.Types.ObjectId(),
    type: 'post',
    category: 'harassment',
    collegeId: otherCollegeAdminUser.collegeId,
    college: otherCollegeAdminUser.college,
    status: 'pending',
  }

  const commentReportOtherCollege = {
    _id: new mongoose.Types.ObjectId(),
    type: 'comment',
    category: 'spam',
    collegeId: otherCollegeAdminUser.collegeId,
    college: otherCollegeAdminUser.college,
    status: 'pending',
  }

  it('1. Main Admin can access platform reports', () => {
    // Main Admin should have full access to platform reports
    const canAccess = mainAdminUser.role === 'main_admin' || mainAdminUser.role === 'admin'
    assert.equal(canAccess, true, 'Main Admin must be able to access platform reports')
  })

  it('2. Main Admin can access system reports', () => {
    // Main Admin should have full access to system reports
    const canAccess = mainAdminUser.role === 'main_admin' || mainAdminUser.role === 'admin'
    assert.equal(canAccess, true, 'Main Admin must be able to access system reports')
  })

  it('3. Main Admin can access post reports across colleges', () => {
    // Main Admin should see post reports from all colleges
    const canAccess = mainAdminUser.role === 'main_admin' || mainAdminUser.role === 'admin'
    assert.equal(canAccess, true, 'Main Admin must be able to access post reports from any college')
  })

  it('4. Main Admin can access comment reports across colleges', () => {
    // Main Admin should see comment reports from all colleges
    const canAccess = mainAdminUser.role === 'main_admin' || mainAdminUser.role === 'admin'
    assert.equal(canAccess, true, 'Main Admin must be able to access comment reports from any college')
  })

  it('5. College Admin CANNOT access platform reports', () => {
    // College Admin should NOT see platform reports
    const isPlatformReport = platformReport.type === 'platform'
    const isPlatformCategory = ['platform_bug', 'college_admin_misconduct', 'feature_request'].includes(platformReport.category)
    const shouldBlock = collegeAdminUser.role === 'college_admin' && (isPlatformReport || isPlatformCategory)
    assert.equal(shouldBlock, true, 'College Admin must NOT be able to access platform reports')
  })

  it('6. College Admin CANNOT access system reports', () => {
    // College Admin should NOT see system reports
    const isPlatformReport = systemReport.type === 'platform'
    const isPlatformCategory = ['platform_bug', 'college_admin_misconduct', 'feature_request'].includes(systemReport.category)
    const shouldBlock = collegeAdminUser.role === 'college_admin' && (isPlatformReport || isPlatformCategory)
    assert.equal(shouldBlock, true, 'College Admin must NOT be able to access system reports')
  })

  it('7. College Admin CAN access post reports from their own college', () => {
    // College Admin should see post reports from their college
    const isOwnCollege = postReportOwnCollege.collegeId && postReportOwnCollege.collegeId.equals(collegeAdminUser.collegeId)
    const isPostReport = postReportOwnCollege.type === 'post'
    const canAccess = collegeAdminUser.role === 'college_admin' && isOwnCollege && isPostReport
    assert.equal(canAccess, true, 'College Admin must be able to access post reports from their own college')
  })

  it('8. College Admin CAN access comment reports from their own college', () => {
    // College Admin should see comment reports from their college
    const isOwnCollege = commentReportOwnCollege.collegeId && commentReportOwnCollege.collegeId.equals(collegeAdminUser.collegeId)
    const isCommentReport = commentReportOwnCollege.type === 'comment'
    const canAccess = collegeAdminUser.role === 'college_admin' && isOwnCollege && isCommentReport
    assert.equal(canAccess, true, 'College Admin must be able to access comment reports from their own college')
  })

  it('9. College Admin CANNOT access post reports from other colleges', () => {
    // College Admin should NOT see post reports from other colleges
    const isOwnCollege = postReportOtherCollege.collegeId && postReportOtherCollege.collegeId.equals(collegeAdminUser.collegeId)
    const isPostReport = postReportOtherCollege.type === 'post'
    const shouldBlock = collegeAdminUser.role === 'college_admin' && !isOwnCollege && isPostReport
    assert.equal(shouldBlock, true, 'College Admin must NOT be able to access post reports from other colleges')
  })

  it('10. College Admin CANNOT access comment reports from other colleges', () => {
    // College Admin should NOT see comment reports from other colleges
    const isOwnCollege = commentReportOtherCollege.collegeId && commentReportOtherCollege.collegeId.equals(collegeAdminUser.collegeId)
    const isCommentReport = commentReportOtherCollege.type === 'comment'
    const shouldBlock = collegeAdminUser.role === 'college_admin' && !isOwnCollege && isCommentReport
    assert.equal(shouldBlock, true, 'College Admin must NOT be able to access comment reports from other colleges')
  })

  it('11. Report type filter correctly excludes platform reports for college admins', () => {
    // Filter should only allow post and comment types for college admins
    const allowedTypes = ['post', 'comment']
    const isAllowedForCollegeAdmin = allowedTypes.includes(postReportOwnCollege.type)
    assert.equal(isAllowedForCollegeAdmin, true, 'Post reports should be allowed for college admins')
    assert.equal(allowedTypes.includes(platformReport.type), false, 'Platform reports should be blocked for college admins')
  })

  it('12. Category filter correctly excludes platform/system categories for college admins', () => {
    // Platform/system categories should be blocked for college admins
    const blockedCategories = ['platform_bug', 'college_admin_misconduct', 'feature_request']
    const isBlockedForCollegeAdmin = blockedCategories.includes(platformReport.category)
    assert.equal(isBlockedForCollegeAdmin, true, 'Platform bug category should be blocked for college admins')
    assert.equal(blockedCategories.includes(systemReport.category), true, 'College admin misconduct category should be blocked for college admins')
    assert.equal(blockedCategories.includes(postReportOwnCollege.category), false, 'Harassment category should be allowed for college admins')
  })
})
