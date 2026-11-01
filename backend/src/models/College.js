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
    // Additional fields for College Admin module
    logo:     { type: String, default: null },
    logoPublicId: { type: String, default: null }, // Cloudinary public ID for deletion
    banner:   { type: String, default: null }, // Banner/cover image
    bannerPublicId: { type: String, default: null },
    website:  { type: String, default: '', trim: true },
    address:  { type: String, default: '', trim: true },
    phone:    { type: String, default: '', trim: true },
    email:    { type: String, default: '', trim: true, lowercase: true },
    description: { type: String, default: '', maxlength: 1000 },
    
    // Branding colors
    primaryColor: { type: String, default: '#6366f1' },
    secondaryColor: { type: String, default: '#8b5cf6' },
    
    // Social media links
    facebook: { type: String, default: '', trim: true },
    twitter: { type: String, default: '', trim: true },
    linkedin: { type: String, default: '', trim: true },
    instagram: { type: String, default: '', trim: true },
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
