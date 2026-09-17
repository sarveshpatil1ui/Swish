// backend/src/config/db.js
import mongoose from 'mongoose'

let isConnected = false

export async function connectDB() {
  if (isConnected) return

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // These are the recommended settings for Mongoose 8+
      serverSelectionTimeoutMS: 5000,
    })
    isConnected = true
    console.log('✅  MongoDB connected:', mongoose.connection.host)
  } catch (err) {
    console.error('❌  MongoDB connection error:', err.message)
    process.exit(1)
  }
}
