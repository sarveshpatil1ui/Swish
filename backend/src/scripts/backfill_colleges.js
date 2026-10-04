// backend/src/scripts/backfill_colleges.js
import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'
import College from '../models/College.js'

async function runBackfill() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected.')

    const colleges = await College.find({})
    console.log(`Found ${colleges.length} colleges in database.`)

    const users = await User.find({})
    console.log(`Found ${users.length} users in database.`)

    let updatedCount = 0

    for (const user of users) {
      let changed = false
      const emailDomain = user.email ? user.email.split('@')[1]?.toLowerCase() : null

      // 1. Backfill collegeId if missing
      if (!user.collegeId && user.role !== 'admin' && user.role !== 'main_admin') {
        const matchingCollege = colleges.find(c => 
          (emailDomain && c.domain?.toLowerCase() === emailDomain) ||
          (user.college && c.name?.trim().toLowerCase() === user.college.trim().toLowerCase())
        )

        if (matchingCollege) {
          user.collegeId = matchingCollege._id
          user.college = matchingCollege.name
          changed = true
          console.log(`[Backfill] Assigned collegeId ${matchingCollege._id} (${matchingCollege.name}) to user ${user.email} (${user.role})`)
        }
      }

      // 2. Fix college admin where college string was stored as ObjectId string
      if (user.role === 'college_admin' && user.collegeId) {
        const adminCollege = colleges.find(c => c._id.toString() === user.collegeId.toString())
        if (adminCollege && user.college !== adminCollege.name) {
          console.log(`[Backfill] Fixed collegeAdmin ${user.email} college name: "${user.college}" -> "${adminCollege.name}"`)
          user.college = adminCollege.name
          changed = true
        }
      }

      if (changed) {
        await user.save()
        updatedCount++
      }
    }

    console.log(`Backfill complete. ${updatedCount} users updated.`)
    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Error during backfill:', err)
    process.exit(1)
  }
}

runBackfill()
