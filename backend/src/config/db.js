// backend/src/config/db.js
import mongoose from 'mongoose'

let isConnected = false

export async function connectDB() {
  if (isConnected) return

  const options = {
    serverSelectionTimeoutMS: 5000,   // fail fast if no server
    socketTimeoutMS:          45000,  // drop dead sockets after 45s
    maxPoolSize:              Number(process.env.MONGO_MAX_POOL_SIZE) || 50, // allow up to 50 concurrent DB operations
    minPoolSize:              Number(process.env.MONGO_MIN_POOL_SIZE) || 5,  // keep 5 warm connections ready for instant traffic
    heartbeatFrequencyMS:     10000, // detect dropped connections faster
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, options)
    isConnected = true
    console.log('✅  MongoDB connected:', mongoose.connection.host)
  } catch (err) {
    if (
      err.message.includes('querySrv') &&
      process.env.MONGO_URI &&
      process.env.MONGO_URI.includes('cluster0.l5jvtoe.mongodb.net')
    ) {
      console.warn('⚠️  SRV DNS lookup failed on local network. Falling back to direct replica set hosts...')
      const directUri = process.env.MONGO_URI
        .replace('mongodb+srv://', 'mongodb://')
        .replace(
          'cluster0.l5jvtoe.mongodb.net',
          'ac-knggboa-shard-00-00.l5jvtoe.mongodb.net:27017,ac-knggboa-shard-00-01.l5jvtoe.mongodb.net:27017,ac-knggboa-shard-00-02.l5jvtoe.mongodb.net:27017'
        )
      const separator = directUri.includes('?') ? '&' : '?'
      const fallbackUri = `${directUri}${separator}ssl=true&authSource=admin&replicaSet=atlas-wfn117-shard-0`

      try {
        await mongoose.connect(fallbackUri, options)
        isConnected = true
        console.log('✅  MongoDB connected (via replica set fallback):', mongoose.connection.host)
        return
      } catch (fallbackErr) {
        console.error('❌  Fallback connection also failed:', fallbackErr.message)
      }
    }
    console.error('❌  MongoDB connection error:', err.message)
    process.exit(1)
  }
}
