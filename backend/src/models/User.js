import mongoose from 'mongoose'

const { Schema } = mongoose

const NotificationPrefsSchema = new Schema(
  {
    likes:    { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    follows:  { type: Boolean, default: true },
    mentions: { type: Boolean, default: true },
    events:   { type: Boolean, default: false },
  },
  { _id: false }
)

const PrivacyPrefsSchema = new Schema(
  {
    private:   { type: Boolean, default: false },
    showEmail: { type: Boolean, default: false },
    activity:  { type: Boolean, default: true },
    tagged:    { type: Boolean, default: true },
  },
  { _id: false }
)

const SecurityPrefsSchema = new Schema(
  { twoFactor: { type: Boolean, default: false } },
  { _id: false }
)

const PreferencesSchema = new Schema(
  {
    notifications: { type: NotificationPrefsSchema, default: () => ({}) },
    privacy:       { type: PrivacyPrefsSchema,       default: () => ({}) },
    security:      { type: SecurityPrefsSchema,      default: () => ({}) },
  },
  { _id: false }
)

const UserSchema = new Schema(
  {
    name:        { type: String, required: true, trim: true },
    username:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    initials:    { type: String, required: true },
    avatarColor: { type: String, default: '#6366f1' },
    
    profilePhoto: { type: String, default: null },

    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['student', 'faculty', 'admin','college_admin'], required: true },

    isEmailVerified: { type: Boolean, default: false },
    otpHash:         { type: String, default: null },
    otpExpiresAt:    { type: Date,   default: null },
    otpAttempts:     { type: Number, default: 0 },

    college: { type: String, default: '' },
    collegeId: {type: Schema.Types.ObjectId, ref: 'College',default: null,},
    dept:    { type: String, default: '' },
    bio:     { type: String, default: '', maxlength: 500 },

    year:      { type: String, default: null },
    studentId: { type: String, default: null },

    designation: { type: String, default: null },
    employeeId:  { type: String, default: null },

    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    posts:     { type: Number, default: 0 },

    preferences: { type: PreferencesSchema, default: () => ({}) },

    deactivated: { type: Boolean, default: false },
    suspended:   { type: Boolean, default: false },
    mustChangePassword: {type: Boolean,default: false},
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
)



UserSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.passwordHash
    delete ret.otpHash
    delete ret.otpExpiresAt
    delete ret.otpAttempts
    return ret
  },
})

export default mongoose.model('User', UserSchema)