// backend/src/scripts/cleanup_hardcoded_data.js
// ─────────────────────────────────────────────────────────────────────────────
// Removes all hardcoded demo profiles (Rahul, Priya, Arjun, Sneha, etc.)
// and demo posts, comments, notifications, and follows from MongoDB.
// Ensures admin@swish.com has isDemo: false and password set to ADMIN_PASSWORD.
// ─────────────────────────────────────────────────────────────────────────────
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDB } from '../config/db.js'
import User from '../models/User.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import Follow from '../models/Follow.js'
import Notification from '../models/Notification.js'

const BCRYPT_ROUNDS = 12

const DEMO_EMAILS = [
  'rahul@campus.edu',
  'student@campus.edu',
  'faculty@campus.edu',
  'collegeadmin@campus.edu',
  'priya@campus.edu',
  'arjun@campus.edu',
  'sneha@campus.edu',
]

async function cleanup() {
  console.log('\n🧹  Starting cleanup of hardcoded profiles and posts...\n')
  await connectDB()

  // 1. Identify demo users
  const demoUsers = await User.find({
    $or: [
      { email: { $in: DEMO_EMAILS } },
      { isDemo: true, role: { $nin: ['admin', 'main_admin'] } },
    ],
  })

  const demoUserIds = demoUsers.map(u => u._id)
  console.log(`Found ${demoUsers.length} hardcoded demo users:`, demoUsers.map(u => u.email).join(', '))

  if (demoUserIds.length > 0) {
    // 2. Delete all posts by demo users
    const demoPosts = await Post.find({ user: { $in: demoUserIds } })
    const demoPostIds = demoPosts.map(p => p._id)
    const deletePostsResult = await Post.deleteMany({ _id: { $in: demoPostIds } })
    console.log(`  🗑️  Deleted ${deletePostsResult.deletedCount} demo posts`)

    // 3. Delete comments by demo users or on demo posts
    const deleteCommentsResult = await Comment.deleteMany({
      $or: [
        { user: { $in: demoUserIds } },
        { post: { $in: demoPostIds } },
      ],
    })
    console.log(`  🗑️  Deleted ${deleteCommentsResult.deletedCount} demo comments`)

    // 4. Delete follows involving demo users
    const deleteFollowsResult = await Follow.deleteMany({
      $or: [
        { follower: { $in: demoUserIds } },
        { following: { $in: demoUserIds } },
      ],
    })
    console.log(`  🗑️  Deleted ${deleteFollowsResult.deletedCount} demo follow relations`)

    // 5. Delete notifications involving demo users
    const deleteNotifsResult = await Notification.deleteMany({
      $or: [
        { recipient: { $in: demoUserIds } },
        { actor: { $in: demoUserIds } },
      ],
    })
    console.log(`  🗑️  Deleted ${deleteNotifsResult.deletedCount} demo notifications`)

    // 6. Remove demo user IDs from likes and savedBy on any remaining posts
    await Post.updateMany(
      {},
      {
        $pull: {
          likes: { $in: demoUserIds },
          savedBy: { $in: demoUserIds },
        },
      }
    )

    // Recalculate accurate likeCount and commentCount for all remaining posts
    const remainingPosts = await Post.find({})
    for (const post of remainingPosts) {
      const accurateLikes = Array.isArray(post.likes) ? post.likes.length : 0
      const accurateComments = await Comment.countDocuments({ post: post._id, isDeleted: false })
      post.likeCount = accurateLikes
      post.commentCount = accurateComments
      post.commentsCount = accurateComments
      await post.save()
    }
    console.log(`  🔄  Recalculated like & comment counts for remaining ${remainingPosts.length} posts`)

    // 7. Delete the demo user accounts
    const deleteUsersResult = await User.deleteMany({ _id: { $in: demoUserIds } })
    console.log(`  🗑️  Deleted ${deleteUsersResult.deletedCount} demo user accounts`)
  } else {
    console.log('  ℹ️  No demo users found.')
  }

  // 8. Re-sync followers & following count for all remaining users
  const remainingUsers = await User.find({})
  for (const user of remainingUsers) {
    const followers = await Follow.countDocuments({ following: user._id })
    const following = await Follow.countDocuments({ follower: user._id })
    const postCount = await Post.countDocuments({ user: user._id, isDeleted: false })
    user.followers = followers
    user.following = following
    user.posts = postCount
    await user.save()
  }
  console.log(`  🔄  Synced follower/following/post counts for remaining ${remainingUsers.length} users`)

  // 9. Ensure admin@swish.com is permanent and has isDemo: false and password updated
  const adminEmail = 'admin@swish.com'
  const adminPassword = (process.env.ADMIN_PASSWORD || 'SwishAdmin@2026').trim()
  const adminHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS)

  let admin = await User.findOne({ email: adminEmail })
  if (admin) {
    admin.isDemo = false
    admin.passwordHash = adminHash
    admin.isEmailVerified = true
    await admin.save()
    console.log(`  👑  Updated ${adminEmail} (isDemo: false, password synced to ADMIN_PASSWORD)`)
  } else {
    admin = await User.create({
      name: 'Swish Admin',
      username: 'admin',
      initials: 'AU',
      avatarColor: '#ef4444',
      email: adminEmail,
      passwordHash: adminHash,
      role: 'admin',
      isEmailVerified: true,
      isDemo: false,
    })
    console.log(`  👑  Created permanent ${adminEmail} (password: ${adminPassword})`)
  }

  console.log('\n✅  Cleanup completed successfully!\n')
  await mongoose.disconnect()
  process.exit(0)
}

cleanup().catch(err => {
  console.error('❌  Cleanup error:', err)
  process.exit(1)
})
