// backend/scripts/set-admin-password.js
// ─────────────────────────────────────────────────────────────────────────────
// Securely sets or updates the administrator password directly in MongoDB.
// Uses bcrypt with 12 salt rounds. No passwords stored in .env!
//
// Usage:
//   node scripts/set-admin-password.js admin@swish.com MyNewSecretPass123!
// ─────────────────────────────────────────────────────────────────────────────
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../src/models/User.js'

const BCRYPT_ROUNDS = 12

async function main() {
  const email = process.argv[2]?.trim().toLowerCase() || 'admin@swish.com'
  const newPassword = process.argv[3]

  if (!newPassword) {
    console.error('\n❌ Error: Please provide the new password.')
    console.log('Usage:\n  node scripts/set-admin-password.js <email> <newPassword>')
    console.log('Example:\n  node scripts/set-admin-password.js admin@swish.com SuperSecretPassword@2026\n')
    process.exit(1)
  }

  if (newPassword.length < 8) {
    console.error('\n❌ Error: Password must be at least 8 characters long.\n')
    process.exit(1)
  }

  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    console.error('\n❌ Error: MONGO_URI is not set in environment or .env file.\n')
    process.exit(1)
  }

  try {
    console.log('\nConnecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✔ Connected.')

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

    let user = await User.findOne({ email })

    if (user) {
      user.passwordHash = passwordHash
      user.isEmailVerified = true
      user.role = user.role === 'main_admin' ? 'main_admin' : 'admin'
      await user.save()
      console.log(`\n✅ Password successfully updated for existing admin: ${email}`)
    } else {
      user = await User.create({
        name: 'Swish Admin',
        username: 'admin',
        initials: 'AU',
        avatarColor: '#ef4444',
        email,
        passwordHash,
        role: 'admin',
        isEmailVerified: true,
        dept: 'Administration',
      })
      console.log(`\n✅ Created new Admin account in MongoDB: ${email}`)
    }

    console.log(`Role: ${user.role}`)
    console.log('Credentials are encrypted and safely stored in MongoDB.')
    console.log('You do NOT need ADMIN_PASSWORD in your .env file anymore!\n')

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('\n❌ Failed to update admin password:', err.message)
    process.exit(1)
  }
}

main()
