// backend/src/config/db.js
import mongoose from 'mongoose'

let isConnected = false

export async function connectDB() {
  if (isConnected) return

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,   // fail fast if no server
      socketTimeoutMS:          45000,  // drop dead sockets after 45s
      maxPoolSize:              Number(process.env.MONGO_MAX_POOL_SIZE) || 50, // allow up to 50 concurrent DB operations (was artificially choked at 10)
      minPoolSize:              Number(process.env.MONGO_MIN_POOL_SIZE) || 5,  // keep 5 warm connections ready for instant traffic
      heartbeatFrequencyMS:     10000, // detect dropped connections faster
    })
    isConnected = true
    console.log('✅  MongoDB connected:', mongoose.connection.host)
  } catch (err) {
    console.error('❌  MongoDB connection error:', err.message)
    process.exit(1)
  }
}
