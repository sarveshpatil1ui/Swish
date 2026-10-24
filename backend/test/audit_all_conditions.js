import 'dotenv/config'

const BASE_URL = 'http://localhost:3001'

let totalTests = 0
let passedTests = 0
let failedTests = 0
const failures = []

function assert(condition, name, details = '') {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✔ [PASS] ${name}`)
  } else {
    failedTests++
    console.error(`  ✖ [FAIL] ${name} ${details ? '— ' + details : ''}`)
    failures.push({ name, details })
  }
}

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, options)
  let body = null
  const text = await res.text()
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, headers: res.headers, body }
}

async function runAudit() {
  console.log('=================================================================')
  console.log(' SWISH COMPREHENSIVE END-TO-END CONDITION AUDIT')
  console.log('=================================================================\n')

  // ── 1. SYSTEM HEALTH & CORS ────────────────────────────────────────────────
  console.log('▶ 1. System Health & CORS')
  {
    const res = await api('/api/health')
    assert(res.status === 200, 'Health endpoint returns HTTP 200')
    assert(res.body.ok === true && res.body.status === 'healthy', 'Health status is healthy')

    // OPTIONS preflight
    const optRes = await api('/api/posts', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
      },
    })
    assert(optRes.status === 204 || optRes.status === 200, 'CORS preflight responds successfully')
  }

  // ── 2. AUTHENTICATION & SESSION CONDITIONS ──────────────────────────────────
  console.log('\n▶ 2. Authentication & Session Conditions')
  let studentToken = null
  let studentUser = null
  let collegeAdminToken = null
  let platformAdminToken = null

  // 2a. Missing credentials
  {
    const res = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert(res.status === 400 || res.status === 422, 'Login rejects empty credentials with 400/422')
    assert(res.body.ok === false, 'Error flag ok === false on missing credentials')
  }

  // 2b. Wrong password
  {
    const res = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul@campus.edu', password: 'wrongpassword' }),
    })
    assert(res.status === 401, 'Login rejects incorrect password with 401')
    assert(res.body.ok === false, 'Error flag ok === false on incorrect password')
  }

  // 2c. Nonexistent email
  {
    const res = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody_12345@campus.edu', password: 'password123' }),
    })
    assert(res.status === 401 || res.status === 404, 'Login rejects nonexistent user with 401/404')
  }

  // 2d. Successful student login
  {
    const res = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul@campus.edu', password: 'swish123' }),
    })
    assert(res.status === 200, 'Student login succeeds with 200')
    assert(res.body.ok === true && res.body.token, 'Student token generated')
    studentToken = res.body.token
    studentUser = res.body.user
  }

  // 2e. Successful college admin login
  {
    const res = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'collegeadmin@campus.edu', password: 'college123' }),
    })
    assert(res.status === 200, 'College admin login succeeds with 200')
    collegeAdminToken = res.body.token
  }

  // 2f. Successful platform admin login
  {
    const res = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@swish.com', password: 'admin123' }),
    })
    assert(res.status === 200, 'Platform admin login succeeds with 200')
    platformAdminToken = res.body.token
  }

  // 2g. Auth verification /api/auth/me
  {
    // Without token
    const noToken = await api('/api/auth/me')
    assert(noToken.status === 401, '/api/auth/me rejects unauthenticated request with 401')

    // With invalid token
    const badToken = await api('/api/auth/me', {
      headers: { Authorization: 'Bearer invalid.token.value' },
    })
    assert(badToken.status === 401, '/api/auth/me rejects invalid token with 401')

    // With valid token
    const validMe = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(validMe.status === 200, '/api/auth/me succeeds with valid token')
    assert(validMe.body.user?.email === 'rahul@campus.edu', 'Returns correct authenticated user profile')
  }

  // ── 3. POSTS & INTERACTIONS CONDITIONS ──────────────────────────────────────
  console.log('\n▶ 3. Posts & Feed Conditions')
  let samplePostId = null

  // 3a. Feed retrieval
  {
    const res = await api('/api/posts', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(res.status === 200, 'GET /api/posts feed returns 200')
    assert(Array.isArray(res.body.posts) && res.body.posts.length > 0, 'Feed contains array of posts')
    samplePostId = res.body.posts[0]._id || res.body.posts[0].id
  }

  // 3b. Like and Unlike post (idempotency and toggle)
  {
    // Ensure clean state: unlike if currently liked
    await api(`/api/posts/${samplePostId}/like`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    })

    // 1. Like
    const likeRes = await api(`/api/posts/${samplePostId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(likeRes.status === 200, 'POST /api/posts/:id/like returns 200')
    assert(likeRes.body.liked === true, 'Post marked as liked')

    // 2. Duplicate like (should reject with 409 Conflict)
    const repeatLike = await api(`/api/posts/${samplePostId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(repeatLike.status === 409, 'Duplicate like correctly rejected with 409 Conflict')
    assert(repeatLike.body.ok === false, 'Duplicate like error flag ok === false')

    // 3. Unlike via DELETE
    const unlikeRes = await api(`/api/posts/${samplePostId}/like`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(unlikeRes.status === 200, 'DELETE /api/posts/:id/like returns 200')
    assert(unlikeRes.body.liked === false, 'Post marked as unliked')
  }

  // 3c. Save and Unsave post
  {
    const saveRes = await api(`/api/posts/${samplePostId}/save`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(saveRes.status === 200, 'POST /api/posts/:id/save returns 200')
    assert(saveRes.body.saved === true, 'Post marked as saved')

    const unsaveRes = await api(`/api/posts/${samplePostId}/save`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(unsaveRes.status === 200, 'DELETE /api/posts/:id/save returns 200')
    assert(unsaveRes.body.saved === false, 'Post marked as unsaved')
  }

  // 3d. Comments
  let createdCommentId = null
  {
    // Add comment
    const addComment = await api(`/api/posts/${samplePostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ text: 'Automated test comment: brilliant work! #audit' }),
    })
    assert(addComment.status === 201 || addComment.status === 200, 'Add comment returns 201/200')
    createdCommentId = addComment.body.comment?._id || addComment.body.comment?.id

    // List comments
    const listComments = await api(`/api/posts/${samplePostId}/comments`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(listComments.status === 200, 'GET /api/posts/:id/comments returns 200')
    assert(Array.isArray(listComments.body.comments), 'Returns array of comments')

    // Comment on invalid post ID
    const badPostComment = await api('/api/posts/invalid_id_format/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ text: 'should fail' }),
    })
    assert(badPostComment.status === 400 || badPostComment.status === 404, 'Comment on invalid ID rejected')
  }

  // ── 4. TRENDING & DISCOVERY CONDITIONS ──────────────────────────────────────
  console.log('\n▶ 4. Trending & Discovery Conditions')
  {
    // 4a. tab=trending
    const trendingTab = await api('/api/trending/posts?tab=trending', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(trendingTab.status === 200 && trendingTab.body.ok === true, 'GET /trending/posts?tab=trending returns 200')
    assert(Array.isArray(trendingTab.body.posts), 'Trending tab returns posts array')

    // 4b. tab=foryou
    const foryouTab = await api('/api/trending/posts?tab=foryou', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(foryouTab.status === 200 && foryouTab.body.ok === true, 'GET /trending/posts?tab=foryou returns 200')

    // 4c. tab=college
    const collegeTab = await api('/api/trending/posts?tab=college', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(collegeTab.status === 200 && collegeTab.body.ok === true, 'GET /trending/posts?tab=college returns 200')

    // 4d. tab=hashtags (all tagged posts)
    const hashtagsTab = await api('/api/trending/posts?tab=hashtags', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(hashtagsTab.status === 200 && hashtagsTab.body.ok === true, 'GET /trending/posts?tab=hashtags returns 200')
    assert(hashtagsTab.body.posts.every(p => p.tags && p.tags.length > 0), 'Every post returned in hashtags tab has at least one tag')

    // 4e. tab=hashtags with tag filter
    const tagFilterTab = await api('/api/trending/posts?tab=hashtags&tag=webdev', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(tagFilterTab.status === 200 && tagFilterTab.body.ok === true, 'GET /trending/posts?tab=hashtags&tag=webdev returns 200')
    assert(tagFilterTab.body.posts.every(p => p.tags && p.tags.map(t => t.toLowerCase()).includes('webdev')), 'Filtered posts match requested tag')

    // 4f. tab=hashtags with # prefix in query
    const hashPrefixTab = await api('/api/trending/posts?tab=hashtags&tag=%23webdev', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(hashPrefixTab.status === 200 && hashPrefixTab.body.ok === true, 'Handles # prefix in tag parameter cleanly')

    // 4g. Invalid tab parameter rejection
    const invalidTab = await api('/api/trending/posts?tab=invalid_tab', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(invalidTab.status === 422 || invalidTab.status === 400, 'Rejects invalid tab with 422/400')

    // 4h. Hashtags directory
    const hashtagsDir = await api('/api/trending/hashtags', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(hashtagsDir.status === 200 && hashtagsDir.body.ok === true, 'GET /trending/hashtags returns 200')
    assert(Array.isArray(hashtagsDir.body.hashtags) && hashtagsDir.body.hashtags.length > 0, 'Hashtags directory returns non-empty array with counts')

    // 4i. Specific tag route
    const tagPosts = await api('/api/trending/hashtags/webdev/posts', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(tagPosts.status === 200 && tagPosts.body.ok === true, 'GET /trending/hashtags/:tag/posts returns 200')

    // 4j. Accounts discovery
    const accounts = await api('/api/trending/accounts', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(accounts.status === 200 && accounts.body.ok === true, 'GET /trending/accounts returns 200')
    assert(Array.isArray(accounts.body.accounts), 'Accounts discovery returns array')
  }

  // ── 5. USERS & SOCIAL GRAPH CONDITIONS ──────────────────────────────────────
  console.log('\n▶ 5. Users & Social Graph Conditions')
  {
    // 1. Search users
    const searchRes = await api('/api/users/search?q=rahul', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(searchRes.status === 200, 'GET /api/users/search?q=rahul returns 200')
    assert(Array.isArray(searchRes.body.users), 'Search returns users array')

    // 2. All users directory
    const allUsersRes = await api('/api/users/all', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(allUsersRes.status === 200, 'GET /api/users/all returns 200')
    assert(Array.isArray(allUsersRes.body.users) && allUsersRes.body.users.length > 0, 'All users directory returns non-empty list')
    const otherUser = allUsersRes.body.users.find(u => (u._id || u.id) !== studentUser._id)
    const otherUserId = otherUser?._id || otherUser?.id

    // 3. User profile by :userId
    const profileRes = await api(`/api/users/${otherUserId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(profileRes.status === 200, 'GET /api/users/:userId returns 200')
    assert(profileRes.body.user?.name, 'Profile returned with user information')

    // 4. Nonexistent user profile
    const notFoundUser = await api('/api/users/507f1f77bcf86cd799439011', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(notFoundUser.status === 404, 'Nonexistent user ID returns 404')

    // 5. Cannot follow oneself
    const studentUserId = studentUser.id || studentUser._id
    const followSelf = await api(`/api/users/${studentUserId}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(followSelf.status === 400, 'Following self is rejected with 400')

    // 6. Follow another user (ensure not already following)
    await api(`/api/users/${otherUserId}/follow`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    const followRes = await api(`/api/users/${otherUserId}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(followRes.status === 201, 'Following another user returns 201 Created')

    // 7. Unfollow via DELETE
    const unfollowRes = await api(`/api/users/${otherUserId}/follow`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(unfollowRes.status === 200, 'Unfollowing another user via DELETE returns 200')
  }

  // ── 6. NOTIFICATIONS & INBOX ───────────────────────────────────────────────
  console.log('\n▶ 6. Notifications & Inbox Conditions')
  {
    const notifs = await api('/api/notifications', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(notifs.status === 200, 'GET /api/notifications returns 200')
    assert(Array.isArray(notifs.body.notifications), 'Notifications returns array')

    const markAllRead = await api('/api/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(markAllRead.status === 200, 'PATCH /api/notifications/read-all returns 200')

    // Messages inbox
    const inbox = await api('/api/messages', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(inbox.status === 200, 'GET /api/messages inbox returns 200')
    assert(Array.isArray(inbox.body.conversations), 'Inbox returns conversations array')
  }

  // ── 7. COLLEGES, DEPARTMENTS & NOTICES ──────────────────────────────────────
  console.log('\n▶ 7. Colleges, Departments & Notices')
  {
    const colleges = await api('/api/colleges')
    assert(colleges.status === 200, 'GET /api/colleges returns 200')
    assert(Array.isArray(colleges.body.colleges), 'Colleges returns array')

    const depts = await api('/api/departments/by-domain?domain=campus.edu')
    assert(depts.status === 200, 'GET /api/departments/by-domain returns 200')

    // Student campus notice feed
    const studentNotices = await api('/api/notices/college', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(studentNotices.status === 200, 'GET /api/notices/college returns 200 for students')

    // College admin notice management
    const adminNotices = await api('/api/notices', {
      headers: { Authorization: `Bearer ${collegeAdminToken}` },
    })
    assert(adminNotices.status === 200, 'GET /api/notices returns 200 for college admin')
  }

  // ── 8. ROLE-BASED ACCESS CONTROL (RBAC) GUARDS ─────────────────────────────
  console.log('\n▶ 8. Role-Based Access Control (RBAC) Guards')
  {
    // Student attempting admin endpoint
    const studentAsAdmin = await api('/api/admin/colleges', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(studentAsAdmin.status === 403, 'Student blocked from platform admin endpoints with 403 Forbidden')

    // College admin attempting platform admin endpoint
    const collegeAdminAsPlatformAdmin = await api('/api/admin/colleges', {
      headers: { Authorization: `Bearer ${collegeAdminToken}` },
    })
    assert(collegeAdminAsPlatformAdmin.status === 403, 'College admin blocked from platform admin endpoints with 403')

    // Platform admin accessing platform admin endpoint
    const platformAdminAccess = await api('/api/admin/colleges', {
      headers: { Authorization: `Bearer ${platformAdminToken}` },
    })
    assert(platformAdminAccess.status === 200, 'Platform admin allowed access with 200')

    // Student blocked from college analytics
    const studentAnalytics = await api('/api/analytics/dashboard', {
      headers: { Authorization: `Bearer ${studentToken}` },
    })
    assert(studentAnalytics.status === 403, 'Student blocked from college analytics dashboard with 403')

    // College admin accessing college analytics
    const collegeAnalytics = await api('/api/analytics/dashboard', {
      headers: { Authorization: `Bearer ${collegeAdminToken}` },
    })
    assert(collegeAnalytics.status === 200, 'College admin allowed access to college analytics dashboard with 200')
  }

  // ── 9. ROUTE 404 & ERROR HANDLING ──────────────────────────────────────────
  console.log('\n▶ 9. Unknown Routes & Error Handling')
  {
    const notFound = await api('/api/nonexistent_route_path_404')
    assert(notFound.status === 404, 'Unknown route correctly returns 404')
    assert(notFound.body.ok === false, '404 response contains ok: false')
  }

  console.log('\n=================================================================')
  console.log(` AUDIT SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`)
  if (failedTests > 0) {
    console.error(` ${failedTests} TESTS FAILED!`)
    console.error(' Failures:', failures)
    process.exit(1)
  } else {
    console.log(' ALL CONDITIONS & FUNCTIONS OPERATING AT 100% CORRECTNESS')
    console.log('=================================================================')
  }
}

runAudit().catch(err => {
  console.error('Audit unexpected error:', err)
  process.exit(1)
})
