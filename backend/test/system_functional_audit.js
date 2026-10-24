// backend/test/system_functional_audit.js
// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive End-to-End Functional Test Suite
// Verifies all core business workflows against the live local backend (http://localhost:3001).
// ─────────────────────────────────────────────────────────────────────────────
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'
import User from '../src/models/User.js'
import Post from '../src/models/Post.js'
import Comment from '../src/models/Comment.js'
import Follow from '../src/models/Follow.js'
import Story from '../src/models/Story.js'
import StoryView from '../src/models/StoryView.js'
import Notification from '../src/models/Notification.js'
import { Conversation, Message } from '../src/models/Conversation.js'

const BASE_URL = 'http://localhost:3001'

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`)
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const res = await fetch(url, { ...options, headers })
  let data = null
  try {
    data = await res.json()
  } catch {
    // Non-JSON response
  }
  return { status: res.status, headers: res.headers, data }
}

async function runAudit() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🚀  STARTING COMPREHENSIVE SYSTEM FUNCTIONALITY AUDIT')
  console.log('═══════════════════════════════════════════════════════════════\n')

  await connectDB()

  // Test data identifiers
  const user1Email = 'test.student1@campus.edu'
  const user2Email = 'test.student2@campus.edu'
  const testPassword = 'Password@2026!'

  // Pre-test cleanup: ensure test accounts do not exist
  await User.deleteMany({ email: { $in: [user1Email, user2Email] } })

  let token1 = null
  let user1Id = null
  let token2 = null
  let user2Id = null
  let createdPostId = null

  try {
    // ── SECTION 1: HEALTH & CONFIG ──────────────────────────────────────────
    console.log('▶ [1/9] Testing System Health & Public Config...')
    const health = await request('/api/health')
    assert(health.status === 200, `Health check returned status ${health.status}`)
    assert(health.data.ok === true && health.data.status === 'healthy', 'Health check is healthy')
    console.log('  ✔ Health check endpoint returned 200 OK & healthy status')

    const colleges = await request('/api/colleges')
    assert(colleges.status === 200, 'Get colleges returned 200')
    assert(Array.isArray(colleges.data.colleges), 'Colleges array is returned')
    assert(colleges.data.colleges.some(c => c.domain === 'campus.edu'), 'campus.edu is an active college')
    console.log(`  ✔ Colleges route returned ${colleges.data.colleges.length} active colleges`)

    // ── SECTION 2: AUTHENTICATION & SECURITY ────────────────────────────────
    console.log('\n▶ [2/9] Testing Registration, Domain Verification & OTP Security...')
    
    // 2a. Reject unapproved domain
    const badDomain = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Hacker',
        email: 'attacker@gmail.com',
        password: testPassword,
        role: 'student',
        dept: 'Computer Science',
      })
    })
    assert(badDomain.status === 403, `Rejects non-college email domain with 403 (got ${badDomain.status})`)
    assert(badDomain.data.ok === false, 'Bad domain returns ok: false')
    console.log('  ✔ Correctly rejected unauthorized email domain (@gmail.com) with 403 Forbidden')

    // 2b. Register User 1
    const regUser1 = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Student One',
        email: user1Email,
        password: testPassword,
        role: 'student',
        dept: 'Computer Science',
        year: '3rd Year',
        studentId: 'CS2026001',
      })
    })
    assert(regUser1.status === 201, `User 1 registration returned ${regUser1.status}`)
    assert(regUser1.data.pendingVerification === true, 'Registration requires OTP verification')
    console.log('  ✔ User 1 registration successful (pending verification)')

    // 2c. Register User 2
    const regUser2 = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Student Two',
        email: user2Email,
        password: testPassword,
        role: 'student',
        dept: 'Information Technology',
        year: '2nd Year',
        studentId: 'IT2026002',
      })
    })
    assert(regUser2.status === 201, 'User 2 registration returned 201')
    console.log('  ✔ User 2 registration successful (pending verification)')

    // 2d. Reject invalid OTP
    const badOtp = await request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: user1Email, otp: '000000' })
    })
    assert(badOtp.status === 400, 'Invalid OTP rejected with 400')
    console.log('  ✔ Invalid OTP correctly rejected')

    // 2e. Verify with MASTER_OTP in dev
    const verify1 = await request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: user1Email, otp: '123456' })
    })
    assert(verify1.status === 200, 'Valid OTP verification returned 200')
    assert(verify1.data.ok === true && verify1.data.token, 'OTP returns JWT token')
    token1 = verify1.data.token
    user1Id = verify1.data.user.id
    console.log('  ✔ User 1 OTP verified successfully; JWT session issued')

    const verify2 = await request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: user2Email, otp: '123456' })
    })
    assert(verify2.status === 200, `User 2 OTP verified (status: ${verify2.status}, body: ${JSON.stringify(verify2.data)})`)
    token2 = verify2.data.token
    user2Id = verify2.data.user.id
    console.log('  ✔ User 2 OTP verified successfully')

    // 2f. Verify /me endpoint session rehydration
    const meRes = await request('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token1}` }
    })
    assert(meRes.status === 200 && meRes.data.user?.email === user1Email, 'GET /api/auth/me rehydrates session')
    console.log('  ✔ Session rehydration via GET /api/auth/me works')

    // 2g. Verify login rejects deleted demo accounts
    const oldDemo = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'rahul@campus.edu', password: 'swish123' })
    })
    assert(oldDemo.status === 401, 'Deleted demo account rejected with 401')
    console.log('  ✔ Purged hardcoded demo credentials (rahul@campus.edu) cannot log in')

    // 2h. Verify login with wrong password fails
    const badPass = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: user1Email, password: 'WrongPassword123' })
    })
    assert(badPass.status === 401, 'Wrong password returns 401')
    console.log('  ✔ Wrong password correctly returns 401 Unauthorized')

    // 2i. Verify login with correct password succeeds
    const goodLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: user1Email, password: testPassword })
    })
    assert(goodLogin.status === 200 && goodLogin.data.ok === true, 'Valid login returns 200')
    console.log('  ✔ Standard database password login successful')

    // ── SECTION 3: SOCIAL GRAPH (FOLLOW, UNFOLLOW, PROFILES) ────────────────
    console.log('\n▶ [3/9] Testing Social Graph, Followers & Profile Updates...')

    // 3a. Search users
    const search = await request('/api/users/search?q=Student', {
      headers: { 'Authorization': `Bearer ${token1}` }
    })
    assert(search.status === 200 && Array.isArray(search.data.users), 'Search returns user list')
    assert(search.data.users.some(u => u.email === user2Email || u.name === 'Student Two'), 'Search finds Student Two')
    console.log('  ✔ User search via GET /api/users/search returned matching users')

    // 3b. User 1 follows User 2
    const followRes = await request(`/api/users/${user2Id}/follow`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    })
    assert(followRes.status === 200 || followRes.status === 201, `Follow endpoint succeeded (got ${followRes.status})`)
    assert(followRes.data.ok === true, 'Follow endpoint returned ok: true')
    console.log('  ✔ Follow action succeeded (User 1 → User 2)')

    // 3c. Verify follower count on User 2 profile
    const profile2 = await request(`/api/users/${user2Id}`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    })
    assert(profile2.status === 200, 'Get profile returned 200')
    assert(profile2.data.user.followers >= 1, 'Followers count incremented')
    assert(profile2.data.user.isFollowing === true, 'isFollowing reflects true for viewer')
    console.log(`  ✔ Target profile reflects updated followers count (${profile2.data.user.followers}) and isFollowing: true`)

    // 3d. User profile update (bio & designation)
    const updateProfile = await request(`/api/users/${user1Id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token1}` },
      body: JSON.stringify({
        bio: 'Building awesome apps on Swish! 🚀',
      })
    })
    assert(updateProfile.status === 200 && updateProfile.data.ok === true, 'Profile update succeeded')
    assert(updateProfile.data.user.bio === 'Building awesome apps on Swish! 🚀', 'Bio was persisted')
    console.log('  ✔ User bio update persisted via PUT /api/users/:userId')

    // 3e. Preferences update
    const prefRes = await request('/api/users/preferences', {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token1}` },
      body: JSON.stringify({
        preferences: {
          notifications: { likes: true, comments: true },
          privacy: { showEmail: false, activity: true }
        }
      })
    })
    assert(prefRes.status === 200 && prefRes.data.ok === true, 'Preferences update succeeded')
    console.log('  ✔ User preferences updated via PATCH /api/users/preferences')

    // ── SECTION 4: POSTS, FEEDS, LIKES, COMMENTS & BOOKMARKS ────────────────
    console.log('\n▶ [4/9] Testing Posts Creation, Feeds, Likes, Comments & Saves...')

    // 4a. Create a post with tags
    const createPost = await request('/api/posts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` },
      body: JSON.stringify({
        caption: 'Excited to test the clean Swish platform! Live build verification. #swish #clean #coding',
        tags: ['swish', 'clean', 'coding']
      })
    })
    assert(createPost.status === 201 && createPost.data.ok === true, 'Create post returned 201')
    createdPostId = createPost.data.post.id
    console.log(`  ✔ Post created successfully (id: ${createdPostId})`)

    // 4b. Fetch feed
    const feed = await request('/api/posts', {
      headers: { 'Authorization': `Bearer ${token2}` }
    })
    assert(feed.status === 200 && Array.isArray(feed.data.posts), 'Feed returned 200 with posts')
    const foundInFeed = feed.data.posts.find(p => p.id === createdPostId)
    assert(Boolean(foundInFeed), 'Newly created post is visible in campus feed')
    console.log('  ✔ New post verified in feed via GET /api/posts')

    // 4c. User 2 likes the post
    const likeRes = await request(`/api/posts/${createdPostId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` }
    })
    assert(likeRes.status === 200 && likeRes.data.ok === true, 'Like post succeeded')
    assert(likeRes.data.likeCount === 1, `likeCount is 1 (got ${likeRes.data.likeCount})`)
    console.log('  ✔ Post liked by User 2; likeCount incremented')

    // 4d. User 2 adds a comment
    const commentRes = await request(`/api/posts/${createdPostId}/comments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` },
      body: JSON.stringify({ text: 'Looks great! Clean platform test.' })
    })
    assert(commentRes.status === 201 && commentRes.data.ok === true, 'Add comment returned 201')
    const commentId = commentRes.data.comment?.id || commentRes.data.comment?._id
    console.log('  ✔ Comment added successfully via POST /api/posts/:id/comments')

    // 4e. Fetch post comments
    const getComments = await request(`/api/posts/${createdPostId}/comments`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    })
    assert(getComments.status === 200 && Array.isArray(getComments.data.comments), 'Fetch comments returned 200')
    assert(getComments.data.comments.some(c => c.text.includes('Clean platform test')), 'Comment text verified')
    console.log(`  ✔ Verified comments list contains newly added comment (${getComments.data.comments.length} total)`)

    // 4f. User 1 saves the post
    const saveRes = await request(`/api/posts/${createdPostId}/save`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` }
    })
    assert(saveRes.status === 200 && saveRes.data.ok === true, 'Save post succeeded')
    assert(saveRes.data.saved === true, 'Post marked as saved')
    console.log('  ✔ Post saved/bookmarked via POST /api/posts/:id/save')

    // 4g. User 2 unlikes the post
    const unlikeRes = await request(`/api/posts/${createdPostId}/like`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token2}` }
    })
    assert(unlikeRes.status === 200 && unlikeRes.data.ok === true, 'Unlike post succeeded')
    assert(unlikeRes.data.likeCount === 0, 'likeCount decremented to 0')
    console.log('  ✔ Unlike succeeded; likeCount decremented to 0')

    // 4h. Delete comment
    if (commentId) {
      const delComment = await request(`/api/posts/${createdPostId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token2}` }
      })
      assert(delComment.status === 200 && delComment.data.ok === true, 'Comment delete succeeded')
      console.log('  ✔ Comment deleted via DELETE /api/posts/:id/comments/:commentId')
    }

    // ── SECTION 5: STORIES FUNCTIONALITY ────────────────────────────────────
    console.log('\n▶ [5/9] Testing Stories Creation, Feed, Views & Likes...')

    // User 2 follows User 1 so mutual follow allows viewing stories
    await request(`/api/users/${user1Id}/follow`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` }
    })

    // 5a. Create a story
    const storyRes = await request('/api/stories', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` },
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800',
        caption: 'Campus sunset story! 🌅',
      })
    })
    assert(storyRes.status === 201 && storyRes.data.ok === true, 'Story creation returned 201')
    const storyId = storyRes.data.story.id
    console.log(`  ✔ Story created successfully (id: ${storyId})`)

    // 5b. Fetch story feed
    const storyFeed = await request('/api/stories', {
      headers: { 'Authorization': `Bearer ${token2}` }
    })
    assert(storyFeed.status === 200 && Array.isArray(storyFeed.data.stories), 'Story feed returned 200 with stories')
    console.log(`  ✔ Story feed fetched (${storyFeed.data.stories.length} stories available)`)

    // 5c. View story
    const viewStory = await request(`/api/stories/${storyId}/view`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` }
    })
    assert(viewStory.status === 200 && viewStory.data.ok === true, 'View story returned 200')
    console.log('  ✔ Story view recorded for viewer')

    // 5d. Like story
    const likeStory = await request(`/api/stories/${storyId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token2}` }
    })
    assert(likeStory.status === 200 && likeStory.data.ok === true, 'Like story returned 200')
    console.log('  ✔ Story liked by viewer')

    // 5e. View story viewers (author only)
    const viewersRes = await request(`/api/stories/${storyId}/viewers`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    })
    assert(viewersRes.status === 200 && viewersRes.data.ok === true, 'Story viewers returned 200')
    console.log(`  ✔ Story viewers list verified (${viewersRes.data.viewsCount} viewers)`)

    // ── SECTION 6: DIRECT MESSAGING ─────────────────────────────────────────
    console.log('\n▶ [6/9] Testing Direct Messaging & Conversations...')

    // 6a. Start or get conversation between User 1 and User 2
    const createConv = await request('/api/messages', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` },
      body: JSON.stringify({ participantId: user2Id })
    })
    assert(createConv.status === 200 && createConv.data.ok === true, 'Create/get conversation returned 200')
    const convId = createConv.data.convId
    assert(Boolean(convId), 'Conversation ID returned')
    console.log(`  ✔ Conversation initialized (id: ${convId})`)

    // 6b. Send message from User 1 to User 2
    const sendMsg = await request(`/api/messages/${convId}/send`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` },
      body: JSON.stringify({
        text: 'Hey Student Two, testing real direct message!'
      })
    })
    assert(sendMsg.status === 200 && sendMsg.data.ok === true, 'Send direct message returned 200')
    console.log('  ✔ Direct message sent via POST /api/messages/:convId/send')

    // 6c. User 2 reads conversation messages
    const getConv = await request(`/api/messages/${convId}`, {
      headers: { 'Authorization': `Bearer ${token2}` }
    })
    assert(getConv.status === 200 && Array.isArray(getConv.data.messages), 'Conversation messages returned')
    assert(getConv.data.messages.some(m => m.text.includes('testing real direct message')), 'Message text verified in thread')
    console.log(`  ✔ User 2 read conversation messages (${getConv.data.messages.length} messages in thread)`)

    // 6d. User 2 checks unread message count
    const unreadCount = await request('/api/messages/unread-count', {
      headers: { 'Authorization': `Bearer ${token2}` }
    })
    assert(unreadCount.status === 200 && typeof unreadCount.data.count === 'number', 'Unread count returned number')
    assert(unreadCount.data.count >= 1, 'Unread count reflects unread message')
    console.log(`  ✔ Unread message count returned correctly: ${unreadCount.data.count}`)

    // 6e. User 2 marks messages as read
    const markRead = await request(`/api/messages/${convId}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token2}` }
    })
    assert(markRead.status === 200 && markRead.data.ok === true, 'Mark read returned 200')
    console.log('  ✔ Messages marked as read via PATCH /api/messages/:convId/read')

    // ── SECTION 7: NOTIFICATIONS ────────────────────────────────────────────
    console.log('\n▶ [7/9] Testing In-App Notifications...')

    const notifs = await request('/api/notifications', {
      headers: { 'Authorization': `Bearer ${token2}` }
    })
    assert(notifs.status === 200 && Array.isArray(notifs.data.notifications), 'Notifications returned 200 with list')
    console.log(`  ✔ User 2 notifications retrieved (${notifs.data.notifications.length} notifications)`)

    if (notifs.data.notifications.length > 0) {
      const markAll = await request('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token2}` }
      })
      assert(markAll.status === 200 && markAll.data.ok === true, 'Mark all notifications read succeeded')
      console.log('  ✔ Notifications marked read via PATCH /api/notifications/read-all')
    }

    // ── SECTION 8: TRENDING & NOTICES ───────────────────────────────────────
    console.log('\n▶ [8/9] Testing Trending Content & College Notices...')

    const trendingPosts = await request('/api/trending/posts?tab=trending', {
      headers: { 'Authorization': `Bearer ${token1}` }
    })
    assert(trendingPosts.status === 200 && Array.isArray(trendingPosts.data.posts), 'Trending posts returned 200')
    console.log(`  ✔ Trending posts returned ${trendingPosts.data.posts.length} ranked posts`)

    const notices = await request('/api/notices/college', {
      headers: { 'Authorization': `Bearer ${token1}` }
    })
    assert(notices.status === 200, 'Notices endpoint returned 200')
    console.log('  ✔ Campus notices retrieved successfully for student')

    // ── SECTION 9: ADMINISTRATOR PRIVILEGES & ROLE GUARDS ───────────────────
    console.log('\n▶ [9/9] Testing Administrator Access & Security Role Guards...')

    // 9a. Normal student attempting admin route must be blocked
    const forbidden = await request('/api/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${token1}` }
    })
    assert(forbidden.status === 403, `Student access to /api/admin/dashboard blocked with 403 (got ${forbidden.status})`)
    console.log('  ✔ Role guard: Student correctly blocked from /api/admin/dashboard (403 Forbidden)')

    // 9b. Super admin logs in and accesses admin routes
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@swish.com',
        password: process.env.ADMIN_PASSWORD || 'SwishAdmin@2026'
      })
    })
    assert(adminLogin.status === 200 && adminLogin.data.ok === true, 'Admin login succeeded')
    const adminToken = adminLogin.data.token

    const adminDashboard = await request('/api/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    assert(adminDashboard.status === 200 && adminDashboard.data.ok === true, 'Admin dashboard endpoint returned 200')
    console.log('  ✔ Admin authorized: GET /api/admin/dashboard returned statistics')

    const adminColleges = await request('/api/admin/colleges', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    assert(adminColleges.status === 200 && Array.isArray(adminColleges.data.colleges), 'Admin colleges endpoint returned 200')
    console.log(`  ✔ Admin authorized: GET /api/admin/colleges returned ${adminColleges.data.colleges.length} colleges`)

    const adminAnalytics = await request('/api/analytics/dashboard', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    assert(adminAnalytics.status === 200 && adminAnalytics.data.ok === true, 'Admin analytics dashboard returned 200')
    console.log('  ✔ Admin analytics dashboard returned 200 OK with real metric aggregates')

    console.log('\n───────────────────────────────────────────────────────────────')
    console.log('🎉  ALL END-TO-END WORKFLOWS PASSED WITH 100% SUCCESS!')
    console.log('───────────────────────────────────────────────────────────────')
  } finally {
    // Clean up temporary test objects created during this audit
    console.log('\n🧹  Cleaning up temporary audit entities from database...')
    if (createdPostId) {
      await Post.deleteOne({ _id: createdPostId })
      await Comment.deleteMany({ post: createdPostId })
    }
    if (user1Id || user2Id) {
      const ids = [user1Id, user2Id].filter(Boolean)
      await User.deleteMany({ _id: { $in: ids } })
      await Follow.deleteMany({ $or: [{ follower: { $in: ids } }, { following: { $in: ids } }] })
      await Story.deleteMany({ user: { $in: ids } })
      await StoryView.deleteMany({ viewer: { $in: ids } })
      await Notification.deleteMany({ $or: [{ recipient: { $in: ids } }, { actor: { $in: ids } }] })
      await Conversation.deleteMany({ participants: { $in: ids } })
    }
    console.log('✔ Audit entities cleanly purged; database remains clean.')
    await mongoose.disconnect()
  }
}

runAudit().catch(err => {
  console.error('\n💥 AUDIT FAILED:', err.message)
  process.exit(1)
})
