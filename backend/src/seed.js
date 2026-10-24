// backend/src/seed.js
// ─────────────────────────────────────────────────────────────────────────────
// Clean Database Seeder:
// Initializes active colleges and ensures super administrator exists.
// Does NOT seed any hardcoded student/faculty profiles or fake posts.
// ─────────────────────────────────────────────────────────────────────────────
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import User from './models/User.js'
import College from './models/College.js'

const BCRYPT_ROUNDS = 12

const COLLEGES_TO_SEED = [
  {
    name: 'KJSCE Mumbai',
    code: 'KJSCE',
    domain: 'campus.edu',
    location: 'Mumbai, Maharashtra',
    active: true,
    website: 'https://kjsce.somaiya.edu',
    address: 'Vidyavihar, Mumbai - 400077',
    phone: '+91-22-24061234',
    email: 'info@kjsce.edu',
    description: 'K. J. Somaiya College of Engineering - A premier engineering institution in Mumbai',
  },
  {
    name: 'KC College of Engineering',
    code: 'KCCEMSR',
    domain: 'kccemsr.edu.in',
    location: 'Thane, Maharashtra',
    active: true,
    website: 'https://kccemsr.edu.in',
    address: 'Mith Bunder Road, Kopri, Thane East - 400603',
    phone: '+91-22-25327100',
    email: 'info@kccemsr.edu.in',
    description: 'K. C. College of Engineering and Management Studies and Research',
  },
  {
    name: 'Datta Meghe College of Engineering',
    code: 'DMCE',
    domain: 'dmce.ac.in',
    location: 'Airoli, Navi Mumbai, Maharashtra',
    active: true,
    website: 'https://dmce.ac.in',
    address: 'Plot No. 98, Sector 3, Airoli, Navi Mumbai - 400708',
    phone: '+91-22-27791662',
    email: 'info@dmce.ac.in',
    description: 'Datta Meghe College of Engineering - Premier engineering institute affiliated with University of Mumbai',
  },
]

async function seed() {
  await connectDB()
  console.log('\n🌱  Starting clean seed (colleges & admin only)...\n')

  // 1. Seed colleges
  for (const col of COLLEGES_TO_SEED) {
    const upserted = await College.findOneAndUpdate(
      { domain: col.domain },
      { $set: col },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    console.log(`  ✅  College: ${upserted.name} (${upserted.domain})`)
  }

  // 2. Ensure super administrator exists
  const adminEmail = 'admin@swish.com'
  const adminPassword = (process.env.ADMIN_PASSWORD || 'SwishAdmin@2026').trim()
  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS)

  const admin = await User.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: {
        name: 'Swish Admin',
        username: 'admin',
        initials: 'AU',
        avatarColor: '#ef4444',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        college: '',
        dept: 'Administration',
        bio: 'Swish Platform Administrator',
        isEmailVerified: true,
        isDemo: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  console.log(`  👑  Platform Administrator: ${admin.email} (id: ${admin._id})`)

  console.log('\n✅  Clean seed complete (no hardcoded student/faculty profiles or fake posts).\n')
  console.log('──────────────────────────────────────────────')
  console.log('  Admin credentials:')
  console.log(`    • Email:    ${adminEmail}`)
  console.log(`    • Password: ${adminPassword}`)
  console.log('──────────────────────────────────────────────\n')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})
