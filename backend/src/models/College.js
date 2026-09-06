// backend/src/models/College.js
// ─────────────────────────────────────────────────────────────────────────────
// Swish College schema.
//
// Each college has a unique email domain. During signup, the backend checks
// that the user's email domain matches an active college in this collection.
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'

const { Schema } = mongoose

const CollegeSchema = new Schema(
  {
    name:     { type: String, required: true, trim: true },
    code:     { type: String, required: true, trim: true, uppercase: true },
    domain:   { type: String, required: true, unique: true, trim: true, lowercase: true },
    location: { type: String, default: '', trim: true },
    active:   { type: Boolean, default: true },
  },
  { timestamps: true }
)

// ── toJSON — expose id instead of _id ────────────────────────────────────────
CollegeSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('College', CollegeSchema)
