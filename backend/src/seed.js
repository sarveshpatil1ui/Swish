// backend/src/seed.js
// ─────────────────────────────────────────────────────────────────────────────
// Seeds the demo accounts into MongoDB with properly hashed passwords.
// Run once: npm run seed
//
// Demo accounts seeded:
//   student@campus.edu   / student123   (role: student)
//   faculty@campus.edu   / faculty123   (role: faculty)
//   admin@swish.com      / admin123     (role: admin)
//   rahul@campus.edu     / swish123     (role: student)
//
// All demo accounts:
//   • Have isEmailVerified: true  (no OTP required to log in)
//   • Have isDemo: true           (helps identify them in admin UI)
// ─────────────────────────────────────────────────────────────────────────────
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import User from './models/User.js'

const BCRYPT_ROUNDS = 12

const DEMO_ACCOUNTS = [
  {
    name:         'Rahul Sharma',
    username:     'rahul.sharma',
    initials:     'RS',
    avatarColor:  '#6366f1',
    email:        'rahul@campus.edu',
    password:     'swish123',
    role:         'student',
    college:      'KJSCE Mumbai',
    dept:         'Information Technology',
    bio:          'Full Stack Developer 🚀 | Hackathon enthusiast | Building Swish',
    year:         '3rd Year',
    studentId:    'IT2024001',
    followers:    243,
    following:    118,
    posts:        12,
    isEmailVerified: true,
    isDemo:       true,
  },
  {
    name:         'Demo Student',
    username:     'demo.student',
    initials:     'DS',
    avatarColor:  '#6366f1',
    email:        'student@campus.edu',
    password:     'student123',
    role:         'student',
    college:      'KJSCE Mumbai',
    dept:         'Computer Science',
    bio:          'Campus explorer 🎓',
    year:         '2nd Year',
    studentId:    'CS2024099',
    followers:    0,
    following:    0,
    posts:        0,
    isEmailVerified: true,
    isDemo:       true,
  },
  {
    name:         'Demo Faculty',
    username:     'demo.faculty',
    initials:     'DF',
    avatarColor:  '#10b981',
    email:        'faculty@campus.edu',
    password:     'faculty123',
    role:         'faculty',
    college:      'KJSCE Mumbai',
    dept:         'Computer Science',
    bio:          'Educator & researcher 📚',
    designation:  'Assistant Professor',
    employeeId:   'EMP2024001',
    followers:    0,
    following:    0,
    posts:        0,
    isEmailVerified: true,
    isDemo:       true,
  },
  {
    name:         'Admin User',
    username:     'swish.admin',
    initials:     'AU',
    avatarColor:  '#ef4444',
    email:        'admin@swish.com',
    password:     'admin123',
    role:         'admin',
    college:      '',
    dept:         'Administration',
    bio:          'Swish Platform Administrator',
    followers:    0,
    following:    0,
    posts:        0,
    isEmailVerified: true,
    isDemo:       true,
  },
]

async function seed() {
  await connectDB()
  console.log('\n🌱  Starting seed...\n')

  for (const account of DEMO_ACCOUNTS) {
    const { password, ...rest } = account
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    const result = await User.findOneAndUpdate(
      { email: rest.email },
      { $set: { ...rest, passwordHash } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    console.log(`  ✅  ${result.role.padEnd(7)} ${result.email} (id: ${result._id})`)
  }

  console.log('\n✅  Seed complete.\n')
  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})
