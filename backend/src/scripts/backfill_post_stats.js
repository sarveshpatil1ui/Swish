// backend/src/scripts/backfill_post_stats.js
// ─────────────────────────────────────────────────────────────────────────────
// Backfill script for Post.likeCount and Post.collegeId
// Style mirrored from backfill_colleges.js
// ─────────────────────────────────────────────────────────────────────────────
import 'dotenv/config'
import mongoose from 'mongoose'
import Post from '../models/Post.js'
import User from '../models/User.js'

async function runBackfill() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected.')

    const posts = await Post.find({})
    console.log(`Found ${posts.length} posts in database.`)

    let updatedCount = 0

    // Fetch user map for quick lookup
    const users = await User.find({}).select('_id collegeId').lean()
    const userCollegeMap = new Map()
    for (const u of users) {
      userCollegeMap.set(u._id.toString(), u.collegeId || null)
    }

    for (const post of posts) {
      let changed = false

      // 1. Backfill likeCount from likes array
      const accurateLikes = Array.isArray(post.likes) ? post.likes.length : 0
      if (post.likeCount !== accurateLikes) {
        post.likeCount = accurateLikes
        changed = true
      }

      // 2. Backfill collegeId from author
      if (!post.collegeId && post.user) {
        const authorCollegeId = userCollegeMap.get(post.user.toString())
        if (authorCollegeId) {
          post.collegeId = authorCollegeId
          changed = true
        }
      }

      if (changed) {
        await post.save()
        updatedCount++
      }
    }

    console.log(`Backfill complete. ${updatedCount} posts updated with likeCount and collegeId.`)
    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Error during backfill:', err)
    process.exit(1)
  }
}

runBackfill()
