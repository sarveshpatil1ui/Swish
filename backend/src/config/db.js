// backend/src/config/db.js
import mongoose from 'mongoose'

let isConnected = false

export async function connectDB() {
  if (isConnected) return

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,   // fail fast if no server
      socketTimeoutMS:          45000,  // drop dead sockets after 45s
      maxPoolSize:              10,     // limit connections (Render free tier)
      heartbeatFrequencyMS:     10000, // detect dropped connections faster
    })
    isConnected = true
    console.log('✅  MongoDB connected:', mongoose.connection.host)
  } catch (err) {
    console.error('❌  MongoDB connection error:', err.message)
    process.exit(1)
  }
}
